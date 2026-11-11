import { z } from 'zod';
import type { WorldMap } from '@deadline/shared';

const point = z.object({ x: z.number(), y: z.number() });
const mapSchema = z.object({
  width: z.number().positive().max(8192),
  height: z.number().positive().max(8192),
  tileSize: z.number().positive(),
  spawn: point,
  colliders: z.array(point.extend({ width: z.number().positive(), height: z.number().positive() })),
  interactions: z.array(
    point.extend({
      id: z.enum(['computer', 'telephone', 'cabinet', 'television', 'exit', 'training']),
      label: z.string(),
      radius: z.number().positive().optional(),
    }),
  ),
  enemies: z.array(point.extend({ type: z.enum(['grunt', 'gunner']) })).optional(),
});

/** Parse into a fresh object: scene overrides must not mutate Phaser's cache. */
export function readWorldMap(value: unknown): WorldMap {
  return mapSchema.parse(value);
}
