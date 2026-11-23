# Design review and verification

Started 20 November 2026; final fixes verified 23 November 2026. New project created separately from Search Footprint at the user's request. There was no existing Lost in Transit implementation to audit. The “before” captures are the first working pass built during this session, not a pre-existing product.

## Reference-driven changes implemented

| First-pass issue | Implemented correction |
|---|---|
| Landing infrastructure was below the ground plane; suitcase/tag competed with the heading | Corrected scene placement, enlarged original suitcase, moved and reduced the luggage tag, protected the text column. |
| Abrupt scene change on entry | Retained one canvas; interpolated airport position, suitcase scale and camera zoom into gameplay. |
| Camera zoom was continuously reset | Limited automatic zoom interpolation to mode, viewport and reset changes; user zoom remains free afterwards. |
| Flat service gates | Added structural frames, translucent front panels, lit edges and status-dependent accent strips. |
| Small telemetry and dense overlays | Increased key text sizes, added progressive telemetry disclosure, bounded panel heights, and allowed completion summary dismissal. |
| Mobile panel overlap | Repositioned telemetry below wrapped mission text, limited inspector height, kept gate controls and transport reachable. Verified at 390×844. |
| Repeated static geometry | Instanced conveyor rollers per belt and all request bodies; animation mutates Three transforms without per-frame React state. |
| Idle state caused repeated renders | Ignore identical WebSocket snapshots; memoize static infrastructure. |
| Missing keyboard/material alternatives | Visible focus rings, native controls, keyboard gate/request selection, Escape handling, modal Tab containment, reduced-motion preference and manual toggle, WebGL failure message with remaining functional controls. |
| Request inspection did not move the camera | Added a reversible follow-request camera control. |
| Scrubbing alone was not playback | Added backend-driven historical playback which never changes the live run's recorded outcome. |

Additional final fixes: unique luggage storage slots prevent overlapping terminal outcomes; conveyor waypoints keep routing movement on the physical network; re-entering an unfinished mission resumes it; Space controls replay correctly.

## Captures

- `design/captures/01-first-pass-landing.png`: before composition correction.
- `design/captures/02-first-pass-game.png`: before spacing and material refinement.
- `design/captures/03-refined-landing.png`: production landing.
- `design/captures/04-gate-investigation.png`: failed gate inspection.
- `design/captures/05-recovery.png`: previous/current outcomes after repair.
- `design/captures/06-mobile-game.png`: mobile airport with summary dismissed.

Six external reference captures and their source mappings are in DESIGN_REFERENCES.md. Motion references are listed separately; no screen recording or measured Apple animation timing is claimed.

## Verification performed

- Production TypeScript/Vite build passed.
- Nine Python tests passed on the project's CPython 3.12.16 runtime. Tests cover deterministic 73/27 outcome, recovery by restoration and rerouting, event ordering, historical snapshots, retry/breaker interactions, bounded overload producing HTTP 503 rather than transport failure, API input validation, WebSocket initial synchronization, pause/step, comparison baseline, non-mutating replay playback, and exact single-event stepping when timestamps coincide.
- Browser inspection: desktop 1280×720 and mobile 390×844.
- Browser repair flow: entered mission, observed 73 successes/27 transport failures, inspected gate C, restored service, sent verification batch, observed 100 successes/0 failures and previous/current comparison.
- Production browser controls: pause, one-event step, departure-board selection, request trace, follow/stop following, rewind slider, replay play, return to live, resume, reduced-motion toggle.
- Production runtime serves frontend and local API from the same origin. Fonts are bundled locally.
- No production browser errors were observed during these checks. The development build logged React/Drei portal-unmount warnings during hot reload; these were not present in production inspection. Pytest emitted one upstream Starlette/httpx TestClient deprecation warning.

## Limits and remaining work

This is a first playable mission, not the entire master vision. Additional missions, persistent runs, two simultaneous 3D comparison views, connection-edge dragging, draggable panels, cancellation, scroll storytelling and audio remain unimplemented. Queued requests have bounded queues but no end-to-end deadline; retries use per-attempt connection timeouts. Circuit opening is implemented, but half-open probes are not. Quality uses a capped pixel ratio and batched geometry, not measured adaptive frame-rate control. Cross-device 60 FPS and screen-reader usability have not been formally audited. The mobile interface is functional but deliberately uses compact typography.

The Search Footprint implementation and its tests were not modified.

## Public browser runtime and release

- Preserved the Python engine and all nine backend tests. Added a TypeScript discrete-event runtime behind the same UI; no duplicate airport or hardcoded outcomes.
- Five Python-generated conformance scenarios compare every frame, request trace, gate state and metric. A sixth test exercises repair, baseline comparison, pause, single event stepping, replay isolation, mutation guards and restart.
- First entry opens a dismissible tutorial with the missing-27 premise and explicit inspect/repair/verify instructions.
- Moved verification beside the repair action so shorter viewports do not hide the next essential step below telemetry. Added a reduced-transparency fallback to the glass material.
- Production build uses relative URLs and a separate browser runtime; local FastAPI builds still use WebSockets. Public builds have no API or localhost dependency.
- Published original sources under MIT. Third-party study screenshots remain local and ignored; runtime dependency notices accompany the build.
- GitHub Actions verifies both engines before publishing to Pages. Public URL: https://jeenal4801.github.io/lost-in-transit/
- Live public browser verification completed: tutorial → 73/100 initial arrivals and 27 timeouts → REQ-003 trace → restore Gate C → verification batch → 100/100 with previous-batch comparison. Pause/resume, replay seek/play, return to live, restart and page refresh passed. No console warnings/errors were captured.
- Saved deployed screenshots: `design/captures/07-public-failure.png` and `08-public-recovery.png`. The full local Python app was also run through 73-to-100 recovery in the browser.
