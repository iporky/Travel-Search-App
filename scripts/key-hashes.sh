#!/usr/bin/env bash
# Prints the signing fingerprints you need to register with Firebase and Facebook.
#
#   ./scripts/key-hashes.sh                                  # debug keystore
#   ./scripts/key-hashes.sh ~/konnect-upload.keystore konnect-upload
#
# Firebase wants SHA-1 and SHA-256 (colon-separated hex).
# Facebook wants the "key hash" — base64 of the RAW SHA-1 bytes, NOT the hex.
#
# Run under Git Bash on Windows. Needs keytool (JAVA_HOME/bin) and openssl.
set -euo pipefail

KEYSTORE="${1:-$(dirname "$0")/../android/app/debug.keystore}"
ALIAS="${2:-androiddebugkey}"

if [ ! -f "$KEYSTORE" ]; then
  echo "ERROR: keystore not found: $KEYSTORE" >&2
  exit 1
fi

KEYTOOL="keytool"
command -v keytool >/dev/null 2>&1 || KEYTOOL="$JAVA_HOME/bin/keytool"

# Debug keystore password is the fixed well-known value; anything else prompts.
if [ "$ALIAS" = "androiddebugkey" ]; then
  STOREPASS="android"
else
  read -rsp "Keystore password for '$ALIAS': " STOREPASS
  echo
fi

echo
echo "Keystore : $KEYSTORE"
echo "Alias    : $ALIAS"
echo

"$KEYTOOL" -list -v -alias "$ALIAS" -keystore "$KEYSTORE" -storepass "$STOREPASS" 2>/dev/null \
  | grep -E "^\s+(SHA1|SHA256):" \
  | sed -E 's/^[[:space:]]+/  /'

# openssl base64 of the raw SHA-1 digest — this is what Facebook calls a key hash.
FB=$("$KEYTOOL" -exportcert -alias "$ALIAS" -keystore "$KEYSTORE" -storepass "$STOREPASS" 2>/dev/null \
  | openssl sha1 -binary | openssl base64)
echo "  Facebook key hash: $FB"
echo
