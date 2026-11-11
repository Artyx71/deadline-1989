import type { Settings } from '@deadline/shared';
import { Modal } from './Modal';

interface SettingsPanelProps { settings: Settings; onChange: (patch: Partial<Settings>) => void; onClose: () => void }

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const volumes = [['masterVolume', 'MASTER VOLUME'], ['musicVolume', 'MUSIC VOLUME'], ['sfxVolume', 'SFX VOLUME']] as const;
  const switches = [['muted', 'MUTE ALL AUDIO'], ['streamerMode', 'STREAMER MODE'], ['reducedMotion', 'REDUCED MOTION'], ['crt', 'CRT SCANLINES']] as const;
  return <Modal title="SYSTEM CONFIGURATION" onClose={onClose} className="settings-panel">
    <p className="panel-kicker">PERSONAL SETTINGS / PROFILE PREFERENCES</p>
    <div className="settings-section"><h3>01 / AUDIO</h3>{volumes.map(([key, label]) => <label className="range-setting" key={key}>
      <span>{label}<output>{Math.round(settings[key] * 100)}%</output></span>
      <input aria-label={label} type="range" min="0" max="1" step="0.05" value={settings[key]} onChange={(event) => onChange({ [key]: Number(event.target.value) })} />
    </label>)}</div>
    <div className="settings-section"><h3>02 / PREFERENCES</h3>{switches.map(([key, label]) => <label className="toggle-setting" key={key}>
      <span>{label}{key === 'streamerMode' && <small>Only music cleared for streaming; uncertain tracks disabled.</small>}{key === 'reducedMotion' && <small>Reduce camera shake, transitions and animated text.</small>}</span>
      <input type="checkbox" checked={settings[key]} onChange={(event) => onChange({ [key]: event.target.checked })} /><span className="toggle-indicator" aria-hidden="true">{settings[key] ? 'ON' : 'OFF'}</span>
    </label>)}</div>
    <button className="button-primary" onClick={onClose}>RETURN TO THE CITY <span aria-hidden="true">↵</span></button>
  </Modal>;
}
