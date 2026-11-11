# Frontend rules

- Group task mutations, list/filter presentation, and terminal UI by feature. Separate API hooks from rendering. Keep HUD, settings, dialogue, and pause components focused; share visual tokens rather than copying styles.
- Use strict TypeScript, accessible native form controls, stable IDs, and semantic labels. Validate forms for useful feedback while keeping the API authoritative.
- TanStack Query owns task/resource/progress data. Zustand owns selection, overlay state, settings, and temporary drafts. Do not maintain a second authoritative task list or calculate reward entitlement in a store.
- Show pending, empty, loading, stale, and error states. Preserve unsent drafts on failure. For uncertain mutation outcomes, retry the same idempotency key or reconcile with the server; do not blindly submit a new completion.
- Provide keyboard create/edit/complete/delete flows with visible focus. Announce mutation results/errors without disrupting input. Focus dialogs on open, contain focus when modal, then restore it. Keep text selection and ordinary editing shortcuts functional.
- Centralize overlay input ownership with the bridge. Text entry, dialogue progression, and buttons must not trigger game movement/fire. Release controls on blur/unmount and reacquire deliberately.
- Keep task access in the React shell independent of game loading, death, tutorial, and renderer failure. Server outage must show a recoverable state without pretending changes were saved.
- Use the ART_BIBLE terminal/HUD identity and shared tokens for palette, spacing, borders, and typography. Test primary desktop sizes and constrained viewports with scrolling, readable text, and reachable controls.
- Respect reduced motion; expose effects/audio controls. CRT/glitch effects cannot obscure task text, focus, or errors. Avoid seizure-like flicker and screen shake on forms.
- Memoize only for a demonstrated render problem. Never subscribe React to frame-level positions or use rendering as the game loop. Verify bridge cleanup on remount.
