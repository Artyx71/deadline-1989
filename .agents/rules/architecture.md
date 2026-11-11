# Architecture rules

- `apps/web` may depend on `packages/shared`; `apps/server` may depend on it. Shared contracts never import app code, React, Phaser, Fastify, or database adapters. Web never imports server internals.
- Keep the React shell and task terminal usable before Phaser starts and when its asset loading or renderer fails. Game loading affects the canvas area only.
- Put Phaser simulation in `apps/web/src/game/`. React components mount/destroy the game at one adapter boundary; do not construct scenes in render functions.
- Use a typed, instance-scoped bridge for meaningful events and commands: interaction requested, pause/resume, mission outcome, authoritative resource snapshot. Avoid global event buses and per-frame React state. Dispose all subscriptions on unmount/shutdown.
- UI owns focus. Opening terminal/dialogue/pause suppresses gameplay keyboard and pointer actions; closing restores them only when the correct scene is active. Handle browser blur and hidden tabs.
- Request resource changes through the API adapter. Phaser may request a shot; it cannot mint ammunition, XP, reward history, or durable progress. The orchestrator defines bridge and API contracts in `packages/shared`.
- Keep API schemas, DTOs, errors, and version semantics explicit. Validate transport responses as well as requests. Never expose ORM rows as the accidental public API.
- TanStack Query caches server snapshots; Zustand holds transient UI state; Phaser holds simulation state. After mutations, reconcile the returned authoritative version and invalidate affected queries. Do not apply stale responses over newer balances.
- Separate immutable mission/map definitions, scene lifecycle, entities, AI state, and services. Scene shutdown removes input, physics callbacks, timers, tweens, audio, and bridge handlers. Scene restart must not register them twice.
- Record unresolved cross-system choices in `docs/DECISIONS.md` before coding across ownership boundaries. Startup scripts, manifests, and dependency versions are future implementation work.
