import type { TutorialProgress } from '@deadline/shared';
import { TUTORIAL_HINTS } from '../narrative/tutorial';

interface TutorialGuideProps { tutorial: TutorialProgress; busy: boolean; onSkip: () => void; onTraining: () => void; onTerminal: () => void; onPhone: () => void }
export function TutorialGuide({ tutorial, busy, onSkip, onTraining, onTerminal, onPhone }: TutorialGuideProps) {
  if (tutorial.completed || tutorial.skipped) return null;
  return <aside className="tutorial-guide" aria-label="FIRST CALL tutorial"><header><span>FIRST CALL</span><button onClick={onSkip} disabled={busy}>SKIP TUTORIAL</button></header>
    <p>{TUTORIAL_HINTS[tutorial.step]}</p>
    {(tutorial.step === 'computer' || tutorial.step === 'create-task') && <button className="tutorial-action" onClick={onTerminal}>OPEN TASK TERMINAL ↵</button>}
    {tutorial.step === 'rewards' && <><p className="tutorial-reward-explanation">EASY: 3 AMMO / 50 XP · NORMAL: 6 / 100 · HARD: 12 / 200. Finish real work before completing a task. Combat never completes it for you.</p><button className="tutorial-action" onClick={onTraining} disabled={busy}>ENTER TRAINING / TEMPORARY AMMO ↗</button></>}
    {(tutorial.step === 'first-call' || tutorial.step === 'second-call') && <button className="tutorial-action" onClick={onPhone} disabled={busy}>ANSWER THE CALL ↵</button>}
  </aside>;
}
