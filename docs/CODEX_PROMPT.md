# CODEX TASK — LOST IN TRANSIT: THE NETWORK EFFECT

Repository: this repository root
Production: https://jeenal4801.github.io/lost-in-transit/

Read these documents in full before coding:
- `docs/CAMPAIGN_GRAPH.md`
- `docs/VISUAL_DIRECTION.md`

## Goal

Transform the current easy, text-heavy, one-mission demo into a challenging, polished, branching system-design game. The player is an incident commander: observe symptoms, find evidence, develop hypotheses, change infrastructure, test under load, and live with the consequences. More paths and missions unlock as the campaign progresses; multiple architectures should produce distinct future incidents and endings.

Keep the existing Python/FastAPI simulation, TypeScript browser-playable runtime, procedural 3D airport, glass visual system, and GitHub Pages deployment. Inspect existing code and tests first; preserve what works. Do not make an unrelated second app.

## Nonnegotiable gameplay

1. **Difficulty arises from reasoning**, not reading large instructions or clicking an obviously broken red object. Never reveal root causes in mission previews or by red-highlighted faulty nodes.
2. **Interactive evidence gathering:** traces, partial logs, metrics, queue inspection, dependency graph, controlled experiments. Evidence must be sufficient, discoverable, and technically coherent.
3. **Real architecture trade-offs:** capacity, load balancing, timeout budget, retries, circuit breakers, cache freshness, queue policies, idempotency, replication, observability, and cost. Choices update simulation state and alter later workload outcomes.
4. **Branching campaign:** implement the graph in CAMPAIGN_GRAPH.md. Guards and prior decisions determine unlocks; optional and exclusive paths coexist; later branches reconverge and reference persistent history. No soft locks or fake branches.
5. **Meaningful endings:** measure performance, reliability, integrity, cost and recovery decisions, rather than awarding arbitrary endings based on dialogue.
6. **No reading walls:** briefs max two concise sentences by default, optional evidence/tooltips/technical debriefs, no mandatory lecture screens.
7. **Navigation:** obvious HQ, campaign map, pause, exit, replay, restart, and next available case. A completed case shows a satisfying and unmistakable results screen with three clear next actions.
8. **Progress persistence:** versioned browser save of campaign history, decisions, unlocked paths, completed nodes and ending state. Refresh must not lose completed progress. New Game must be distinct from replay.
9. **Zero recurring cost:** public game remains completely playable on GitHub Pages without Python running remotely, login, cloud, paid APIs, or LLM calls.

## Build strategy

- First, audit the repo, design a data-driven campaign schema and write a brief architecture plan in docs. Keep the graph and visual spec as product source-of-truth documents.
- Implement a working campaign-map screen, prerequisites/unlock engine, mission state machine, save/load and end-of-case navigation.
- Implement a *genuinely playable branching vertical slice*: at least 10–12 deep missions, 3 meaningful routes, a reconvergence challenge, and 2 reachable endings. If this cannot be completed robustly in one session, implement a smaller fully playable slice and explicitly label future content as unavailable, not playable.
- For each mission: seedable fault scenario, plausible hypotheses, multiple interventions with distinct outcomes, verification under load, optional debrief, persistent effects, and automated checks. Avoid copy-pasted mechanics with changed titles.
- Build Python simulation functionality for local development and equivalent TypeScript simulation for the published browser game; use shared fixtures, parity tests and documented exceptions. Do not hardcode success numbers or visual outcomes.
- Build campaign graph visualization using an appropriate React graph rendering approach (SVG/React Flow plus a layout engine if helpful), integrated with the 3D airport. The map is not a static image. Apply VISUAL_DIRECTION.md throughout, not merely at the end.
- Test graph reachability, conditional edges, no soft-locks, save migration, deterministic outcomes, mission completion, multiple repair strategies, real player navigation, browser-only operation and cross-runtime correctness. Browser-play at least two divergent routes if tooling allows.
- Perform an actual UI audit against the visual brief: screenshot, inspect, improve clarity, responsiveness, animations and performance.
- Run all tests, build the site, commit and push the verified changes to the existing remote without force-pushing, deploy GitHub Pages and verify the live site. If blocked by credentials or permissions, stop at the blocked action and report it plainly.

## Scope integrity

CAMPAIGN_GRAPH.md specifies 42 intended mission nodes across eight acts; it does not claim they are already implemented. Do not fake 42 completed missions, publish nonfunctional nodes as playable, or generate superficial branches to inflate counts. Prioritize robust rules, challenging interactions, and coherent consequences. Record which nodes and endings have actually passed automated AND gameplay verification.

Begin by reading the documents, inspecting the repository, and executing the first vertical slice.
