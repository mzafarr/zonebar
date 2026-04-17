use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const LICENSE_STATE_FILE: &str = "license-state.json";
const LICENSE_PRODUCT_ID: Option<i32> = None;

#[derive(Debug, Serialize, Deserialize, Default)]
struct PersistedLicenseState {
    license_key: Option<String>,
    instance_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseInfo {
    pub valid: bool,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseValidation {
    #[serde(alias = "activated")]
    pub valid: bool,
    pub error: Option<String>,
    pub license_key: Option<LicenseKey>,
    pub instance: Option<LicenseInstance>,
    pub meta: Option<LicenseMeta>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseKey {
    pub status: String,
    #[serde(rename = "activation_limit")]
    pub activation_limit: i32,
    #[serde(rename = "activation_usage")]
    pub activation_usage: i32,
    #[serde(rename = "expires_at")]
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseInstance {
    pub id: String,
    pub name: String,
    #[serde(rename = "created_at")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseMeta {
    #[serde(rename = "store_id")]
    pub store_id: i32,
    #[serde(rename = "order_id")]
    pub order_id: Option<i32>,
    #[serde(rename = "product_id")]
    pub product_id: Option<i32>,
    #[serde(rename = "variant_id")]
    pub variant_id: Option<i32>,
    #[serde(rename = "customer_email")]
    pub customer_email: Option<String>,
    #[serde(rename = "customer_name")]
    pub customer_name: Option<String>,
}

fn extract_error_message(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(message) if !message.trim().is_empty() => Some(message.clone()),
        serde_json::Value::Array(items) => items.iter().find_map(extract_error_message),
        serde_json::Value::Object(map) => {
            for key in ["error", "message", "detail", "title"] {
                if let Some(found) = map.get(key).and_then(extract_error_message) {
                    return Some(found);
                }
            }
            None
        }
        _ => None,
    }
}

fn extract_api_error_message(body: &str) -> Option<String> {
    let payload: serde_json::Value = serde_json::from_str(body).ok()?;

    for key in ["error", "message", "detail", "title", "errors"] {
        if let Some(found) = payload.get(key).and_then(extract_error_message) {
            return Some(found);
        }
    }

    extract_error_message(&payload)
}

fn parse_license_response<T>(response: reqwest::blocking::Response, operation: &str) -> Result<T, String>
where
    T: DeserializeOwned,
{
    let status = response.status();
    let headers = response.headers().clone();
    let body = response
        .text()
        .map_err(|error| format!("Failed to read {operation} response body: {error}"))?;

    if !status.is_success() {
        log::error!("{operation} request failed. status={status} headers={headers:?} body={body}");
        let user_error = extract_api_error_message(&body)
            .unwrap_or_else(|| format!("Request failed with HTTP {status}."));
        return Err(format!("{operation} failed: {user_error}"));
    }

    serde_json::from_str::<T>(&body).map_err(|error| {
        log::error!(
            "{operation} response parse failed. status={status} headers={headers:?} error={error} body={body}"
        );
        format!("{operation} failed: invalid server response.")
    })
}

fn get_license_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to get app config directory: {error}"))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("Failed to create app config directory: {error}"))?;

    Ok(app_data_dir.join(LICENSE_STATE_FILE))
}

fn load_license_state(app: &AppHandle) -> Result<PersistedLicenseState, String> {
    let path = get_license_state_path(app)?;

    if !path.exists() {
        return Ok(PersistedLicenseState::default());
    }

    let contents = std::fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read license state file: {error}"))?;

    serde_json::from_str::<PersistedLicenseState>(&contents)
        .map_err(|error| format!("Failed to parse license state file: {error}"))
}

fn save_license_state(app: &AppHandle, state: &PersistedLicenseState) -> Result<(), String> {
    let path = get_license_state_path(app)?;
    let temp_path = path.with_extension("tmp");
    let json = serde_json::to_string_pretty(state)
        .map_err(|error| format!("Failed to serialize license state: {error}"))?;

    std::fs::write(&temp_path, json)
        .map_err(|error| format!("Failed to write license state file: {error}"))?;

    std::fs::rename(&temp_path, &path)
        .map_err(|error| format!("Failed to persist license state file: {error}"))?;

    Ok(())
}

fn get_or_create_instance_id(app: &AppHandle) -> Result<String, String> {
    let mut state = load_license_state(app)?;

    if let Some(instance_id) = state.instance_id.clone() {
        return Ok(instance_id);
    }

    let instance_id = uuid::Uuid::new_v4().to_string();
    state.instance_id = Some(instance_id.clone());
    save_license_state(app, &state)?;

    Ok(instance_id)
}

fn store_license_key(app: &AppHandle, key: String) -> Result<(), String> {
    let mut state = load_license_state(app)?;
    state.license_key = Some(key);
    save_license_state(app, &state)
}

pub fn get_stored_key(app: &AppHandle) -> Result<Option<String>, String> {
    let state = load_license_state(app)?;
    Ok(state.license_key)
}

pub fn clear_license(app: &AppHandle) -> Result<(), String> {
    let path = get_license_state_path(app)?;
    match std::fs::remove_file(&path) {
        Ok(_) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Failed to remove license state file: {error}")),
    }
}

fn ensure_product_matches(app: &AppHandle, validation: &LicenseValidation) -> Result<(), String> {
    let Some(expected_product_id) = LICENSE_PRODUCT_ID else {
        return Ok(());
    };

    if validation
        .meta
        .as_ref()
        .and_then(|meta| meta.product_id)
        == Some(expected_product_id)
    {
        return Ok(());
    }

    clear_license(app)?;
    Err("This license key is not valid for ZoneBar".to_string())
}

#[tauri::command]
pub fn activate_license(
    app: AppHandle,
    license_key: String,
    instance_name: Option<String>,
) -> Result<LicenseValidation, String> {
    if license_key.trim().is_empty() {
        return Err("License key is required".to_string());
    }

    let instance_id = get_or_create_instance_id(&app)?;
    let name = instance_name.unwrap_or_else(|| "ZoneBar".to_string());

    let client = reqwest::blocking::Client::new();
    let response = client
        .post("https://api.lemonsqueezy.com/v1/licenses/activate")
        .header("Accept", "application/json")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("license_key", license_key.as_str()),
            ("instance_id", instance_id.as_str()),
            ("instance_name", name.as_str()),
        ])
        .send()
        .map_err(|error| format!("Network error: {error}"))?;

