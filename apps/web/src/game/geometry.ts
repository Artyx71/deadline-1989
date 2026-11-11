import type { WorldRect } from '@deadline/shared';

export interface Point {
  x: number;
  y: number;
}
export function movement(x: number, y: number, speed: number): Point {
  const length = Math.hypot(x, y);
  return length ? { x: (x / length) * speed, y: (y / length) * speed } : { x: 0, y: 0 };
}
/** Slab intersection prevents fast projectiles from tunnelling through thin walls. */
export function segmentRect(start: Point, end: Point, rect: WorldRect, padding = 0): number | null {
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'y'] as const) {
    const delta = end[axis] - start[axis];
    const min = rect[axis] - padding;
    const max = rect[axis] + (axis === 'x' ? rect.width : rect.height) + padding;
    if (Math.abs(delta) < 1e-8) {
      if (start[axis] < min || start[axis] > max) return null;
      continue;
    }
    const a = (min - start[axis]) / delta;
    const b = (max - start[axis]) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}
export function lineOfSight(a: Point, b: Point, walls: WorldRect[]): boolean {
  return !walls.some((wall) => segmentRect(a, b, wall) !== null);
}
export function actorRect(point: Point, radius = 9): WorldRect {
  return { x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2 };
}

export function clearPath(a: Point, b: Point, walls: WorldRect[], radius = 8): boolean {
  return !walls.some((wall) => segmentRect(a, b, wall, radius) !== null);
}

/** Walls win equal-distance hits, preventing damage through a touching obstacle. */
export function firstImpact<T>(
  start: Point,
  end: Point,
  walls: WorldRect[],
  targets: { rect: WorldRect; value: T }[],
): { fraction: number; target: T | null } | null {
  let fraction = Infinity;
  let target: T | null = null;
  for (const wall of walls) {
    const hit = segmentRect(start, end, wall, 1);
    if (hit !== null && hit < fraction) {
      fraction = hit;
      target = null;
    }
  }
  for (const candidate of targets) {
    const hit = segmentRect(start, end, candidate.rect);
    if (hit !== null && hit < fraction) {
      fraction = hit;
      target = candidate.value;
    }
  }
  return fraction <= 1 ? { fraction, target } : null;
}
