import { BALANCE } from './constants';

/** Simulation inventory contains only rounds already authorized by the server. */
export class WeaponState {
  magazine: number;
  reserve: number;
  private reloadAt = 0;
  private fireAt = 0;
  private meleeAt = 0;
  private pending = false;

  constructor(rounds: number) {
    const ammunition = Math.max(0, Math.floor(rounds));
    this.magazine = Math.min(BALANCE.magazine, ammunition);
    this.reserve = ammunition - this.magazine;
  }
  get reloading() {
    return this.reloadAt > 0;
  }
  get shotPending() {
    return this.pending;
  }
  requestShot(now: number): boolean {
    if (this.pending || this.reloading || this.magazine <= 0 || now < this.fireAt) return false;
    this.pending = true;
    this.fireAt = now + BALANCE.fireInterval;
    return true;
  }
  resolveShot(now: number, authorized: boolean): boolean {
    if (!this.pending) return false;
    this.pending = false;
    if (!authorized) return false;
    this.magazine -= 1;
    this.fireAt = Math.max(this.fireAt, now + BALANCE.fireInterval);
    return true;
  }
  reload(now: number): boolean {
    if (this.pending || this.reloading || this.magazine >= BALANCE.magazine || this.reserve <= 0)
      return false;
    this.reloadAt = now + BALANCE.reloadDuration;
    return true;
  }
  advance(now: number): boolean {
    if (!this.reloadAt || now < this.reloadAt) return false;
    const rounds = Math.min(BALANCE.magazine - this.magazine, this.reserve);
    this.magazine += rounds;
    this.reserve -= rounds;
    this.reloadAt = 0;
    return true;
  }
  melee(now: number): boolean {
    if (this.pending || this.reloading || now < this.meleeAt) return false;
    this.meleeAt = now + BALANCE.meleeCooldown;
    this.fireAt = Math.max(this.fireAt, now + 100);
    return true;
  }
}

/** Consumed by unpaused frame deltas, independently of frozen simulation time. */
export class HitStop {
  private remaining = 0;
  get active() {
    return this.remaining > 0;
  }
  request(duration: number) {
    this.remaining = Math.max(this.remaining, duration);
  }
  advance(delta: number, externallyPaused = false) {
    if (externallyPaused) return this.active;
    this.remaining = Math.max(0, this.remaining - Math.max(0, delta));
    return this.active;
  }
}
