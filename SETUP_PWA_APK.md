# PWA & Android APK Setup - Complete Guide ✅

## 🎯 What's Been Set Up

### ✅ Progressive Web App (PWA)
- **Service Worker**: Registered and optimized for offline usage
- **Manifest**: Updated with full PWA configuration
- **Icons**: Multi-sized icons with maskable support
- **Shortcuts**: Quick actions (New Document, Search)
- **Metadata**: Complete PWA metadata in layout
- **Offline Support**: Network-first strategy with cache fallback

### ✅ Android APK Support
- **Capacitor Configuration**: Ready for mobile build
- **Build Scripts**: Added convenient npm scripts
- **Permissions**: Pre-configured for camera and storage

---

## 🚀 Quick Start

### 1. Test PWA Locally

```bash
# Start development server
bun run dev

# Open in browser: http://localhost:3000
# Chrome: Click install icon (top-right)
# Firefox: Click install icon (address bar)
```

### 2. Build for Production

```bash
# Build PWA
bun run build:pwa

# Verify build succeeded (✓ Compiled successfully)
```

---

## 📱 Generate Android APK

### Prerequisites
```bash
# 1. Install Java JDK 17+ (required)
# Download: https://www.oracle.com/java/technologies/downloads/

# 2. Install Android SDK (required)
# Option A: Download Android Studio
# https://developer.android.com/studio

# Option B: Command-line tools only
# https://developer.android.com/tools/sdkmanager

# 3. Set environment variables
export JAVA_HOME=/path/to/jdk17
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH
```

### Setup Capacitor (First Time Only)

```bash
# Initialize Capacitor
bunx cap init

# Follow prompts:
# - App name: DocuDigitize Pro
# - App ID: com.docudigitize.app
# - Directory: ./ (current directory)

# Add Android platform
bunx cap add android

# Sync web assets
bun run android:sync
```

### Build APK

**Debug APK (for testing on device):**
```bash
bun run build:android:debug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK (for distribution):**
```bash
# One-time: Create keystore
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# Build release APK
bun run build:android:release

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Install on Android Device

```bash
# Via ADB (if connected)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or: Transfer APK file manually and tap to install
```

---

## 📋 File Structure

```
new-next-app/
├── public/
│   ├── sw.js                    # Service worker
│   ├── icon-192x192.png         # App icon (needs to be added)
│   ├── icon-512x512.png         # Large icon (needs to be added)
│   └── manifest.json            # PWA manifest
│
├── app/
│   └── layout.tsx               # PWA metadata + SW registration
│
├── capacitor.config.json        # Capacitor configuration
├── manifest.json                # PWA manifest
├── PWA_APK_SETUP.md             # Detailed setup guide
└── android/                     # Generated Android project (after init)
```

---

## 🎨 Icon Setup

You need to provide proper icons for PWA and Android app.

### Create Icons Using Online Tools:
- https://pwa-asset-generator.netlify.app/ (Recommended)
- https://app-manifest.firebaseapp.com/
- https://www.favicon-generator.org/

### Required Sizes:
```
public/
├── icon-96x96.png          # For shortcuts
├── icon-192x192.png        # PWA home screen
├── icon-192x192-maskable.png
├── icon-512x512.png        # PWA splash screen
├── icon-512x512-maskable.png
├── screenshot-540x720.png  # Mobile portrait
└── screenshot-1280x720.png # Desktop landscape
```

### For Android:
```
android/app/src/main/res/
├── mipmap-hdpi/ic_launcher.png
├── mipmap-mdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
└── mipmap-xxxhdpi/ic_launcher.png
```

---

## 🔧 Available Commands

```bash
# PWA Commands
bun run build:pwa              # Build PWA
bun run export                 # Export static site

# Android Commands
bun run build:android          # Full build (prep + release)
bun run build:android:prepare  # Prepare and clean
bun run build:android:debug    # Debug APK
bun run build:android:release  # Release APK
bun run android:open           # Open Android Studio
bun run android:sync           # Sync assets to Android
bun run android:run            # Run on connected device
```

---

## 🧪 Testing Checklist

### PWA Testing:
- [ ] App installs via browser install prompt
- [ ] App works offline
- [ ] Service worker registered (check DevTools > Application > Service Workers)
- [ ] Cache storage populated (check DevTools > Application > Cache Storage)
- [ ] Theme persists across sessions
- [ ] Shortcuts appear in app drawer

### Android APK Testing:
- [ ] APK installs without errors
- [ ] App launches successfully
- [ ] Camera functionality works
- [ ] Image upload works
- [ ] Offline data storage works
- [ ] Sync works when online
- [ ] Dark mode works
- [ ] App shortcuts work

---

## ⚙️ Configuration Files

### capacitor.config.json
- App ID: `com.docudigitize.app`
- Web directory: `out` (for static export)
- Plugins: Camera enabled

### manifest.json
- Standalone display mode
- Theme color: `#c80000` (red)
- Background color: `#ffffff` (white)
- Shortcuts for quick actions
- Maskable icons for adaptive display

### public/sw.js
- Network-first strategy for pages
- Offline fallback with cached content
- API routes always use network
- Background sync support
- Push notification support

---

## 🔒 Security Considerations

### Before Production:

```bash
# 1. Generate secure keystore for signing
keytool -genkey -v -keystore app-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias app-key

# 2. Use environment variables for secrets
export KEYSTORE_PASSWORD=your_secure_password
export KEYSTORE_ALIAS=app-key

# 3. Enable code obfuscation in gradle
# android/app/build.gradle:
# minifyEnabled true
# shrinkResources true
```

### HTTPS Requirements:
- PWA requires HTTPS in production
- Update `NEXT_PUBLIC_API_BASE_URL` to HTTPS endpoint
- Service worker won't register over HTTP

---

## 📦 Distribution

### Google Play Store:
1. Create Google Play account ($25 one-time)
2. Upload signed APK (release version)
3. Add app listing, screenshots, privacy policy
4. Submit for review (3-24 hours)

### Direct Installation:
1. Share APK file via email/cloud storage
2. Users enable "Unknown sources" in settings
3. Open APK file and tap install

### Firebase App Distribution:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Configure Firebase project
firebase init

# Distribute APK
firebase appdistribution:distribute app-release.apk \
  --release-notes "Version 1.0" \
  --testers "tester@example.com"
```

---

## 🐛 Troubleshooting

### Service Worker Won't Register:
```javascript
// Check browser console for errors
// Ensure sw.js is in public/ directory
// Verify HTTPS in production
```

### APK Build Fails:
```bash
# Clear gradle cache
cd android && ./gradlew clean

# Update gradle wrapper
cd android && ./gradlew wrapper --gradle-version=8.1.0

# Check Java version
java -version
```

### Capacitor Sync Issues:
```bash
# Re-sync assets
bunx cap sync android

# Check capacitor config
bunx cap status
```

---

## 📚 Resources

- [Next.js PWA Documentation](https://nextjs.org/docs)
- [Capacitor Getting Started](https://capacitorjs.com/docs/getting-started)
- [Android Development](https://developer.android.com/docs)
- [Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## ✨ Next Steps

1. **Add Icons**: Create and place PWA icons in `public/`
2. **Test Locally**: Run `bun run dev` and test PWA installation
3. **Setup Capacitor**: Run `bunx cap init` to initialize Android support
4. **Generate Debug APK**: Test on Android device
5. **Create Release APK**: Sign and prepare for distribution

---

**Version**: 1.0  
**Last Updated**: January 17, 2026  
**App**: DocuDigitize Pro
