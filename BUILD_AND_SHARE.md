# Konnect App — Build & Share Guide (expo.dev)

---

## Phase 1 — Finish & Test Locally

### 1. Install dependencies
```powershell
cd "C:\Users\user\Downloads\konnect-app"
npm install
```

### 2. Run locally with Expo Go
```powershell
npx expo start
```
Scan the QR code with **Expo Go** (iOS/Android) to verify the app works end-to-end before building.

---

## Phase 2 — Set Up expo.dev Account & Project

### 3. Create an Expo account
Sign up at [expo.dev/signup](https://expo.dev/signup) — the free tier is sufficient.

### 4. Log in via CLI
```powershell
npx expo login
```

### 5. Link your project to expo.dev
```powershell
npx expo init --id
```
> Your `app.json` already has `"slug": "konnect-app"`, so it will auto-link to:
> `expo.dev/accounts/<your-username>/projects/konnect-app`

---

## Phase 3 — Build with EAS (Expo Application Services)

### 6. Install EAS CLI
```powershell
npm install -g eas-cli
eas login
```

### 7. Initialize EAS in the project
```powershell
eas build:configure
```
This creates `eas.json` with `development`, `preview`, and `production` profiles.

### 8. Build a shareable preview (no app store needed)
```powershell
# Android APK — fastest to share with testers
eas build --platform android --profile preview

# iOS — requires Apple Developer account (or use Expo Go instead)
eas build --platform ios --profile preview
```
> Builds run in Expo's cloud — no Xcode or Android Studio required.

---

## Phase 4 — Share with Testers via Link

### 9. Get the shareable install link
Once the build finishes, visit:
```
https://expo.dev/accounts/<your-username>/projects/konnect-app/builds
```
Each build has a **QR code + install link**. Copy and send it directly to your testers.

### 10. Push instant JS updates (optional — no new build needed)
For UI or logic changes that don't require a new binary:
```powershell
npx expo install expo-updates
eas update --branch preview --message "First preview"
```
Testers with the installed app will receive updates automatically.

---

## Quick Reference

```
npm install
  → npx expo start          (local test)
  → eas build:configure
  → eas build --platform android --profile preview
  → share build link from expo.dev dashboard
```

**Tip:** For iOS testers without an Apple Developer account, share via **Expo Go** using the `npx expo start` QR code instead of a binary build.
