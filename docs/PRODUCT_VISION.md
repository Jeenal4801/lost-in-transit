# CODEX MASTER PROMPT: LOST IN TRANSIT

## Your role

Act as a principal Python backend engineer, senior frontend engineer, creative technologist, 3D interaction designer, and Apple-caliber motion designer.

You are building **Lost in Transit: The Internet Is an Airport**.

This must be a complete, functioning, visually exceptional interactive application, not a mockup.

**The ambition:** Make a distributed-systems simulator feel like an Apple product reveal crossed with a beautifully designed indie game.

The experience should be immediately interesting to someone who knows nothing about networking, while the underlying engineering should be genuinely impressive to an experienced backend engineer.

---

# 1. Important: inspect the repository first

Before making changes:

1. Inspect the current repository, code, dependencies, and architecture.
2. Determine which functionality already exists.
3. Preserve working features and tests.
4. Identify gaps between the current implementation and this specification.
5. Write a concise implementation plan and then execute it.
6. Do not unnecessarily rewrite functioning components.
7. Do not stop after planning. Implement and verify the application.

If the repository is empty, initialize the project.

# 2. Product concept

**Name:** Lost in Transit

**Tagline:** Every request has a destination. Not every request makes its flight.

The internet is an airport.

Each HTTP request is represented by a suitcase moving through an interactive virtual airport.

Networking concepts become physical airport operations:

| Networking concept | Airport representation |
|---|---|
| Client request | Suitcase entering check-in |
| DNS lookup | Destination assignment |
| TLS handshake | Security clearance |
| Load balancing | Baggage sorting junction |
| Service instance | Terminal gate |
| Service queue | Baggage waiting area |
| Retry | Rebooking a suitcase |
| Timeout | Missed connection |
| Circuit breaker | Closed terminal gate |
| HTTP response | Baggage reaching the arrival carousel |
| Service outage | Terminal shutdown |
| Cascading failure | Airport-wide disruption |

The metaphor must remain technically accurate. HTTP error responses are still responses, while transport failures may prevent any response.

The application should be playable, educational, visually remarkable, and technically authentic.

# 3. Design philosophy: Apple Liquid Glass meets infrastructure

This is the most important frontend instruction.

I want an interface with the level of visual refinement, animation quality, and attention to detail associated with Apple's product websites and Liquid Glass design language.

Use Apple as a **reference for design principles**, not as a source of copied assets, logos, proprietary artwork, or exact page layouts.

## Visual characteristics

- Beautiful translucent glass panels.
- Real background blur and frosted-glass effects.
- Subtle specular highlights and luminous edges.
- Layered depth and realistic translucency.
- Smooth, physically plausible movement.
- Premium typography.
- Carefully controlled negative space.
- Sophisticated lighting.
- Soft shadows and elegant material transitions.
- Consistent spacing, radii, and design tokens.
- Precise hover, focus, press, drag, and release interactions.

The interface should feel expensive, even though it costs nothing to run.

## Color direction

Use a refined palette:

- Deep midnight blue and graphite for the environment.
- Translucent smoky glass for operational panels.
- Frosted white glass for selected surfaces.
- Cool cyan for active request flows.
- Soft green for healthy services.
- Muted amber for congestion.
- Coral red for failures.
- Very subtle iridescence for glass highlights.

Do not make everything neon.

Do not use generic purple gradients.

Avoid the stereotypical AI-generated SaaS aesthetic.

## Typography

Use expressive but restrained typography.

- Large, bold, editorial-style headings.
- A modern sans-serif for UI.
- Monospaced typography for technical telemetry.
- Clear type hierarchy.
- Excellent contrast and readability.

Use freely licensed fonts.

# 4. The Apple-style landing experience

The application needs a spectacular first impression.

Do not immediately dump the user into a dashboard filled with controls.

Create a cinematic landing experience that transitions directly into the playable airport.

## Hero sequence

On first arrival:

1. The screen opens on a dark, elegant environment.
2. A beautifully rendered 3D suitcase floats in the center.
3. The suitcase subtly rotates with pointer movement.
4. Delicate light travels across its surface.
5. A small luggage tag displays an HTTP request ID.
6. The headline appears:

   **Every request has a destination.**

