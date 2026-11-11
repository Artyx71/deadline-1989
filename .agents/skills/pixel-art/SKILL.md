---
name: pixel-art
description: "Review or correct pixel art consistency, sprite animation, palette, scale, and in-scene visual quality."
---

# Pixel art consistency

Use for visual asset preparation or review. Read `docs/ART_BIBLE.md`, `docs/ASSET_CREDITS.md`, and art-direction rules. Respect pending rights and proposed standards. During bootstrap, do not generate or download assets.

1. Read the art bible and identify the approved baseline or unresolved numeric proposals.
2. Inspect actual existing sprites and manifests; if none exist, report the missing evidence rather than fabricate a visual review.
3. Measure tile dimensions, atlas layout, spacing, and logical pixel density.
4. Compare character canvases, body proportions, pivots, direction coverage, and scale against props/doors.
5. Check frame alignment, animation names, order, fps/durations, looping, action coverage, and transitions. List missing frames rather than marking them complete.
6. Compare palette families and contrast, keeping enemies, interactions, focus, and task text readable.
7. Check nearest-neighbor rendering, integer zoom, texture filtering, and UI text scaling at intended desktop viewports.
8. Inspect actual scene screenshots and motion when available. Separate asset inspection from verified browser rendering; do not claim either without evidence.
9. Identify inconsistencies with file/frame/screenshot references and severity.
10. Recommend or implement authorized corrections within owned paths. Coordinate any change to the baseline and update credits for modifications. Use available image generation tooling for raster creation only when appropriate; use existing code/vector tools for code-native assets.

Return: visual QA report; asset changes (or none); animation issues; prioritized improvements. Include missing evidence, licensing gaps, and screenshot paths where available.
