# PWA & Android APK Setup Guide

## 🌐 Progressive Web App (PWA) Setup

The application is now configured as a full PWA with:

### Features Enabled:
- ✅ Installable on all devices (Android, iOS, Desktop)
- ✅ Offline-first architecture with service worker
- ✅ Background sync for pending documents
- ✅ Push notifications support
- ✅ App shortcuts for quick actions
- ✅ Dark mode support with persistent theme

### Installation:

#### Android:
1. Open the app in Chrome/Firefox
2. Tap menu (⋮) → "Install app" or look for the install prompt
3. App will be installed to home screen

#### iOS:
1. Open the app in Safari
2. Tap share button (↑)
3. Select "Add to Home Screen"
4. App will be installed to home screen

#### Desktop:
1. Open the app in Chrome/Edge
2. Click install icon in address bar
3. App will open in app mode

---

## 📱 Android APK Generation

### Prerequisites:

```bash
# Install Java Development Kit (JDK 17 or later)
# Download from: https://www.oracle.com/java/technologies/downloads/

# Install Android SDK
# Download Android Studio from: https://developer.android.com/studio

# Set JAVA_HOME and ANDROID_SDK_ROOT environment variables
export JAVA_HOME=/path/to/jdk
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH
```

### Build Steps:

#### 1. Create a Release Build:
```bash
# Build Next.js for production
bun run build

# Export static site
bun run export  # or: next export
```

#### 2. Initialize Capacitor (One-time setup):
```bash
# Install Capacitor CLI globally
bun add @capacitor/cli @capacitor/core @capacitor/android -g

# Initialize Capacitor in the project
bunx cap init

# Add Android platform
bunx cap add android

# Copy built assets to Capacitor
bunx cap copy

# Build Android project
cd android
./gradlew build
cd ..
```

#### 3. Generate APK:

**Debug APK (for testing):**
```bash
cd android
./gradlew assembleDebug
cd ..

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK (for production):**

First, create a keystore (one-time):
```bash
keytool -genkey -v -keystore docudigitize-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias docudigitize-key
```

Then update `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        keyAlias = 'docudigitize-key'
        keyPassword = env.KEYSTORE_PASSWORD
        storeFile = file('docudigitize-release.keystore')
        storePassword = env.KEYSTORE_PASSWORD
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.release
    }
}
```

Build release APK:
```bash
cd android
export KEYSTORE_PASSWORD=your_keystore_password
./gradlew assembleRelease
cd ..

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

#### 4. Install on Device:

**Via ADB (Android Debug Bridge):**
```bash
# Connect device via USB with USB debugging enabled
adb devices  # Verify device is connected

# Install debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Install release APK
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Manually:**
- Transfer APK file to Android device
- Open file manager and tap the APK
- Follow installation prompts

---

## 🔧 APK Configuration

### Update Manifest (android/app/src/main/AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Icon & Splash Configuration:
Replace Android app icons:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

---

## 📊 Testing Checklist:

- [ ] PWA installs successfully on Android
- [ ] PWA works offline
- [ ] Camera/image upload functions work
- [ ] Data syncs when online
- [ ] Dark mode persists
- [ ] App shortcuts work
- [ ] Theme colors apply correctly
- [ ] APK installs without errors
- [ ] All features work in APK

---

## 🚀 Distribution:

### Google Play Store:
1. Create Google Play Developer Account ($25 one-time fee)
2. Create new app in Play Console
3. Upload signed APK (release version)
4. Add app description, screenshots, privacy policy
5. Submit for review

### Direct Distribution:
- Share APK file directly
- Users must enable "Unknown sources" in settings
- Consider using a distribution platform like Firebase App Distribution

---

## 🔒 Security Tips:

- [ ] Use HTTPS for API endpoints in production
- [ ] Keep keystore password secure
- [ ] Never commit keystore to version control
- [ ] Use environment variables for sensitive data
- [ ] Enable code obfuscation (R8/ProGuard)
- [ ] Regularly update dependencies

---

## 📝 Environment Setup (.env for APK build):

```env
# App Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com/api
NEXT_PUBLIC_APP_NAME=DocuDigitize Pro

# Android Configuration
ANDROID_SDK_ROOT=$HOME/Android/Sdk
JAVA_HOME=/path/to/jdk
KEYSTORE_PASSWORD=your_secure_password
KEYSTORE_ALIAS=docudigitize-key
```

---

## 🐛 Troubleshooting:

**Issue: "Cannot find android" after `cap add android`**
```bash
# Set ANDROID_SDK_ROOT
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
bunx cap add android
```

**Issue: Gradle build fails**
```bash
cd android
./gradlew clean
./gradlew build
cd ..
```

**Issue: Capacitor command not found**
```bash
# Use bunx to run Capacitor CLI
bunx cap --version
bunx cap sync
```

---

## 📚 Useful Commands:

```bash
# Check build configuration
bunx cap status

# Update Capacitor plugins
bunx cap update

# Open Android Studio IDE
bunx cap open android

# Sync web assets with Capacitor
bunx cap copy

# Get Capacitor version
bunx cap --version
```

---

For more information:
- [Capacitor Documentation](https://capacitorjs.com)
- [Next.js PWA Guide](https://nextjs.org/docs)
- [Android Development](https://developer.android.com)
