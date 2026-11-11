import { describe, expect, it } from 'vitest';
import { HitStop, WeaponState } from './WeaponState';
import { nextEnemyState, type Perception } from './enemyState';
import { firstImpact, clearPath, lineOfSight } from './geometry';
import { readWorldMap } from './mapData';
import { InputLatch } from './InputLatch';

describe('discrete input latching', () => {
  it('retains a complete tap until its next simulation frame and consumes it once', () => {
    const input = new InputLatch();
    input.press('interact');
    // Keyup intentionally does not cancel a command waiting for a frame.
    expect(input.consume('reload')).toBe(false);
    expect(input.consume('interact')).toBe(true);
    expect(input.consume('interact')).toBe(false);
    input.press('fire');
    expect(input.consume('fire')).toBe(true);
    expect(input.consume('fire')).toBe(false);
  });
  it('ignores OS repeat and discards menu inputs on pause or shutdown', () => {
    const input = new InputLatch();
    input.press('reload', true);
    expect(input.consume('reload')).toBe(false);
    input.press('reload'); input.press('melee'); input.press('dash'); input.press('fire'); input.clear();
    expect(input.consume('reload')).toBe(false);
    expect(input.consume('melee')).toBe(false);
    expect(input.consume('dash')).toBe(false);
    expect(input.consume('fire')).toBe(false);
  });
});

describe('authorized weapon timing and conservation', () => {
  it('waits for authorization and blocks a reload while spending is unresolved', () => {
    const weapon = new WeaponState(12);
    expect(weapon.requestShot(0)).toBe(true);
    expect(weapon.magazine).toBe(6);
    expect(weapon.requestShot(1000)).toBe(false);
    expect(weapon.reload(1000)).toBe(false);
    expect(weapon.resolveShot(1000, true)).toBe(true);
    expect(weapon.magazine + weapon.reserve).toBe(11);
    expect(weapon.resolveShot(1000, true)).toBe(false);
    expect(weapon.requestShot(1249)).toBe(false);
    expect(weapon.requestShot(1250)).toBe(true);
  });
  it('never consumes local ammunition on denied or failed authorization', () => {
    const weapon = new WeaponState(3);
    weapon.requestShot(0); weapon.resolveShot(100, false);
    expect(weapon.magazine).toBe(3);
    expect(weapon.reserve).toBe(0);
    expect(weapon.requestShot(250)).toBe(true);
  });
  it('transfers only existing reserve after 900 ms of active simulation', () => {
    const weapon = new WeaponState(8);
    weapon.requestShot(0); weapon.resolveShot(0, true);
    expect(weapon.reload(250)).toBe(true);
    expect(weapon.requestShot(5000)).toBe(false);
    expect(weapon.advance(1149)).toBe(false);
    expect(weapon.magazine).toBe(5);
    expect(weapon.advance(1150)).toBe(true);
    expect([weapon.magazine, weapon.reserve]).toEqual([6, 1]);
    expect(weapon.advance(2000)).toBe(false);
    expect(weapon.magazine + weapon.reserve).toBe(7);
  });
  it('keeps melee available without ammunition with a 400 ms cooldown', () => {
    const weapon = new WeaponState(0);
    expect(weapon.requestShot(0)).toBe(false);
    expect(weapon.reload(0)).toBe(false);
    expect(weapon.melee(0)).toBe(true);
    expect(weapon.melee(399)).toBe(false);
    expect(weapon.melee(400)).toBe(true);
    expect(weapon.magazine + weapon.reserve).toBe(0);
  });
  it('releases hit stop without requiring the frozen simulation clock to tick', () => {
    const stop = new HitStop();
    stop.request(35);
    expect(stop.advance(16)).toBe(true);
    expect(stop.advance(16)).toBe(true);
    expect(stop.advance(3)).toBe(false);
    stop.request(35); stop.request(10);
    expect(stop.advance(34)).toBe(true);
    expect(stop.advance(1)).toBe(false);
  });
  it('resumes a partial hit stop after terminal pause without consuming hidden time', () => {
    const stop = new HitStop();
    stop.request(35);
    expect(stop.advance(16)).toBe(true);
    expect(stop.advance(5000, true)).toBe(true);
    expect(stop.advance(18)).toBe(true);
    expect(stop.advance(1)).toBe(false);
  });
});

