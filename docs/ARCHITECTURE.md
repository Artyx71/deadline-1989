# DEADLINE: 1989 — Architecture

This document describes the implemented system. It does not certify completion or test coverage; consult [VERIFICATION.md](VERIFICATION.md) for current evidence. Project ownership rules remain in [AGENTS.md](../AGENTS.md) and [architecture rules](../.agents/rules/architecture.md).

## Product gate

Task creation, completion, deletion, and reload persistence are P0. React exposes task management while Phaser loads, pauses, or fails. Combat never completes tasks; death never changes task status. Resource integrity takes priority over optional simulation or visual features.

## Workspace and tooling

| Path                                    | Responsibility                                                             |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `apps/web/src/components/`, `features/` | React shell, task terminal, forms, menus, HUD, dialogue, settings          |
| `apps/web/src/game/`                    | Phaser scene, input, Arcade Physics, weapons, enemies, paths, simulation   |
| `apps/web/src/narrative/`               | Original dialogue and pure tutorial progression                            |
| `apps/web/src/audio/`                   | Web Audio graph and state-driven playback                                  |
| `apps/web/public/assets/`               | Original/registered images, Tiled-compatible map data, audio               |
| `apps/server/src/`                      | Fastify routes, native SQLite connection, thin shared-domain wrappers      |
| `apps/server/migrations/`               | Versioned SQL migrations                                                   |
| `apps/server/tests/`                    | Real SQLite API integration tests                                          |
| `packages/shared/src/`                  | Zod transport schemas, DTOs, game/UI bridge contracts                      |
| `packages/domain/src/`                  | Sole task/reward/mission business rules, schema, errors, initial migration |
| `apps/web/src/persistence/`             | Worker transport, SQL.js/Drizzle adapter, IndexedDB durability and locking |
| `e2e/`, `playwright.config.ts`          | Browser scenarios and isolated server startup                              |
| `.agents/`, `.codex/`, `docs/`          | Agent infrastructure, project rules, design, evidence                      |

This existing directory is the monorepo root. pnpm is installed; `package.json` pins pnpm 12.18.0 and Node >=24, with dependency versions recorded in manifests and the lockfile. React/TypeScript/Vite/Tailwind/Zustand/TanStack Query serve the client; Phaser 3 uses Arcade Physics and Tiled-compatible exports. Native persistence uses Fastify/better-sqlite3/Drizzle/Zod. Pages uses SQL.js/Drizzle in a Web Worker with IndexedDB and Web Locks; both call the same domain package. Vitest and Playwright provide verification.

The checkout name contains `:`. `scripts/workspace.mjs` resolves tool entry points directly with Node, avoiding PATH/`pnpm exec` problems caused by that character. Root commands `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm test:e2e` call this runner; `node scripts/workspace.mjs <mode>` is the equivalent direct invocation. `pnpm start` runs the built server. Prettier 3.10.0 is configured through `pnpm format` / `pnpm format:check`; generated assets, evidence, SQLite files, dependencies, builds, and lockfile are excluded. `pnpm build:pages` builds the static/browser mode into `apps/web/dist-pages`; `pnpm test:pages` runs its separate browser suite. Their acceptance and deployment results are pending and tracked separately.

## Runtime ownership and dependency direction

React owns interfaces, accessibility, focus, loading/error presentation, and the application session. Phaser owns frame-level movement, aiming, collision, AI, projectiles, animation, and camera. `@deadline/domain` owns task/reward/mission rules, inventory, progression, schema, and idempotent transactions. Fastify and the browser worker validate transport requests and call that one implementation. SQLite is the durable source of truth.

Both applications depend on `@deadline/shared` and `@deadline/domain`. Shared contracts do not import application/framework internals. Domain depends on shared DTOs and Drizzle, with no Node, native database, or browser driver imports. Web never imports server internals. React and Phaser cannot access SQLite directly; browser database access belongs to the persistence worker. Both transports validate external inputs with Zod, and the client validates returned snapshots.

