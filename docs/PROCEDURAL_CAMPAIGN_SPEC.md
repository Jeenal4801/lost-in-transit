# CODEX: LOST IN TRANSIT — HIDDEN CAMPAIGN, PROCEDURAL INCIDENTS & CLOUD SAVES

Repository: this repository root

Live: https://jeenal4801.github.io/lost-in-transit/

## Objective

Transform Lost in Transit from a visible mission-graph game into a replayable, personalized distributed-systems adventure.

Three major changes:

1. Hide the canonical campaign graph and let the world unfold through player decisions.
2. Introduce procedural variation so players experience different incidents, paths, consequences, and endings.
3. Add optional Google login and cloud-synced game progress, while preserving free guest play.

Maintain zero mandatory operating costs, with usage kept within verified free-tier quotas.

Preserve existing working gameplay, Python simulation code, browser-compatible TypeScript simulation, graphics, design system, and tests.

## PART A — Remove the visible campaign graph

The existing campaign graph should become internal game-engine structure.

Do not expose all 42 mission nodes, canonical routes, future missions, hidden branches, or ending conditions to players.

Replace the main campaign map with an interactive **Airport Headquarters**.

Players see:
- Their evolving airport infrastructure.
- Current incidents.
- Recent incident history.
- Infrastructure health and resources.
- Available engineering actions.
- Discovered destinations and services.
- A short summary of their current objective.

Do not display locked future missions or spoilers.

A small local network view is permitted, but it must show only the currently discovered infrastructure.

The complete graph should remain available in developer tooling and documentation, not normal gameplay.

## PART B — Seeded procedural campaign generation

Create a deterministic procedural campaign director.

Each new campaign should generate and persist a unique seed.

The engine should consider:
- Campaign seed.
- Current architecture.
- Completed incidents.
- Infrastructure decisions.
- Available budget.
- Observability capabilities.
- Current capacity.
- Reliability history.
- Unresolved technical debt.
- Previously tested engineering concepts.
- Player progression.

Use these inputs to choose and parameterize future incidents.

Variation should include:
- Affected services.
- Failure timing.
- Request volumes.
- Traffic distributions.
- Dependency topology.
- Failure combinations.
- Recovery constraints.
- Incident sequence.
- Diagnostic evidence.

Do not produce random failures that are technically incoherent or impossible to solve.

Use authored scenario families with validated procedural parameters rather than unconstrained random generation.

Every generated mission must have:
- A reproducible seed.
- A valid root cause.
- Sufficient discoverable evidence.
- Meaningful interventions.
- At least one feasible solution.
- Verifiable completion criteria.

Do not let the player see the root cause before investigating.

## PART C — Consequences and adaptive progression

The campaign must react to what the player actually builds.

For example:
- Aggressive retries can increase load during later failures.
- Caching may reduce latency but create freshness challenges.
- More redundancy can improve availability but increase costs.
- Asynchronous processing can improve throughput while introducing delivery and idempotency concerns.
- Poor observability makes future diagnosis more difficult.

Make consequences emerge from simulated system behavior, not arbitrary story flags.

Do not punish players for every reasonable decision. Allow engineering trade-offs, migration, recovery, and architectural improvements.

New incidents and infrastructure capabilities should emerge gradually.

Add progression rules that ensure players encounter a diverse range of concepts over a full run, even when their routes differ.

## PART D — Multiple endings

Preserve the existing two reachable endings.

Expand to at least six designed ending categories:

1. The Architect — resilient, observable, balanced infrastructure.
2. The Golden Cage — highly reliable but economically unsustainable.
3. The Domino Effect — cascading failures from poor fault isolation.
4. Move Fast, Break Everything — strong performance but weak reliability.
5. The Silent Failure — apparently healthy metrics conceal serious correctness failures.
6. The Phoenix Protocol — the player recovers from severe failure through successful redesign.

Ending selection must be based on:
- Final system performance.
- Reliability.
- Data correctness.
- Cost.
- Recovery capability.
- Observability.
- Accumulated architecture decisions.

Do not make an ending reachable through a single obvious choice.

Create a final multi-stage incident or workload evaluation that meaningfully tests the player's accumulated architecture.

Only present an ending as reachable after its criteria, simulation, and presentation have been implemented and verified.

A finished campaign should show an elegant, cinematic ending sequence, followed by a technical retrospective of the player's decisions.

## PART E — Optional accounts and progress synchronization

