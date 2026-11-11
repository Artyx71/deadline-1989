import type { TutorialProgress, TutorialStep } from '@deadline/shared';
import { TUTORIAL_HINTS } from '../narrative/tutorial';

interface TutorialGuideProps { tutorial: TutorialProgress; busy: boolean; onSkip: () => void; onTraining: () => void; onTerminal: () => void; onPhone: () => void }

const OBJECTIVES: Record<TutorialStep, string> = {
  wake: 'Тебе звонят.',
  movement: 'Подойди к телефону.',
  'first-call': 'Ответь на первый звонок.',
  computer: 'Открой компьютер.',
  'create-task': 'Запиши настоящее дело.',
  rewards: 'Дела дают патроны и опыт.',
  training: 'Пройди короткую тренировку.',
  aim: 'Наведи прицел на мишень.',
  shoot: 'Сделай учебный выстрел.',
  reload: 'Перезаряди пистолет.',
  melee: 'Попробуй ближний бой.',
  'second-call': 'Возьми трубку ещё раз.',
  complete: 'Ты готов к ночной смене.',
};

export function TutorialGuide({ tutorial, busy, onSkip, onTraining, onTerminal, onPhone }: TutorialGuideProps) {
  if (tutorial.completed || tutorial.skipped) return null;
  const stage = ['wake', 'movement', 'first-call'].includes(tutorial.step) ? 0 : ['computer', 'create-task', 'rewards'].includes(tutorial.step) ? 1 : 2;
  return <aside className="tutorial-guide onboarding-guide" aria-label="Обучение «Первый звонок»">
    <header><span>ПЕРВЫЙ ЗВОНОК</span><button data-testid="tutorial-skip" onClick={onSkip} disabled={busy}>ПРОПУСТИТЬ</button></header>
    <ol className="tutorial-route" aria-label="Первые шаги">{['Звонок', 'Запиши дело', 'Тренировка'].map((label, index) => <li key={label} className={index === stage ? 'is-current' : index < stage ? 'is-complete' : ''} aria-current={index === stage ? 'step' : undefined}>
      <span aria-hidden="true">{index < stage ? '✓' : index + 1}</span>{label}
    </li>)}</ol>
    <div className="tutorial-objective" aria-live="polite" aria-atomic="true"><p>ШАГ {stage + 1} ИЗ 3</p><h2>{OBJECTIVES[tutorial.step]}</h2></div>
    <p className="tutorial-instruction">{TUTORIAL_HINTS[tutorial.step]}</p>
    {(tutorial.step === 'computer' || tutorial.step === 'create-task') && <><p className="tutorial-honesty-note">Для обучения достаточно записать дело. Отметь его выполненным после настоящей работы.</p><button data-testid="tutorial-terminal" className="tutorial-action" onClick={onTerminal}>ЗАПИСАТЬ ДЕЛО <span aria-hidden="true">↵</span></button></>}
    {tutorial.step === 'rewards' && <><p className="tutorial-honesty-note">Вход в тренировку — подсвеченная дверь справа внизу. Подойди и нажми E или начни этой кнопкой.</p><button data-testid="tutorial-training" className="tutorial-action" onClick={onTraining} disabled={busy}>НАЧАТЬ ТРЕНИРОВКУ <span aria-hidden="true">↗</span></button></>}
    {(tutorial.step === 'first-call' || tutorial.step === 'second-call') && <button data-testid="tutorial-answer" className="tutorial-action" onClick={onPhone} disabled={busy}>ОТВЕТИТЬ НА ЗВОНОК <span aria-hidden="true">↵</span></button>}
  </aside>;
}