7. A second line fades in:

   **Not every request makes its flight.**

8. The camera reveals the airport routing system behind the suitcase.
9. Hundreds of tiny suitcases travel through illuminated routes.
10. The user sees a prominent **ENTER THE AIRPORT** control.

Everything should feel cohesive and deliberate.

No artificial multi-second loading screens.

Provide a skip option and respect reduced-motion preferences.

## Scroll-based storytelling

Use Apple-style scroll-triggered animations, preferably using GSAP ScrollTrigger or Motion.

Create brief sections demonstrating:

- A single HTTP request making its journey.
- Thousands of concurrent requests.
- A terminal becoming overloaded.
- A cascading failure spreading through the airport.
- The ability to diagnose and repair the disruption.

Use cinematic camera movement and object transitions.

Do not turn onboarding into a long slideshow.

Let users jump directly into gameplay.

# 5. The interactive 3D airport

The airport is the center of the product.

Use **Three.js with React Three Fiber and Drei**, with procedural geometry and original assets.

The airport should resemble a highly detailed, miniature, futuristic baggage-sorting facility viewed from an elevated isometric perspective.

It needs:

- Beautiful miniature terminals.
- Conveyor belts.
- Routing junctions.
- Animated suitcases.
- Service gates.
- Arrival carousels.
- Queueing areas.
- Subtle environmental lighting.
- Meaningful status indicators.
- Animated disruptions.
- Camera controls.

The scene must feel alive even during healthy operations.

## Suitcases

Every suitcase represents a simulated HTTP request.

The visual state must correspond to the authoritative Python backend state.

For example:

- Created: appears at check-in.
- Queued: waits in the appropriate baggage area.
- Routing: travels through the designated junction.
- Processing: enters a service gate.
- Retrying: receives a new attempt marker and re-enters the route.
- Succeeded: reaches the arrival carousel.
- HTTP error: reaches a distinct response-handling outcome.
- Timed out: enters the lost-baggage workflow.
- Cancelled: visibly exits the active system.

Never randomly animate a suitcase as successful unless the simulation confirms success.

## Camera interactions

Support:

- Smooth zooming.
- Click-and-drag panning.
- Selecting terminals.
- Following a request.
- Focusing on an incident.
- Resetting the camera.
- Graceful camera transitions.

Use motion with realistic easing and momentum.

# 6. Glassmorphic operations interface

Overlay the airport with floating glass panels.

These should appear like carefully designed spatial computing controls.

## Top navigation

Include:

- Product identity.
- Simulation state.
- Current scenario.
- Mission progress.
- Settings.

## Floating telemetry panel

Display:

- Requests per second.
- Successful deliveries.
- HTTP error responses.
- Transport failures.
- p50/p95/p99 latency.
- Active requests.
- Queue depth.
- Retry count.

Metrics must come from the real simulation.

## Incident console

A floating glass console should display live events:

- REQUEST_CREATED
- DNS_RESOLVED
- SERVICE_SELECTED
- REQUEST_QUEUED
- REQUEST_STARTED
- REQUEST_RETRIED
- CIRCUIT_OPENED
- REQUEST_COMPLETED
- REQUEST_TIMED_OUT

Animate new events elegantly without overwhelming the user.

## Context-sensitive panels

When selecting a suitcase or terminal, open a floating inspection panel with animated transitions.

Use progressive disclosure so beginners see simple descriptions and experienced engineers can inspect detailed traces.

Make panels draggable or collapsible where appropriate.

# 7. Make the game genuinely interactive

This cannot just be a beautiful visualization.

Users must control the underlying simulated distributed system.

## Physically reroute traffic

Let users manipulate routing junctions.

Changing a junction must change the relevant backend routing configuration, not just the animation.

## Disable connections

Users can sever connections or take service instances offline.

Show traffic backing up, rerouting, failing, or timing out according to the simulation's rules.

## Repair infrastructure

Users should be able to restore damaged connections, reopen gates, change policies, and observe recovery.

## Inspect individual requests

Click a suitcase to see:

- Correlation ID.
- HTTP method.
- Destination.
- Routing history.
- Queueing delays.
- Processing duration.
- Retry attempts.
- Response status.
- Failure classification.
- Complete event timeline.

