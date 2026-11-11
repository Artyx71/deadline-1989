import { useEffect, useRef, useState } from 'react';

interface MainMenuProps {
  onStart: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onCredits: () => void;
  canContinue: boolean;
  canStart?: boolean;
}

export function MainMenu({ onStart, onContinue, onSettings, onCredits, canContinue, canStart = true }: MainMenuProps) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const options = [
    { id: 'start-game', label: 'НАЧАТЬ ИГРУ', action: onStart, disabled: !canStart },
    { id: 'continue', label: 'ПРОДОЛЖИТЬ', action: onContinue, disabled: !canContinue },
    { id: 'settings', label: 'НАСТРОЙКИ', action: onSettings },
    { id: 'credits', label: 'АВТОРЫ', action: onCredits },
  ];
  useEffect(() => { buttons.current[0]?.focus(); }, []);

  return <section className="main-menu" aria-label="Главное меню" onKeyDown={(event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    let next = (selected + direction + options.length) % options.length;
    if (options[next]?.disabled) next = (next + direction + options.length) % options.length;
    setSelected(next); buttons.current[next]?.focus();
  }}>
    <div className="menu-sky" aria-hidden="true" />
    <div className="menu-horizon" aria-hidden="true" />
    <div className="vcr-label"><span className="recording-dot" /> ВОСПР. <span aria-hidden="true">▸</span><span className="vcr-channel">КАНАЛ 03 / СТЕРЕО</span></div>
    <div className="menu-content">
      <p className="menu-eyebrow">СПИСОК ДЕЛ × НОЧНОЙ ЭКШЕН</p>
      <h1 className="game-logo"><span>DEADLINE</span><small>1989</small></h1>
      <p className="menu-tagline">ВЫПОЛНЯЙ ДЕЛА. ПОЛУЧАЙ ПАТРОНЫ.</p>
      <nav className="menu-options" aria-label="Действия в меню">
        {options.map((option, index) => <button key={option.label} ref={(node) => { buttons.current[index] = node; }}
          disabled={option.disabled} className={selected === index ? 'selected' : ''}
          data-testid={`menu-${option.id}`}
          onFocus={() => setSelected(index)} onPointerEnter={() => { if (!option.disabled) setSelected(index); }} onClick={option.action}>
          <span className="menu-arrow" aria-hidden="true">›</span>{option.label}<span className="menu-option-index">0{index + 1}</span>
        </button>)}
      </nav>
      {import.meta.env.VITE_STATIC_PROFILE === '1' && <p className="menu-profile-note">Прогресс сохраняется в этом браузере. Синхронизации между устройствами нет.</p>}
      <p className="menu-hint"><kbd>↑</kbd><kbd>↓</kbd> ВЫБОР <span>·</span> <kbd>ENTER</kbd> ПОДТВЕРДИТЬ</p>
    </div>
    <footer className="menu-footer"><div>23:47<br />26 ОКТЯБРЯ 1989</div><p>У ГОРОДА ВСЕГДА ЕСТЬ ДЕЛА.<br /><span>У ВАС ТОЖЕ.</span></p><span className="tape-counter">ВОСПР. ▸ 00:00:01</span></footer>
    <div className="vhs-grain" aria-hidden="true" />
  </section>;
}