TanStack Query caches authoritative snapshots and mutation results from the selected persistence mode. Zustand holds transient screen/overlay/HUD state. Phaser retains transient simulation. No React state update drives each game frame. Reward amounts come from shared domain definitions; `/api/rules` provides UI display values.

## Native profile and serving

The native mode uses one local profile without authentication. Fastify defaults to `127.0.0.1:3001`; `HOST`, `PORT`, and `DATABASE_PATH` configure startup. The default database path is `data/deadline.sqlite`, relative to the server working directory. Development Vite defaults to port 5173 and proxies `/api` to the backend; `VITE_PORT` and `VITE_API_TARGET` support isolated test ports.

The built server serves `apps/web/dist` when present and uses a single SPA fallback for non-API paths. API misses retain structured 404 errors. Public multi-user deployment requires authentication, profile isolation, authorization, and deployment hardening; changing the listen address does not provide those features.

## Public Pages mode and browser-local SQLite

The repository is public by explicit user authorization. GitHub Pages is configured for `https://artyx71.github.io/deadline-1989/`, with GitHub Actions deployment from `feat/deadline-1989`. Deployment and the new browser-mode acceptance run are **pending**; configuration is not evidence of a live working site.

Pages serves static files and does not run Fastify. The full application selects a browser persistence transport instead of issuing requests to a missing `/api` server. `client.ts` sends typed messages to `profile.worker.ts`; `routes.ts` validates/dispatches the same domain operations. The worker initializes SQL.js WASM, and Drizzle adapts the resulting SQLite database to `DomainStore`.

For each request the worker acquires the origin-wide exclusive Web Lock `deadline-1989:sqlite-profile-v1`, reads the latest SQLite bytes from IndexedDB, opens a private database, and invokes the shared domain service. SQL changes use the same immediate/deferred transaction port as native mode. A mutation is acknowledged only after the exported SQLite bytes finish a strict-durability IndexedDB transaction. The lock remains held through that flush. A failed write rejects the operation and discards the private database; retrying the same key reconciles with the last durable receipt.

IndexedDB database `deadline-1989-profile`, store `sqlite-files`, key `local-profile-v1` contains the SQLite image. All tabs of the same origin coordinate through the lock and reload the latest committed image. The worker reports missing Web Locks, blocked/failed IndexedDB, invalid data, and unknown timeouts; it must not silently start a fresh profile after a storage failure.

A Pages profile belongs to that browser/device and origin. It does not synchronize with another browser/device, the native server file, or GitHub. Clearing site data removes the profile. This is local persistence on public static hosting, with no account system or remote profile service. Asset, worker, and WASM URLs must honor the `/deadline-1989/` base path. No user database is published with the site.

## React/Phaser integration and lifecycle

`App` dynamically creates one Phaser host through `createGame`; `useSession` owns the typed `GamePort` and controller. The shared bridge exposes pause, scene entry, effects/phone state, and destruction; game events report loading, readiness, interactions, HUD, outcomes, tutorial actions, sounds, prompts, and errors. `spendShot()` requests committed authorization through the API.

Scenes receive bridge contracts, not React components, QueryClient, or database adapters. Only coarse events cross into React; HUD observations are throttled/deduplicated. Scene readiness has a version so overlay/focus pause state is reapplied on every transition.

Scene shutdown removes keyboard/pointer handlers, blur listeners, timers, tweens, physics objects, and combat resources. React unmount destroys Phaser. Pause stops physics, simulation timers, animations, AI, and gameplay input; forms remain operable. Browser blur and hidden tabs relinquish control. Input latches preserve brief action presses across frame boundaries, while UI focus prevents typing from becoming movement/fire.

Maps combine original raster art with Tiled collision objects and typed world/interaction exports. Geometry, obstacle paths, enemy state transitions, weapon timing, and hit-stop timing are separated from the scene. Bullet objects are pooled. Training and combat share systems while keeping resource authority distinct.

## Operation contracts

