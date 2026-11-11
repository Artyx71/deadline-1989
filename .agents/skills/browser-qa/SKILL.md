---
name: browser-qa
description: "Verify the running DEADLINE: 1989 app with browser automation, including task persistence, gameplay, and scene transitions."
---

# Browser QA

Use for actual browser verification after implementation is authorized. Read testing rules, relevant backlog criteria, and current package scripts. A bootstrap capability probe is not application QA.

1. Inspect scripts/tool availability and start backend and frontend using the documented commands, isolated test SQLite, and available ports. Record URLs and server startup results; do not invent pnpm scripts.
2. Open the app through available Playwright/browser automation. Verify a real browser launch, not merely an installed package. If tooling, permissions, or servers are unavailable, report BLOCKED/NOT RUN with the reason; never claim browser verification.
3. Observe console errors, page errors, failed requests, and unexpected response codes throughout the run.
4. Verify loading, empty/error states, keyboard access, focus, and task access while the game is unavailable.
5. Create, edit, complete, filter, reopen, and delete test tasks as supported by the assigned scope. Check duplicate completion and single reward issuance against authoritative API data.
6. Refresh the page, including during combat and tutorial where implemented.
7. Verify task/resource/progress persistence after reload and server restart; simulate network interruption and retry without duplicate rewards or restored spent ammo.
8. Test movement, walls, aiming/shooting, reload, empty-ammo melee, pause, input focus, and enemy sight/collision.
9. Test apartment/mission/death transitions, tutorial completion/skip, optional calls and cooldowns. Repeat transitions to expose leaked listeners or duplicated mutations.
10. Record failures with preconditions, exact steps, expected/actual behavior, and screenshots/traces when available. Shut down only processes you started; preserve failure evidence without real personal task data.

Return: passed checks; failed checks; BLOCKED/NOT RUN coverage; reproduction steps; browser/version/viewport and commands; screenshot/trace locations when available; remaining risks. A screenshot cannot substitute for interaction assertions.
