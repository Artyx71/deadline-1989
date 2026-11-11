---
name: asset-research
description: "Research and compare game asset packs, verify license rights and animation coverage, and recommend a coherent set."
---

# Asset research

Use for a requested asset search or pack selection. Read `docs/ART_BIBLE.md`, `docs/ASSET_CREDITS.md`, and `.agents/rules/art-direction.md` from the project root. During bootstrap, create standards only; do not begin searches or downloads without the future implementation goal.

1. List required categories: characters, interiors/tiles, props, effects, portraits, UI/fonts, audio. Separate MVP needs from polish.
2. Search original creator pages and reputable libraries: Kenney, OpenGameArt, itch.io. Use Tiled documentation for map tooling, not as a license for artwork.
3. Open the actual pack page and check that the intended files are available. State whether availability was observed on a page or an actual download was tested; do not download unless in scope.
4. Inspect the pack's license text and any per-file exceptions. Record author, original URL, version/date, commercial use, attribution, modification, and redistribution rights. Unknown rights remain pending; never infer a pack's license from its host.
5. Compare perspective, palette, logical pixel density, tile/sprite scale, pivots, and readability against the art bible.
6. Build an animation coverage matrix for player, enemy, environment, and effects; list missing directions, actions, frames, and timing metadata.
7. Record pack URLs and license evidence links with the check date in `docs/ASSET_CREDITS.md`. Preserve license files when acquisition is authorized.
8. Recommend the smallest compatible set, explaining conflicts and the changes required to harmonize it.
9. List missing assets and whether they block MVP or polish.
10. Propose original replacements where suitable compatible rights-cleared assets do not exist. Do not use extracted game assets or copied characters/maps/music.

Return: asset comparison table; license report (verified/pending with evidence); recommended pack/set; missing asset list and original replacement plan. Do not label unverified terms as approved.
