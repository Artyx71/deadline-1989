# DEADLINE: 1989 — Art Bible

Status: M1-ART / M3-ART / M5-ART production baseline. The master implementation goal ended the bootstrap hold. Original procedural pixel art has been generated and inspected as PNG files. The apartment passed its second browser screenshot checkpoint; combat-map screenshot review remains pending. Numeric standards explicitly identified as production below describe the current files; other tuning values remain proposed.

## References and original identity

Use Hotline Miami and Hotline Miami 2 as atmosphere and pacing references: top-down crime scenes, expressive silhouettes, neon contrast, and detailed interiors. Do not reproduce their sprites, portraits, maps, typography artwork, soundtrack, characters, or scene compositions.

Build an original 1989 identity around quiet apartment interiors, hard fluorescent workspaces, rain-dark streets, worn electronics, and intrusive telephone calls. **Proposed motifs:** print-shop registration marks, telephone exchange diagrams, redacted paper contracts, and dot-matrix task receipts. These motifs are design candidates, not approved content or acquired assets.

### Supplied screenshot analysis and implementation mapping

Both supplied reference images were inspected directly. Image 1 groups dense overhead interiors, a crowded neon club, a cinematic dialogue panel, and a large arcade title/menu. Image 2 shows a complete proposed screen family: a sunset skyline menu, overhead apartment, cyan terminal, readable combat HUD, telephone dialogue, and death/victory screens. These are visual targets, not source assets.

| Reference trait                            | Original implementation                                                                                            | Verification state                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Orthogonal overhead rooms and small people | 768 × 480 apartment with 16 px floors/walls; 32 px overhead characters                                             | PNG inspected; scene scale pending browser review            |
| Dense identifiable domestic objects        | Bedroom, living area, tiled kitchen, desk, cabinets, books, papers, slippers, records, plants, phone, TV and doors | Original apartment/prop PNGs inspected                       |
| Warm worn surfaces under colored light     | Wood grain, woven rug, fabric folds, metal/plastic highlights; discrete magenta, cyan, and red light spill         | Source image inspected; motion/contrast pending browser      |
| Strong silhouettes with limited effects    | Outlined characters, separate enemy/gunner palette, bounded bright muzzle effects                                  | Sprite strip inspected; combat readability pending           |
| Atmospheric skyline/menu                   | Original layered city, striped sunset, exchange tower, rooftop antennae, palms, wet reflections                    | `skyline.png` inspected; final title composition owned by UI |
| Portrait dialogue and cyan terminal        | Two original 64 px portraits plus an original terminal palette                                                     | Portraits inspected; actual overlays pending integration     |
| Expressive action and environmental motion | Ten-row character action sheets; phone, screen, TV, neon, doors and effects strips                                 | Frame metadata checked; browser motion pending               |

The reference uses more illustrative detail and richer scene-specific composition than a generic tile kit. Keep correcting the integrated scene against these traits. File existence alone does not establish the visual release gate.

Visual quality is an acceptance requirement. A coherent limited set of compatible assets is preferable to filling gaps with inconsistent packs. The Pixel Art Director reviews a representative screenshot and animation strip before a new pack becomes part of the project.

## Proposed palette

Use this initial palette for art tests. Values are proposals; any revision must update the palette and the representative scene together.

| Role      | Hex       | Use                                        |
| --------- | --------- | ------------------------------------------ |
| Ink       | `#10101D` | Deep outlines and voids                    |
| Midnight  | `#201A34` | Floor shadows and unlit rooms              |
| Aubergine | `#3D274C` | Wall shadows and secondary surfaces        |
| Concrete  | `#666179` | Neutral objects and structural midtones    |
| Paper     | `#D8D0B8` | Readable text and worn paper               |
| Hot pink  | `#F04B98` | Select accents and signage                 |
| Violet    | `#9055D8` | Secondary neon and atmosphere              |
| Cyan      | `#50D5D7` | Terminal focus and interaction accents     |
| Alarm red | `#E75156` | Damage and threat accents                  |
| Amber     | `#EAAF60` | Lamps, muzzle flashes, and warm highlights |

Reserve strong saturation for focal information. Separate walkable floor, solid walls, characters, interactables, and threats through value and silhouette as well as hue. Do not rely on red versus green alone to communicate state. Palette compatibility means deliberate remapping and retouching, not an automatic filter applied to a mismatched pack.

