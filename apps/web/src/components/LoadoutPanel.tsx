import { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface LoadoutPanelProps { available: number; unlocked: boolean; busy: boolean; onLaunch: (ammo: number) => void; onTraining: () => void; onClose: () => void }
export function LoadoutPanel({ available, unlocked, busy, onLaunch, onTraining, onClose }: LoadoutPanelProps) {
  const [carry, setCarry] = useState(Math.min(available, 12));
  useEffect(() => { setCarry((value) => Math.min(value, available)); }, [available]);
  return <Modal title="ДИСПЕТЧЕРСКАЯ / НОЧНАЯ СМЕНА" onClose={onClose} className="loadout-panel">
    <p className="panel-kicker">КОНТРАКТ 01 · 4 БОЙЦА / 2 СТРЕЛКА</p><h3>ОДНО ЗДАНИЕ.<br />БЕЗ ВТОРОГО ШАНСА.</h3>
    <p className="loadout-description">Закрытый офис. Шестеро задержались допоздна. Зачистите комнаты и возвращайтесь домой.</p>
    <div className="loadout-inventory"><span>ПАТРОНЫ В ЗАПАСЕ</span><strong>{available.toString().padStart(2, '0')}</strong></div>
    <label className="loadout-range">ПАТРОНЫ С СОБОЙ <output>{carry}</output><input aria-label="Патроны с собой" type="range" min="0" max={available} value={carry} onChange={(event) => setCarry(Number(event.target.value))} /></label>
    <p className="loadout-description">Патроны резервируются перед выходом. Потраченные не вернуть; оставшиеся вернутся после смерти или победы. Ближний бой доступен даже без патронов.</p>
    {!unlocked && <p className="loadout-locked">Пройдите или пропустите «ПЕРВЫЙ ЗВОНОК», чтобы открыть задание.</p>}
    <div className="loadout-actions"><button className="button-secondary" onClick={onTraining} disabled={busy}>НА ТРЕНИРОВКУ</button><button className="button-primary" data-testid="mission-launch" onClick={() => onLaunch(carry)} disabled={busy || !unlocked}>{busy ? 'РЕЗЕРВИРОВАНИЕ…' : 'НА ЗАДАНИЕ ↗'}</button></div>
  </Modal>;
}
