export type EnemyState = 'IDLE' | 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'SEARCH' | 'DEAD';
export interface Perception {
  state: EnemyState;
  since: number;
  lastSeenAt: number;
  now: number;
  visible: boolean;
  distance: number;
  attackRange: number;
}

/** Detection, reaction time and memory are independent of rendering callbacks. */
export function nextEnemyState(input: Perception): EnemyState {
  const { state, since, lastSeenAt, now, visible, distance, attackRange } = input;
  if (state === 'DEAD') return state;
  if (visible && ['IDLE', 'PATROL', 'SEARCH'].includes(state)) return 'ALERT';
  if (state === 'ALERT') return now - since >= 430 ? 'CHASE' : 'ALERT';
  if (!visible && (state === 'CHASE' || state === 'ATTACK') && now - lastSeenAt >= 700)
    return 'SEARCH';
  if (state === 'SEARCH' && now - since >= 3400) return 'PATROL';
  if (state === 'IDLE' && now - since >= 700) return 'PATROL';
  if (visible && (state === 'CHASE' || state === 'ATTACK') && distance < attackRange)
    return 'ATTACK';
  if (state === 'ATTACK') return 'CHASE';
  return state;
}