## Production grid, tiles, and sprite dimensions

| Item                 | Proposed source dimensions | Rule                                                                                |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| World tile           | 16 × 16 px                 | Production: one shared base grid; reusable floor and wall tiles                     |
| Player/enemy frame   | 32 × 32 px                 | Shared canvas, consistent foot/body anchor, readable body footprint around 12–16 px |
| Large character pose | 32 × 32 px first           | Expand only with an approved canvas/pivot contract for the animation set            |
| Portrait             | 64 × 64 px                 | Common framing and palette across speakers                                          |
| Small HUD icon       | 16 × 16 px                 | Same stroke weight and optical alignment                                            |
| Door/prop            | Multiples of 16 px         | Visual bounds may exceed collision bounds; document both                            |

Do not resize one character to compensate for a mismatched pack. Judge all sprites beside the same door, desk, and player reference. Define pivots, collision shapes, frame dimensions, naming, direction count, and animation metadata before integration. Collision bounds reflect gameplay geometry and must be reviewed separately from decorative pixels.

## Pixel density, camera, and rendering

**Production apartment world:** 768 × 480 logical pixels (48 × 30 tiles). Target the game view at approximately 640 × 400 through 768 × 480 logical pixels with 2× integer display zoom where the viewport permits. Use a camera/letterbox policy at smaller viewports; never stretch character or furniture pixels independently. UI text uses accessible browser sizing outside the game canvas. Browser camera framing remains an integration check.

Use nearest-neighbor sampling for pixel sprites and integer texture scales. Avoid blurred atlases, fractional sprite sizing, inconsistent outline thickness, and uneven camera pixel snapping. Validate movement and camera behavior together; pixel alignment must not damage control responsiveness. Record alternate viewport behavior before approving a rendering policy.

## Animation conventions

The following counts and rates are **proposed starting ranges**, not promises about available packs. Review timing in motion. All frames in a set share canvas size, scale, pivot, and facing conventions. All animation events must be explicit metadata; gameplay timing must not depend on guessing filenames.

**Production direction contract:** characters are drawn facing east and Phaser rotates the whole overhead sprite around pixel anchor (16,16). Eight atlas columns are animation phases, not directions. Ten rows are `idle`, `walk`, `run`, `aim`, `shoot`, `reload`, `melee`, `hit`, `death`, and `wake`. Each sheet is 256 × 320 px. Rotation uses nearest-neighbor sampling; inspect diagonal silhouette stability in the browser. Enemy aliases are patrol → walk, chase → run, attack → shoot/melee as appropriate. Runtime animation timing must use the manifest rather than the earlier proposed ranges.

`art-manifest.json` supplies frame lists, fps, looping, muzzle origin/frame, melee active frames, character anchors and solid bounds. Death progresses from upright to collapse; wake reverses into movement. The sheets include held exposure frames for idle/aim and must not be described as eighty distinct poses. `enemy-gunner.png` uses a controlled cool palette separate from the red enemy.

| Player animation | Proposed frames / rate | Review requirement                                     |
| ---------------- | ---------------------- | ------------------------------------------------------ |
| Idle             | 2–4 / 4–6 fps          | Stable aim and readable silhouette                     |
| Walk             | 6–8 / 8–10 fps         | Consistent stride and ground contact                   |
| Run              | 6–8 / 10–14 fps        | Clear distinction from walking                         |
| Aim              | 1–2 per direction      | Weapon muzzle/pivot alignment                          |
| Shoot            | 2–3 / 12–18 fps        | Flash, recoil, and projectile origin agree             |
| Reload           | 5–8 / 8–12 fps         | Readable phases; gameplay duration supplied explicitly |
| Melee            | 4–6 / 12–16 fps        | Windup, active contact, recovery                       |
| Death            | 5–8 / 8–12 fps         | Final pose remains readable                            |
| Wake up          | 6–10 / 6–10 fps        | Consistent apartment placement and transition          |

