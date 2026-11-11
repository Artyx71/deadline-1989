import type { Settings } from '@deadline/shared';
import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const desired = useRef<Partial<Settings>>({});
  useEffect(() => {
    const remaining = Object.fromEntries(
      Object.entries(desired.current).filter(
        ([key, value]) => settings[key as keyof Settings] !== value,
      ),
    ) as Partial<Settings>;
    desired.current = remaining;
    setDraft({ ...settings, ...remaining });
  }, [settings]);
  const change = (patch: Partial<Settings>) => {
    desired.current = { ...desired.current, ...patch };
    setDraft((previous) => ({ ...previous, ...patch }));
    onChange(patch);
  };
  const volumes = [
    ['masterVolume', 'ОБЩАЯ ГРОМКОСТЬ'],
    ['musicVolume', 'ГРОМКОСТЬ МУЗЫКИ'],
    ['sfxVolume', 'ГРОМКОСТЬ ЭФФЕКТОВ'],
  ] as const;
  const switches = [
    ['muted', 'БЕЗ ЗВУКА'],
    ['streamerMode', 'РЕЖИМ СТРИМЕРА'],
    ['reducedMotion', 'МЕНЬШЕ АНИМАЦИИ'],
    ['crt', 'ПОЛОСЫ ЭЛТ'],
  ] as const;
  return (
    <Modal title="НАСТРОЙКИ СИСТЕМЫ" onClose={onClose} className="settings-panel">
      <p className="panel-kicker">ЛИЧНЫЕ НАСТРОЙКИ / ПРОФИЛЬ</p>
      <div className="settings-section">
        <h3>01 / ЗВУК</h3>
        {volumes.map(([key, label]) => (
          <label className="range-setting" key={key}>
            <span>
              {label}
              <output>{Math.round(draft[key] * 100)}%</output>
            </span>
            <input
              data-testid={`settings-${key}`}
              aria-label={label}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draft[key]}
              onChange={(event) => change({ [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className="settings-section">
        <h3>02 / ПАРАМЕТРЫ</h3>
        {switches.map(([key, label]) => (
          <label className="toggle-setting" key={key}>
            <span>
              {label}
              {key === 'streamerMode' && (
                <small>Только музыка, разрешённая для трансляций. Остальные треки отключены.</small>
              )}
              {key === 'reducedMotion' && (
                <small>Меньше тряски камеры, переходов и анимированного текста.</small>
              )}
            </span>
            <input
              data-testid={`settings-${key}`}
              type="checkbox"
              checked={draft[key]}
              onChange={(event) => change({ [key]: event.target.checked })}
            />
            <span className="toggle-indicator" aria-hidden="true">
              {draft[key] ? 'ВКЛ' : 'ВЫКЛ'}
            </span>
          </label>
        ))}
      </div>
      <p className="panel-kicker" role="status">
        {Object.keys(desired.current).length ? 'СОХРАНЕНИЕ НАСТРОЕК…' : 'НАСТРОЙКИ ЗВУКА И ЭКРАНА'}
      </p>
      <button className="button-primary" onClick={onClose}>
        ВЕРНУТЬСЯ В ГОРОД <span aria-hidden="true">↵</span>
      </button>
    </Modal>
  );
}
