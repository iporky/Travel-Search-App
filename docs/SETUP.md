# Konnect App — Local Development Setup

Step-by-step environment setup for the Konnect mobile app (React Native 0.81 /
Expo SDK 54, ejected native projects in `android/` and `ios/`). Follow the
section for your OS, then the **Common project setup** and **Run the app**
sections, which are the same on both.

What you're setting up:

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20 LTS or 22 LTS | Metro bundler, Expo CLI, all JS tooling |
| JDK | 17 | Android Gradle builds |
| Android Studio + SDK | latest stable (SDK 35+) | Android emulator, platform SDK, adb |
| Gradle | 8.14 (wrapper — installs itself) | Android builds; never install manually |
| Xcode + CocoaPods | latest stable | iOS builds — **Mac only** |
| Git | any recent | clone the repo |

> iOS development is only possible on a Mac. On Windows you develop and test
> the Android app.

---

## macOS setup

### 1. Install Homebrew (if you don't have it)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Node.js (LTS) and watchman

```bash
brew install node@22 watchman
```

Check: `node -v` should print v22.x (v20.x also fine).

### 3. JDK 17

```bash
brew install --cask zulu@17
```

Add to `~/.zshrc`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Check: `java -version` prints 17.x.

### 4. Android Studio + SDK

1. Download Android Studio from <https://developer.android.com/studio> and install it.
2. Open it → **More Actions → SDK Manager** and install:
   - **SDK Platforms**: Android 15 (API 35) — or whatever `compileSdk` Expo 54 targets.
   - **SDK Tools**: Android SDK Build-Tools, Android SDK Platform-Tools (this is `adb`), Android Emulator, and **NDK (Side by side)** if prompted during the first build.
3. Add to `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

Check: `adb --version` works in a new terminal.

### 5. (iOS) Xcode + CocoaPods

1. Install Xcode from the App Store, open it once, accept the license, and let it install the iOS platform.
2. `xcode-select --install` (command-line tools).
3. CocoaPods:

```bash
brew install cocoapods
```

---

## Windows setup

### 1. Node.js (LTS)

Install Node 22 LTS from <https://nodejs.org> (or via winget):

```bash
winget install OpenJS.NodeJS.LTS
```

Check in a new terminal: `node -v` → v22.x (v20.x also fine).

### 2. JDK 17

```bash
winget install EclipseAdoptium.Temurin.17.JDK
```

Then set the environment variable (Settings → System → About → Advanced system
settings → Environment Variables):

- `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17.<x>-hotspot`

Check in a new terminal: `java -version` prints 17.x.

### 3. Android Studio + SDK

1. Download Android Studio from <https://developer.android.com/studio> and install it.
2. Open it → **More Actions → SDK Manager** and install:
   - **SDK Platforms**: Android 15 (API 35).
   - **SDK Tools**: Android SDK Build-Tools, Android SDK Platform-Tools (this is `adb`), Android Emulator, and **NDK (Side by side)** if prompted during the first build.
3. Environment variables:
   - `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`
   - Append to `Path`: `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator`

Check in a new terminal: `adb --version` works.

### 4. Git + a POSIX-ish shell

```bash
winget install Git.Git
```

Git Bash (bundled with Git for Windows) is handy: the build snippets in
`CLAUDE.md` and this repo's docs use POSIX syntax (`&&`, `$( )`). PowerShell
works too if you adapt them.

---

## Common project setup (both OSes)

### 1. Clone and install JS dependencies

```bash
git clone <repo-url> konnect-app
cd konnect-app
npm install
```

> npm is the package manager of record here (`package-lock.json` is committed).
> Don't mix in yarn/pnpm.

### 2. Firebase / auth config

Google + Facebook sign-in run through Firebase and need per-app config files:

- **Android**: `google-services.json` at the repo root (already committed for
  the dev Firebase project). The Android build copies it automatically.
- **iOS**: `GoogleService-Info.plist` at the repo root (also committed).

For **Google Sign-In to work on your own debug builds**, your machine's
signing certificate must be registered in the Firebase console:

```bash
cd android && ./gradlew signingReport
```

Copy the debug keystore's **SHA-1** and **SHA-256** and add them to the
Firebase project (Project settings → Your apps → Android app → Add
fingerprint). Without this, Google sign-in returns no `idToken`.

### 3. Backend endpoints

All API hosts derive from `API_HOST` in `src/config/index.ts` (default `staging.konnect.kr`; override per build with `EXPO_PUBLIC_API_HOST`, see `.env.example` — run `cd android && ./gradlew clean` after changing it, the bundle task does not track `.env`).
Flags to know:

- `USE_MOCKS` — non-search APIs mocked when `true`.
- `FORCE_ONBOARDING` — replays the onboarding flow on every launch (testing
  only; keep `false` for normal work).

No `.env` files are used; config is checked in.

### 4. TypeScript check (optional but recommended before commits)

```bash
npx tsc --noEmit
```

---

## Run the app

### Android — device (recommended)

1. On the phone: Settings → About phone → tap **Build number** 7× → back →
   **Developer options** → enable **USB debugging**. Plug in via USB and
   accept the trust prompt.
2. Check it's visible:

```bash
adb devices
```

3. Debug build with Metro (fast refresh):

```bash
npm run android
```

   This runs `expo run:android`: Gradle-builds the debug APK, installs it, and
   starts Metro. Subsequent JS-only edits hot-reload; native/dependency
   changes need the command re-run.

### Android — emulator

Create a device in Android Studio (**Device Manager → Create device**, e.g.
Pixel 8, API 35 image), start it, then `npm run android` as above. Note the
release APK below is universal (arm64-v8a + armeabi-v7a + x86) and installs on
emulators too, but prefer a physical phone for anything involving the
camera/mic/auth.

### Android — release build

The project convention (see `CLAUDE.md`) is: build → copy into `release/` →
install on the device:

```bash
cd android && ./gradlew assembleRelease
cd ..
VER=$(node -e "console.log(require('./app.json').expo.version)")
cp android/app/build/outputs/apk/release/app-release.apk "release/konnect-v${VER}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "release/konnect-latest.apk"
adb install -r release/konnect-latest.apk
```

Play Store bundle: `cd android && ./gradlew bundleRelease` →
`android/app/build/outputs/bundle/release/app-release.aab`.
Never commit `.apk`/`.aab` files (gitignored repo-wide).

First Gradle build downloads Gradle 8.14 + dependencies — expect several
minutes; later builds take ~30 s.

### iOS (Mac only)

```bash
cd ios && pod install && cd ..
npm run ios
```

Opens the simulator. For a physical iPhone you need an Apple developer team
selected in Xcode (`ios/*.xcworkspace` → Signing & Capabilities).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `adb: device not found` | Reconnect USB, confirm USB debugging, `adb kill-server && adb devices` |
| Gradle fails with a JDK error | `JAVA_HOME` must point at JDK **17**, not 8/11/21 |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=<your ANDROID_HOME path>` (use `\\` on Windows) |
| Google sign-in returns no `idToken` | Debug SHA-1/SHA-256 not registered in Firebase (see above) |
| A freshly added bundled PNG renders blank in release | Known project gotcha — load it by Android resource name; see the Assets section of `CLAUDE.md` |
| Metro cache weirdness after branch switches | `npx expo start -c` |
| Build stalls downloading NDK | Install "NDK (Side by side)" from SDK Manager and re-run |

## Related docs

- `CLAUDE.md` — project conventions, asset rules, build/install loop.
- `docs/RELEASE.md`, `docs/PLAY_CLOSED_TESTING.md` — release/distribution.
- `BUILD_AND_SHARE.md` — sharing builds.
