import { describe, expect, it } from 'vitest';
import { actorRect, lineOfSight, movement, segmentRect } from './geometry';
import { findPath } from './pathfinding';

describe('movement and collision geometry', () => {
  it('keeps diagonal and cardinal speeds equal and zero input stationary', () => {
    expect(Math.hypot(...Object.values(movement(1, 1, 220)))).toBeCloseTo(220);
    expect(movement(0, 0, 220)).toEqual({ x: 0, y: 0 });
    expect(movement(1, 0, 220)).toEqual({ x: 220, y: 0 });
  });
  it('sweeps a fast projectile through a thin wall without tunnelling', () => {
    expect(
      segmentRect({ x: 0, y: 20 }, { x: 100, y: 20 }, { x: 50, y: 0, width: 1, height: 40 }),
    ).toBe(0.5);
    expect(
      segmentRect({ x: 0, y: 50 }, { x: 100, y: 50 }, { x: 50, y: 0, width: 1, height: 40 }),
    ).toBeNull();
  });
  it('blocks enemy vision and handles parallel lines safely', () => {
    expect(
      lineOfSight({ x: 10, y: 0 }, { x: 10, y: 50 }, [{ x: 0, y: 20, width: 20, height: 2 }]),
    ).toBe(false);
    expect(
      segmentRect({ x: 30, y: 0 }, { x: 30, y: 50 }, { x: 0, y: 20, width: 20, height: 2 }),
    ).toBeNull();
  });
  it('routes around obstacles instead of walking through walls', () => {
    const wall = { x: 64, y: 0, width: 16, height: 80 };
    const path = findPath({ x: 24, y: 40 }, { x: 120, y: 40 }, [wall], 160, 128);
    expect(path.length).toBeGreaterThan(6);
    for (let i = 1; i < path.length; i++)
      expect(lineOfSight(path[i - 1]!, path[i]!, [wall])).toBe(true);
    expect(path.some((p) => p.y >= 88)).toBe(true);
  });
  it('returns no route for a sealed destination', () => {
    expect(
      findPath(
        { x: 24, y: 24 },
        { x: 120, y: 24 },
        [{ x: 64, y: 0, width: 32, height: 128 }],
        160,
        128,
      ),
    ).toEqual([]);
    expect(actorRect({ x: 10, y: 10 }).width).toBe(18);
  });
});
