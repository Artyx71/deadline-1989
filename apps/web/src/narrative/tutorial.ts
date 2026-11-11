import { tutorialSteps, type TutorialProgress, type TutorialStep } from '@deadline/shared';

export const TUTORIAL_HINTS: Record<TutorialStep, string> = {
  wake: 'ПЕРВЫЙ ЗВОНОК · Просыпайся. Звонит телефон. Обучение можно пропустить в любой момент.',
  movement: 'WASD — движение · Иди на звонок телефона. В квартире безопасно.',
  'first-call': 'Подойди к телефону и нажми E. Звонок всегда может подождать.',
  computer: 'Найди компьютер. Нажми рядом E или открой терминал задач клавишей Tab.',
  'create-task': 'Создай настоящую задачу. Отмечай её выполненной только после настоящей работы; для обучения это не нужно.',
  rewards: 'За выполненную задачу получишь патроны и XP один раз. Бой не выполняет задачи. Когда будешь готов, иди на тренировку.',
  training: 'ТРЕНИРОВКА · Учебные патроны временные. Твой сохранённый запас хранится отдельно.',
  aim: 'Двигай мышью для прицеливания. Наведи прицел на учебную мишень.',
  shoot: 'Левая кнопка мыши — выстрел. Бесплатные патроны доступны только на тренировке.',
  reload: 'Нажми R для перезарядки. В магазине шесть патронов; перезаряжайся за укрытием.',
  melee: 'Нажми F или правую кнопку мыши рядом с мишенью для удара. Рукопашной патроны не нужны.',
  'second-call': 'Вернись в квартиру. Телефон снова звонит; нажми E, чтобы ответить.',
  complete: 'ПЕРВЫЙ ЗВОНОК ЗАВЕРШЁН · ПЕРВАЯ СМЕНА доступна. У выхода выбери снаряжение или нажми Tab для своих задач.',
};

export type TutorialAction = 'moved' | 'aimed' | 'shot' | 'reloaded' | 'melee'
  | 'first-call' | 'computer' | 'task-created' | 'training' | 'second-call';

/** Ordered cursor only; callers persist the returned step through the API. */
export function nextTutorialStep(current: TutorialStep): TutorialStep {
  const index = tutorialSteps.indexOf(current);
  return tutorialSteps[Math.min(index + 1, tutorialSteps.length - 1)] ?? 'complete';
}

const actions: Record<Exclude<TutorialStep, 'complete'>, TutorialAction> = {
  wake: 'moved', movement: 'moved', 'first-call': 'first-call', computer: 'computer',
  'create-task': 'task-created', rewards: 'training', training: 'training',
  aim: 'aimed', shoot: 'shot', reload: 'reloaded', melee: 'melee', 'second-call': 'second-call',
};

/**
 * Out-of-order actions cannot advance the lesson or change real tasks/resources.
 * Apartment readiness may advance wake with nextTutorialStep before movement.
 * The training interaction advances rewards -> training; training readiness then
 * advances training -> aim. The separate steps keep the reward explanation visible.
 */
export function reduceTutorialStep(current: TutorialStep, action: TutorialAction): TutorialStep {
  if (current === 'complete' || actions[current] !== action) return current;
  return nextTutorialStep(current);
}

/** Persist this explicit skip through the API; do not synthesize task completion. */
export function skipTutorial(): TutorialProgress {
  return { step: 'complete', completed: true, skipped: true };
}
