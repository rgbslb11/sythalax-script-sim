# SYTHALAX Script-Sim v0.5

Single-game college football score-path simulator.
SHADOW. Does not write House.

## Open the app

**Live:** https://rgbslb11.github.io/sythalax-script-sim/

**BOX PAD (iPhone):** https://rgbslb11.github.io/sythalax-script-sim/box.html

If that 404s, turn Pages on once:

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / folder: **/ (root)**
4. Save. Wait one minute. Refresh the URL.

## BOX PAD — Saturday phone box

The 6×2 grid (Q1 Q2 Q3 Q4 OT T) with the T column as a formula.
Tap a cell, tap +7 / +3 / +2 / +1. Slate lives in the phone (localStorage).
Safari → Share → Add to Home Screen. No Excel, no rebuilt grid.

## Local

```
python3 -m http.server 8765
```

Then http://localhost:8765 and http://localhost:8765/box.html

## Clock

- 10:00 quarters = 40:00 game (synthetic world)
- 15:00 quarters = 60:00 game

## Seed

New seed on load, preset, reset, and accept. Do not reuse a seed unless you are reproducing a draw.
