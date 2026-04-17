# Releasing ZoneBar (macOS, Windows, Linux)

This repo now has a single GitHub Actions workflow that builds release artifacts for all major desktop platforms:

- macOS: `.dmg` (signed + notarized when Apple secrets are present)
- Windows: `.msi`
- Linux: `.AppImage` and `.deb`

Workflow file: `.github/workflows/release.yml`

## 1) One-time GitHub secrets setup

Set these in your repository (or org) secrets.

### Preferred secret names (ZoneBar)

- `MACOS_CERTIFICATE` (base64-encoded `.p12` Developer ID Application cert)
- `MACOS_CERTIFICATE_PWD` (password for that `.p12`)
- `APPLE_ID` (Apple ID email)
- `APPLE_TEAM_ID` (10-char Apple Team ID)
- `APPLE_APP_PASSWORD` (Apple app-specific password)

### Reuse SwiftPen credentials

The workflow also supports these fallback names automatically:

- `SWIFTPEN_MACOS_CERTIFICATE`
- `SWIFTPEN_MACOS_CERTIFICATE_PWD`
- `SWIFTPEN_APPLE_ID`
- `SWIFTPEN_APPLE_TEAM_ID`
- `SWIFTPEN_APPLE_APP_PASSWORD`

If ZoneBar secrets are missing, it will use the SwiftPen-prefixed ones.

## 2) Create a release tag

From local:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Then create/publish the GitHub release for that tag, or use your existing release automation.

## 3) Build artifacts and attach to release

When a release is published, the workflow automatically:

1. Builds on macOS, Windows, and Linux (matrix build)
2. Notarizes macOS output if Apple credentials are provided
3. Uploads all generated artifacts to that GitHub release

You can also run it manually via **Actions → Build and Release → Run workflow** and pass a tag.

## 4) Local production build (optional)

```bash
npm ci
npm run tauri build -- --bundles dmg,msi,appimage,deb
```

Outputs are in `src-tauri/target/release/bundle/...`.

## Notes

- This is Developer ID notarization for direct downloads, not Mac App Store submission.
- Mac App Store distribution needs a separate setup (App Sandbox entitlements, App Store Connect flow, MAS signing/provisioning).
