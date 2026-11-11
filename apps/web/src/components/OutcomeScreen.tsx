import { useEffect } from 'react';
import type { MissionStats } from '@deadline/shared';
import { Modal } from './Modal';

interface OutcomeScreenProps {
  result: 'dead' | 'cleared';
  stats: MissionStats;
  onReturn: () => void;
  onRetry?: () => void;
}

export function OutcomeScreen({ result, stats, onReturn, onRetry }: OutcomeScreenProps) {
  const cleared = result === 'cleared';
  const seconds = Math.floor(stats.durationMs / 1000);
  const time = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const accuracy = stats.shotsFired
    ? `${Math.min(100, Math.round((stats.hits / stats.shotsFired) * 100))}%`
    : '—';
  const rows = [
    ['ВРЕМЯ ЗАДАНИЯ', time],
    ['ПРОТИВНИКОВ УБИТО', `${stats.kills} / 6`],
    ['ВЫСТРЕЛОВ', `${stats.shotsFired}`],
    ['ТОЧНОСТЬ', accuracy],
    ['ПАТРОНОВ ПОТРАЧЕНО', `${stats.shotsFired}`],
    ['УБИЙСТВ ВРУКОПАШНУ', `${stats.meleeKills}`],
  ];
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && onRetry && !cleared && !event.repeat) {
        event.preventDefault();
        onRetry();
      }
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [cleared, onRetry]);
  return (
    <Modal
      title={cleared ? 'ОТЧЁТ / ЗАДАНИЕ ВЫПОЛНЕНО' : 'ОТЧЁТ / ЗАДАНИЕ ПРОВАЛЕНО'}
      onClose={onReturn}
      className={`outcome-screen ${cleared ? 'outcome-cleared' : 'outcome-dead'}`}
    >
      <div className="outcome-art" aria-hidden="true" />
      <p className="panel-kicker">КОНТРАКТ 01 / НОЧНАЯ СМЕНА</p>
      <h2 className="outcome-title">{cleared ? 'ЭТАЖ ЗАЧИЩЕН' : 'ВЫ МЕРТВЫ'}</h2>
      <p className="outcome-subtitle">
        {cleared ? 'ОДНИМ ПОВОДОМ НЕ СПАТЬ СТАЛО МЕНЬШЕ.' : 'РАБОТА ДОЖДЁТСЯ ВАС И ЗАВТРА.'}
      </p>
      <dl className="outcome-stats">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="settlement-note">
        Оставшиеся патроны вернутся в запас. Ваши настоящие задачи не изменились.
      </p>
      {onRetry && !cleared && (
        <button className="button-secondary" onClick={onRetry}>
          [R] ПОПРОБОВАТЬ СНОВА
        </button>
      )}
      <button className="button-primary" data-testid="outcome-return" onClick={onReturn}>
        ВЕРНУТЬСЯ В КВАРТИРУ <span aria-hidden="true">↵</span>
      </button>
    </Modal>
  );
}
