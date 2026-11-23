# Lost in Transit — Visual direction

## Design thesis

A **premium, spatial, Apple-inspired glass interface** floating over an original miniature 3D internet airport. Borrow principles of restraint, depth, continuity, and animation polish, not proprietary Apple code/assets or screenshots as shipped assets. The campaign map must be central, beautiful, usable, and *meaningful*.

## Campaign graph

- Zoomable and pannable spatial network with 42 mission nodes arranged as an organic, legible branching constellation, NOT 42 identical cards and NOT a dense spreadsheet.
- Each act is a visually distinct region. Routes are curved, gently illuminated, and grouped intelligently to minimize crossings; use a graph layout strategy such as ELK or Dagre with custom positions as needed.
- States: hidden, discovered/locked, available, in-progress, completed, abandoned branch, optional investigation. Differentiate by more than color (shape/icon/text/texture/accessibility labels).
- Unlock animation: dormant network strand draws forward, node materializes with depth and soft light; meaningful chosen decisions make paths transform. Do not animate unavailable paths as enabled.
- On selecting a node, a frosted glass case dossier appears with a two-sentence hook, prior consequences, estimated challenge category, and clearly labeled Play / Back. Never expose the solution.
- The player's current route should be traceable; use History and a 'why locked?' explanation without spoiling hidden node identities.
- Navigation always shows Continue, Map/HQ, Pause, Restart, and a clear completion/next path state.

## 3D game scene

- Isometric mini-airport/baggage sorter with procedural, original 3D assets and smooth camera transitions.
- The airport grows as architectural decisions add capacity, routes, caching services, queues, or new regions. All visual topology changes derive from simulation state.
- Suitcase movement communicates request status accurately. Errors are not always visibly red; diagnostics reveal causal information.
- Inspection is tactile: click baggage, gates, queue stacks, and routes; interact with routing, capacities and fault-management tools.
- Incident feedback is cinematic but restrained. Never mask gameplay with VFX.

## Material and typography

- Background: midnight/navy/graphite, with atmospheric depth.
- Surfaces: restrained frosted/smoked glass, true blur where supported, edge highlights and soft shadows; avoid making text unreadable.
- Accent colors: cold cyan (active), sage green (healthy), warm amber (pressure), restrained coral (alert), muted lavender (branching); avoid neon saturation and generic purple gradients.
- Modern editorial sans typography plus monospace telemetry; use open-license fonts.
- Motion: cinematic 400–900ms transitions for major scene shifts, 120–250ms purposeful microinteractions, reduced-motion mode; use these as guidelines, not forced timers.

## Screens (all required in playable slice)

1. Landing/HQ: a clear one-sentence objective and Start / Continue / Map.
2. Campaign graph: spatial branching path, path history, unlocks, locks, zoom/pan, legend.
3. Mission briefing: concise stakes and goal, no solution.
4. Live airport: 3D gameplay, inspect/diagnose/experiment, optional advanced technical view.
5. Results: Case closed, what the player changed, measured outcomes, newly unlocked paths, Replay / Next node / Return to map.
6. Endings: animated system postmortem reflecting accumulated architecture and measurable outcomes.

## Animation references and implementation

- Apple design principles: https://developer.apple.com/design/
- Apple Liquid Glass discussion: https://developer.apple.com/videos/play/wwdc2025/219/
- Airport sorting reference: https://www.vanderlande.com/airports/systems/
- Baggage carrier reference: https://www.beumergroup.com/products-systems/baggage-handling-technology/crisbag-independent-carrier-system/

These links are inspiration, not resources to embed or copy. Add a `docs/references/` folder with *user-provided and appropriately licensed* stills if available. A reference gallery is not mandatory to implement the brief.

## Quality gate

Take actual running screenshots at 1440px desktop and narrower viewports. Inspect readability, labels, hit targets, contrast, transitions, graph edge crossings, hover/touch selection, focus order, layout on zoom, web performance, and reduced motion. Improve actual rendered UI, not only code cleanliness. Maintain 60fps aspiration with sensible degradation for low-performance devices.
