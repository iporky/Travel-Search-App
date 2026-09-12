# Google Play — Closed Testing Checklist

Status of the current build, and everything needed to get it onto a closed
testing track. Verified against the repo on 2026-07-28.

Legend: **[CODE]** = I can do it · **[YOU]** = only you can do it (credentials,
Console, content decisions)

---

## Already compliant — no action needed

| Item | Status |
|---|---|
| Target API level | `targetSdk 36`, `minSdk 24` — Play requires 35+ ✅ |
| 64-bit support | arm64-v8a included ✅ |
| AAB build works | `./gradlew bundleRelease` produces a valid bundle ✅ |
| Kids/family policy | Not targeting children — standard flow ✅ |

---

## Phase 0 — Blockers to fix before building

### 0.1 Release signing **[YOU + CODE]** — HARD BLOCKER
Play rejected the last upload: *"signed in debug mode"*. Gradle is already wired
to read an upload key; you just need to create one. See `docs/RELEASE.md`.

```bash
keytool -genkeypair -v -keystore ~/konnect-upload.keystore \
  -alias konnect-upload -keyalg RSA -keysize 2048 -validity 10000
```
Then add the four `KONNECT_UPLOAD_*` properties to `~/.gradle/gradle.properties`.

> **Back up the keystore.** Lose it and you can never update this listing again.

### 0.2 App icon is missing **[CODE]** — HARD BLOCKER
`app.json` points `icon` and `android.adaptiveIcon.foregroundImage` at
`./assets/onboarding/avatar_container.webp` — **that file does not exist.**
The APK only has launcher icons because `android/` was prebuilt earlier and the
generated `mipmap-*` files are stale leftovers. Any `expo prebuild` will break.

You need to supply a square PNG (1024×1024, no transparency, no rounded corners)
and I'll wire it into `app.json` + regenerate the launcher icons.

### 0.3 App display name **[CODE]**
Currently `konnect-app` — that is what appears under the launcher icon. Should
almost certainly be `Konnect`. (I changed this earlier and reverted it on your
instruction; say the word and it goes back.)

### 0.4 Package name **[DONE — code side]** / **[YOU — Firebase]**
Renamed to **`com.konnect.app`** (was `com.chauhanshivang4.konnectapp`):
`build.gradle` namespace + applicationId, the Kotlin package dir and both
package declarations, and `app.json` (android.package + ios.bundleIdentifier).

**The build fails until Firebase catches up** — `processReleaseGoogleServices`
errors with *"No matching client found for package name 'com.konnect.app'"*.
Add a new Android app for `com.konnect.app` under Firebase project
`konnectbackend`, then drop the new `google-services.json` into **both** the repo
root and `android/app/` (Gradle reads the latter; they are separate files).

Facebook also needs the new package name + `com.konnect.app.MainActivity` class
name. iOS was intentionally left half-done — see `KONNECT-PACKAGE-RENAME.md`.

Permanent once published to Play.

### 0.5 Permissions Play will question **[CODE]**
`SYSTEM_ALERT_WINDOW` (draw over other apps) is in the **main** manifest but
unused — it invites review scrutiny. `READ_EXTERNAL_STORAGE` /
`WRITE_EXTERNAL_STORAGE` are legacy leftovers superseded by `READ_MEDIA_IMAGES`.
Recommend removing all three.

`CAMERA`, `RECORD_AUDIO`, `READ_MEDIA_IMAGES` are legitimately used and must be
justified in the Data Safety form (below).

### 0.6 Content is mock data **[YOU — product decision]**
`USE_MOCKS = true`. Every Buzz feature (Ask / Moments / Tips / Drops / Vibes)
shows invented posts from invented users with placeholder photos. Auth points at
`staging.konnect.kr` (all API hosts derive from one `API_HOST` in `src/config/index.ts`).

Acceptable for **closed testing with your own team**. Not acceptable for open
testing or production.

---

## Phase 1 — Register the signing key with your auth providers **[YOU]**

**If you skip this, Google and Facebook sign-in will fail in the uploaded build**
even though they work on your phone today. This is the single most common
"it worked locally" failure.

```bash
keytool -list -v -keystore ~/konnect-upload.keystore -alias konnect-upload
```

Copy **SHA-1** and **SHA-256** into:
1. Firebase → project `konnectbackend` → Project settings → Android app →
   *Add fingerprint* → then **re-download `google-services.json`** into the repo root.
2. Facebook → developers.facebook.com → app `2266334640859593` → Settings →
   Basic → Android → *Key hashes* (base64-encoded SHA-1).

