# کشیک‌یار روی Android و iOS

این پروژه یک سورس مشترک دارد. نسخه وب/PWA و پوسته‌های Android و iOS همگی از همان `app.js` و `solver.js` استفاده می‌کنند.

## سریع‌ترین راه: نصب PWA
1. فایل‌های این پروژه را روی GitHub بگذار.
2. در GitHub: Settings → Pages → Source را روی GitHub Actions قرار بده.
3. Workflow با نام `Deploy PWA to GitHub Pages` را اجرا کن یا یک Commit روی main انجام بده.
4. آدرس Pages را روی گوشی باز کن.

### Android
با Chrome باز کن و `Install app` / `Add to Home screen` را بزن. در خود برنامه هم بخش «نصب روی گوشی» در تنظیمات راهنمایی می‌کند.

### iPhone / iPad
با Safari باز کن → Share → Add to Home Screen.

## ساخت APK با GitHub Actions
بعد از Upload فایل‌های موبایل، به تب Actions برو → Android APK → Run workflow. بعد از پایان Build، Artifact با نام `KeshikYar-Android-debug` را دانلود کن. این APK برای تست است و برای انتشار Play Store باید Release signing انجام شود.

## ساخت Android روی کامپیوتر توسعه‌دهنده
نیازها: Node.js 22، Android Studio و Android SDK.

```bash
npm install
npm run mobile:prepare
npx cap add android
npx cap open android
```

بعد در Android Studio پروژه را Run یا Build کن.

## iOS
ساخت Native iOS به macOS و Xcode نیاز دارد. برای تست ساخت بدون امضا، Workflow `iOS Simulator Build` قرار داده شده است.

برای نصب روی iPhone واقعی یا انتشار TestFlight/App Store باید Apple Developer Account و Code Signing داشته باشی. روی Mac:

```bash
npm install
npm run mobile:prepare
npx cap add ios
npx cap open ios
```

سپس Signing را در Xcode تنظیم کن.

## شناسه برنامه
`com.miladkhan1379.keshikyar`

## نکته حریم داده
کشیک‌چینی و تحلیل همچنان در خود دستگاه انجام می‌شود. دریافت آنلاین تعطیلات تنها قابلیت اختیاری وابسته به اینترنت است.