Native mode exposes the HTTP routes below; Pages maps equivalent operations through the typed worker transport without a remote API. Native HTTP mutations require an `Idempotency-Key` header; browser worker requests carry the equivalent required key in their typed message. Successful mutations return `MutationResult = { state: StateSnapshot, reward?: RewardClaim }`. Reads return the indicated DTO. Routes validate strict inputs and never accept client reward amounts.

| Method and route                           | Contract                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `GET /api/health`                          | Health response                                                                                       |
| `GET /api/rules`                           | Shared domain reward definitions for display                                                          |
| `GET /api/state`                           | Revisioned tasks, receipts, player, active attempt, progression, tutorial, dialogue history, settings |
| `GET /api/tasks`                           | Task list                                                                                             |
| `POST /api/tasks`                          | Create title/description/difficulty/optional deadline                                                 |
| `PATCH /api/tasks/:id`                     | Edit supplied task fields without applying creation defaults                                          |
| `POST /api/tasks/:id/complete`             | Complete and issue the first eligible reward atomically                                               |
| `POST /api/tasks/:id/reopen`               | Reopen without resetting reward history                                                               |
| `DELETE /api/tasks/:id`                    | Delete task; retain earned resources and receipt                                                      |
| `GET /api/player`                          | Authoritative ammunition, XP, deaths, consecutive deaths                                              |
| `POST /api/missions/start`                 | `{ missionId: 'first-shift', ammo }`; reserve inventory and create attempt                            |
| `POST /api/missions/:id/shots`             | `{ count: 1 }`; commit one reserved round                                                             |
| `POST /api/missions/:id/finish`            | `{ outcome: 'dead'                                                                                    | 'cleared' | 'abandoned', stats }`; settle/refund once |
| `GET /api/dialogue/next`                   | `{ next, history }` after eligibility/priority/cooldown checks                                        |
| `POST /api/dialogue/:id/acknowledge`       | Persist answered/ignored history                                                                      |
| `GET /api/settings`, `PATCH /api/settings` | Read/patch audio and accessibility/effect preferences                                                 |
| `PATCH /api/tutorial`                      | Persist valid cursor/completed/skipped fields; completion/skip unlocks mission                        |
| `POST /api/game/reset`                     | Replay gameplay/tutorial, preserving tasks/resources/receipts/settings                                |
| `POST /api/profile/reset`                  | Strict `{ confirmation: 'УДАЛИТЬ' }`; clear profile only after explicit UI consent                    |

Errors use `{ error: { code, message, requestId? } }`; native HTTP adds the request ID and the worker correlates its response envelope. Invalid input is 400, absent entities 404, and resource/state/idempotency conflicts 409. Unexpected failures return a safe 500 with a retry instruction and internal request-correlated logging. Unknown API paths never return the SPA HTML.

## SQLite, migrations, and transactions

The schema contains `tasks`, `reward_claims`, `player_state`, `mission_progress`, `mission_attempts`, `tutorial_progress`, `dialogue_history`, `settings`, `state_meta`, `idempotency_operations`, and `resource_ledger`. Drizzle performs shared domain queries over better-sqlite3 in native mode and SQL.js in the browser worker. `INITIAL_MIGRATION_SQL` in the domain package contains the exact original migration bytes used by both adapters. A checksum-tracked versioned SQL migration initializes the database; startup rejects an altered applied migration or a schema newer than this server.

Native connections enable WAL, foreign keys, a 5-second busy timeout, and FULL synchronous durability. Resource mutations use synchronous immediate SQLite transactions. Browser SQL.js transactions are followed by the locked IndexedDB flush before response; native filesystem WAL settings do not describe IndexedDB durability. Database CHECK constraints prevent negative balances and invalid reserved/spent relationships; a partial unique index permits only one active mission attempt.

Task completion updates status, inserts a unique receipt keyed by task ID, credits domain-defined resources, records the ledger event, increments the snapshot revision, and stores the idempotent response in one transaction. Easy/normal/hard rewards are 3/6/12 ammunition and 50/100/200 XP. Claims survive physical task deletion and reopening. Recompletion cannot reward twice, including concurrent requests.

