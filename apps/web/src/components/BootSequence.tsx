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
  return <section className={`boot-screen boot-phase-${stage}`} aria-label="Вступительная VHS-заставка">
    <div className="boot-static" aria-hidden="true" />
    <div className="boot-tracking" aria-hidden="true" />
    <p className="boot-label">VHS-СИСТЕМА / ЗАГРУЗКА ЛОКАЛЬНОГО ПРОФИЛЯ</p>
    <div className="boot-emblem"><h1>DEADLINE<span>: 1989</span></h1><span className="boot-edition">КРИМИНАЛЬНЫЙ ТРИЛЛЕР О ВАШИХ ДЕЛАХ</span></div>
    <p role="status">{failed ? 'ИГРА НЕДОСТУПНА / ТЕРМИНАЛ ЗАДАЧ РАБОТАЕТ' : ready ? 'СИГНАЛ ПОЛУЧЕН' : 'ЗАГРУЗКА ИГРОВЫХ РЕСУРСОВ'}</p>
    <progress aria-label="Загрузка игровых ресурсов" value={progress} max={1} />
    <p className="boot-tip">ГОРОД ПОДОЖДЁТ. СНАЧАЛА ВАШИ НАСТОЯЩИЕ ДЕЛА.</p>
    <button className="button-secondary" data-testid="boot-continue" disabled={!ready && !failed} onClick={onContinue}>{ready || failed ? stage < 3 ? 'ПРОПУСТИТЬ ЗАСТАВКУ / ОТКРЫТЬ МЕНЮ ↵' : 'ВОЙТИ В ГОРОД ↵' : 'ИНИЦИАЛИЗАЦИЯ…'}</button>
    <span className="boot-timecode">КАССЕТА 001 / 26 ОКТЯБРЯ 1989 / 23:47</span>
  </section>;
}
