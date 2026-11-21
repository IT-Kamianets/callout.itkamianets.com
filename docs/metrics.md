# Learning metrics

Callout's metrics are training estimates, never a prediction of match performance.

## Communication Readiness (per map)

`round(100 × (0.25M + 0.15CA + 0.15X + 0.15L + 0.10V + 0.10R + 0.10S))`

All terms are bounded to [0, 1]. Unknown evidence contributes zero.

- **M**: fraction of verified positions mastered.
- **C**: fraction with at least two correct answers; **A**: independent measured accuracy.
- **X**: alias accuracy × `min(1, alias answers / 10)`.
- **L**: actual local-audio accuracy × `min(1, audio answers / 10)`.
- **V**: `max(0, 1 − mean reaction milliseconds / 12000) × A × min(1, measured answers / 20)`.
- **R**: round decision accuracy × `min(1, round answers / 8)`.
- **S**: mean across positions of `min(1, interval days / 15)`.

Flashcard self-assessment and explicitly aided answers are excluded from measured statistics. Showing a hint or transcript marks an answer aided. Subtitles make an audio answer aided. Unsupported or muted audio is a text exercise and contributes no audio evidence. History reports keep all answers, including aided answers and flashcards. Timeout decisions are errors; the displayed mean reaction excludes timeouts. Speed evidence is multiplied by accuracy so failed timeouts do not improve readiness.

## Spaced repetition

The scheduler uses an SM-2 variant. Initial ease is 2.5; minimum ease 1.3. A correct answer under 3.5 seconds gets quality 5; slower success quality 4; an error quality 1. Ease adjustment is `0.1 − (5−q) × (0.08 + (5−q) × 0.02)`, clamped to [1.3, 10]. It changes on scheduled independent reviews and errors, rather than repeated same-day success.

Successful due reviews schedule 1 day, 6 days, then `round(previous interval × ease)`. Earlier successful reviews do not advance the interval. A mistake resets repetitions and schedules a retry after 5 minutes. Aided and self-assessed success does not advance scheduled repetitions. A position is mastered only after at least three successful scheduled reviews, ≥80% recorded accuracy, independent results in at least two exercise types, and an interval of at least six days. This prevents one correct click or same-session repetition from claiming mastery.

## Adaptive immersion

Ten-task sessions schedule exactly 2 / 5 / 8 / 10 foreign-language prompts, shuffled without replacing the proportion with a decorative probability. Four-event rounds round to the closest possible count (1 / 2 / 3 / 4). The ratio concerns the language of the incoming call. Reverse and typed-production modes explicitly practice the target language. A user-selected audio language overrides the adaptive mix in audio modes.

Before ten independent answers, the self-assessed starting level is provisional. After that, the latest 40 independent answers determine the level:

- Below 65% accuracy, or slower than 10 seconds on average: Beginner (20%).
- Otherwise: Adaptation (50%).
- ≥85%, faster than 5.5 seconds, ≥25% positions mastered, at least 5 actual audio answers at ≥75%: Advanced (80%).
- ≥92%, faster than 3 seconds, ≥65% mastered, at least 10 audio answers at ≥85%: Match Ready (100%).

Manual difficulty overrides automatic progression. Match Ready recognition uses map identification instead of translation choices. Advanced tasks use short deadlines and fewer hints. Contextual messages and aliases are enabled in later levels and voice/round modes. No number of repetitions alone unlocks Match Ready.

## Reaction measurement

The monotonic training clock begins after initial TTS finishes, or with the visible text fallback. Replaying a call does not reset it. Going to another tab pauses the current exercise; returning requires Continue and restarts only the unanswered question. Every submitted answer is committed before feedback appears. After a crash, the last committed answer survives and the next unanswered question resumes.
