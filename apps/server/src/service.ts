import { createHash } from 'node:crypto';
import { createService as createDomainService, type ServiceOptions } from '@deadline/domain';
import type { Store } from './database.js';

export { rewardDefinitions, dialogueIds, type DialogueId } from '@deadline/domain';
export type { ServiceOptions } from '@deadline/domain';

export function createService(store: Store, options: ServiceOptions = {}) {
  return createDomainService(store, {
    ...options,
    // Existing native profiles retain their persisted SHA-256 fingerprints.
    fingerprint: (canonical) => createHash('sha256').update(canonical).digest('hex'),
  });
}
