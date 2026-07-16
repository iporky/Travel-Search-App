# Konnect App — Claude Instructions

## Project Overview
React Native / Expo app (~54) targeting Android (arm64-v8a) and iOS. Korea travel companion for foreigners. Firebase auth (Google + Apple). All backend calls are mocked (`USE_MOCKS = true` in `src/config/index.ts`).

## After Every Code Change — Build, Copy to release/, Install

**After any successful code change, always: (1) build a new release APK, (2) copy it into the `release/` folder, and (3) install it on the connected phone.**

### 1. Build
```bash
cd android && ./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### 2. Copy the APK into the release/ folder
Always keep a copy of the newest successful build in the project-root `release/` folder,
named with the version from `app.json` (`expo.version`) plus a stable `konnect-latest.apk`:
```bash
cd ..   # back to project root
VER=$(node -e "console.log(require('./app.json').expo.version)")
cp android/app/build/outputs/apk/release/app-release.apk "release/konnect-v${VER}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "release/konnect-latest.apk"
```
- `release/konnect-latest.apk` — always the most recent successful build (overwrite each time).
- `release/konnect-v<version>.apk` — versioned snapshot; bump `expo.version` in `app.json` for a new one.

### 3. Verify device is connected
```bash
adb devices
```
The physical phone device ID is `63191XEBF8XBB2` (arm64-v8a).  
The emulator is `emulator-5554` (x86_64) — installing the release APK there is fine only if the
build is universal; prefer the physical phone.

### 4. Install on phone
```bash
adb -s 63191XEBF8XBB2 install -r release/konnect-latest.apk
```

### Notes
- The `release/` build is a **universal APK** (arm64-v8a + armeabi-v7a + x86), so it installs on the phone.
- The legacy `apk-release.apk` at the project root is x86_64 (emulator-only) — never install it on the physical phone.
- If the phone is disconnected, prompt the user to reconnect via USB with USB Debugging enabled.
- Build takes ~3–5 minutes. Run it in the background.

## Project Structure

```
konnect-app/
├── src/
│   ├── api/          # fetch wrapper + mock layer
│   ├── assets/       # asset manifests + preload (onboardingAssets.ts, preload.ts, index.ts)
│   ├── components/   # shared UI components
│   ├── config/       # API_BASE_URL, USE_MOCKS, STORAGE_KEYS
│   ├── context/      # AuthContext, LanguageContext
│   ├── hooks/        # useVoiceRecognition
│   ├── i18n/         # en + ko translations
│   ├── mocks/        # local mock data
│   ├── screens/
│   │   ├── auth/         # SignIn.tsx
│   │   ├── onboarding/   # OnboardingFlow, QuestionScreen, ProfileSetupScreen, SplashWelcome1-4
│   │   ├── HomeScreen, BuzzScreen, HistoryScreen, ProfileScreen, OnboardingScreen
│   ├── theme/        # design tokens (colors, spacing, typography)
│   ├── types/        # shared TS interfaces (user, community, onboarding)
│   └── utils/        # assetSource.ts + generic helpers
├── assets/
│   ├── auth/         # google.png, apple.png, facebook.png
│   ├── cities/       # name_seoul4x.png etc.
│   ├── icons/        # app icons
│   ├── mascot/       # bird variants + sprites
│   ├── navigation/   # tab bar SVGs
│   ├── onboarding/   # bg slides, logo, avatar
│   ├── services/     # icon-bus/food/map/passport/plane/emergency
│   └── voice/        # mic SVGs + voice-bird
├── android/          # ejected Android native project
├── ios/              # iOS native project
└── CLAUDE.md         # this file
```

## Key Conventions
- Design tokens: import from `src/theme/tokens.ts` — never hardcode colors or spacing.
- Config/flags: import from `src/config/index.ts`.
- Types: add shared interfaces to `src/types/`, not inline.
- Asset requires: update `src/assets/preload.ts` when adding new static images.
- i18n: all user-facing strings go through `i18next` (en/ko in `src/i18n/locales/`).