## Freeze and rewind

Allow users to pause simulation time, step through events, rewind, and replay.

Replay must reproduce the authoritative backend event log.

Use snapshots and/or deterministic event replay as appropriate.

## Side-by-side comparison

Allow two simulation runs to be compared visually.

Example:

- Run A: retries enabled, no circuit breaker.
- Run B: retries enabled, circuit breaker active.

Show how congestion and outcomes differ.

# 8. Make it a mystery game

This is the main gameplay differentiator.

When the game starts, the user should be able to select a mystery.

The user is the airport's incident commander.

A failure occurs.

They must investigate the observable symptoms, identify the cause, and repair the system.

## First playable mission

**THE CASE OF THE MISSING 27**

The airport receives 100 simulated requests.

Exactly 27 fail to reach a successful outcome in the scripted introductory scenario.

The player must determine why.

Do not display the root cause immediately.

Provide:

- A visible incident timeline.
- Request tracing.
- Service health inspection.
- Queue metrics.
- Routing inspection.
- Controls for safe experimentation.

The player should identify the fault, implement a correction, and demonstrate recovery.

The incident must be generated by actual simulation logic with reproducible configuration, not by hardcoding 27 red suitcases into the UI.

For the introductory scenario, design deterministic traffic and fault rules that produce the specified outcome and verify it with an automated test.

## Additional missions

Implement:

1. Retry Storm: recover from a dangerous retry policy.
2. The Overloaded Terminal: resolve queue saturation.
3. The Vanishing Destination: diagnose DNS failures.
4. The Domino Effect: contain a cascading service outage.
5. The Wrong Gate: identify an unhealthy load-balancing configuration.

Each scenario needs:

- A real technical cause.
- Observable symptoms.
- Multiple diagnostic actions.
- Measurable success conditions.
- A satisfying completion animation.
- An explanation of the underlying distributed-systems concept.

Do not make missions linear click-through tutorials.

# 9. Python backend

Use Python 3.12+.

Preferred technologies:

- FastAPI.
- asyncio.
- Pydantic v2.
- WebSockets.
- pytest.
- pytest-asyncio.
- Ruff.
- SQLite for optional local persistence.

Implement a modular event-driven simulation engine.

Requirements:

- Concurrent request processing.
- Bounded queues.
- Configurable service capacity.
- Backpressure.
- Load balancing.
- Exponential-backoff retries.
- Circuit breakers.
- Timeout management.
- Failure injection.
- Deterministic event scheduling.
- Reproducible seeded scenarios.
- Structured event logs.
- Correlation IDs.
- Accurate simulated metrics.
- Pause, resume, replay, and reset.
- Versioned event schemas.
- WebSocket resynchronization.

Use a discrete-event logical simulation clock for reproducible behavior. asyncio can coordinate runtime tasks and client communication, but must not introduce nondeterministic ordering into recorded logical outcomes.

The Python backend is the authoritative source of all system state.

Keep simulation logic independent of FastAPI and frontend rendering.

# 10. Frontend stack

Use:

- React.
- TypeScript.
- Vite.
- React Three Fiber.
- Three.js.
- Drei.
- GSAP with ScrollTrigger, where appropriate.
- Motion for interface transitions.
- Zustand for lightweight client state if useful.
- Tailwind CSS for layout and design tokens, if appropriate.
- Lucide for interface icons.

Use open-source packages only.

Avoid unnecessary dependencies.

Do not use heavy animations everywhere simply because animation libraries are installed.

# 11. Animation quality requirements

Motion is a primary product feature.

Create a consistent animation system.

## Glass interactions

Glass panels should respond elegantly to pointer movement, focus, dragging, and selection.

Use subtle lighting and highlight shifts.

## Page transitions

Transitions should feel continuous, with shared visual elements whenever practical.

Avoid abrupt screen replacements.

## Scroll animations

Use scroll-linked camera movement, object rotation, depth transitions, and carefully paced text reveals.

## Simulation animations

Suitcases move smoothly along their backend-defined paths.

Queue length should visually correspond to actual queue state.

Failures have distinct but restrained visual feedback.

