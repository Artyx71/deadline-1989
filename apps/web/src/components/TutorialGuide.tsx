import type { TutorialProgress } from '@deadline/shared';
import { TUTORIAL_HINTS } from '../narrative/tutorial';

interface TutorialGuideProps { tutorial: TutorialProgress; busy: boolean; onSkip: () => void; onTraining: () => void; onTerminal: () => void; onPhone: () => void }
export function TutorialGuide({ tutorial, busy, onSkip, onTraining, onTerminal, onPhone }: TutorialGuideProps) {
  if (tutorial.completed || tutorial.skipped) return null;
  return <aside className="tutorial-guide" aria-label="Обучение «Первый звонок»"><header><span>ПЕРВЫЙ ЗВОНОК</span><button data-testid="tutorial-skip" onClick={onSkip} disabled={busy}>ПРОПУСТИТЬ</button></header>
    <p>{TUTORIAL_HINTS[tutorial.step]}</p>
    {(tutorial.step === 'computer' || tutorial.step === 'create-task') && <button data-testid="tutorial-terminal" className="tutorial-action" onClick={onTerminal}>ОТКРЫТЬ ТЕРМИНАЛ ↵</button>}
    {tutorial.step === 'rewards' && <><p className="tutorial-reward-explanation">ЛЁГКАЯ: 3 ПАТР. / 50 ОПЫТА · ОБЫЧНАЯ: 6 / 100 · СЛОЖНАЯ: 12 / 200. Отмечайте задачу выполненной после реальной работы. Бой не выполняет её за вас.</p><button data-testid="tutorial-training" className="tutorial-action" onClick={onTraining} disabled={busy}>НА ТРЕНИРОВКУ / УЧЕБНЫЕ ПАТРОНЫ ↗</button></>}
    {(tutorial.step === 'first-call' || tutorial.step === 'second-call') && <button data-testid="tutorial-answer" className="tutorial-action" onClick={onPhone} disabled={busy}>ОТВЕТИТЬ НА ЗВОНОК ↵</button>}
  </aside>;
}
