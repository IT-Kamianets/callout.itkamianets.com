# Callout agent guide

This is an independent, local-first CS2 communication trainer implemented with strict TypeScript, Vite and DOM UI components. The user authorized a full application after the original static conversion. The product name is Callout. Do not restore Angular or introduce game/anti-cheat/process/overlay integrations.

## Structure

- `assets/`: owner-supplied Mirage radar and original icon; do not replace it with an invented layout. Do not download third-party artwork without checking permission.
- `css/`: responsive dark UI.
- `js/core/`: typed models, verified dictionary, provenance, validation and pure learning engines.
- `js/services/`: storage and local-speech abstractions.
- `js/ui/`, `js/main.ts`: UI components and controllers.
- `docs/`: architecture, metrics, sources, verification limits and platform continuation.
- `tests/`: Node TypeScript tests and production/offline-handler checks.
- `public/`: PWA metadata. `dist/` is generated.

## Rules

- Keep learner progress separate from versioned dictionaries. Position IDs are stable.
- Source English position names. Ukrainian primary names are editorial translations requested by the owner; do not claim them as verified community slang or add invented aliases. No Russian UI or training content; the legacy migration alone must recognize the old ru code. No invented expansion data.
- Implement algorithms in core/services, not renderer event handlers.
- Do not credit text fallback as listening, flashcard self-report as measured accuracy, or same-day repetition as retained mastery.
- Save each answer transactionally before showing feedback. Do not overwrite corrupt local data automatically.
- Pre-generated local Ryan OGG is the default English voice; device-local TTS is the fallback. No second automatic speed adjustment of processed recordings; explicit text fallback. No remote voice service or microphone recording without a new user request and explicit privacy controls.
- Escape user/imported text. Validate schema, IDs and references before writes.
- After changes, run `npm run check`. Add meaningful tests for learning/data changes.
- Real browser/native checks remain incomplete in this environment; do not claim them passed without execution. Follow `docs/qa.md`.
- Preserve CNAME unless instructed. Do not publish merely because the build passed.

## Audio library

- Shared phrase catalog: `js/core/audio-catalog.ts`; positions still live only in the existing dictionary.
- `AudioCalloutService`: `js/services/audio.ts`. All modes use `exerciseAudio()` for the same text/ID mapping.
- Generate using the existing `/home/dima/callout-voices/.venv`, Ryan model and FFmpeg; do not reinstall them unnecessarily.
- `npm run voices:generate`, `npm run voices:sync`, `npm run voices:test`. Generator outputs are under `/home/dima/callout-voices/generated`.
- Synchronize only manifest-listed OGG files, never model/WAV/Python/venv assets. Build only the validated active pack and precache it for offline playback.
- English uses Ryan by default, Ukrainian must never be synthesized with an English model. No Ukrainian model is currently installed.
- Cache fingerprints include phrase text, model/config hashes, processing settings and toolchain versions. Keep stable phrase/position IDs.

## Current audio state — owner request

All generated voice files have been intentionally removed from the generator, source assets and production output. Keep `/home/dima/callout-voices`, its venv, models and scripts. Manifests have zero entries. An empty pack must allow startup/build and system-voice/text fallback. Do not regenerate recordings unless the user requests it again. Prior generation counts in historical documentation are not current assets.
