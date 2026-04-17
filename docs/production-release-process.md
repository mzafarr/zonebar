# ZoneBar Production Release Process (macOS)

This document describes the complete process to build a Tauri app into a production-ready, signed, and notarized macOS DMG.

## Prerequisites

- Apple Developer Account (paid, $99/year)
- App-specific password generated at https://appleid.apple.com
- Node.js 22+ and Rust installed

---

## Phase 1: One-Time Setup

### 1.1 Create CSR and Private Key

Generate a new private key and Certificate Signing Request (CSR):

```bash
openssl req -new \
  -keyout ~/Downloads/zonebar-devid.key \
  -out ~/Downloads/zonebar-devid.csr \
  -newkey rsa:2048 \
  -nodes \
  -subj "/UID=9F22X55D38/CN=Muhammad Zafar/OU=9F22X55D38/O=Muhammad Zafar/C=PK"
```

**Important**: Save `zonebar-devid.key` somewhere secure - it's needed to create the .p12 later.

### 1.2 Get Developer ID Certificate

1. Go to https://developer.apple.com → **Certificates** → **+**
2. Select **"Developer ID Application"**
3. Upload the CSR: `~/Downloads/zonebar-devid.csr`
4. Download the certificate as **.cer** format

### 1.3 Create .p12 from .cer + Private Key

```bash
# Convert .cer to .pem
openssl x509 -inform DER -in ~/Downloads/developerID_application.cer -out ~/Downloads/cert.pem

# Combine private key + certificate into .p12
openssl pkcs12 -export \
  -out ~/Downloads/zonebar-devid.p12 \
  -inkey ~/Downloads/zonebar-devid.key \
  -in ~/Downloads/cert.pem \
  -passout pass:YOUR_PASSWORD
```

### 1.4 Import .p12 to Keychain

```bash
security import ~/Downloads/zonebar-devid.p12 \
  -k ~/Library/Keychains/login.keychain-db \
  -P "YOUR_PASSWORD" \
  -T /usr/bin/codesign
```

### 1.5 Get Signing Identity Hash

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

Output will show something like:
```
2) BD2CDE2CC4371E257CF7D30F7AD340C4D745F132 "Developer ID Application: Muhammad Zafar (9F22X55D38)"
```

Copy the SHA1 hash (`BD2CDE2CC4371E257CF7D30F7AD340C4D745F132`).

### 1.6 Configure Tauri

Edit `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "macOS": {
      "signingIdentity": "BD2CDE2CC4371E257CF7D30F7AD340C4D745F132"
    },
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

---

## Phase 2: Build & Release (Repeatable)

### 2.1 Build the App

```bash
cd /Volumes/WD-1TB/mac-apps/zonebar

# Clean previous builds
rm -rf src-tauri/target/release/bundle/dmg

# Build with signing
npm run tauri build -- --bundles dmg
```

### 2.2 Find the DMG

```bash
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" | head -1)
echo "DMG: $DMG_PATH"
```

### 2.3 Notarize the DMG

```bash
# Set your credentials
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="9F22X55D38"

# Submit for notarization (--wait blocks until complete)
xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait
```

### 2.4 Staple the Ticket

```bash
xcrun stapler staple "$DMG_PATH"

# Verify
xcrun stapler validate "$DMG_PATH"
```

### 2.5 Copy to Downloads

```bash
cp "$DMG_PATH" ~/Downloads/ZoneBar_v0.1.0_notarized.dmg
```

---

## One-Command Release Script

A script is provided at `./scripts/release-macos-local.sh`:

```bash
# Set credentials first (or export in your shell profile)
export APPLE_ID="your@email.com"
export APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="9F22X55D38"

# Run release
cd /Volumes/WD-1TB/mac-apps/zonebar
./scripts/release-macos-local.sh 0.1.0
```

The script automatically:
1. Finds your Developer ID signing identity
2. Builds the Tauri app with code signing
3. Creates a DMG
4. Notarizes it with Apple
5. Staple the notarization ticket
6. Copies final DMG to `~/Downloads/ZoneBar_v{VERSION}_notarized.dmg`

---

## Troubleshooting

### "No identity found" during build

- Verify the .p12 was imported with private key
- Run: `security find-identity -v -p codesigning | grep "Developer ID Application"`
- If only Apple Development shows, the .p12 has no private key - regenerate using new CSR

### Notarization fails with "Invalid"

- Check the app is properly signed with Developer ID (not Apple Development)
- Run: `codesign -dv /path/to/YourApp.app`
- Verify `TeamIdentifier` shows your team ID (e.g., `9F22X55D38`)

### App-specific password not working

- Generate a fresh one at https://appleid.apple.com → Sign-In and Security → App-Specific Passwords
- The password format is `xxxx-xxxx-xxxx-xxxx`

### Forgot .p12 password

- Cannot recover - must regenerate certificate with new CSR

---

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| Private Key | ~/Downloads/zonebar-devid.key | For creating .p12 |
| CSR | ~/Downloads/zonebar-devid.csr | Upload to Apple |
| Certificate | ~/Downloads/developerID_application.cer | Downloaded from Apple |
| .p12 | ~/Downloads/zonebar-devid.p12 | Keychain import |
| Notarized DMG | ~/Downloads/ZoneBar_0.1.0_notarized.dmg | Final distribution |

---

## Notes

- This is for **Developer ID** distribution (direct download, not App Store)
- For App Store, different provisioning and signing is required
- Certificate expires - regenerate annually
- Keep private key backed up securely