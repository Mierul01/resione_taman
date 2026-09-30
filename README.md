# ResiOne

A mobile app for managing a residents' association (*persatuan penduduk taman*) — fee collection, charity funds, community programs, committee contacts, and admin tools, all in one place. Built with Expo/React Native and Firebase.

The app is **multi-tenant**: anyone can register a new "park" (residential community) just by typing its name at sign-up. The first person to register under a park automatically becomes that park's admin — no manual setup or backend configuration needed to onboard a new community.

---

## Install

| Android (APK) | iPhone / iPad (web app) |
|:---:|:---:|
| <img src="docs/qr/android-apk.png" width="200" alt="QR code to download the Android APK"> | <img src="docs/qr/ios-web.png" width="200" alt="QR code to open the ResiOne web app"> |
| [Download `neighbourly.apk`](https://github.com/Mierul01/resione_taman/releases/latest/download/neighbourly.apk) | [resione-taman.quizcarnival.workers.dev](https://resione-taman.quizcarnival.workers.dev) |

Both QR codes are permanent. The Android one always downloads the newest release's APK, and the iPhone one opens the web app, which Cloudflare rebuilds from `master` on every push. On iPhone, open the link in Safari, tap **Share → Add to Home Screen**, and ResiOne opens full screen like an installed app.

---

## Features

### For residents
- **Dashboard** — quick access to programs, fees, charity, committee contacts, and (for committee members) collection reports
- **Fee payments (Yuran)** — self-reported payment ledger with **partial payment support**; pay any amount toward a fee and the app tracks the running balance
- **Charity payments (Khairat)** — contribute to death/disaster/orphan funds, same partial-payment ledger
- **Programs** — browse community events on a calendar, see upcoming activities
- **Committee & emergency contacts** — directory of AJK members with tap-to-call/WhatsApp/SMS, plus fire/police/ambulance numbers
- **Family members** — register dependents under your account; optionally give a dependent their own login so they can view (but not manage) their own payment status
- **Profile** — editable profile with photo upload, password change, and a full activity history

### For committee members / admins
- **Collections & Reports** — real-time totals per fee/charity item, contributor counts, park-wide breakdowns
- **Admin Panel** — manage resident roles (resident / AJK / treasurer / chairman / admin)
- **Bank account settings** — publish the park's official bank details so residents can pay via bank transfer, shown with a QR code
- **Add programs** — create new community events

### App-wide
- **Bilingual** — full UI in Bahasa Melayu or English, switchable anytime in Settings (every screen, every error message)
- **Dark mode** — a real theme system, not just a status-bar tweak
- **In-app update checker** — the Android app checks GitHub for newer releases on launch and prompts an in-app download, so testers don't need to keep re-scanning a QR code for every update

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 57) + React Native 0.86, TypeScript |
| Navigation | React Navigation (native-stack + a custom bottom-tab bar with an overflow "More" sheet) |
| Backend | [Firebase](https://firebase.google.com) — **Authentication** (email/password) for accounts, **Firestore** for all app data |
| State | React Context (no Redux) — one context per domain: auth, payments, theme, language |
| Styling | Hand-rolled theme system (`src/theme/theme.ts`) with light/dark palettes, no UI kit |
| i18n | Custom dot-path translation resolver (`src/i18n/translations.ts`), no external i18n library |

## Why Firebase, and what changed

The app originally stored everything in `AsyncStorage` (i.e., local to a single device/browser — nothing synced). It has since been migrated to a real backend:

- **Firebase Authentication** owns passwords — the app never stores or transmits a plaintext password itself
- **Firestore** holds everything else: `users`, `paymentRecords`, `programs`, `bankAccounts` — see [`firestore.rules`](firestore.rules) for exactly who can read/write what (residents can read the directory but only edit their own profile; payment records are create-only and readable by their owner or their park; programs and bank details are editable only by that park's admin/treasurer/chairman)
- Dark mode and language preference intentionally **stay device-local** — they're not shared account data

## Roles

| Role | Malay label | Capabilities |
|---|---|---|
| `resident` | Penduduk | Pay fees/charity, view programs & committee directory |
| `ajk` | AJK | Resident permissions + appears in the committee directory |
| `treasurer` | Bendahari | AJK permissions + manage bank account details, view collections |
| `chairman` | Pengerusi | Same as treasurer |
| `admin` | Admin | Full control of their park: role management (Admin Panel), everything above |

The **first person to register a given park name becomes that park's admin automatically.** There's also a hardcoded super-admin override (`SUPER_ADMIN_EMAILS` in `src/context/AuthContext.tsx`) for one specific account, useful for a project owner who needs admin access regardless of which park they're testing in.

---

## Project structure

```
App.tsx                      Root providers (theme, language, auth, payments) + navigation shell
src/
  components/                Shared UI: ScreenHeader, AppModal, Button, CustomTabBar, UpdateBanner...
  context/                   AuthContext, PaymentContext, ThemeContext, LanguageContext
  data/                      Static seed data (fee items, charity items, mock programs) + programsStore
  firebase/                  Firebase app/auth/firestore initialization
  i18n/                      translations.ts (en + ms) and the t() resolver
  navigation/                RootNavigator, MainTabNavigator, CustomTabBar, route types
  screens/                   One file per screen
  theme/                     Color palettes, spacing, typography
  utils/                     avatarPicker, checkForUpdate
firestore.rules              Firestore security rules (paste into Firebase Console → Firestore → Rules)
```

---

## Getting started

### Prerequisites
- Node.js + npm
- A Firebase project with **Authentication** (Email/Password provider enabled) and **Firestore** (in production mode) turned on
- For Android builds: Android Studio + JDK 17

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Fill in your project's config in `src/firebase/config.ts` (get it from Firebase Console → Project Settings → General → Your apps → Web app). Then publish the security rules from `firestore.rules` via Firestore → Rules → paste → Publish.

### 3. Run it
```bash
npx expo start --web      # fastest way to preview in a browser
npx expo start            # then scan the QR with Expo Go, or press 'a' for Android
```

### 4. Build a real Android APK
```bash
npx expo prebuild --platform android   # generates the android/ folder (gitignored, regenerated each time)
cd android
./gradlew assembleDebug     # debug build — needs Metro running on your PC
./gradlew assembleRelease   # release build — JS bundled in, works standalone on any device
```

> `android/gradle.properties` is regenerated by `expo prebuild` every time, so a local JDK pin (if your Android Studio's bundled JDK is too new for the pinned Android Gradle Plugin version) needs to be re-added after each prebuild.

---

## Distributing updates

Releases are published as GitHub Releases with the built `neighbourly.apk` attached. The **in-app update banner** checks `github.com/Mierul01/resione_taman/releases/latest`, so once someone has the app installed, publishing a new release is enough — no need to share a new QR code or link each time.

To ship an update:
1. Bump `"version"` in `app.json`
2. Build a new release APK (`gradlew assembleRelease`)
3. Publish a new GitHub Release tagged to match (e.g. `v1.0.1`), with the asset named exactly `neighbourly.apk`

Keeping the asset name the same is what keeps the Android QR code valid forever: it points at `releases/latest/download/neighbourly.apk`, which GitHub always resolves to the newest release.

The iPhone web app is hosted on **Cloudflare Workers** (`resione-taman.quizcarnival.workers.dev`), connected to this repo with build command `npx expo export --platform web` and output directory `dist`. Every push to `master` redeploys it at the same address, so its QR code never changes either.

---

## Known limitations

- Payments are **self-reported** (an honor-system ledger) — there is no real payment gateway integration
- The release APK is currently signed with the project's debug key, which is fine for side-loaded distribution to testers but not acceptable for a Play Store submission (that needs a dedicated release keystore)
- `expo-updates`/EAS is not set up — updates to native code (new packages, `app.json` native config changes) always require a fresh APK install; only the in-app banner + manual download flow is available today
