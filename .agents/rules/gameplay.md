# Gameplay rules

- Normalize movement vectors before applying speed; compute physics using elapsed time/engine stepping consistently. Verify equal diagonal/cardinal speed, held keys, rapid direction changes, and low frame rates.
- Convert pointer coordinates through the active camera for aim. Exclude terminal/HUD clicks and browser focus changes from firing. Pause blocks movement, AI, projectiles, and applicable timers consistently.
- Use explicit Tiled layers/properties for solid collision and sight blocking. Verify player/enemy bodies and door state against these layers. Test corners, thin walls, and fast projectiles; use swept collision where discrete steps miss obstacles.
- Define weapon fire rate, magazine, reload, melee range, and dash rules as data. Prevent fire during reload/death/transition; reloading transfers authorized rounds and never creates ammunition. Melee remains usable at zero ammo.
- Persistent ammunition must be committed or safely reserved by the backend before a visible shot is permitted under the agreed protocol. Never persist an optimistic client balance or refill from stale local state on reload. Define unused reservation policy before batching consumption.
- Use explicit enemy FSM states (idle, patrol, chase, attack, dead) and legal transitions. Sight checks include range and solid-obstacle occlusion; lose sight according to documented rules rather than following the player through walls.
- One hit kills the player for MVP. Resolve death once, stop combat, clean the mission, and return to apartment. Death changes no real task status or reward eligibility. Preserve spent ammunition.
- Model mission start, active, won, failed, and returning transitions explicitly. Victory/death races resolve once; backend progress writes are idempotent. Restarting a mission cannot duplicate rewards or unlocks.
- Keep training ammunition isolated and nonpersistent; tutorial shooting never requires a false completed task. Test skip and returning to normal resources.
- Profile representative combat before adding pools. When pooling, reset velocity, lifetime, collision flags, animation, and listeners; assert inactive objects cannot deal damage.
