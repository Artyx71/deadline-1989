import { useEffect, useState } from 'react';

interface BootSequenceProps {
  progress: number; ready: boolean; failed: boolean; reducedMotion: boolean; onContinue(): void;
}
export function BootSequence({ progress, ready, failed, reducedMotion, onContinue }: BootSequenceProps) {
  const [phase, setPhase] = useState(reducedMotion ? 3 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    const timers = [450, 850, 1500].map((delay, index) => window.setTimeout(() => setPhase(index + 1), delay));
    return () => timers.forEach(window.clearTimeout);
  }, [reducedMotion]);
  const stage = reducedMotion ? 3 : phase;
  return <section className={`boot-screen boot-phase-${stage}`} aria-label="VHS startup sequence">
    <div className="boot-static" aria-hidden="true" />
    <div className="boot-tracking" aria-hidden="true" />
    <p className="boot-label">VHS SYSTEMS / INITIALIZING LOCAL PROFILE</p>
    <div className="boot-emblem"><h1>DEADLINE<span>: 1989</span></h1><span className="boot-edition">AN ORIGINAL PRODUCTIVITY CRIME THRILLER</span></div>
    <p role="status">{failed ? 'GAME RENDERER UNAVAILABLE / TASK TERMINAL ONLINE' : ready ? 'SIGNAL ACQUIRED' : 'LOADING GAME ASSETS'}</p>
    <progress aria-label="Game assets loaded" value={progress} max={1} />
    <p className="boot-tip">THE CITY CAN WAIT. YOUR REAL WORK COMES FIRST.</p>
    <button className="button-secondary" data-testid="boot-continue" disabled={!ready && !failed} onClick={onContinue}>{ready || failed ? stage < 3 ? 'SKIP CINEMATIC / OPEN MENU ↵' : 'ENTER THE CITY ↵' : 'INITIALIZING…'}</button>
    <span className="boot-timecode">TAPE 001 / OCT 26 1989 / 23:47</span>
  </section>;
}
