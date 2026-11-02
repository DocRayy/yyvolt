# YYVOLT V2 SPEC

This file extends AGENTS.md. Where the two conflict, THIS file wins.
Work one V2 phase at a time (see the phase table below). Never rewrite working v1 code
unless a phase says so. Prefer small targeted edits and adapters.

## V2 goals
1. Wider tracks that never visually merge, with an automatic validator.
2. The car can never leave the track (invisible walls).
3. Mobile controls: real pedal shapes, no overlapping buttons, an F1 steering wheel.
4. A Settings screen (control scheme, sensitivity, audio, quality, vibration).
5. Three new real-world-inspired circuits: Monaco, Silverstone (UK), Baku (Azerbaijan),
   as full environments, plus the Bedroom as the default environment.
6. Three car classes (F3, F2, F1) and 8 selectable colors. F1 + yellow is the default.

General rules for all V2 work:
- Same visual rules as AGENTS.md (palette, solid panels, banned list, copy rules).
  Car colors are the only place where extra colors are allowed.
- Every new screen is responsive and works on touch (see docs/spec/mobile.md).
- No real logos, trademarks, team liveries, sponsor names, or copied map data. Circuits are
  stylized and "inspired by" the real ones.
- No console errors. Dispose geometries, materials, and textures when switching
  environment or car. No memory growth after switching 10 times.
- Persist choices in localStorage inside try/catch (settings, car, color, last environment,
  best lap per environment). Use versioned keys, e.g. "yyvolt:v2:settings".


---

## V2 phases (read ONLY the files listed for the phase you are asked to do)
After each phase: run the dev server, run `npm run check:tracks` when tracks changed, fix errors, STOP, summarize.

| Phase | Work | Read |
|---|---|---|
| V2-1 | Track width, TrackValidator, check:tracks script, TrackCollider | docs/v2/V2-1-track.md |
| V2-2a | Pedals, overlap-free touch layout, `?debug=layout` | docs/v2/V2-2a-pedals.md + docs/spec/mobile.md |
| V2-2b | Steering wheel, alternative schemes, Settings screen | docs/v2/V2-2b-wheel-settings.md |
| V2-3 | Car classes F3/F2/F1, CarFactory, 8 colors, Garage screen | docs/v2/V2-3-cars.md |
| V2-4 | Environment system, EnvironmentManager, Bedroom adapter, track select | docs/v2/V2-4-environments.md |
| V2-5a | Monaco | docs/v2/V2-5-circuit-rules.md + V2-5a-monaco.md |
| V2-5b | Silverstone | docs/v2/V2-5-circuit-rules.md + V2-5b-silverstone.md |
| V2-5c | Baku | docs/v2/V2-5-circuit-rules.md + V2-5c-baku.md |
| V2-6 | Regression and polish: mobile pass at all test sizes, performance budget, switching environments and cars 10 times without leaks, README update | none (use this file) |
