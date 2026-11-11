import { useEffect } from 'react';
import type { MissionStats } from '@deadline/shared';
import { Modal } from './Modal';

interface OutcomeScreenProps { result: 'dead' | 'cleared'; stats: MissionStats; onReturn: () => void; onRetry?: () => void }

export function OutcomeScreen({ result, stats, onReturn, onRetry }: OutcomeScreenProps) {
  const cleared = result === 'cleared';
  const seconds = Math.floor(stats.durationMs / 1000);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const accuracy = stats.shotsFired ? `${Math.min(100, Math.round(stats.hits / stats.shotsFired * 100))}%` : '—';
  const rows = [['MISSION TIME', time], ['ENEMIES ELIMINATED', `${stats.kills} / 6`], ['SHOTS FIRED', `${stats.shotsFired}`], ['ACCURACY', accuracy], ['AMMUNITION SPENT', `${stats.shotsFired}`], ['MELEE KILLS', `${stats.meleeKills}`]];
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && onRetry && !cleared && !event.repeat) { event.preventDefault(); onRetry(); }
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [cleared, onRetry]);
  return <Modal title={cleared ? 'MISSION REPORT / COMPLETE' : 'MISSION REPORT / TERMINATED'} onClose={onReturn} className={`outcome-screen ${cleared ? 'outcome-cleared' : 'outcome-dead'}`}>
    <div className="outcome-art" aria-hidden="true" />
    <p className="panel-kicker">CONTRACT 01 / THE NIGHT SHIFT</p>
    <h2 className="outcome-title">{cleared ? 'FLOOR CLEARED' : 'YOU ARE DEAD'}</h2>
    <p className="outcome-subtitle">{cleared ? 'ONE LESS THING KEEPING YOU AWAKE.' : 'THE WORK WILL STILL BE THERE TOMORROW.'}</p>
    <dl className="outcome-stats">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="settlement-note">Unused ammunition returns to inventory. Your real tasks remain unchanged.</p>
    {onRetry && !cleared && <button className="button-secondary" onClick={onRetry}>[R] TRY AGAIN</button>}
    <button className="button-primary" data-testid="outcome-return" onClick={onReturn}>RETURN TO APARTMENT <span aria-hidden="true">↵</span></button>
  </Modal>;
}
