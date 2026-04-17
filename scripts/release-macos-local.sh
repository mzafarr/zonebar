#!/bin/bash
set -e

# ZoneBar Local Release Script
# Usage: APPLE_ID=your@email.com APPLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx ./scripts/release-macos-local.sh [version]
# Example: APPLE_ID=zafarr.pk@icloud.com APPLE_APP_PASSWORD=fsgz-umls-gkuk-wjxs ./scripts/release-macos-local.sh 0.1.0

VERSION="${1:-0.1.0}"
TEAM_ID="9F22X55D38"

# Get Developer ID signing identity (SHA1 hash)
# Output format: "  2) BD2CDE2CC4371E257CF7D30F7AD340C4D745F132 "Developer ID Application: ..."
IDENTITY_LINE=$(security find-identity -v -p codesigning | grep "Developer ID Application")
SIGNING_IDENTITY=$(echo "$IDENTITY_LINE" | grep -oE '[A-F0-9]{40}' | head -1)

if [ -z "$SIGNING_IDENTITY" ]; then
    echo "ERROR: No Developer ID signing identity found in keychain"
    echo "Run: security import ~/Downloads/zonebar-devid.p12 -k ~/Library/Keychains/login.keychain-db -P YOUR_PASSWORD -T /usr/bin/codesign"
    exit 1
fi

echo "=== Building ZoneBar v${VERSION} ==="
echo "Signing Identity: $SIGNING_IDENTITY"

# 1. Build frontend + Tauri (signed DMG)
echo "[1/5] Building Tauri app..."
export APPLE_SIGNING_IDENTITY="$SIGNING_IDENTITY"
export APPLE_TEAM_ID="$TEAM_ID"
npm ci
npm run tauri build -- --bundles dmg

# 2. Find the built DMG
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" | head -1)
if [ -z "$DMG_PATH" ]; then
    echo "ERROR: No DMG found at src-tauri/target/release/bundle/dmg"
    exit 1
fi
echo "[2/5] Built DMG: $DMG_PATH"

# 3. Notarize the DMG
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_PASSWORD" ]; then
    echo "[3/5] Notarizing DMG..."
    xcrun notarytool submit "$DMG_PATH" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --team-id "$TEAM_ID" \
        --wait

    echo "[4/5] Stapling ticket..."
    xcrun stapler staple "$DMG_PATH"
    xcrun stapler validate "$DMG_PATH"
    echo "Notarization complete!"
else
    echo "[3/5] Skipping notarization (APPLE_ID or APPLE_APP_PASSWORD not set)"
fi

# 5. Copy to Downloads
FINAL_DMG=~/Downloads/ZoneBar_v${VERSION}_notarized.dmg
cp "$DMG_PATH" "$FINAL_DMG"

# 6. Final output
echo ""
echo "=== Release Complete ==="
echo "Final DMG: $FINAL_DMG"
echo ""
ls -lh "$FINAL_DMG"