| Enemy animation | Proposed frames / rate | Review requirement                           |
| --------------- | ---------------------- | -------------------------------------------- |
| Idle            | 2–4 / 4–6 fps          | Distinct from dead bodies                    |
| Patrol          | 6–8 / 8–10 fps         | Match source scale and foot placement        |
| Chase           | 6–8 / 10–14 fps        | Readable urgency                             |
| Attack          | 3–6 / 10–16 fps        | Telegraph and contact timing are explicit    |
| Death           | 5–8 / 8–12 fps         | Consistent with player scale and environment |

| Environment animation   | Proposed frames / rate             | Review requirement                                      |
| ----------------------- | ---------------------------------- | ------------------------------------------------------- |
| Telephone ringing       | 2–4 / 6–8 fps                      | Visible cue plus optional audio; no forced interaction  |
| Computer screen         | 2–4 / 2–4 fps                      | Task text stays legible                                 |
| Neon flicker            | 3–5 / event timing                 | Irregular controlled pulses with reduced-effect setting |
| Television static       | 3–6 / 8–12 fps                     | Low visual priority and optional animation              |
| Doors                   | 4–6 / 8–12 fps                     | Visual opening matches collision changes                |
| Environmental particles | 3–6 or pooled procedural particles | Bounded counts and consistent pixel size                |

## Lighting and effects

Use baked pixel shading and restrained colored light overlays. Neon cannot obscure enemy silhouettes, task controls, floor boundaries, or collision cues. Keep interior detail subordinate to movement and aim readability. Document light source direction so characters and props belong in the same room.

| Effect            | Proposed standard             | Constraints                                         |
| ----------------- | ----------------------------- | --------------------------------------------------- |
| Muzzle flash      | 2–3 frames, 1–3 display ticks | Anchor to muzzle; cap brightness                    |
| Impact            | 3–5 frames, 12–18 fps         | Distinguish wall, floor, and actor contact          |
| Smoke             | 4–6 frames, 6–10 fps          | Low opacity and bounded lifetime                    |
| Shell casing      | 2–4 orientations              | Pool where justified; cap retained casings          |
| Camera shake      | 1–3 logical px, 40–100 ms     | Proposed tuning; user can disable                   |
| Hit stop          | 30–60 ms                      | Proposed tuning; never stalls task UI/network state |
| Glitch transition | 100–250 ms                    | Skip/reduce option and readable transition state    |

CRT scanlines, VHS noise, chromatic effects, flashes, and shake are optional treatments. They must be adjustable or removable and must not reduce the task interface's contrast or introduce disruptive flashing. Measure effects in a representative scene before increasing complexity.

## UI typography and layout

Use an original retro terminal/HUD composition with clear hierarchy, sharp borders, controlled accents, and intentional spacing. Avoid generic dashboard cards as the default visual language.

**Proposed UI rules:** use a licensed, legible pixel display face for headings and a readable monospace face for task content; start body text at 16 CSS px with 1.5 line height and preserve browser zoom. Verify real font licenses before acquisition. Provide visible keyboard focus, meaningful labels, non-color status cues, and sufficient contrast. Decorative text effects must not impair task editing or error reading.

Portrait framing, dialogue panels, menu borders, loading screens, terminal prompts, and HUD icons should share the same palette and spacing language. Story text may use typewriter presentation with an immediate reveal/skip option.

## Asset acquisition and consistency gates

Research candidates through the [asset registry](ASSET_CREDITS.md). Check the actual downloadable package, its included license, version, author, commercial rights, attribution, modification, and redistribution rights. Store provenance before importing art. A storefront tag or search result is not license proof.

Review every proposed pack against tile size, character proportions, perspective, outlines, palette, animation coverage, directions, pivots, and readability at the selected scale. Current selected artwork is original Python/Pillow raster generation from `scripts/generate-art.py`, using no external pixel inputs. The user expressly permitted original procedural art. Image generation tools are available in the environment but were not used for this asset family. No candidate pack pixels were downloaded or incorporated.

Required visual review evidence is a representative room screenshot, player/enemy animation strips, a palette swatch, and a gap list. Screenshots must come from the actual application once it exists; label mockups as mockups. Record accepted exceptions and their owner rather than silently mixing styles.

## Production files and map contract

All production images are under `apps/web/public/assets/` and generated reproducibly by `scripts/generate-art.py`. `apartment.png` is the baked original room image; `apartment.json` contains absolute collider rectangles, point interactions with labels/radii, and a spawn point. `apartment.tiled.json` is a Tiled-compatible orthogonal map with an artwork image layer, Collisions object layer, Interactions point layer, and spawnX/spawnY properties. It is not a claim that a human authored the map in Tiled.