Use Firebase Authentication and Cloud Firestore on the Spark no-cost plan.

Keep GitHub Pages for frontend hosting.

Provide:
- Continue with Google.
- Play as Guest.
- Continue Campaign.
- New Campaign.
- Saved Campaigns.
- Campaign History.
- Endings Discovered.
- Sign Out.

Do not require registration to start playing.

### Guest mode

Guest games should save locally using IndexedDB or localStorage.

Guest mode must work even if Firebase is unavailable.

### Authenticated mode

Save progress to Firestore under the authenticated user's UID.

A saved campaign should include:
- Campaign ID.
- Owner UID.
- Seed.
- Generator version.
- Current world state.
- Architecture configuration.
- Resources and budget.
- Discovered content.
- Completed incidents.
- Decisions and interventions.
- Relevant simulation outcomes.
- Unlocked capabilities.
- Ending history.
- Timestamps.
- Save schema version.

Do not persist redundant high-volume animation frames or unnecessary trace data.

Save at meaningful checkpoints and debounce updates.

Support resuming across devices.

### Save integrity and security

Implement strict Firestore Security Rules so users can only read or write their own saves.

Validate document structure and size.

Use explicit ownership checks and prevent arbitrary writes to other users' data.

Never ship Firebase Admin credentials or service-account private keys to the frontend.

Do not rely on client-side authorization checks alone.

Treat cloud saves as user-controlled data, not authoritative proof of achievements. If competitive rankings or tamper-resistant achievements are added later, they will require trusted server-side verification.

### Guest-to-account migration

When a guest signs in, offer to keep their existing campaign.

Do not silently overwrite cloud saves.

Implement clear conflict-resolution behavior.

### Privacy

Collect only information required for authentication and game saves.

Provide account-data deletion and clear local-save controls.

Do not introduce advertising, analytics tracking, or unnecessary personal-data collection.

## PART F — Game experience

Reduce compulsory reading.

Make the game more cinematic, intuitive, and mysterious.

Use:
- Brief incident announcements.
- Environmental clues.
- Discoverable telemetry.
- Interactive diagnostic tools.
- Short, useful feedback.
- Optional technical explanations.

Avoid:
- Long mission descriptions.
- Exposed future mission lists.
- Visible root causes.
- Obvious one-click repair solutions.
- Unnecessary tutorials.
- Excessive information panels.

Players should discover how the system works by interacting with it.

Preserve Apple-inspired Liquid Glass visuals, cinematic transitions, 3D airport interactions, and smooth animations.

## PART G — Engineering and testing

Keep Python and TypeScript simulation implementations consistent.

Share validated scenario definitions and deterministic fixtures where practical.

Implement tests for:
- Seed reproducibility.
- Different seeds producing varied valid incidents.
- Procedural parameter boundaries.
- Solvability.
- Branch eligibility.
- Persistent architectural consequences.
- Curriculum coverage.
- Ending evaluations.
- Save schema migration.
- Local persistence.
- Cloud-save synchronization.
- Authentication state changes.
- Guest-to-account migration.
- Cross-user isolation.
- Network and quota failures.
- Offline behavior.
- Existing gameplay regressions.

Create tests that complete several full campaign runs across different seeds and strategies.

Verify that multiple endings are actually reachable.

## PART H — Implementation and deployment

First audit the existing repository.

Preserve all existing tests and functionality.

Implement in reviewable milestones:

1. Internalize the campaign graph and redesign Headquarters.
2. Build the seeded procedural campaign director.
3. Integrate branching consequences and progression.
4. Implement ending evaluations.
5. Add guest persistence.
6. Add Firebase authentication and cloud saves.
7. Refine the visual and gameplay experience.
8. Test complete campaigns and deploy.

Firebase setup must never block local gameplay.

If credentials, project creation, or authorized-domain settings require user action, implement everything possible and provide exact setup instructions.

Do not invent Firebase configuration values.

Do not claim cloud saving works until verified with actual authenticated sessions and Firestore security tests.

Keep the existing public site playable throughout implementation.

Run tests, push verified changes, and deploy to GitHub Pages when ready.

## Final quality bar

Two people starting new campaigns should be able to encounter meaningfully different problems.

Two people making different engineering choices should face different consequences.

Two people reaching the same ending may have taken completely different journeys.

The game should teach real distributed-systems reasoning without feeling like a textbook.

And nobody should ever have to look at a 42-node graph to understand how to play.

Begin implementation.