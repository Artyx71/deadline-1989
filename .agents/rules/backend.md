# Backend rules

- Separate Fastify routes, business services, and Drizzle persistence. Zod validates parameters, bodies, and queries; constrain lengths and reject client reward amounts. Use parameterized database access.
- In one SQLite transaction, transition task completion, create a uniquely constrained reward record, update ammunition/XP, and persist idempotency outcome. A failure rolls back every part.
- Enforce once-per-task reward with a database constraint, including concurrent requests and reopening. Reopening changes completion only. Deletion never creates a reward; retain the reward ledger/tombstone needed to prevent reissuance and resolve duplicate requests.
- Bind durable idempotency keys to operation scope and a canonical request fingerprint. Replay the committed result for the same request; reject key reuse with a different request. Commit the response record with the mutation. Never depend on process memory for deduplication.
- Resource spending uses conditional nonnegative updates and a transaction with spend/mission evidence. Detect insufficient balance explicitly. Reload, response loss, and restart must never recreate spent ammunition.
- Define reserve/commit/refund policy and reload reconciliation before combat integration. Do not accept arbitrary client balances or trust a mission result to award resources without validation.
- API responses represent committed state and carry an ordering/version mechanism. Use stable error codes and appropriate HTTP status; log internal details with a request ID, without leaking stack traces/database paths to clients.
- Configure connection pragmas and transaction/concurrency handling deliberately. Test foreign keys, busy/lock behavior, and migration durability against the chosen SQLite driver; do not assume all drivers behave alike.
- Version Drizzle migrations and verify fresh and upgrade paths with fixture data. Never silently drop/reset user data or generate migrations by guessing an unseen schema.
- Persist tutorial progress, mission progress, and dialogue history with idempotent transitions. Keep game death endpoints unable to mutate task completion. Define identity scope before exposing the server beyond the local MVP.
- Test real SQLite rollback, parallel completion/spending, reopening/deletion history, server restart, response loss, and invalid input. Keep test databases separate from user data.