`props.png` is a 512 × 320 transparent atlas sharing exact source pixels with the composed apartment. `tiles.png` is a 64 × 64 atlas with wood, ceramic, carpet and wall rows. `portraits.png` has player/caller cells. `skyline.png` is a 768 × 480 menu background without baked UI text. Environment strips are `phone-ring.png`, `computer-screen.png`, `tv-static.png`, `neon-flicker.png`, and `doors.png`; combat effect rows in `effects.png` cover muzzle, impact, smoke and casing. Exact frame rectangles live in `art-manifest.json`.

`combat.png`, `combat.json`, and `combat.tiled.json` define the original NIGHT SHIFT / THE PRINTWORKS level. Six workrooms connect through a 48 px service passage and six 48 px door apertures. Records office, presses, ink storage, dispatch entry, loading/press area, and cutting/finishing room share the material/lighting family while using original industrial equipment. The empty dispatch entry spawns the player at (96,389). Four grunts and two gunners are placed outside it. Thirty-one rectangles describe solid geometry, exported identically to Tiled's Collisions layer. All enemy centers are collision-safe and reachable on a 4 px navigation sample with a 7 px body radius; each initial enemy-to-spawn sight line is obstructed. Live enemy patrol/chase, melee fairness and movement still require runtime QA.

Remaining evidence: sustained animated playback; diagonal actor rotation; live interaction/collider behavior; reduced-effect handling; final menu functionality; combat-map visual acceptance; scene particles, camera shake, hit stop and glitch transitions in runtime. These are not verified by PNG inspection.

## Browser visual checkpoint — 2026-11-11

Inspected actual `docs/evidence/apartment-initial.png`, `menu-initial.png`, and `terminal-initial.png`, comparing both supplied reference sheets. The apartment establishes an original overhead layout, coherent pixel scale, textured rooms, identifiable furniture, and restrained magenta/cyan/red pools. The menu combines the original skyline with a strong magenta title and clear cinematic hierarchy. The first terminal screenshot has a clipped right column; frontend correction and repeat capture are required.

The initial player silhouette was a visual blocker: pale sleeves/head merged into a crescent. Revised source separates long blue trouser legs and shoe highlights, dark red shirt, black-haired head, small skin edge and hands. Original opaque rectangular furniture shadows were also replaced with translucent silhouettes matching each prop, removing the black slabs below round tables. The sprite frame size, anchor and collision contract remain unchanged. Updated PNGs have been regenerated; a second browser screenshot must confirm these corrections and the frontend's canvas-aspect correction before the apartment gate is accepted.

The orchestrator reports actual WASD movement/collision and no page errors for this capture. Those runtime checks were not independently executed by the art agent. This checkpoint is an art review, not final application acceptance.

**Second capture accepted:** inspected `docs/evidence/apartment-revised.png` and `terminal-revised.png`. The player now has separable red/blue clothing, furniture shadows follow source shapes, and the 2× apartment display preserves source pixel proportions. The terminal's complete three-column composition fits the viewport with visible form controls and no clipped detail column. M3 visual gate is accepted for progression to one combat map. A subsequent small source polish increases only local magenta/cyan/red light contribution; full-frame bloom is not used. Final visual polish and broader viewport review remain release checks.

### Integrated screen-family review

