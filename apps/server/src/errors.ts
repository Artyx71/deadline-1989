export class DomainError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
  }
}
export function missing(entity: string): never {
  const messages: Record<string, string> = { Task: 'Задача не найдена.', 'Mission attempt': 'Попытка прохождения не найдена.' };
  throw new DomainError(404, 'NOT_FOUND', messages[entity] ?? 'Объект не найден.');
}
export function conflict(code: string, message: string): never { throw new DomainError(409, code, message); }
