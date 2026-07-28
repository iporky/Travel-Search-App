# Release / Play Store build

## One-time: create the upload keystore

Play rejects debug-signed uploads ("signed in debug mode"), so release builds
need a real upload key. Generate it **once**, outside the repo:

```bash
keytool -genkeypair -v \
  -keystore ~/konnect-upload.keystore \
  -alias konnect-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

> **Back this file up somewhere safe.** If it's lost, the app can never be
> updated under the same Play listing again (short of Play's key-reset process).
> Never commit it — `*.keystore` is gitignored.

## One-time: point Gradle at it

Add to `~/.gradle/gradle.properties` (your user home — **not** the repo):

```properties
KONNECT_UPLOAD_STORE_FILE=/absolute/path/to/konnect-upload.keystore
KONNECT_UPLOAD_STORE_PASSWORD=<store password>
KONNECT_UPLOAD_KEY_ALIAS=konnect-upload
KONNECT_UPLOAD_KEY_PASSWORD=<key password>
```

CI can supply the same names as environment variables instead.

When these are absent, release builds fall back to the debug key so local
installs keep working — but that artifact is not uploadable.

## One-time: register the key's fingerprints

Google and Facebook sign-in validate the signing certificate. A new upload key
means new fingerprints, and **sign-in will fail in the uploaded build** until
they're registered — even though it works on a locally-installed build.

```bash
keytool -list -v -keystore ~/konnect-upload.keystore -alias konnect-upload
```

Copy the SHA-1 and SHA-256 into:

- **Firebase** → project `konnectbackend` → Project settings → your Android app →
  *Add fingerprint*. Then re-download `google-services.json` into the repo root.
- **Facebook** → developers.facebook.com → app `2266334640859593` → Settings →
  Basic → Android → *Key hashes* (base64 of the SHA-1).

If you enable **Play App Signing**, Play re-signs with its own key. Add the
*app signing certificate* fingerprint Play shows you after the first upload to
both places as well, or sign-in breaks for store installs.

## Build

```bash
cd android
./gradlew bundleRelease      # AAB for Play  -> app/build/outputs/bundle/release/app-release.aab
./gradlew assembleRelease    # APK for sideloading -> app/build/outputs/apk/release/app-release.apk
```

Verify what actually signed the artifact before uploading:

```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab
```

`Owner: CN=Android Debug` means the upload key wasn't picked up — recheck
`~/.gradle/gradle.properties`.

## Versioning

Bump both before each upload; Play rejects a `versionCode` it has already seen:

- `versionCode` / `versionName` in `android/app/build.gradle`
- `expo.version` in `app.json` (keep in sync with `versionName`)
