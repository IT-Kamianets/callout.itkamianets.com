# Verification and next release gates

## Executed in this environment

- Offline `npm ci`: clean install from the pinned lockfile succeeded.
- `npm test`: domain and integration tests for language direction, dictionary validation, aliases, choice grading, timeouts and clocks, immersion distribution, adaptive demotion/promotion, SM-2 spacing, typed production, multi-call ordering, round rule sets, save/restore through the repository contract, statistics and achievements.
- `npm run build`: strict TypeScript check and production Vite build.
- `npm run test:built`: checks the built HTML's resource links, map/icon/manifest/docs, and executes the service worker in an isolated test context to validate precaching and offline navigation/resource responses. This is an automated offline-handler test, not a real browser airplane-mode test.

The repository integration tests use a test persistence adapter. They do not establish that an actual browser IndexedDB installation works or survives OS termination.

## Blocked manual checks

Attempting the browser tool returned `The browser access host is unavailable`. Attempting `npm start -- --port 5173` returned `listen EPERM: operation not permitted 127.0.0.1:5173`. No browser or localhost-port permission workaround was attempted. npm registry DNS also failed; cached build dependencies were used instead. Consequently there is no claim of executed Playwright, visual, actual audio, installed PWA or native-platform tests.

## Browser release checklist

1. Run `npm run check`, then `npm start`. Complete onboarding in UA→EN, restart, and confirm settings survive. Repeat EN→UA in a fresh browser profile.
2. Search English, Russian and an alias; filter A/B/Mid; hide names; pan/zoom/reset using mouse, touch and keyboard. Verify map positions with an experienced Mirage player against in-game layout. Inspect 390px, 768px and desktop layouts.
3. Finish each practice mode. Verify timed failure, keyboard choices, typed aliases, flashcard reveal, hint flags, three-call order and empty mistake review.
4. Finish A-site hold in Training, Normal and Competitive modes, and typed Reverse Communication. Open reports, retry, next scenario and mistake review.
5. Leave mid-session and resume from Dashboard; start a second session, then resume the earlier one from Statistics. Crash-close after submitted answers and confirm only the unanswered question restarts.
6. Verify local English/Ukrainian voices at two rates and volumes, subtitles, replay and automatic text fallback when no voice exists. Confirm fallback does not create audio evidence. Reverse Voice is typed production; pronunciation is not assessed.
7. Export progress, validate a reload, import the backup, update a dictionary with retained IDs, reject invalid/missing-reference JSON, export again, and delete test progress with confirmation.
8. `npm run build && npm run preview`; visit once online, reload after service worker activation, disable networking, refresh and complete training. Confirm no font/CDN/network dependency. Install via the browser where supported. Verify OS speech packs work offline separately.
9. Test quota/blocked storage and corrupted JSON. Confirm error display and raw recovery export instead of automatic data deletion.

## Concrete continuation order

- Run real browser/Playwright end-to-end coverage and cross-device QA above; correct visual, input, audio and IndexedDB issues before declaring the MVP release-ready.
- Obtain gameplay review of the schematic and add more independently sourced Mirage subpositions with unambiguous bilingual labels.
- Add native Tauri 2 and Capacitor projects and platform storage/TTS adapters; run signed or unsigned test builds on their actual target toolchains.
- Expand one map at a time with documented bilingual sources, original/licensed artwork, and Nuke layer selection tests.

## Recorded Ryan audio update

The locally installed Piper model generated 230 English clips. Every clip was probed and fully decoded with FFmpeg; the second generation run skipped all 230 unchanged files. The current check set includes 43 Node domain/service/integration tests, 3 production/offline tests and 3 separately executed Python generator/FFmpeg tests. The production offline test also retrieves a cached OGG and checks its OggS header. See `recorded-audio.md` for the complete recipe and commands. Media service tests use a controlled HTMLAudio adapter and do not claim physical speaker playback. No Ukrainian Piper model is present.

## Current empty-pack checkpoint

Owner requested deletion of every generated recording. The generator/source/build manifests now contain zero entries; no voice files remain in those directories. A new empty-pack fallback regression test passes. `npm run check` passes 44 Node tests, TypeScript/production build and 3 build/offline checks. Recorded playback tests use in-memory metadata and fake media adapters, not recreated audio files. Do not regenerate without a new user request.
