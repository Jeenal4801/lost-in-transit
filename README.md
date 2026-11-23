# Lost in Transit

**Every request has a destination. Not every request makes its flight.**

An interactive distributed-systems mystery in an original miniature 3D airport. Suitcases are HTTP requests; conveyors route them through services. Diagnose the missing 27, repair the infrastructure and recover all 100 requests.

**[Play in your browser](https://jeenal4801.github.io/lost-in-transit/)** · [Source](https://github.com/Jeenal4801/lost-in-transit)

## Play the first case

Enter the airport and accept the short mission tutorial. Watch the incident, inspect a terminal or open **Departures** to trace a failed request. Restore service or change routing, then **Send verification batch**. The engine computes every outcome; there are multiple valid repairs.

- Drag to orbit, right-drag to pan, scroll to zoom. Gate buttons and the departure table offer keyboard alternatives.
- Space pauses/resumes; R resets the camera; Escape closes panels.
- Scrub the timeline and play recorded history. **Return to live** resumes investigation.
- Reset the original incident without refreshing. Settings includes reduced motion, retries and circuit breakers.

## Run the complete Python app

Requires Python 3.12+ and Node 22+. From the repository root:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-lock.txt
npm ci --prefix frontend
npm run build --prefix frontend
.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001
```

Open http://127.0.0.1:8001. On a configured macOS checkout, `Start Lost in Transit.command` launches this server. For development, run the backend plus `npm run dev --prefix frontend`; Vite proxies commands and WebSockets to port 8001.

## Standalone browser build

```sh
npm run build:pages --prefix frontend
python3 -m http.server 4173 --directory frontend/dist-pages
```

Open http://localhost:4173. Python here only serves files for local preview; deployed visitors need no Python, account, API key or backend. The hosted runtime executes entirely in each browser tab. Refresh starts a fresh incident. Assets and fonts are bundled locally; there are no analytics or paid services.

## Architecture and correctness

| Component | Responsibility |
| --- | --- |
| `backend/engine.py` | Authoritative Python discrete-event engine; deterministic logical clock and ordered event heap |
| `backend/main.py` | FastAPI commands, WebSocket state, clock driver and local static serving |
| `frontend/src/simulation.ts` | Equivalent TypeScript engine for static hosting |
| `frontend/src/runtime.ts` | Build-time runtime selection; the UI and 3D scene are shared |
| `frontend/src/Airport.tsx` | Procedural Three.js scene, instanced luggage and conveyor rollers |
| `backend/scripts/fixtures.py` | Python-generated scenario snapshots, metrics and complete per-request traces |
| `frontend/tests/` | Frame-by-frame cross-runtime comparisons and command/replay tests |

The input manifest routes 27 of 100 requests toward an offline service. Both engines compute routing, queue capacity, timeouts, retries, circuit opening, HTTP errors and arrivals. Repairing the service or excluding it from routing recovers all 100. Browser state is tab-local; the local Python server intentionally shares one simulation across its clients.

```sh
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
.venv/bin/python backend/scripts/fixtures.py
npm test --prefix frontend
npm run build --prefix frontend
npm run build:pages --prefix frontend
```

Generated parity JSON and build output are ignored, regenerated during CI and never imported by the game. Frontend tests use Node's built-in runner. Animation updates mutate Three.js objects; simulation state updates at 10 Hz and remains idle when paused. Reduced motion disables interpolated camera and suitcase movement. WebGL fallback retains gate and request controls.

## Deploy to GitHub Pages

The repository's `pages.yml` workflow runs Python tests, generates conformance fixtures, runs browser tests, builds with relative asset URLs and deploys `frontend/dist-pages` using GitHub's Pages artifact service. In **Settings → Pages → Build and deployment**, select **GitHub Actions**. Push to `main` or run the workflow manually. A public repository uses free Pages hosting; there is no server to operate. All navigation stays on the single entry page, so refresh works at the repository URL.

## Design and licensing

See `docs/PRODUCT_VISION.md`, `docs/DESIGN_REFERENCES.md` and `docs/DESIGN_REVIEW.md`. The vision document describes longer-term ambitions, not a list of shipped features. Source code and original procedural assets are MIT licensed. See `docs/ASSETS.md` and bundled `THIRD_PARTY_NOTICES.txt` for dependency/font licensing. Third-party reference screenshots are local study material and excluded from Git and deployment.

## Current limits

One complete mission; no saved runs, multiplayer, additional missions, sound or draggable connection editing. Circuit breakers open without half-open recovery probes; retries use per-attempt timeouts, not a global deadline. Replay retains snapshots in memory for the current 100-request batch. 60 FPS is a target, not a measured guarantee across devices. Local Python tests currently report an upstream Starlette/httpx deprecation warning.
