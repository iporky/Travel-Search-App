#!/usr/bin/env bash
# Creates the Play upload keystore and wires Gradle up to use it.
#
#   bash scripts/setup-upload-key.sh
#
# Run this in YOUR terminal (Git Bash). It prompts for a password, which is
# never echoed and never leaves your machine. Afterwards `./gradlew
# assembleRelease` / `bundleRelease` produce properly signed artifacts instead of
# debug-signed ones.
#
# Everything it writes lives OUTSIDE the repo:
#   ~/konnect-upload.keystore   the key itself
#   ~/.gradle/gradle.properties the credentials Gradle reads
set -euo pipefail

KEYSTORE="${KONNECT_KEYSTORE_PATH:-$HOME/konnect-upload.keystore}"
ALIAS="${KONNECT_KEY_ALIAS:-konnect-upload}"
GRADLE_DIR="$HOME/.gradle"
GRADLE_PROPS="$GRADLE_DIR/gradle.properties"

KEYTOOL="keytool"
command -v keytool >/dev/null 2>&1 || KEYTOOL="${JAVA_HOME:-}/bin/keytool"
command -v "$KEYTOOL" >/dev/null 2>&1 || {
  echo "ERROR: keytool not found. Set JAVA_HOME (Android Studio ships one at" >&2
  echo "       'C:/Program Files/Android/Android Studio/jbr')." >&2
  exit 1
}

echo "=============================================="
echo " Konnect — Play upload key setup"
echo "=============================================="
echo "keystore : $KEYSTORE"
echo "alias    : $ALIAS"
echo

# Never clobber an existing key — that would orphan any build already signed
# with it, and there is no way to recover the original.
if [ -f "$KEYSTORE" ]; then
  echo "A keystore already exists at that path. Refusing to overwrite it." >&2
  echo "Delete it yourself first if you are certain it is unused, or set" >&2
  echo "KONNECT_KEYSTORE_PATH to a different path." >&2
  exit 1
fi

read -rsp "Choose a keystore password (min 6 chars): " PW1; echo
read -rsp "Confirm password: " PW2; echo
[ "$PW1" = "$PW2" ] || { echo "Passwords do not match." >&2; exit 1; }
[ ${#PW1} -ge 6 ] || { echo "Password must be at least 6 characters." >&2; exit 1; }
echo

# Certificate identity. Play shows none of this to users; it just has to be
# present and stable.
read -rp "Organisation [Konnect]: " ORG;      ORG="${ORG:-Konnect}"
read -rp "City         [Seoul]: "   CITY;     CITY="${CITY:-Seoul}"
read -rp "Country code [KR]: "      COUNTRY;  COUNTRY="${COUNTRY:-KR}"
DNAME="CN=Konnect, OU=Mobile, O=$ORG, L=$CITY, C=$COUNTRY"

echo
echo "Generating 2048-bit RSA key, valid 10000 days (~2053)..."
"$KEYTOOL" -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "$DNAME" \
  -storepass "$PW1" -keypass "$PW1" >/dev/null
echo "Keystore created."
echo

# Gradle runs on a Windows JVM and does NOT understand Git Bash's MSYS paths.
# $HOME here is '/c/Users/you', which Gradle's file() treats as relative and
# resolves against android/app/ — producing
# 'android/app/c/Users/you/konnect-upload.keystore' and a "keystore not found"
# failure. cygpath -m converts to 'C:/Users/you/...', which is both absolute and
# free of backslashes (backslashes are escape characters in .properties files).
if command -v cygpath >/dev/null 2>&1; then
  KEYSTORE_FWD=$(cygpath -m "$KEYSTORE")
else
  KEYSTORE_FWD=$(echo "$KEYSTORE" | sed 's#\\#/#g')
fi

mkdir -p "$GRADLE_DIR"
touch "$GRADLE_PROPS"

if grep -q "^KONNECT_UPLOAD_STORE_FILE=" "$GRADLE_PROPS" 2>/dev/null; then
  echo "NOTE: KONNECT_UPLOAD_* entries already exist in $GRADLE_PROPS."
  echo "      Leaving them alone — check them by hand if the build misbehaves."
else
  cat >> "$GRADLE_PROPS" <<EOF

# Konnect Play upload key — added by scripts/setup-upload-key.sh
KONNECT_UPLOAD_STORE_FILE=$KEYSTORE_FWD
KONNECT_UPLOAD_STORE_PASSWORD=$PW1
KONNECT_UPLOAD_KEY_ALIAS=$ALIAS
KONNECT_UPLOAD_KEY_PASSWORD=$PW1
EOF
  echo "Credentials written to $GRADLE_PROPS"
fi

# Lock the properties file down where the filesystem supports it.
chmod 600 "$GRADLE_PROPS" 2>/dev/null || true

echo
echo "=============================================="
echo " Fingerprints — register these"
echo "=============================================="
"$KEYTOOL" -list -v -alias "$ALIAS" -keystore "$KEYSTORE" -storepass "$PW1" 2>/dev/null \
  | grep -E "^\s+(SHA1|SHA256):" | sed -E 's/^[[:space:]]+/  /'

FB=$("$KEYTOOL" -exportcert -alias "$ALIAS" -keystore "$KEYSTORE" -storepass "$PW1" 2>/dev/null \
  | openssl sha1 -binary | openssl base64)
echo "  Facebook key hash: $FB"

unset PW1 PW2

cat <<'EOF'

==============================================
 Next
==============================================
1. BACK UP the keystore file and its password (password manager + offline copy).
   Lose them and you can never update the Play listing again.
2. Add the SHA-1 and SHA-256 above to Firebase project konnect-9f573,
   app com.konnect.app, then re-download google-services.json.
3. Add the Facebook key hash above to the Facebook app's Android settings.
4. Tell Claude it is done — it will build and verify the signed AAB.

The keystore and ~/.gradle/gradle.properties are outside the repo. Never commit
either one.
EOF
