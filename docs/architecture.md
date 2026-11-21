# Architecture and decisions

## Implementation boundary

Callout is a standalone local-first training application. It never reads CS2 memory, attaches to its process, draws an overlay or connects to match voice chat. There is no account, API backend, telemetry, remote font, third-party runtime script or microphone capture.

The requested recommended React toolchain was not available in the environment: npm DNS failed and React was not cached. The implemented frontend uses strict TypeScript, Vite and accessible DOM components. Vite 8.3.3 and TypeScript 6.0.3 were installed reproducibly from the existing offline npm cache with a pruned lockfile. No Angular dependencies remain. Pure services and typed domain entities do not depend on the renderer. Replacing the renderer with React is possible, but is not required to run the current product.

## Modules

- `js/core/model.ts`: settings, language, maps/layers, positions, translations, aliases, sources, progress, sessions/answers, scenarios/events and achievements.
- `js/core/dictionary.ts`: MapDataService, PositionDictionaryService, sourced English names and editorial Ukrainian translations and authored scenarios.
- `js/core/engines.ts`: LearningEngine, LanguageImmersionEngine, SpacedRepetitionEngine, ListeningTrainingEngine, RoundSimulationEngine, ProgressTrackingService, CommunicationReadinessCalculator, StatisticsService and earned achievements.
- `js/core/clock.ts`: monotonic timers, independent of wall-clock changes.
- `js/core/validation.ts`: runtime schema and reference validation, including dictionary provenance. Implemented directly without a schema-library dependency.
- `js/services/storage.ts`: LocalStorageAdapter contract, IndexedDBAdapter, explicit browser-storage fallback, validation before persistence.
- `js/core/audio-catalog.ts`: shared generated phrase catalog and audio manifest validation.
- `js/services/audio.ts`: AudioCalloutService, ID-scoped Ryan recordings, bounded preloading, cancellation and explicit system fallback.
- `js/services/voice.ts`: VoiceCalloutService and device-local browser TTS. A platform-native speech adapter can implement the same contract later.
- `js/ui/map.ts`: pointer, touch, wheel and keyboard map controls and escaped markup.
- `js/main.ts`: route rendering, form and exercise controllers. Domain algorithms remain in core modules.

The route lives in the URL hash, so refreshing any app screen works on static hosting without server rewrites. The icon is original SVG artwork; the Mirage radar is the image supplied by the owner, embedded unchanged in a cropped SVG viewport. Typography uses system fonts. The app supports English and Ukrainian interface labels according to the native language setting. Some mode names, achievement names and scenario titles retain their English proper labels.

## Persistence

A versioned snapshot stores settings, progress, review bookmarks and sessions in one IndexedDB readwrite transaction. Only after transaction completion does the UI adopt the new snapshot and show feedback. If IndexedDB cannot open, localStorage is tried; there is no silent volatile-storage success path. A storage or validation failure leaves old data intact and offers recovery export. Import/export uses JSON with a 5 MB import limit. This is a single-user, single-active-tab MVP; cross-tab reconciliation is a later task. Device backups remain the user's export files, not a cloud service.

Dictionary rows use stable IDs (`mirage.window`, etc.). Translations and aliases reference positions and sources separately, and user progress lives outside dictionary data. Updating a dictionary rejects removed IDs used by current progress/history, and never rewrites personal answers. Unknown or unverified targets cannot be generated for training. Addition of a new map requires reviewed bilingual data, layer artwork and UI selection wiring; a metadata card alone is not supported training.

## Offline

The build emits an application-specific, content-versioned service worker. Installation precaches all production resources; a failed install does not publish a partial cache. Activation removes only older Callout caches. No personal IndexedDB data is stored in HTTP caches. English audio uses the synchronized Ryan OGG pack, precached with the application. Ukrainian and missing recordings use installed local voices or explicit text fallback. Native offline TTS adapters remain future extensions. See recorded-audio.md. Offline cache installation itself requires one successful HTTPS/localhost visit. Do not open `index.html` with `file://`.

## Implemented versus release-verified

The Web training implementation includes the Mirage learning loop, adaptive scheduling, listening fallback, authored rounds and statistics. Automated domain/integration tests and production resource/offline-handler checks run locally. Real browser, actual IndexedDB crash recovery, speaker playback, visual/mobile layout and real airplane-mode checks have not been verified in this execution environment: the browser host is unavailable and opening localhost ports returns EPERM. See `qa.md` for the release checklist. Native packages are not implemented or claimed built.
