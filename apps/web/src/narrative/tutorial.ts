import { tutorialSteps, type TutorialProgress, type TutorialStep } from '@deadline/shared';

export const TUTORIAL_HINTS: Record<TutorialStep, string> = {
  wake: 'Ответь на первый звонок. Он объяснит, как реальные дела дают патроны для игры. Обучение можно пропустить.',
  movement: 'Осмотрись и подойди к телефону. WASD — движение, E у телефона — ответить. В квартире безопасно.',
  'first-call': 'Узнай, с чего начать: ответь на звонок кнопкой ниже или нажми E у телефона.',
  computer: 'Запиши своё первое реальное дело. Подойди к компьютеру и нажми E или открой список задач клавишей Tab.',
  'create-task': 'Добавь в список дело из своей жизни. Достаточно его записать: отмечать выполненным для обучения не нужно.',
  rewards: 'Перейди к бесплатной тренировке. Своё дело выполни в жизни, затем отметь в списке — получишь патроны и XP один раз. Бой задачи не выполняет.',
  training: 'Научись стрелять без риска для своих патронов. Здесь учебный запас: настоящие патроны и XP не меняются.',
  aim: 'Наведи прицел на учебную мишень: двигай мышью.',
  shoot: 'Выстрели в мишень левой кнопкой мыши. Учебные патроны бесплатны и не попадают в боевой запас.',
  reload: 'Перезаряди пистолет клавишей R. В магазине шесть патронов; в бою перезаряжайся за укрытием.',
  melee: 'Подойди к мишени и ударь: F или правая кнопка мыши. Для ближнего боя патроны не нужны.',
  'second-call': 'Получи первую миссию: ответь на звонок кнопкой ниже или нажми E у телефона в квартире.',
  complete: 'Первая миссия открыта. Подойди к выходу и выбери снаряжение. Для своих реальных дел в любой момент нажми Tab.',
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
