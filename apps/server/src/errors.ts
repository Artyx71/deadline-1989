export class DomainError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
  }
}
export function missing(entity: string): never { throw new DomainError(404, 'NOT_FOUND', `${entity} not found.`); }
export function conflict(code: string, message: string): never { throw new DomainError(409, code, message); }