describe('enemy perception and telegraph states', () => {
  const baseline: Perception = { state: 'PATROL', since: 0, lastSeenAt: 0, now: 1000, visible: true, distance: 20, attackRange: 29 };
  it('gives a newly detected target a 430 ms reaction window before chasing', () => {
    expect(nextEnemyState(baseline)).toBe('ALERT');
    expect(nextEnemyState({ ...baseline, state: 'ALERT', since: 1000, now: 1429 })).toBe('ALERT');
    expect(nextEnemyState({ ...baseline, state: 'ALERT', since: 1000, now: 1430 })).toBe('CHASE');
    expect(nextEnemyState({ ...baseline, state: 'CHASE' })).toBe('ATTACK');
  });
  it('searches using last sight time instead of an unrelated attack start time', () => {
    expect(nextEnemyState({ ...baseline, state: 'ATTACK', since: 0, lastSeenAt: 999, now: 1000, visible: false })).toBe('CHASE');
    expect(nextEnemyState({ ...baseline, state: 'CHASE', lastSeenAt: 1000, now: 1699, visible: false })).toBe('CHASE');
    expect(nextEnemyState({ ...baseline, state: 'CHASE', lastSeenAt: 1000, now: 1700, visible: false })).toBe('SEARCH');
    expect(nextEnemyState({ ...baseline, state: 'SEARCH', since: 1700, now: 5100, visible: false })).toBe('PATROL');
  });
  it('never attacks without visibility and never revives dead enemies', () => {
    expect(nextEnemyState({ ...baseline, state: 'CHASE', visible: false, lastSeenAt: 999 })).toBe('CHASE');
    expect(nextEnemyState({ ...baseline, state: 'DEAD' })).toBe('DEAD');
    expect(nextEnemyState({ ...baseline, state: 'CHASE', distance: 250, attackRange: 220 })).toBe('CHASE');
  });
});

describe('projectile and body clearance', () => {
  it('hits a wall immediately in front of the muzzle instead of spawning past it', () => {
    const hit = firstImpact({ x: 0, y: 0 }, { x: 30, y: 0 }, [{ x: 6, y: -5, width: 1, height: 10 }], [{ rect: { x: 20, y: -4, width: 8, height: 8 }, value: 'enemy' }]);
    expect(hit?.target).toBeNull();
    expect(hit?.fraction).toBeCloseTo(5 / 30);
  });
  it('resolves the nearest target and gives a touching wall priority over an actor', () => {
    const wall = { x: 20, y: -5, width: 2, height: 10 };
    const near = { rect: { x: 8, y: -4, width: 4, height: 8 }, value: 'near' };
    const tie = { rect: { x: 19, y: -4, width: 4, height: 8 }, value: 'behind' };
    expect(firstImpact({ x: 0, y: 0 }, { x: 100, y: 0 }, [wall], [tie, near])?.target).toBe('near');
    expect(firstImpact({ x: 0, y: 0 }, { x: 100, y: 0 }, [wall], [tie])?.target).toBeNull();
  });
  it('distinguishes a clear sight ray from a route too narrow for an enemy body', () => {
    const walls = [{ x: 20, y: 16, width: 10, height: 10 }];
    expect(lineOfSight({ x: 0, y: 10 }, { x: 50, y: 10 }, walls)).toBe(true);
    expect(clearPath({ x: 0, y: 10 }, { x: 50, y: 10 }, walls)).toBe(false);
  });
});

describe('map data boundary', () => {
  const map = { width: 100, height: 100, tileSize: 16, spawn: { x: 10, y: 10 }, colliders: [{ x: 0, y: 0, width: 4, height: 100 }], interactions: [] };
  it('rejects invalid geometry and copies cached data before scene overrides', () => {
    const parsed = readWorldMap(map);
    parsed.colliders[0]!.width = 10;
    expect(map.colliders[0]!.width).toBe(4);
    expect(() => readWorldMap({ ...map, colliders: [{ x: 0, y: 0, width: -1, height: 5 }] })).toThrow();
  });
});
