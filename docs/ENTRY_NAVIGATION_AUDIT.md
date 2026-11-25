# Campaign entry audit — 2026-11-25

## Diagnosis

`frontend/src/main.tsx` mounts Headquarters. `Headquarters.tsx` initializes its local view to `hq`; `persistence.ts` loads campaign data, not navigation. Neither URL routing nor saved campaign data opens `classic`. No service worker exists in this application. The public HTML returned HTTP 200 and GitHub Pages `cache-control: max-age=600`; old HTML may therefore persist briefly. An already-open tab also retains its previous UI until reloaded. Stale deployment was not established as the cause of the reported session.

The reproducible product defects were ambiguous entry labels and competing landing experiences: campaign launch said “Play as Guest,” practice said “Original sandbox,” and practice opened an elaborate Missing 27 landing screen. The Game home button could return to that practice landing instead of Headquarters. Campaign replay also said “Reset original incident.” Google sign-in looked actionable even when it could only explain missing configuration.

## Correction

Headquarters remains the unconditional boot screen. It explicitly presents New Campaign, Continue Campaign, Practice Sandbox, Saved Campaigns and How to Play. Starting a campaign records a checkpoint so Continue remains available even before the first completed incident. New campaigns preserve previous runs. Practice is reachable only by its named action; both its landing and gameplay are labeled practice. Every game view has a prominent Return to Headquarters control. Unconfigured Google sign-in is explanatory text, not an authentication button. No storage key or save schema changes, deletions, or forced resets were introduced.

## Verification

Local browser: resumed the existing I02 “One crowded terminal” campaign with its 1 completed incident, 23 credits and 12 workers preserved; entered practice and returned without changing it. Checked desktop and 390px mobile entry and gameplay navigation. Frontend regression suite and production build pass. Final public first-time and returning-session verification is recorded after deployment.

## Broader gameplay audit remains separate

The existing eight families share the same A/B/C service topology. `director.ts:incident` varies faults and traffic; `feasible` exposes one high-resource configuration usable across families. Ending evaluation classifies final metrics and evidence rather than introducing independent mechanics. This navigation patch does not claim to implement Retry Apocalypse, Cache Stampede, Double Delivery, or the requested deep gameplay expansion. That work remains on the engineering-depth feature branch after the urgent entry correction.
