# Lost in Transit — Campaign graph and gameplay specification

## Rules

This is a **directed campaign graph**, not a fixed linear sequence. Each mission is a playable incident with a seeded workload, hidden root cause, discoverable evidence, at least two interventions, testable win conditions, and a debrief. Nodes are examples of designed content until implemented and browser-tested. Never label placeholders playable.

- 42 mission nodes across eight acts (4 + 6 + 5 + 6 + 5 + 6 + 4 + 6 = 42).
- A normal run plays a subset, not all 42. Some paths branch exclusively, others reconverge, and optional forensic missions may be revisited.
- Unlock edges are prerequisites; guards also depend on persistent architecture state, evidence found, outcomes and budget.
- No mission advertises its root cause. Expose symptoms and evidence through player actions.
- Allow recovery from suboptimal designs, at a meaningful cost. Avoid permanent soft-locks.

## Graph

```mermaid
flowchart TB
  subgraph A1["Act I — First Contact (4)"]
    A01["01 Missing 27"] --> A02["02 Slow Arrivals"]
    A02 --> A03["03 Unreliable Connection"]
    A02 --> A04["04 Mystery Header"]
  end
  subgraph A2["Act II — Under Pressure (6)"]
    B01["05 Morning Surge"]
    B02["06 Queue Cliff"]
    B03["07 Load Balancer Blindspot"]
    B04["08 Stalled Workers"]
    B05["09 Rate-Limit Dilemma"]
    B06["10 Tail Latency"]
    B01 --> B02 --> B04 --> B06
    B01 --> B03 --> B05 --> B06
  end
  subgraph A3["Act III — Broken Promises (5)"]
    C01["11 Retry Storm"]
    C02["12 Duplicate Booking"]
    C03["13 Circuit Breaker"]
    C04["14 Deadline Propagation"]
    C05["15 Poison Message"]
    C01 --> C02 --> C04
    C01 --> C03 --> C04
    C03 --> C05
  end
  subgraph A4["Act IV — Scaling Trap (6)"]
    D01["16 Hot Cache"]
    D02["17 Cache Stampede"]
    D03["18 Stale Departure Board"]
    D04["19 Database Hotspot"]
    D05["20 Shard Rebalance"]
    D06["21 Consistency Budget"]
    D01 --> D02 --> D03 --> D06
    D01 --> D04 --> D05 --> D06
  end
  subgraph A5["Act V — Fault Lines (5)"]
    E01["22 Hidden Dependency"]
    E02["23 Backpressure"]
    E03["24 Dead Letter Office"]
    E04["25 Partial Commit"]
    E05["26 Thundering Herd"]
    E01 --> E02 --> E03
    E01 --> E04 --> E05
  end
  subgraph A6["Act VI — Across Borders (6)"]
    F01["27 Regional Failover"]
    F02["28 Replica Lag"]
    F03["29 Split Brain"]
    F04["30 DNS Failover Delay"]
    F05["31 Global Queue"]
    F06["32 Data Residency"]
    F01 --> F02 --> F03
    F01 --> F04 --> F05
    F03 --> F06
    F05 --> F06
  end
  subgraph A7["Act VII — Blackout (4)"]
    G01["33 Silent Alarm"]
    G02["34 Cascading Outage"]
    G03["35 Recovery Order"]
    G04["36 Incident Command"]
    G01 --> G02 --> G03 --> G04
  end
  subgraph A8["Act VIII — Final Reckoning (6)"]
    H01["37 Peak Demand"]
    H02["38 Dependency Collapse"]
    H03["39 Recovery Under Budget"]
    H04["40 Integrity Audit"]
    H05["41 Dark Launch"]
    H06["42 Final Reckoning"]
    H01 --> H02 --> H03 --> H06
    H01 --> H04 --> H05 --> H06
  end
  A03 --> B01
  A04 --> B01
  B06 --> C01
  C04 --> D01
  C05 --> D01
  D06 --> E01
  E03 --> F01
  E05 --> F01
  F06 --> G01
  G04 --> H01
  B03 -. "optional investigation" .-> C03
  C02 -. "duplicate-event evidence" .-> E04
  D03 -. "staleness evidence" .-> F02
  E02 -. "capacity debt" .-> G02
  F03 -. "consistency debt" .-> H04
```

## Architectural decisions and guard examples

- After Act II, player chooses concrete capacity/routing/retry settings **without labels such as 'safe route' or 'risky route'**. These alter workload outcomes.
- C02 unlocks only if the campaign has seen at-least-once delivery or retry duplication; otherwise C03 remains reachable. Players can later discover C02 via forensic evidence.
- D03 unlocks after enabling caching; D04 after selecting no cache, discovering a hotspot, or performing an audit. D06 is reachable through either track.
- F03 unlocks when replicas can accept concurrent writes; F04 when DNS-based failover is configured. Every run still reaches F06 through at least one path.
- Optional dotted connections represent additional evidence, remedial opportunities or bonus node access, not a required shortcut through acts.
- Endings evaluate actually recorded resilience, performance, integrity, operational cost and incident response across the final test workload. Provide at least six ending categories, with at least two fully reachable in first shipped slice. Do not imply unfinished endings are playable.

## Required schema per mission

`id`, `act`, `title`, `short_hook`, `prerequisites`, `unlock_guards`, `exclusive_group?`, `starting_architecture_delta`, `workload_seed`, `workload`, `hidden_fault_model`, `initial_observables`, `discoverable_evidence`, `diagnostic_actions`, `interventions`, `simulator_assertions`, `completion_conditions`, `failure_conditions`, `persistent_consequences`, `skills_tested`, `debrief`, `replay_variants`.

## Suggested first playable slice

Implement and thoroughly test A01–A04, B01–B03, C01–C03, D01–D02, plus an initial converging challenge and two genuinely reachable endings. This is an implementation priority, not a claim that the remaining nodes work. If the simulation needs narrower scope, prioritize a smaller coherent branching vertical slice over shallow breadth.

## Acceptance

- Every playable node has more than one plausible intervention and evidence sufficient to distinguish causes.
- At least three strategic paths that change state and later workloads, not merely dialogue or colors.
- Players can inspect a topology and traces but cannot identify failure by looking for an obvious red node.
- Graph validation checks reachability, non-contradictory guards, absence of unintended soft-locks, and legitimate ending routes.
- Campaign save, new-game, restart, replay, and return-to-map controls work.
