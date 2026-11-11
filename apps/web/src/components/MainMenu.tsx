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
    { label: 'START GAME', action: onStart, disabled: !canStart },
    { label: 'CONTINUE', action: onContinue, disabled: !canContinue },
    { label: 'SETTINGS', action: onSettings },
    { label: 'CREDITS', action: onCredits },
  ];
  useEffect(() => { buttons.current[0]?.focus(); }, []);

  return <section className="main-menu" aria-label="Main menu" onKeyDown={(event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    let next = (selected + direction + options.length) % options.length;
    if (options[next]?.disabled) next = (next + direction + options.length) % options.length;
    setSelected(next); buttons.current[next]?.focus();
  }}>
    <div className="menu-sky" aria-hidden="true" />
    <div className="menu-horizon" aria-hidden="true" />
    <div className="vcr-label"><span className="recording-dot" /> PLAY <span aria-hidden="true">▸</span><span className="vcr-channel">CH 03 / STEREO</span></div>
    <div className="menu-content">
      <p className="menu-eyebrow">A PRODUCTIVITY CRIME THRILLER</p>
      <h1 className="game-logo"><span>DEADLINE</span><small>1989</small></h1>
      <p className="menu-tagline">YOUR WORK. YOUR AMMUNITION.</p>
      <nav className="menu-options" aria-label="Game options">
        {options.map((option, index) => <button key={option.label} ref={(node) => { buttons.current[index] = node; }}
          disabled={option.disabled} className={selected === index ? 'selected' : ''}
          data-testid={`menu-${option.label.toLowerCase().replaceAll(' ', '-')}`}
          onFocus={() => setSelected(index)} onPointerEnter={() => { if (!option.disabled) setSelected(index); }} onClick={option.action}>
          <span className="menu-arrow" aria-hidden="true">›</span>{option.label}<span className="menu-option-index">0{index + 1}</span>
        </button>)}
      </nav>
      <p className="menu-hint"><kbd>↑</kbd><kbd>↓</kbd> SELECT <span>·</span> <kbd>ENTER</kbd> CONFIRM</p>
    </div>
    <footer className="menu-footer"><div>PM 11:47<br />OCT 26 1989</div><p>THE CITY NEVER FINISHES ITS WORK.<br /><span>NEITHER DO YOU.</span></p><span className="tape-counter">SP ▸ 00:00:01</span></footer>
    <div className="vhs-grain" aria-hidden="true" />
  </section>;
}