## Performance

Target smooth 60 FPS on a reasonably modern desktop.

Use instancing or batching for large numbers of objects.

Limit draw calls and expensive post-processing.

Avoid unnecessary React rerenders on every animation frame.

Use interpolation between backend states without inventing outcomes.

Implement adaptive rendering quality and reasonable fallbacks for low-power devices.

Respect prefers-reduced-motion.

# 12. Delightful details

Add purposeful touches:

- A realistic airport departure board showing request statuses.
- Tiny luggage tags containing request IDs.
- A subtle conveyor-belt sound that can be muted.
- A beautiful incident-completion animation.
- A cinematic camera focus when a major outage begins.
- Subtle visual differences between healthy and degraded terminals.
- Small technical jokes in appropriate places.
- An optional terminal-style advanced view.
- An attractive shareable incident summary.

No autoplay audio.

Avoid overwhelming users with constantly moving UI.

# 13. UX requirements

The application must be usable by someone with no distributed-systems background.

The first playable experience should require no explanation longer than a few seconds.

Use:

- Clear affordances.
- Helpful tooltips.
- Progressive disclosure.
- Accessible contrast.
- Keyboard interactions.
- Useful empty and error states.
- Responsive layouts.
- Optional technical explanations.

Make it possible to understand the gameplay without reading the README.

# 14. Cost constraints

Absolutely zero paid dependencies.

No OpenAI API, Claude API, Gemini API, paid hosting, cloud databases, subscriptions, or required authentication.

All simulations must run locally.

The project should be usable without an internet connection after dependencies and required assets are installed.

Never require telemetry to be sent to an external service.

# 15. Testing and verification

Implement meaningful tests covering:

- Simulation correctness.
- Deterministic scenario outcomes.
- Request lifecycle transitions.
- Queueing and overload behavior.
- Retry rules.
- Circuit breaker transitions.
- Routing decisions.
- Event ordering.
- Timeout and cancellation.
- Metrics correctness.
- WebSocket communication.
- Frontend interactions.
- Mission success conditions.

Run the application and inspect the actual frontend.

Where browser automation or screenshot tooling is available, use it to check:

- Visual layout.
- Animations.
- Console errors.
- Overlapping panels.
- Responsive behavior.
- Actual game interactions.

Do not claim visual verification if browser access is unavailable.

# 16. Implementation milestones

Work in vertical slices.

### Milestone 1: Core simulation

Build a deterministic Python simulation engine with tests.

### Milestone 2: Working vertical slice

Connect FastAPI and React. Render a minimal airport with real request events.

### Milestone 3: Premium visual foundation

Create the Liquid Glass design system, 3D airport scene, lighting, typography, and smooth camera movement.

### Milestone 4: Interaction

Implement selecting suitcases, tracing requests, rerouting, disabling connections, and inspecting services.

### Milestone 5: Mystery gameplay

Build and verify The Case of the Missing 27.

### Milestone 6: Cinematic introduction

Create the Apple-inspired landing experience and seamless transition into gameplay.

### Milestone 7: Additional missions

Add the other debugging mysteries and meaningful comparisons.

### Milestone 8: Polish

Improve performance, animations, accessibility, responsive behavior, tests, and documentation.

At every milestone, ensure the application remains runnable.

Finish the first complete, polished playable experience before broadening the scope.

# 17. Quality bar

The application must pass three tests.

**The five-second test:** Someone encountering the demo instantly understands that internet requests are being handled like airport baggage.

**The interaction test:** Users can meaningfully manipulate the system rather than simply watching animations.

**The engineering test:** An experienced Python backend engineer can inspect the source code and find sound concurrency management, state modeling, fault tolerance, observability, and deterministic simulation.

A fourth requirement is equally important:

**The visual quality must be central to the implementation, not something added at the end.**

Do not substitute generic UI components for the requested design.

Do not fake technical functionality for visual effect.

Do not claim absolute originality or first-of-its-kind status without independent evidence.

Build something memorable.

# 18. Start now

Inspect the repository.

Write a short implementation plan.

Begin implementation immediately.

Do not stop at a design document, architectural proposal, or static demo.

Implement, run, test, inspect, refine, and document the actual application.