    let validation: LicenseValidation = parse_license_response(response, "License activation")?;

    if validation.valid {
        ensure_product_matches(&app, &validation)?;
        if let Some(instance) = validation.instance.as_ref() {
            let mut state = load_license_state(&app)?;
            state.instance_id = Some(instance.id.clone());
            save_license_state(&app, &state)?;
        }
        store_license_key(&app, license_key)?;
        log::info!("License activated successfully");
    } else if let Some(error_msg) = validation.error.as_deref() {
        log::warn!("License activation failed: {error_msg}");
    }

    Ok(validation)
}

#[tauri::command]
pub fn validate_license(
    app: AppHandle,
    license_key: String,
    instance_id: Option<String>,
) -> Result<LicenseValidation, String> {
    let instance = match instance_id {
        Some(id) => id,
        None => get_or_create_instance_id(&app)?,
    };

    let client = reqwest::blocking::Client::new();
    let response = client
        .post("https://api.lemonsqueezy.com/v1/licenses/validate")
        .header("Accept", "application/json")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("license_key", license_key.as_str()),
            ("instance_id", instance.as_str()),
        ])
        .send()
        .map_err(|error| format!("Network error: {error}"))?;

    let validation: LicenseValidation = parse_license_response(response, "License validation")?;

    if validation.valid {
        ensure_product_matches(&app, &validation)?;
    }

    Ok(validation)
}

#[tauri::command]
pub fn deactivate_license(
    app: AppHandle,
    license_key: String,
    instance_id: Option<String>,
) -> Result<LicenseInfo, String> {
    let instance = match instance_id {
        Some(id) => id,
        None => get_or_create_instance_id(&app)?,
    };

    let client = reqwest::blocking::Client::new();
    let response = client
        .post("https://api.lemonsqueezy.com/v1/licenses/deactivate")
        .header("Accept", "application/json")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("license_key", license_key.as_str()),
            ("instance_id", instance.as_str()),
        ])
        .send()
        .map_err(|error| format!("Network error: {error}"))?;

    let info: LicenseInfo = parse_license_response(response, "License deactivation")?;

    if info.valid {
        clear_license(&app)?;
        log::info!("License deactivated successfully");
    }

    Ok(info)
}

#[tauri::command]
pub fn get_license_status(app: AppHandle) -> Result<Option<String>, String> {
    get_stored_key(&app)
}

#[tauri::command]
pub fn clear_stored_license(app: AppHandle) -> Result<(), String> {
    clear_license(&app)
}

#[cfg(test)]
mod tests {
    use super::{extract_api_error_message, LicenseValidation};

    #[test]
    fn extracts_top_level_error_message() {
        let body =
            r#"{"activated":false,"error":"This license key has reached the activation limit."}"#;
        assert_eq!(
            extract_api_error_message(body).as_deref(),
            Some("This license key has reached the activation limit.")
        );
    }

    #[test]
    fn extracts_nested_error_message() {
        let body = r#"{"errors":[{"detail":"License is invalid."}]}"#;
        assert_eq!(
            extract_api_error_message(body).as_deref(),
            Some("License is invalid.")
        );
    }

    #[test]
    fn returns_none_for_non_json_payload() {
        assert_eq!(extract_api_error_message("bad gateway"), None);
    }

    #[test]
    fn deserializes_activation_payload_using_activated_field() {
        let body =
            r#"{"activated":true,"error":null,"license_key":null,"instance":null,"meta":null}"#;
        let payload: LicenseValidation = serde_json::from_str(body).unwrap();
        assert!(payload.valid);
    }
}
