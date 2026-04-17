import { invoke } from "@tauri-apps/api/core";

export interface LicenseKey {
  status: string;
  activation_limit: number;
  activation_usage: number;
  expires_at: string | null;
}

export interface LicenseInstance {
  id: string;
  name: string;
  created_at: string;
}

export interface LicenseMeta {
  store_id: number;
  order_id: number | null;
  product_id: number | null;
  variant_id: number | null;
  customer_email: string | null;
  customer_name: string | null;
}

export interface LicenseValidation {
  valid: boolean;
  error: string | null;
  license_key: LicenseKey | null;
  instance: LicenseInstance | null;
  meta: LicenseMeta | null;
}

export interface LicenseInfo {
  valid: boolean;
  status: string;
  error: string | null;
}

export async function getStoredLicenseKey() {
  return invoke<string | null>("get_license_status");
}

export async function activateLicense(licenseKey: string) {
  return invoke<LicenseValidation>("activate_license", {
    licenseKey,
    instanceName: "ZoneBar",
  });
}

export async function validateLicense(licenseKey: string) {
  return invoke<LicenseValidation>("validate_license", {
    licenseKey,
    instanceId: null,
  });
}

export async function deactivateLicense(licenseKey: string) {
  return invoke<LicenseInfo>("deactivate_license", {
    licenseKey,
    instanceId: null,
  });
}
