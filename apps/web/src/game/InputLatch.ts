export type DiscreteAction = 'interact' | 'reload' | 'melee' | 'dash' | 'fire';

/** Preserve a tap even when keydown and keyup both occur between two frames. */
export class InputLatch {
  private pending = new Set<DiscreteAction>();
  press(action: DiscreteAction, repeat = false) {
    if (!repeat) this.pending.add(action);
  }
  consume(action: DiscreteAction): boolean {
    return this.pending.delete(action);
  }
  clear() {
    this.pending.clear();
  }
}
