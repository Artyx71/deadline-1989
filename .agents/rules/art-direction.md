# Art direction rules

- Read `docs/ART_BIBLE.md` before asset choices. Its numeric starting standards are proposals until an accepted pack/original art test establishes a baseline. Change a standard once in the bible and propagate it across all assets.
- Choose a single logical tile size, character canvas/body scale, pivot convention, and pixel density. Integer render zoom and nearest-neighbor sampling preserve pixels; do not mix differently scaled packs without an approved conversion.
- Preserve top-down silhouettes and coherent furniture/door proportions. Validate with an in-scene scale sheet, not isolated thumbnails. Decorative shadows must not obscure traversable space or collisions.
- Use the approved palette families, with bright pink/purple/cyan/red as controlled accents over dark interiors. Reserve readable colors/contrast for enemies, interaction prompts, ammunition, focus, and errors.
- Sprite-sheet manifests specify canvas/frame size, frame order, pivots, direction count, fps/durations, loop flags, and animation names. Keep frame alignment stable. Do not invent missing animations in the registry; identify missing coverage.
- Review all player, enemy, environment, and effects animation categories listed in the bible. Use motion to communicate attacks/reload/death; hit stop and shake cannot delay task UI or interfere with accessibility settings.
- Review camera zoom, lighting, CRT/VHS overlays, text size, and visual hierarchy in actual screenshots at target viewport sizes. Track observed defects and screenshot paths.
- Before selecting a pack, verify its own author/source/license and commercial, modification, redistribution, and attribution rights. A hosting website's general terms are insufficient. Preserve the license text and record modified files when acquisition is authorized.
- Register every sprite, font, portrait, map, music track, sound, and generated asset in `docs/ASSET_CREDITS.md`. Pending terms mean pending selection. Tiled is an editor, not proof of rights to maps/tiles.
- Use references for atmosphere and pacing only. No extracted Hotline Miami assets, copyrighted portraits, original maps/dialogue, or unauthorized music. If compatible assets are unavailable, recommend original creation. No downloads during bootstrap.