Idempotency keys bind a canonical payload fingerprint to method/path scope. The committed response is persisted in the same transaction. A retry returns that exact response without applying a second effect; different input/scope with the same key returns 409. Failed transactions leave no successful receipt. Native request fingerprints remain SHA-256 of the canonical method/path/payload representation, preserving existing history; browser mode uses the canonical representation by default. Receipts currently have no expiry/pruning policy.

The clean-profile operation rejects an active attempt, resets gameplay, deletes tasks/reward claims/resource ledger/attempts, and zeros ammunition/XP in one transaction. Settings, durable request receipts, and the increasing revision are preserved. Replaying an old reset key after creating new tasks returns its cached response without purging those tasks. Replaying old create/reward keys cannot restore their effects. The separate story replay never clears real tasks or earned resources.

## Ammunition reservation, shots, and settlement

Mission start checks the tutorial unlock, available balance, and absence of another active attempt. It conditionally debits selected inventory, records the reservation, and persists `reserved`, `spent = 0`, status, and timestamps. Carrying zero is valid for melee.

In either persistence mode, a shot succeeds only for an active attempt with `spent < reserved`. The transaction increments `spent` before gameplay creates the effective shot. Retries preserve their operation identity. The browser magazine/reserve are simulation projections; SQLite's durably acknowledged counters determine what can be refunded. Reload never writes an inventory credit.

Finish validates authoritative shot count, bounded statistics, `hits <= shotsFired`, `meleeKills <= kills`, `kills <= hits + meleeKills`, and six kills for a clear. It atomically changes the attempt status, records statistics, credits only `reserved − spent`, and stores the retry response. Death increments death statistics; victory increments mission completions/best time and resets the death streak. Neither changes real tasks or awards combat resources.

State snapshots expose only the active attempt; finished attempts remain durable for history/dialogue. Refresh/restart leaves reservations intact. The client displays recovery, then explicitly abandons using the persisted spent count and returns to the apartment. GET never settles or refunds. If a response is lost, retry/reconcile before another effect. Outcomes are client-observed and validated against resource/counter constraints; the local MVP does not run a server-authoritative physics simulation.

## Synchronization and failures

Every mutation response has a monotonically advanced snapshot revision; the UI rejects older snapshots arriving late. Exact idempotency replays may contain an older revision and must not overwrite newer state. The API adapter retains pending operation keys through transient failures in memory/session storage, retries the same operation, and exposes persistent failures rather than inventing success.

`useSession` serializes tutorial and settings mutations and coordinates scene entry, recovery, and settlement. Failed settlement retains a retry surface and terminal access. Native mode has no offline server-mutation queue: input can remain available, but persistence is reported only after the native commit. Pages mode executes against local SQLite and waits for IndexedDB completion; it has no remote synchronization queue. A static Pages deployment alone does not provide an offline app-shell/service-worker cache.

Tutorial progression, skip/completion, settings, and acknowledged/ignored dialogue IDs persist in SQLite. Tutorial calls take priority; contextual calls have once-per-ID history and a 60-second global acknowledgement cooldown. Training starts with 36 temporary simulation-only rounds and never calls persistent shot/reward operations.

## Verification and integration

Vitest covers pure gameplay/narrative logic and native API integration against temporary real SQLite databases. Browser SQL.js adapter/storage tests and the dedicated Pages build/browser scenarios are part of the new integration gate; their current results must be read in VERIFICATION.md. Playwright uses actual Chromium, real client/server routes, unique temporary profiles, and separate ports. Browser scenarios record screenshots/traces and do not gain gameplay outcomes through hidden test APIs.

The orchestrator reviews shared contracts and dependencies, assigns one writer per file, integrates changes, and runs affected checks. Passing a database test does not establish browser behavior or visual quality. Read [testing rules](../.agents/rules/testing.md), [TASKS.md](TASKS.md), and [VERIFICATION.md](VERIFICATION.md) for actual acceptance status and remaining evidence.
