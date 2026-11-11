import type { Difficulty, Task } from '@deadline/shared';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  normal: 'Обычная',
  hard: 'Сложная',
};
export const TASK_STATUS_LABELS: Record<Task['status'], string> = {
  active: 'В работе',
  completed: 'Выполнено',
};
export const FILTER_LABELS = {
  active: 'КОНТРАКТЫ В РАБОТЕ',
  completed: 'ВЫПОЛНЕННЫЕ КОНТРАКТЫ',
  all: 'ВСЕ КОНТРАКТЫ',
} as const;
