# Design references

Captured 20 November 2026 in a browser. These are research references, not assets used in the application. All game geometry is procedural and original.

| Screenshot | Source | Principle applied |
|---|---|---|
| `design/references/01-apple-home.png` | https://www.apple.com/ | Confident type scale, one focal object, generous negative space, clear primary action. |
| `design/references/02-apple-design.png` | https://developer.apple.com/design/ | Thin specular rims, translucent material, subtle shadows separating controls from content. |
| `design/references/03-vision-pro.png` | https://www.apple.com/apple-vision-pro/ | Soft studio lighting, dimensional product silhouette, restrained palette and editorial composition. |
| `design/references/04-vanderlande-systems.png` | https://www.vanderlande.com/airports/systems/ | Legible conveyor connections, raised tracks, structural supports, functional routing junctions. |
| `design/references/05-beumer-crisbag.png` | https://www.beumergroup.com/products-systems/baggage-handling-technology/crisbag-independent-carrier-system/ | One tracked carrier per bag; discrete, inspectable units moving through a physical system. |
| `design/references/06-apple-materials.png` | https://developer.apple.com/design/human-interface-guidelines/materials | Materials establish hierarchy between interface and environment. Readability takes priority over transparency. |

## Motion references (separate from stills)

- https://www.apple.com/apple-vision-pro/ — reference for product-to-environment continuity, layered depth and guided reveals. Desired adaptation: retain the same airport canvas when entering gameplay, gently settle the camera, keep controls stable. Some embedded videos reported unavailable in the capture browser, so exact Apple animation timings were not measured.
- https://developer.apple.com/videos/play/wwdc2025/219/ — “Meet Liquid Glass”, the requested reference for material behavior and fluid controls. Desired adaptation: subtle panel entrances and responsive press states. Video timing has not been independently verified or recorded.
- https://developer.apple.com/design/human-interface-guidelines/materials — material hierarchy; avoid stacked glass obscuring the scene.
- https://developer.apple.com/design/ — edge highlights and layered control surfaces.
- https://www.apple.com/ — focal hierarchy and breathing room.

Implementation timing is an original design choice, not an assertion about Apple's timings: 180ms hover/press feedback, 250–300ms panel entrances, exponential camera/position interpolation. Reduced motion disables decorative floating, damping and UI transitions. No autoplay audio. Scroll-driven storytelling and screen recordings are not part of this first playable slice.

## Review plan

1. Establish authoritative deterministic simulation and a reproducible first case.
2. Build the original miniature airport, suitcase and glass interface.
3. Connect selection, tracing, controls and historical replay to real state.
4. Inspect desktop/mobile compositions, keyboard controls and the complete repair loop.
5. Record actual test results and screenshots in DESIGN_REVIEW.md.