| Actual screenshot inspected                | Findings                                                                                                                                                                                                                     | Disposition                                                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/evidence/menu-revised.png`           | Strong magenta title, original skyline/palms, disciplined screen hierarchy and consistent CRT treatment. The first two menu entries appear subdued; check whether disabled presentation matches actual readiness.            | Visual identity accepted; enabled/disabled clarity belongs to UI behavior review.                                                                 |
| `docs/evidence/apartment-revised.png`      | Detailed domestic zones, readable revised player, consistent prop scale, fitting shadows and exact scene proportions.                                                                                                        | Apartment checkpoint accepted; later localized light polish preserves detail.                                                                     |
| `docs/evidence/terminal-populated.png`     | Populated task rows, selection, description, difficulty, rewards and CRUD controls fit the three-column terminal. Cyan focus/selection belongs to the same screen family as the references.                                  | No blocking visual defect observed at the captured desktop viewport. Functional/persistence behavior is separate evidence.                        |
| `docs/evidence/combat-terminal-paused.png` | Terminal remains legible above dimmed combat; task controls remain reachable in the composition.                                                                                                                             | No blocking composition defect. A still image does not verify simulation pause or persisted resources.                                            |
| `docs/evidence/combat-initial.png`         | Actual printworks, six enemy silhouettes and combat HUD render at a consistent pixel scale. Corridor and room floors lack enough environmental detail compared with supplied references; idle gunners lack a visible weapon. | Corrective source-art pass delivered; runtime should select armed aim poses for gunners/combat player when appropriate. Revised capture required. |

The corrective combat pass adds selective discarded proof pages, paper shreds, ink puddles/drops, routed service cables, room and safety stencils, machine serials, pasted work notices and pressure gauges. Tiny utility lettering is original source-defined geometry, with no external font asset. Clear travel lanes remain visually distinct; all additions are decorative and the 31 collider rectangles, spawn, six enemy starts and door apertures remain unchanged. A stronger metal barrel highlight improves armed pose readability, and a subtle cyan coat edge separates the player from red enemies. These corrections are PNG-inspected, with actual `combat-revised.png` review still pending.

Dialogue, death and victory browser compositions are not yet reviewed in this record. Do not infer their acceptance from menu or terminal screenshots.

## Final visual review — current implementation, 2026-11-11

This review supersedes the pending screenshot items above; earlier entries preserve the correction history. Art/code were frozen for this review. Only this documentation section was changed. Both supplied reference sheets were compared with the actual captured screen family. The result preserves overhead rooms, outlined textured props, consistent small character scale, magenta/cyan/violet atmosphere, portrait dialogue and terminal/HUD framing through original assets and compositions.

| Actual image inspected                                                                                                     | Final finding                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Menu](evidence/menu-revised.png)                                                                                          | Original sunset city and strong magenta title establish the requested neon crime identity. No clipped composition. Subdued Start/Continue readiness styling remains a UI state question rather than an asset issue.                                                                                                                                                                                                        |
| [Apartment](evidence/apartment-revised.png)                                                                                | Detailed original domestic zones, consistent pixel scale and readable corrected character. Apartment checkpoint accepted; later local lighting polish does not obscure geometry.                                                                                                                                                                                                                                           |
| [Combat, corrected](evidence/combat-revised.png)                                                                           | **Combat art checkpoint accepted.** Paper proofs, shreds, stencils, notices, ink marks, machine details and service cables address the initial empty-room/corridor finding. Six enemies, open door apertures, cover and travel lanes remain readable. Armed player/gunners now show a visible metal barrel.                                                                                                                |
| [Death](evidence/death-initial.png)                                                                                        | Magenta death title, statistics, retry and apartment actions fit the screen family and remain fully visible. Cinematic timing cannot be established from the still image.                                                                                                                                                                                                                                                  |
| [Victory](evidence/victory-initial.png)                                                                                    | Cyan FLOOR CLEARED title, six-enemy result, statistics and apartment action are complete and legible. Original skyline texture supplies continuity with the menu.                                                                                                                                                                                                                                                          |
| [Training](../test-results/application-FIRST-CALL-is--e9cfb-oad-and-unlocks-the-mission/training-practice.png)             | Practice target and simulated-ammunition labeling distinguish training. It deliberately reuses the apartment world rather than a bespoke shooting-range asset. The bottom-right tutorial overlays part of a small training instruction strip; main bottom-left controls and the tutorial's current melee instruction remain visible. Nonblocking at this captured viewport, but reposition before expanding training text. |
| [First call](../test-results/application-FIRST-CALL-is--e9cfb-oad-and-unlocks-the-mission/first-call-dialogue.png)         | Original portrait, caller name, magenta framing, dimmed apartment and reveal/ignore controls render coherently. Capture occurs early in typewriter text, so long-line wrapping is not established by this frame. Portrait detail is deliberately limited at its 64 px source size.                                                                                                                                         |
| [Settings](../test-results/application-audio-state-tr-edcb5-ttings-follow-the-interface/settings-accessibility.png)        | Volume tracks, checked preference states and visible cyan keyboard focus fit the terminal styling without clipping. This verifies appearance, not persisted preference behavior or measured accessibility contrast.                                                                                                                                                                                                        |
| [Completed task](../test-results/application-task-CRUD-edit-517ae--browser-reload-persistence/task-terminal-completed.png) | Completed row, description, deadline, status, reward history and reopen/edit/delete actions are visible. Cyan hierarchy and three-column layout remain readable with real content. Persistence and idempotency require separate functional evidence.                                                                                                                                                                       |
| [Terminal during combat](evidence/combat-terminal-paused.png)                                                              | Fully usable terminal composition remains separate from the dimmed game. A screenshot alone does not prove that simulation clocks are paused.                                                                                                                                                                                                                                                                              |

### Source animation coverage and runtime limits

Read-only atlas checks confirm `player.png`, `enemy.png` and `enemy-gunner.png` each contain 80 nonempty 32 × 32 frame slots: eight phases for all ten actions. Distinct exposures per action are idle 2, walk 5, run 5, aim 1, shoot 2, reload 2, melee 8, hit 2, death 5 and wake 6. Held exposures are intentional; this is not eighty unique poses. All five environmental strips have their four declared source phases. Floor/prop perspective and character anchors remain consistent.

Read-only inspection of `WorldScene.ts` and `CombatSystem.ts` establishes wiring, not observed animated playback:

- Character animation keys are registered for all source rows. Player movement/dash/aim/shoot/reload/melee/death/wake and enemy patrol/chase/gunner attack/hit/death have explicit runtime calls. Player-hit is not called because MVP player damage is immediately fatal.
- Ringing telephone, computer screen and TV have loaded animated strips. Local light pulses and drifting dust are procedural tweens; using the supplied neon strip is therefore unnecessary for animated light coverage.
- Muzzle flashes, impacts and fading shell casings are procedural runtime effects rather than the source effects atlas. Camera shake and hit stop are present in code; still images do not measure their timing.
- **Remaining required effect gap:** the source smoke row exists, but no smoke effect is loaded or emitted by the inspected runtime. Do not claim every requested effect is implemented.
- **Remaining enemy attack presentation gap:** the grunt attack uses an aim stance, tint and timed damage rather than playing its available melee action. Its attack logic exists, but the intended visible melee swing is not integrated.
- **Door polish limitation:** `doors.png` exists but is not loaded; doorways are static passages/transition points with no opening animation. This does not obstruct the current collision routes, but the full environmental animation standard is not met.
- Runtime frame rates are hardcoded to idle 5 fps, walk 10 fps and other actions 14 fps; these differ from several source-manifest rates. Current action wiring is present, but final timing should use one reviewed contract rather than claiming manifest-exact playback.

**Disposition:** no blocking static composition defect remains in the inspected desktop screenshots; apartment and combat visual checkpoints pass. This is acceptance of the current original visual family, not a claim of identical illustrative richness to the reference artwork or full motion-feature completion. The required smoke effect and visible grunt melee swing remain release-scope gaps unless implemented and verified by the orchestrator. Static door transitions, coarse portrait detail, held action exposures and training-room reuse are explicitly recorded practical limitations. Full moving-sequence review, smaller viewports, long dialogue wrapping and measured contrast remain unverified by this art review. No source assets were regenerated during final review.

### Follow-up correction requested by orchestrator

After the frozen review, the orchestrator authorized one source correction for animated door integration. The apartment generator now retains both door placement records at top-left (360,420) and (680,400), but omits door pixels and their shadows from `apartment.png`. Runtime owns the existing 48 × 48 `doors.png` sprites at centers (384,444) and (704,424), so an opening sprite will not reveal a baked closed door underneath. No collider, interaction, combat-clutter or sprite-scale redesign accompanies this change. All art was regenerated; a second regeneration produced identical PNG SHA-256 hashes. Updated runtime smoke, grunt swings, door/light motion and death hit stop remain pending follow-up verification by the orchestrator.

### User-directed apartment furnishing revision — dark and cluttered

The user selected a darker, more disordered apartment after reviewing the Russian interface screenshot. This supersedes the earlier furnishing arrangement, while retaining the 768 × 480 world, existing walls/doors, spawn and all six interaction coordinates.

Removed the duplicate lower sofa/round table/bookshelf, kitchen drawer cabinet and plant crowding the training doorway. The lower room is now an untidy storage/work area: an uneven frayed dust sheet, labeled and taped cartons, open record storage, loose records, proof pages, routed floor cables and stains. The kitchen has a smaller stained rectangular table, one chair, stacked storage boxes and used dishes. Bedroom laundry and a jacket on the bed make the upper room less staged. Ambient surfaces are ten percent darker before the existing colored light spill; neon tubes and actor source pixels retain their contrast.

Seven new storage-box solids and the compact kitchen table are generated together with matching JSON/Tiled colliders. Decorative papers, cables, records and stains are nonsolid. The existing 7 px-radius/4 px-step reachability check passes for every interaction, preserving the training lane and terminal access. The new source apartment PNG was inspected; actual browser screenshot acceptance is pending this revision's integration capture. No combat-level redesign accompanies this change.

### Latest acceptance — Russian interface and cluttered apartment

**Accepted:** directly inspected [the actual cluttered apartment](evidence/apartment-cluttered-russian.png). The user's chosen darker, disordered direction is now apparent: repeated furniture has given way to uneven cartons, records, wires, proof pages and stained surfaces, with a smaller kitchen dining arrangement. The living room remains a readable focal area, while the lower room has a distinct neglected storage/work identity. The player, open central passage, telephone, computer and training doorway remain visually distinguishable. No blocking clipping, obstructed visual route or inconsistent pixel scale was observed in this capture. This accepts the furnishing revision; source reachability checks provide separate geometry evidence.

Also directly inspected [the Russian menu](evidence/menu-russian.png) and [the Russian terminal with a long description](../test-results/application-terminal-posit-3421e-details-editors-and-filters/terminal-stable-russian.png). Russian labels fit the retained DEADLINE:1989 identity and neon terminal hierarchy. The long description stays inside its detail column beneath the fixed header; the screenshot shows no spill into adjacent columns or outside the modal. A still image does not independently prove position stability while switching rows/editors; that behavior belongs to the root's running regression test.

The earlier runtime-animation findings are now resolved in the inspected source: `WorldScene.ts` loads/registers the muzzle/smoke effect strips, neon flicker and opening/closing door sequences; proximity changes trigger door animation. `CombatSystem.ts` emits muzzle/smoke sprites, selects the grunt melee action, and sequences player hit into death with a 35 ms hit stop when effects are enabled. These are read-only implementation confirmations, not a claim that every frame was independently watched. The orchestrator reported passing live combat verification before the latest Russian/furnishing run; the latest complete regression result is tracked separately in `docs/VERIFICATION.md`.

**Current visual disposition:** apartment and combat art checkpoints pass, including the user's furnishing correction. No additional blocking visual defect was found in the reviewed desktop captures. Coarse original portraits, held sprite exposures, training-map reuse, and hardcoded animation rates differing from some manifest values remain documented practical limits. Small-view accessibility/contrast and full motion playback are not established solely by these screenshots. This follow-up review changed only these notes and did not regenerate assets or modify application code.

### Superseding user direction — expressive open studio

The user subsequently rejected the grid-like apartment and requested a substantive furnishing/composition redesign, supplying a new visual reference with emerald/amber light against red shadows. Earlier apartment approvals above are historical and do not establish user acceptance of this redesign. The primary new requirement is a compact, coherent studio rather than another scatter pass of storage boxes.

The replacement keeps the 768 × 480 world and 16 px coordinate grid, while concentrating the studio inside x80–688/y64–416. One partial curtain/divider creates a sleeping alcove; the rest is an open living/work/kitchen room. Quiet, longer wood planks replace the brick-grid floor. A single rug groups sofa, coffee table and TV. The desk, pinboard and lamp form the focal work zone; a visible telephone sits between that zone and the kitchen. A small record console, coat stand, slippers, correspondence and one unpacked carton supply personal context without a box field. The kitchen is a compact tiled inset with a small breakfast table, one chair, dishes and kettle.

Broad original emerald light from the left transitions through an amber desk area into crimson light on the right, reflecting the new reference's spatial color contrast. This is a deliberate apartment-specific variation within the existing noir/neon family. No reference pixels, furniture arrangement or protected graphics were copied. Combat, characters, portraits, menu and audio remain unchanged; their PNG hashes were checked while only apartment assets were regenerated.

Production interaction centers are computer (428,126), telephone (479,227), television (344,384), cabinet (618,383), exit (216,409), and training (661,405). Spawn is (204,232). Runtime door placements are top-left (192,408) and (640,392), with no baked door pixels. Twenty-two solids are exported consistently to JSON and Tiled. A 7 px body-radius flood fill reaches all six interactions, and the required training rectangle x500–645/y260–330 remains clear. Initial verification found a plant obstructing the training doorway; it was removed before delivery. The generated studio PNG has been inspected; actual browser acceptance of this superseding design is pending integration capture.

### Actual open-studio and product-guidance review

Directly inspected [studio introduction](evidence/studio-intro.png) and [studio with task note/tutorial](evidence/studio-todo.png). The new studio's coherent living furniture, desk focal point, sleeping alcove, compact kitchen and emerald/amber/crimson contrast are accepted as the current visual direction. The bottom dialogue treatment provides readable Russian introduction text. The paper-style МОИ ДЕЛА note and explicit three-stage tutorial card make the To-Do purpose visible immediately; their positions avoid one another and the task card supplies a direct action. Existing task titles remain user data and are not evidence of untranslated interface labels.

The actual phone, computer and television overlays now occupy their new map locations rather than stale former-scene anchors. Phone center (482,223), computer overlay (413,115), and TV overlay (342,360) correspond to the newly drawn objects. The computer animation is slightly taller than its inner CRT screen: optional precise fitting is center (416,114), crop (0,5,32,21) within the unchanged 32 px frame. The phone's visual support is minimal; a small side table could ground it without moving the interaction, but this is a secondary furnishing detail.

**Remaining visual blocker:** bottom doors extend outside the enclosing wall and appear detached. The current exit door top-left y408 ends at y456, beyond the bottom wall's y432 edge. Proposed flush integration uses top-left y384 for both 48 px door placements, giving centers (216,408) and (664,408) and lower edges y432. Exit/training interaction centers and their navigation contracts can remain unchanged. This is a targeted doorway correction, not a new scene redesign. Source assets were frozen during this review; the correction has been reported to the orchestrator before any implementation.

**Approved correction delivered:** the orchestrator authorized both flush door placements at y384 and a small original wooden phone side table at (454,195), 56 × 52 px. The table is drawn behind the telephone and is nonsolid; the existing phone collider remains authoritative. Only apartment outputs were regenerated. Assertions confirm all interaction values, colliders and spawn are unchanged, while every other PNG retains its SHA-256 hash. Runtime door-center and CRT-crop corrections belong to the orchestrator. Art is frozen pending the corrected actual screenshot.

### Separate training location — user-directed replacement

The user explicitly requested a separate training location. `training.png`, `training.json` and `training.tiled.json` now define an original 768 × 480 industrial practice room, rather than overlaying targets inside the apartment. The apartment training-door interaction remains at (661,405), radius 53; no apartment, combat, character, menu or audio artwork was changed for this task.

The training room uses textured teal concrete, ribbed impact-catching plates, low safety baffles, an equipment bench with gloves/hearing protection, vented lockers, a drain, cable, scattered casings and original Russian safety/title stencils. Painted lines distinguish the shooting lane, dummy pad and return pad without adding invisible obstacles. Source glyph geometry supplies the Russian signs; no font image or reference-game pixels are incorporated. One live practice dummy serves both shooting and close-range melee so decorative targets cannot be mistaken for additional required enemies.

Spawn is (530,290), practice dummy (604,290), and the only interaction is `training` at (500,390), radius 65, labeled ВЕРНУТЬСЯ В КВАРТИРУ. The entire spawn-to-dummy shooting/melee line is clear for a 14 px body, and collision-aware traversal reaches the return pad. JSON and Tiled collision exports match; 9,819 sampled points are reachable. `scripts/generate-art.py --training-only` reproduces only these assets and their manifest entry. Determinism and unchanged existing PNG hashes were checked. The source PNG was inspected; separate-room browser screenshot acceptance remains pending integration.

## Related documents

- [Game design](GDD.md)
- [Asset credits and research status](ASSET_CREDITS.md)
- [Architecture](ARCHITECTURE.md)
- [Art direction rules](../.agents/rules/art-direction.md)
