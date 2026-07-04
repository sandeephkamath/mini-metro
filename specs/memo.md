# Future Considerations

Running list of things not yet decided or implemented. Not a spec — just a backlog to work through and turn into real spec entries (`specs/`) once decided.

---

## Styling / Visual Polish

- Only one visual theme exists (Metro). Decide if alternate themes (e.g. water pipes, blood vessels, airline routes) are worth building on top of `core/logic.md`.
- No animations for station spawn, passenger boarding/alighting, or train arrival — everything pops in/out instantly.
- No sound effects or music (noted in metro.md divergences).
- Canvas is a fixed 800×600 — no responsive scaling for different window/screen sizes.
- Overflow warning is a pulsing red ring — consider whether near-capacity states need earlier/gentler visual cues (e.g. color ramp before red).
- No dark mode.

## Scoring

- Current scoring is flat: +1 per delivered passenger, no multipliers or bonus scoring.
- No distinction between a short trip and a long multi-transfer delivery — consider whether harder deliveries should score more.
- No combo/streak mechanic.
- No persistent high score — every session starts from zero and nothing is saved (noted in metro.md divergences).

## Levels / Maps

- Single fixed map only. Original Mini Metro has multiple cities with different layouts and constraints (rivers, tunnels).
- No difficulty selection or map selection at start screen.
- No way to unlock new maps via progression.
- Consider whether "week" progression should eventually gate into distinct levels rather than one continuously scaling session.

## Analytics

- No analytics or telemetry at all currently. Open questions before adding any:
  - What events matter — session start/end, game over cause, score, session length, delivery events reached?
  - Where would events go (local only vs. a backend)?
  - Does this need to respect any privacy/consent requirement given no accounts exist today?

## Mobile / Responsive

- No touch input support — game only handles mouse events (`useMouseInput.ts`).
- Per project platform strategy, do not build native — only revisit if web/touch input proves insufficient.

## Persistence

- No save/resume — closing the tab loses all progress.
- No high score storage (local storage would be the simplest first step).

## Onboarding / UX

- Start screen has instructions, but no interactive tutorial for first-time players.
- No pause functionality outside of debug mode's speed controls.
- No confirmation before restart from the game over screen.

## Known Gaps Already Tracked

See `specs/themes/metro.md` §8 "Known Divergences from Original Mini Metro" for the baseline list (delivery choice, line deletion, mobile support, sound, high scores, etc.) — cross-check before duplicating work here.
