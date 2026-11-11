export const BALANCE = {
  speed: 220, dashSpeed: 400, dashDuration: 150, dashCooldown: 850,
  magazine: 6, fireInterval: 250, reloadDuration: 900, meleeCooldown: 400,
  meleeRange: 44, bulletSpeed: 760,
} as const;
export const ACTIONS = ['idle', 'walk', 'run', 'aim', 'shoot', 'reload', 'melee', 'hit', 'death', 'wake'] as const;
export type Action = typeof ACTIONS[number];
