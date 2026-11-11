import type { WorldRect } from '@deadline/shared';
import type { Point } from './geometry';

/** Four-neighbour A* with clearance; never cuts diagonally through wall corners. */
export function findPath(
  start: Point,
  goal: Point,
  walls: WorldRect[],
  width: number,
  height: number,
  cell = 16,
): Point[] {
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const blocked = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return true;
    const px = (x + 0.5) * cell;
    const py = (y + 0.5) * cell;
    return walls.some(
      (w) => px + 8 > w.x && px - 8 < w.x + w.width && py + 8 > w.y && py - 8 < w.y + w.height,
    );
  };
  const sx = Math.floor(start.x / cell),
    sy = Math.floor(start.y / cell);
  const gx = Math.floor(goal.x / cell),
    gy = Math.floor(goal.y / cell);
  const key = (x: number, y: number) => y * columns + x;
  const first = key(sx, sy),
    target = key(gx, gy);
  const open = new Set([first]);
  const came = new Map<number, number>();
  const cost = new Map([[first, 0]]);
  let reached = false;
  for (let iteration = 0; open.size && iteration < columns * rows; iteration++) {
    let current = first,
      best = Infinity;
    for (const id of open) {
      const score =
        (cost.get(id) ?? Infinity) +
        Math.abs((id % columns) - gx) +
        Math.abs(Math.floor(id / columns) - gy);
      if (score < best) {
        best = score;
        current = id;
      }
    }
    if (current === target) {
      reached = true;
      break;
    }
    open.delete(current);
    const x = current % columns,
      y = Math.floor(current / columns);
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const nx = x + (dx ?? 0),
        ny = y + (dy ?? 0);
      if (blocked(nx, ny)) continue;
      const id = key(nx, ny),
        next = (cost.get(current) ?? Infinity) + 1;
      if (next >= (cost.get(id) ?? Infinity)) continue;
      came.set(id, current);
      cost.set(id, next);
      open.add(id);
    }
  }
  if (!reached) return [];
  const result: Point[] = [];
  let id = target;
  while (id !== first) {
    result.unshift({
      x: ((id % columns) + 0.5) * cell,
      y: (Math.floor(id / columns) + 0.5) * cell,
    });
    const previous = came.get(id);
    if (previous === undefined) return [];
    id = previous;
  }
  return result;
}
