# Branching campaign slice

## Architecture

Retain the shared airport renderer and Python/TypeScript discrete-event engines. Extend their configuration with seeded workloads, service durations, intermittent connection loss, header validation and least-loaded routing. Keep legacy defaults byte-for-byte compatible with the original 73/27 mission.

Campaign content lives in shared JSON. Each playable case declares fault inputs, diagnostics, interventions, assertions, success thresholds and persistent consequences. A pure TypeScript campaign layer handles graph guards, measured completion, verified case records, cost and versioned local saves. Python consumes the same workload definitions for fixture generation. Save only architecture and campaign progress, not live event heaps; interrupted cases restart their workload after refresh, completed progress survives.

## Shipped scope target

A01–A04, B01–B03, and a clearly separate slice reconvergence challenge (S01). A03/A04 offer an exclusive first specialization; B02/B03 offer a second specialization. Remedial branch switching is explicit, costs reserve credits and does not delete recorded history. Three materially different strategies: extra worker capacity, routing around bottlenecks, and retry/queue policy. These carry into the convergence workload. Two endings evaluate the recorded final success/latency and operating cost. Four further ending categories and the other canonical mission nodes are unavailable future content.

The shortened path to S01 is a slice-only edge, not a claim to have implemented intervening acts. All 42 canonical nodes remain represented with unavailable status; no unimplemented mission can launch. No mandatory completion requires future nodes.

## Verification

Original nine Python tests plus original five parity scenarios remain. Add every campaign scenario and multiple repair configurations to Python-generated frame/trace parity fixtures. Test graph guards, exclusive branches, budget recovery, save validation/migration, persistent decisions, replay isolation, two legitimate ending routes and no reachable dead ends. Browser-play two divergent routes and capture actual desktop/mobile layouts. Publish only after checks pass.

## Implemented rules and intentional limits

- 42 canonical nodes plus S01, a separately labeled slice finale. Seven canonical cases (A01–A04 and B01–B03) are playable. All later canonical cases are unlaunchable future regions, connected by the specified canonical edges.
- A04 requires a trace recorded in A02. B02 opens for buffer-oriented architectures (16+ queue slots) or affinity routing; B03 opens for least-loaded routing or distribution evidence recorded in B01. At least one pressure specialization remains reachable for every valid architecture. Alternate specializations cost four audit credits; replaying a completed case replenishes four. There is no permanent budget soft-lock.
- Each case has a cost ceiling, an arrival objective and a latency objective. Credits are abstract operating units: workers per enabled route + queue allocation + purchased policies, not real money. Per-case ceilings prevent a single early purchase of all upgrades.
- Final completion requires 100/100 successful responses, p95 ≤ 4500 ms, evidence and cost ≤ 42. Precision Network requires final operating cost ≤ 35; Built for Headroom uses 36–42. Both outcomes use the actual final workload and carry recorded architecture/history. Four additional ending categories are explicitly unavailable.
- Save schema v2 stores completed metrics, architecture, evidence, branch choices, audit reserve and ending. The legacy demo had no campaign save; v1/invalid saves recover to a clean v2 state. An interrupted workload restarts, while completed progress survives refresh. No live event heap, private data or credentials are persisted.
- Service deployments may be reset by a case's declared incident delta. Routing, capacity, queue, retry, acceleration and header policies persist. Players can stage changes during a test; those changes apply only when a new verification batch starts.
- This slice models capacity, affinity/least-loaded routing, queues, intermittent failures, header validation, bounded retries and circuit opening. It does not yet simulate cache freshness, idempotency, database transactions, replication or regional failover; corresponding future cases stay unavailable.
- SVG uses deliberate region coordinates and cubic routes, without a graph dependency. Future regions pan into view; initial framing prioritizes the playable branches. Terminal worker modules and route-closed labels derive from the actual configuration. Frame-rate targets remain aspirational, not a cross-device benchmark.

## Verification — 2026-11-23

- Python: 12 passing tests, including the original nine regression tests.
- TypeScript: 46 passing tests, including 32 campaign Python conformance runs, original frame/trace parity, real simulated ending routes, save validation and branch recovery.
- Browser: all eight playable cases completed. First route used A03/B02 and reached Precision (100 arrivals, p95 4295 ms, 35 credits). Paid alternate-route recovery then completed A04/B03 and reached Headroom (100 arrivals, p95 4285 ms, 41 credits). A04 reproduced HTTP 421 before header normalization. Completed history survived refresh.
- Desktop 1440×900 and mobile 390×844 inspected; map, mission console, hide-console controls and new-campaign reset exercised. Captures 09–13 show the two endings, map and mobile views.
- Fixed a DOM-label root teardown race discovered during navigation. Spatial labels now own isolated roots, released outside the scene commit; fresh development navigation produced no console warnings or errors.
- Both production targets compile. Frame rate has not been benchmarked on low-power devices. The 35 later canonical cases and four later ending categories remain explicitly unavailable.