**Also**: if you enable Play App Signing (recommended, and default for new apps),
Play re-signs with *its own* key. After your first upload, go to
Play Console → Test and release → Setup → App signing, copy the
**app signing certificate** SHA-1/SHA-256, and add those to Firebase and
Facebook too. Otherwise sign-in works for your local build but breaks for
testers who install from Play.

---

## Phase 2 — Build the AAB **[CODE]**

```bash
cd android && ./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

Verify before uploading — this is what caught the last rejection:
```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab
```
`Owner: CN=Android Debug` means the key wasn't picked up. You want your own CN.

**Bump `versionCode` for every upload.** Play permanently rejects a `versionCode`
it has already accepted. Currently `1` — fine for the first upload only.
Both `android/app/build.gradle` (`versionCode`/`versionName`) and `app.json`
(`expo.version`) should move together.

---

## Phase 3 — Play Console app setup **[YOU]**

1. Play Console → **Create app**
   - App name (30 chars max), default language, **App** (not Game), **Free**
   - Accept the developer program declarations
2. Complete **Dashboard → Set up your app**, all items below.

### Required declarations

| Form | What to answer for Konnect |
|---|---|
| **App access** | ⚠️ **Critical.** The app is sign-in-gated. You must provide reviewers working test credentials, or they cannot see past the sign-in screen and will reject it. Give a Google account they can use, with any steps needed. |
| **Ads** | No ads (unless you add them) |
| **Content rating** | Fill the questionnaire. User-generated content + social features → expect Teen/PEGI 12ish. Be honest about UGC or the rating gets revoked. |
| **Target audience** | 18+ (or 13+). Do **not** include under-13 or you trigger Families policy. |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | See below — the big one |
| **Government apps** | No |
| **Financial features** | No |
| **Health** | No |

### Data safety form — what to declare
Based on what the code actually does:
- **Personal info → Name, Email address** — collected (Firebase Auth, profile).
  Purpose: Account management, App functionality.
- **Photos** — collected (profile photo, Drops/Moments uploads via
  `expo-image-picker`). Purpose: App functionality.
- **Audio** — `RECORD_AUDIO` for voice search. If audio is only processed
  on-device by the speech recognizer and never transmitted, declare it as
  **not collected** but be certain before you claim that.
- **App activity / search history** — search queries go to `staging.konnect.kr` (or whatever `API_HOST` is set to).
- **Device identifiers** — `device_id` is sent to your auth backend.
- Encryption in transit: **Yes** (all endpoints are HTTPS).
- Deletion: you must state whether users can request deletion, and Play now
  expects an in-app or web route for account deletion. **You currently have no
  delete-account flow** — you'll need one, or a documented web request path.

### Privacy policy **[YOU]** — mandatory
A public URL is required (you collect personal data and use camera/mic/photos).
It must cover what you collect, why, third parties (Firebase, Facebook), and how
users delete their data. `SignIn.tsx` currently renders **placeholder** Terms and
Privacy text — that needs replacing with the real policy too.

---

## Phase 4 — Store listing assets **[YOU]**

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, 32-bit, **no** transparency |
| Feature graphic | 1024×500 PNG/JPG, no transparency |
| Phone screenshots | 2–8 images, 16:9 or 9:16, min 320px, max 3840px |
| Short description | ≤ 80 chars |
| Full description | ≤ 4000 chars |

Screenshots must show the actual app. Since the feeds are mock data, either use
real-looking content or hold off on a public listing.

---

## Phase 5 — Closed testing track **[YOU]**

1. Play Console → **Test and release → Testing → Closed testing** → *Create track*
2. Upload the AAB, add release notes
3. **Testers**: create an email list, or use a Google Group. Testers must opt in
   via the join URL Play gives you before they can install.
4. Roll out

### ⚠️ The 12-testers / 14-days rule
If your developer account is a **personal** account created after
**13 Nov 2023**, Google requires:
- **12 testers opted in continuously for 14 days** on a closed track
- before you can apply for production access

Organisation accounts are exempt. Check which type yours is early — this rule
sets your timeline, and testers must stay opted in for the full 14 days (people
dropping out resets progress).

---

## Recommended order

1. **[YOU]** Decide package name (irreversible) — 0.4
2. **[YOU]** Supply a 1024×1024 icon — 0.2
3. **[CODE]** I fix icon wiring, app name, permissions — 0.2/0.3/0.5
4. **[YOU]** Create keystore + gradle.properties — 0.1
5. **[YOU]** Register SHA-1/256 in Firebase + Facebook — Phase 1
6. **[CODE]** Build + verify signed AAB — Phase 2
7. **[YOU]** Console setup, forms, privacy policy, listing — Phases 3–4
8. **[YOU]** Upload to closed track, recruit 12 testers — Phase 5
9. **[YOU]** After first upload: add Play's app-signing SHA to Firebase/Facebook
