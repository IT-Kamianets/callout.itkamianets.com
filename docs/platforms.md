# Platform delivery status

## Web — implemented

Requires Node.js ≥22.18 (Node 24 LTS recommended for CI). Use:

```sh
npm ci
npm run check
npm start
# Production:
npm run build
npm run preview
```

Publish `dist/` to an HTTPS static host; the existing GitHub Pages workflow builds that directory and keeps the repository's existing `CNAME`. Application routes use `#/...`. The custom `404.html` is preserved. PWA metadata and a production offline cache are included. Real installed-PWA testing remains a release gate.

## Windows/Linux — native packaging planned, not built

The current Web code can be reused inside Tauri 2, but this repository does not yet contain a generated and tested native project. Do not describe `dist/` as a Windows executable or a Linux package.

Next implementation steps:

1. Install the supported Rust and OS dependencies from the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).
2. Add the official Tauri 2 CLI and initialize a project with `frontendDist: ../dist`, `devUrl: http://localhost:5173`, frontend build command `npm run build` and development command `npm start`.
3. Add a narrow, local-only capability configuration and application icons. The app needs no process, filesystem-wide or game access.
4. Implement or verify the LocalStorageAdapter and VoiceCalloutService in the target WebView. Add SQLite only if target persistence tests justify it; it is not necessary for the current Web data volume.
5. Run Tauri development/build commands on Windows and Linux separately and exercise crash recovery, offline startup, audio and import/export. Only then document actual artifact paths and signing/release commands.

## Android — native packaging planned, not built

No APK/AAB or Android Studio project is claimed ready. The recommended integration is Capacitor 8 with `webDir: dist`, using the same Web UI and domain engines.

Follow [Capacitor installation](https://capacitorjs.com/docs/getting-started) and [Android setup](https://capacitorjs.com/docs/android). With a working npm connection and Android toolchain, the next implementation task is to install `@capacitor/core`, `@capacitor/cli` and `@capacitor/android`, initialize the native project, build the Web app, add Android, sync assets, and open Android Studio. Native files, Gradle configuration, app icons, platform TTS and persistence recovery must then be tested on a real device before any APK build can be called supported.

Use JSON export to transfer personal progress between origins/platforms. There is no implicit cloud synchronization. Never add game overlays, game-process access or match voice-chat integration to any wrapper.
