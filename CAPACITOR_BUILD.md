# Capacitor Build Instructions

This document explains how to build the Android APK using Capacitor.

## Problem Fixed

The Capacitor CLI was failing with:
```
[error] Could not find the web assets directory: ./.next/static/pages.
```

This happened because:
1. Next.js server builds (with API routes) don't output to a static directory
2. The `capacitor.config.json` was pointing to `.next/static/pages` which doesn't exist

## Solution

The project now uses a **hybrid approach**:
- **Development/Server**: Use `npm run build` for normal Next.js server build (includes API routes)
- **Mobile App**: Use `npm run build:capacitor` for static export (excludes API routes)
- **API Connection**: Mobile app connects to remote API server via `NEXT_PUBLIC_API_BASE_URL`

## Building for Capacitor/Android

### Prerequisites
- Node.js 22+ (required by Capacitor CLI 8.0.1)
- Android SDK and Gradle (for building APK)

### Build Steps

1. **Build static export for Capacitor:**
   ```bash
   npm run build:capacitor
   ```
   This will:
   - Temporarily move API routes out of the app directory
   - Use `next.config.capacitor.ts` for static export
   - Generate static files in `out/` directory
   - Restore API routes and original config

2. **Sync with Capacitor:**
   ```bash
   npm run android:sync
   ```
   This copies the web assets from `out/` to the Android project.

3. **Build Android APK:**
   ```bash
   # Debug build (for testing)
   cd android && ./gradlew assembleDebug && cd ..
   
   # Release build (for production)
   cd android && ./gradlew assembleRelease && cd ..
   ```

### Quick Build (All-in-One)

```bash
# Build debug APK
npm run build:android

# Build release APK
npm run build:android:release
```

## Configuration Files

### `capacitor.config.json`
- `webDir`: Set to `"out"` (Next.js static export directory)

### `next.config.capacitor.ts`
- Temporary config used only for Capacitor builds
- Enables `output: 'export'` for static site generation
- Sets `images.unoptimized: true` (required for static export)

### `next.config.ts`
- Default config for development and server deployment
- Keeps API routes functional
- Used by `npm run dev` and `npm run build`

## API Routes

The mobile app connects to API routes deployed on a separate server. Configure the API endpoint:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com
```

The API routes in `app/api/` should be deployed separately:
- Deploy to Vercel/Netlify/your server using `npm run build`
- Mobile app will connect to this server

## Troubleshooting

### "Could not find the web assets directory"
- Make sure you run `npm run build:capacitor` before `npm run android:sync`
- Verify `out/index.html` exists after build

### Node.js version error
- Capacitor CLI 8.0.1 requires Node.js 22+
- Install via: https://nodejs.org/

### Build fails with API route errors
- The build script should automatically handle API routes
- If issues persist, manually move `app/api` temporarily before building

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Normal Next.js build (with API routes) |
| `npm run build:capacitor` | Build static export for Capacitor |
| `npm run android:sync` | Sync web assets to Android project |
| `npm run build:android` | Build debug APK (includes build:capacitor) |
| `npm run build:android:release` | Build release APK |
| `npm run android:open` | Open Android project in Android Studio |

## Files Modified

1. **capacitor.config.json**: Changed `webDir` from `.next/static/pages` to `out`
2. **next.config.capacitor.ts**: New config for Capacitor builds
3. **build-capacitor-new.sh**: New build script for Capacitor
4. **package.json**: Updated scripts for Capacitor builds
5. **.gitignore**: Added temporary build files
6. **app/layout.tsx**: Temporarily disabled Google Fonts (network issue in build env)
