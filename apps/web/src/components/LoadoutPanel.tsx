import { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface LoadoutPanelProps { available: number; unlocked: boolean; busy: boolean; onLaunch: (ammo: number) => void; onTraining: () => void; onClose: () => void }
export function LoadoutPanel({ available, unlocked, busy, onLaunch, onTraining, onClose }: LoadoutPanelProps) {
  const [carry, setCarry] = useState(Math.min(available, 12));
  useEffect(() => { setCarry((value) => Math.min(value, available)); }, [available]);
  return <Modal title="DISPATCH / THE NIGHT SHIFT" onClose={onClose} className="loadout-panel">
    <p className="panel-kicker">CONTRACT 01 · FOUR GRUNTS / TWO GUNNERS</p><h3>ONE BUILDING.<br />NO SECOND CHANCES.</h3>
    <p className="loadout-description">A closed office. Six people who stayed too late. Clear every room, then come home.</p>
    <div className="loadout-inventory"><span>AVAILABLE AMMUNITION</span><strong>{available.toString().padStart(2, '0')}</strong></div>
    <label className="loadout-range">ROUNDS TO CARRY <output>{carry}</output><input aria-label="Rounds to carry" type="range" min="0" max={available} value={carry} onChange={(event) => setCarry(Number(event.target.value))} /></label>
    <p className="loadout-description">Rounds are reserved before departure. Only spent rounds are lost. Unused ammunition returns on death or victory. Melee always works, even at zero.</p>
    {!unlocked && <p className="loadout-locked">Complete or skip FIRST CALL to unlock this mission.</p>}
    <div className="loadout-actions"><button className="button-secondary" onClick={onTraining} disabled={busy}>ENTER TRAINING</button><button className="button-primary" data-testid="mission-launch" onClick={() => onLaunch(carry)} disabled={busy || !unlocked}>{busy ? 'RESERVING…' : 'DEPLOY ↗'}</button></div>
  </Modal>;
}
