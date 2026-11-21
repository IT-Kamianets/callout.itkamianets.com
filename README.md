# Callout

**Поточний стан аудіо:** за запитом власника всі згенеровані записи видалено. Генератор, модель та інтеграція збережені; аудіотека порожня. Запуск і збірка не генерують записи автоматично. Використовується системний голос або текстовий режим.

A local-first English/Ukrainian CS2 callout trainer. The current Web implementation focuses on a source-reviewed Mirage pack and a shared learning loop, rather than presenting unverified maps as usable content.

## Run

Node.js ≥22.18; Node 24 LTS recommended.

```sh
npm ci
npm start
# Open the URL printed by Vite (normally http://127.0.0.1:5173).
```

```sh
npm test             # domain and repository integration tests
npm run build        # strict TypeScript check, then production output in dist/
npm run test:built   # built-resource and offline service-worker handler tests
npm run check        # all three in order
npm run preview      # serve production output
```

Do not open index.html with `file://`. Development does not install a service worker. Production offline caching requires HTTPS or localhost and one successful first visit. The existing GitHub Pages workflow tests/builds `dist/` and preserves CNAME; no deployment was performed during development.

## Implemented

- English/Ukrainian onboarding, profile, initial level, optional placement test and settings.
- 20 bilingual Mirage positions with source references, scoped names and verified aliases.
- The user-supplied Mirage radar, displayed without aspect distortion with searchable markers, A/B/Mid filtering, EN/UA labels, hidden-name self-check, mouse/touch panning, wheel/buttons/keyboard zoom and position cards.
- Flashcards, multiple choice, reverse translation, map identification, speed training and mistake/bookmark review.
- Adaptive 20/50/80/100% incoming-call language distribution, independent-result-based levels, manual difficulty and SM-2-style due review scheduling.
- Listen & Select, Listen & Locate, ordered three-call exercises, teammate messages and typed reverse production. Prepared Ryan recording integration (audio files currently removed), system-local TTS fallback for Ukrainian/missing clips, separate recording/system speed controls, volume and subtitles. Explicit text fallback. No microphone capture or pronunciation grading.
- Two authored Mirage round scenarios with Training, Normal, Competitive and Reverse Communication rules, timed decisions, results, retry/next-scenario/review actions.
- Per-answer local persistence, resumable sessions, statistics, readiness, hard positions, real history/chart and earned achievements.
- Validated JSON backup/import, dictionary updates retaining stable IDs, progress deletion and storage-error recovery export.
- Production app-cache service worker and PWA manifest.

## Important delivery limits

The implemented stack is TypeScript + Vite with DOM components, rather than React: npm DNS was unavailable and React was not in the local cache. Build dependencies were installed from the offline npm cache; the pinned package-lock is included. Domain logic and storage/audio contracts are independent of the UI.

The automated tests and build were run. Real browser/Playwright, mobile layout, actual local speech/IndexedDB, installed-PWA and native-platform checks were **not** run: the browser host was unavailable and local server binding returned EPERM. This is implemented Web training code, not a claim that all MVP release checks have passed.

Seven other maps are honestly marked planned with no fabricated exercises. Native Windows/Linux Tauri and Android Capacitor packages, SQLite adapters, full map expansion are not implemented. See the concrete continuation plan in [QA](docs/qa.md) and the [platform guide](docs/platforms.md).

## Structure

```text
assets/       Original app icon, owner-supplied Mirage radar and synchronized OGG audio pack
css/          Responsive dark UI
js/core/      Typed entities, dictionary, validation and learning engines
js/services/  Local persistence and offline-device speech abstractions
js/ui/        Map component, markup escaping and icons
js/main.ts    Routes and UI controllers
public/       Manifest and crawler policy
docs/         Architecture, formulas, sources, QA and platform status
tests/        Automated logic, integration and build/offline tests
index.html    Application entry
404.html      Static error page
```

- [Audio generation, synchronization and playback](docs/recorded-audio.md)
- [Architecture](docs/architecture.md)
- [Readiness, immersion and spaced-repetition formulas](docs/metrics.md)
- [Data sources and artwork](docs/sources.md)
- [Executed checks and release checklist](docs/qa.md)
- [Web delivery and native-platform continuation](docs/platforms.md)

All personal learning data stays on the device. No account, telemetry, server backend, game overlay, process access, anti-cheat interaction or real match voice-chat integration is included. Counter-Strike and CS2 belong to Valve; Callout is an independent training tool.

## Generate or refresh the final Ryan voice

```sh
npm run voices:generate  # existing Piper venv + FFmpeg; updates only changed phrases, then syncs
npm run voices:sync      # verify and copy only manifest + OGG; also runs before start/build
npm run voices:test      # Python cache-policy and real FFmpeg processing tests
```

Generator source: `scripts/generate_callouts.py`, also available through `/home/dima/callout-voices/scripts/generate_callouts.py`. Output: `/home/dima/callout-voices/generated`; static copy: `assets/audio/`; production copy: `dist/assets/audio/`. Piper/model/FFmpeg are required only for generation, not to play the checked-in audio pack. The English pack is currently empty at the owner’s request; Ukrainian remains local system-TTS/text fallback because no Ukrainian Piper model is installed. Recordings default to **1× playback**, retaining the already-applied 95% pitch and approximately 120% tempo. No radio/noise/reverb filters are used.
