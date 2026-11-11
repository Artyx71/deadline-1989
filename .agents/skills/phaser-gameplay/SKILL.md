---
name: phaser-gameplay
description: "Implement and verify Phaser gameplay, physics, input, scene lifecycle, and performance for DEADLINE: 1989."
---

# Phaser gameplay

Use when authorized to implement or change game simulation. Read architecture/gameplay/testing rules and `docs/ARCHITECTURE.md`. The bootstrap task does not authorize implementation.

1. Inspect existing scenes, input, physics configuration, map collision layers, bridge, and tests before changing them.
2. Define ownership: Phaser holds simulation; React holds UI; server holds persistent resources. Specify FSM transitions and event contracts with the orchestrator.
3. Implement reproducible gameplay logic: explicit timing units, injectable random seeds for logic tests, legal state transitions, normalized movement, and camera-correct aiming. Do not claim browser physics is perfectly deterministic across platforms.
4. Integrate Arcade Physics and map collision. Verify projectile speed versus obstacle thickness and use swept collision when needed. Occlude enemy sight with solid obstacles.
5. Pair every subscription, timer, collider, input binding, and allocated resource with shutdown/destroy cleanup. Reset pooled objects completely.
6. Test character/projectile walls, corners, doors, and AI occlusion using representative maps.
7. Test keyboard, mouse, diagonal speed, blur, and suppression of input when terminal/dialogue owns focus.
8. Verify pause/resume for simulation, effects, and timers without blocking task management.
9. Verify one-hit death, apartment return, scene restart, and repeated transitions. Tasks remain unchanged; spent ammo remains spent. Melee works at zero ammo.
10. Measure representative frame/update behavior and listener/object counts. Pool only where beneficial. Keep frame state out of React and resource authority out of game code.

Return: implementation summary; changed files; verification commands and actual results; remaining issues/dependencies. Distinguish unit checks from real browser gameplay and report unavailable verification explicitly.
