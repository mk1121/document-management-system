# Deployment Guide - DocuDigitize Pro

## 📋 Current Status

✅ **PWA Setup Complete**
- Service worker configured for offline-first
- Manifest with full PWA metadata
- Mobile viewport optimization
- Dark mode support with persistence

✅ **Android APK Ready**
- Capacitor configuration prepared
- Build scripts added to package.json
- Permissions configured
- Ready for Capacitor initialization

✅ **Build Passing**
- Next.js compilation: ✓ Successful
- ESLint warnings minimal (non-blocking)
- Production build optimized

---

## 🚀 Deployment Strategies

### Strategy 1: Web-Only (Easiest)
```bash
# Deploy to Vercel
vercel deploy

# Or: Deploy to any Node.js hosting
bun run build
bun run start
```

### Strategy 2: PWA with Progressive Enhancement
```bash
# Deploy web version with PWA
# Users can install from browser
# Automatically works offline

# No additional setup needed
# PWA installs through browser UI
```

### Strategy 3: Android App (Full Native)
```bash
# 1. Setup Capacitor (one-time)
bunx cap init
bunx cap add android

# 2. Generate debug APK
bun run build:android:debug

# 3. Test on device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 4. Generate release APK
bun run build:android:release

# 5. Upload to Play Store
# Submit to Google Play Console
```

### Strategy 4: Hybrid (Recommended)
```bash
# Deploy PWA to web
# + Allow APK download for offline-first users
# + Supports both web and native modes
```

---

## 🌐 Web Deployment

### Vercel (Recommended for Next.js)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Follow prompts
# Vercel auto-detects Next.js
# Builds and deploys automatically
```

### Netlify
```bash
# Export static site
bun run export

# Deploy 'out' directory
# Drag and drop to Netlify dashboard
# Or use Netlify CLI
```

### Docker + Any Cloud
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

---

## 📱 Android Distribution

### Google Play Store (Recommended)

**Preparation:**
1. Create Google Play Developer Account ($25)
2. Create keystore for signing:
```bash
keytool -genkey -v -keystore app.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias app-key
```

3. Build release APK:
```bash
bun run build:android:release
```

4. Sign APK:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore app.jks \
  android/app/build/outputs/apk/release/app-release.apk app-key
```

5. Optimize with zipalign:
```bash
zipalign -v 4 app-release.apk app-release-aligned.apk
```

**Upload to Play Store:**
1. Go to Google Play Console
2. Create new app
3. Upload signed APK
4. Fill in app details:
   - Description
   - Screenshots (4-5 recommended)
   - Privacy policy
   - Content rating
5. Submit for review

**Review Timeline:** 3-24 hours typically

### Firebase App Distribution (Internal Testing)
```bash
# Share APK with team for testing
firebase appdistribution:distribute \
  android/app/build/outputs/apk/release/app-release.apk \
  --release-notes "v1.0 Beta" \
  --testers "team@example.com"
```

### Direct APK Distribution
- Share APK via email or cloud storage
- Users enable "Unknown sources"
- Tap APK to install
- No Play Store approval needed

---

## 🔧 Configuration for Production

### Environment Variables
```env
# .env.production
NEXT_PUBLIC_API_BASE_URL=https://api.docudigitize.com
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=production
```

### API Configuration
```typescript
// lib/config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.docudigitize.com'\;
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_IMAGE_SIZE = 200 * 1024 * 1024; // 200MB
```

### Security Headers
```javascript
// next.config.ts
headers: [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  },
]
```

---

## ✅ Pre-Deployment Checklist

### Code
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] ESLint issues resolved
- [ ] TypeScript strict mode
- [ ] Environment variables configured
- [ ] API endpoints updated for production

### PWA
- [ ] manifest.json valid
- [ ] Service worker registered
- [ ] Icons in place (all sizes)
- [ ] Offline functionality tested
- [ ] Theme colors correct
- [ ] App name/description updated

### Security
- [ ] HTTPS enabled
- [ ] API uses HTTPS
- [ ] No hardcoded secrets
- [ ] Authentication token secure
- [ ] Data encrypted in transit
- [ ] CORS headers configured

### Performance
- [ ] Build size optimized
- [ ] Images compressed
- [ ] Code splitting working
- [ ] Caching strategy optimal
- [ ] CDN configured
- [ ] Load time < 3 seconds

### Testing
- [ ] PWA installs from browser
- [ ] App works offline
- [ ] Sync works online
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Accessibility checked (WCAG 2.1)

---

## 📊 Monitoring

### Sentry (Error Tracking)
```bash
npm install @sentry/nextjs

# Configure in next.config.ts
withSentryConfig(nextConfig, {
  org: "your-org",
  project: "your-project",
})
```

### Analytics
```javascript
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Performance Monitoring
```javascript
// Measure Core Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

---

## 🔄 Continuous Deployment (CI/CD)

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - run: bun install
      - run: bun run build
      - run: bun run lint
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel deploy --prod
```

---

## 📈 Post-Deployment

### Day 1
- [ ] Test app in production
- [ ] Monitor error logs
- [ ] Check analytics
- [ ] Verify PWA installation
- [ ] Test offline functionality

### Week 1
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Check server logs
- [ ] Update documentation
- [ ] Create release notes

### Month 1
- [ ] Analyze usage patterns
- [ ] Optimize based on feedback
- [ ] Plan next features
- [ ] Security audit
- [ ] Performance optimization

---

## 🚨 Rollback Plan

If issues arise:

```bash
# Revert to previous version
git revert <commit>

# Rebuild and redeploy
bun run build
vercel deploy --prod

# Clear cache
vercel cache clear
```

---

## 📞 Support & Troubleshooting

### Common Issues

**PWA won't install:**
- [ ] Check manifest.json validity
- [ ] Verify service worker loads
- [ ] Ensure HTTPS in production
- [ ] Check browser console errors

**Offline sync not working:**
- [ ] Verify IndexedDB storage
- [ ] Check API connectivity
- [ ] Review service worker fetch logic
- [ ] Check network tab for errors

**APK won't install:**
- [ ] Verify device supports app version
- [ ] Check unknown sources enabled
- [ ] Ensure sufficient storage
- [ ] Try clearing Play Store cache

---

## 📚 Resources

- [Vercel Deployment](https://vercel.com/docs/concepts/deployments/overview)
- [Google Play Console](https://play.google.com/console)
- [Firebase Deployment](https://firebase.google.com/docs/hosting)
- [PWA Deployment](https://web.dev/pwa/#deployment)

---

**Last Updated:** January 17, 2026  
**App Version:** 1.0  
**Environment:** Production-Ready
