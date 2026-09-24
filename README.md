# 🕉️ TTD FastFill - Special Entry Darshan Automation Suite

Lightning-fast, resilient autofill bot for the official **Tirumala Tirupati Devasthanams (TTD)** Special Entry Darshan (₹300) booking portal.

Tested and verified directly against live TTD production React forms (`ttdevasthanams.ap.gov.in`).

---

## 📁 Repository Structure

```
TTD BOt/
├── extension/                     # Chrome / Edge / Brave / Kiwi Browser Extension (Manifest V3)
│   ├── manifest.json              # Extension manifest
│   ├── core-filler.js             # High-speed React DOM autofill engine (v2.0)
│   ├── content.js                 # Floating 1-Click HUD overlay & Alt+F listener
│   ├── content.css                # TTD theme HUD styling
│   ├── popup.html                 # Profile management UI (Devotees, Address, Settings)
│   ├── popup.js                   # Popup logic & 1-click mobile bookmarklet exporter
│   ├── popup.css                  # TTD royal purple aesthetic styling
│   └── icons/                     # Extension icons
├── mobile-app/                    # Progressive Web App (PWA) for Android & iPhone
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service Worker for offline caching
│   ├── app.js                     # Mobile app manager & fast-filler
│   ├── app.css                    # Mobile-optimized TTD theme
│   ├── index.html                 # Standalone mobile interface
│   └── icons/                     # High-res mobile icons
├── android/                       # Native Android Studio App Project (SDK 34)
│   ├── build.gradle               # Root Gradle build script
│   ├── settings.gradle            # Settings configuration
│   └── app/
│       ├── build.gradle           # App-level dependencies & SDK config
│       └── src/main/
│           ├── AndroidManifest.xml# App permissions & activity manifest
│           ├── java/org/ttd/fastfill/
│           │   └── MainActivity.java # WebView, @JavascriptInterface & FastFill bridge
│           ├── assets/
│           │   └── core-filler.js # Embedded offline autofill engine
│           └── res/
│               ├── layout/        # activity_main.xml & dialog_devotees.xml
│               ├── values/        # colors.xml, strings.xml, styles.xml
│               └── drawable/      # App icons & launcher graphics
├── bookmarklet/
│   └── generator.html             # Web generator for 1-click Mobile Bookmarklets (No apps needed)
├── userscript/
│   └── ttd-autofill.user.js       # Standalone script for Tampermonkey / Violentmonkey
├── index.html                     # Control Center & Setup Guides
└── README.md
```

---

## 📱 Mobile Phone Setup Options

### Option 1: Native Android App (APK Project)
* Open the `android/` folder in **Android Studio**.
* Build `app-debug.apk` (**Build > Build Bundle(s) / APK(s) > Build APK(s)**) and install on your phone.
* Features a full-screen TTD portal view, dedicated bottom FastFill action bar, and local devotee manager.

### Option 2: Installable Mobile Web App (PWA)
* Open `mobile-app/index.html` in your phone's browser (Chrome or Safari).
* Tap browser options and select **"Add to Home screen"** / **"Install App"**.
* Launches like a real app without browser toolbars, with devotee pool management and persistent FastFill buttons.

### Option 3: 1-Click Mobile Bookmarklet (Zero Installs)
1. Open [`bookmarklet/generator.html`](bookmarklet/generator.html) in your phone or PC browser.
2. Enter your devotee details, set the **"Going / Not Going"** toggles, and enter your address.
3. Tap **Generate & Copy Mobile Bookmarklet**.
4. On your phone:
   - Bookmark any webpage in Chrome or Safari.
   - Go to Bookmarks -> tap **Edit** on that bookmark.
   - Rename it `⚡ TTD FastFill`.
   - Replace the URL with the copied JavaScript code.
5. On booking day:
   - Complete login and slot selection on your phone.
   - When on the Pilgrim Details page, open your bookmarks and tap `⚡ TTD FastFill`.
   - All your selected devotees and address details will fill in **0.2 seconds**!

### Option 4: Kiwi Browser (Android with Extension)
1. Install **Kiwi Browser** from the Google Play Store (supports desktop Chrome extensions on mobile).
2. Open Kiwi, go to `chrome://extensions`, enable Developer Mode, and click **Load unpacked**.
3. Select the `extension/` folder.
4. You will get the floating **1-Click FastFill** widget directly on your phone's screen when on the TTD website!

---

## 💻 Desktop Browser Setup (Chrome, Edge, Brave)

1. Open your browser and go to `chrome://extensions` (or `edge://extensions`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the directory:
   `c:\Users\Gagan K S\Documents\TTD BOt\extension`
5. Pin the **TTD FastFill** icon to your toolbar.
6. Click the icon to enter your devotee names, ages, and Aadhaar numbers.

---

## 🔒 Privacy & Safety Guarantee

* **100% Local Execution:** All devotee details and Aadhaar numbers stay strictly on your device.
* **No External Servers:** No personal data is transmitted across the internet.
* **Safe Against Bot Detection:** Bypasses Akamai bot detection by running directly inside your authenticated browser session.
