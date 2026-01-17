# Capacitor Android APK Setup

## Overview
This project is configured for Android app development using Capacitor. The app is a Next.js application with:
- API routes for backend functionality
- Progressive Web App (PWA) capabilities
- Service worker for offline support
- Full dark mode support

## Prerequisites
- Java 11+ (for Android development)
- Android SDK (API 21+)
- Android Studio (optional, for easier development)
- Gradle 8.1+

## Setup Steps

### 1. Install Capacitor (if not already done)
```bash
bun add -D @capacitor/core @capacitor/android @capacitor/camera @capacitor/preferences
bunx @capacitor/cli init "DocuDigitize Pro" "com.docudigitize.app"
```

### 2. Build Next.js Application
```bash
bun run build
```

### 3. For Static Export (Standalone Web App)

If you want a standalone web app without server-side API routes, configure static export:

**Option A: Create a static-only build**

```bash
# Create a separate config for static builds
cp next.config.ts next.config.static.ts
```

Edit `next.config.static.ts`:
```typescript
output: 'export',
trailingSlash: true,
```

Build: `npx next build -c next.config.static.ts`

Then update `capacitor.config.json`:
```json
{
  "webDir": "out"
}
```

### 4. For Server Mode (Recommended)

If keeping API routes, deploy the Next.js server separately and configure Capacitor to connect to it:

```bash
# Keep existing setup
# Make sure capacitor.config.json webDir points to static pages
```

**Option: Build with Node.js adapter for production hosting**
```bash
# Keep default config - builds to .next/standalone
bun run build
```

Deploy `.next/standalone` to your hosting platform.

### 5. Add Android Platform
```bash
bunx @capacitor/cli add android
```

This creates an `android/` directory with Android Studio project.

### 6. Build Android APK

**Debug APK (for testing):**
```bash
# Sync web assets
bunx @capacitor/cli sync android

# Build debug APK
cd android
./gradlew assembleDebug
cd ..
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Release APK (for distribution):**
```bash
# Create a signing key first (one time):
keytool -genkey -v -keystore docudigitize.keystore \
  -keyalg RSA -keysize 2048 -validity 365 \
  -alias docudigitize

# Sync and build
bunx @capacitor/cli sync android

cd android
./gradlew assembleRelease
cd ..
```

APK location: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

Sign it:
```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore docudigitize.keystore \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  docudigitize

# Verify & align
jarsigner -verify android/app/build/outputs/apk/release/app-release-unsigned.apk
zipalign 4 android/app/build/outputs/apk/release/app-release-unsigned.apk \
  app-release-signed.apk
```

### 7. Run on Android Device

```bash
# Connect Android device via USB (enable USB debugging)
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
cd ..

# Or use Android Studio to run directly
```

### 8. Configure API Endpoint

For production, update the API base URL in `.env` or `app/layout.tsx`:

```typescript
// In app/layout.tsx or your config
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://your-server.com:3000'
```

## Build Scripts

Available npm scripts:
- `bun run build` - Next.js production build
- `bun run dev` - Development server
- `bunx @capacitor/cli sync android` - Sync web assets to Android project
- `bunx @capacitor/cli open android` - Open Android Studio

## Offline Support

The app includes a service worker that provides offline functionality:
- Caches pages and static assets
- Network-first strategy for pages
- API routes require network connection
- Local IndexedDB storage for form data

## PWA Features

- Installable on Android (Web App Install Prompt)
- Works offline with cached content
- Push notifications support
- App shortcuts for quick actions

## Troubleshooting

### Common Issues

**APK too large:**
- Enable code splitting
- Optimize images
- Remove unused dependencies

**API connectivity issues:**
- Check CORS headers in API routes
- Verify API_BASE_URL matches your server
- Test with `curl` first

**Camera permission denied:**
- Update `android/app/src/main/AndroidManifest.xml`
- Add camera permissions
- Request runtime permissions in app

**Build fails:**
```bash
# Clean build
cd android
./gradlew clean
cd ..
bun run build
bunx @capacitor/cli sync android
```

## Publishing

### Google Play Store
1. Create release APK (signed)
2. Create Google Play Developer Account
3. Create app listing
4. Upload APK
5. Fill out store listing
6. Submit for review

### Direct Distribution
- Host APK on your server
- Users download and install directly
- Requires "Install from unknown sources" enabled

## Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Development](https://developer.android.com/)
- [Google Play Console](https://play.google.com/console)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
