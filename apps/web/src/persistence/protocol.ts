import { z } from 'zod';

export const profileRequestSchema = z.object({
  id: z.string().min(1).max(128),
  path: z.string().min(1).max(500),
  method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
  body: z.unknown().optional(),
  key: z.string().optional(),
}).strict();

export type ProfileRequest = z.infer<typeof profileRequestSchema>;
export interface ProfileResponse { id: string; status: number; body: unknown }
export interface ProfileStorage {
  load(): Promise<Uint8Array | undefined>;
  save(bytes: Uint8Array): Promise<void>;
}

export class ProfileStorageError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'ProfileStorageError'; }
}
