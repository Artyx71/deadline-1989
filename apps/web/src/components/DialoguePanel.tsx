import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface DialoguePanelProps {
  speaker: string; lines: string[]; portrait?: number; onComplete: () => void; onClose: () => void;
  onTextSound?: () => void; reducedMotion?: boolean;
  cinematic?: boolean;
}

export function DialoguePanel({ speaker, lines, portrait = 0, onComplete, onClose, onTextSound, reducedMotion = false, cinematic = false }: DialoguePanelProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [characters, setCharacters] = useState(0);
  const typingTimer = useRef<number | null>(null);
  const textSound = useRef(onTextSound);
  textSound.current = onTextSound;
  const line = lines[lineIndex] ?? '';
  const revealed = reducedMotion || characters >= line.length;
  useEffect(() => {
    setCharacters(0);
    if (reducedMotion) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1; setCharacters((previous) => Math.max(previous, count));
      if (count % 3 === 0) textSound.current?.();
      if (count >= line.length) window.clearInterval(timer);
    }, 25);
    typingTimer.current = timer;
    return () => window.clearInterval(timer);
  }, [line, reducedMotion]);
  const advance = () => {
    if (!revealed) { if (typingTimer.current !== null) window.clearInterval(typingTimer.current); setCharacters(line.length); }
    else if (lineIndex < lines.length - 1) setLineIndex((index) => index + 1);
    else onComplete();
  };
  return <Modal title="ВХОДЯЩИЙ ВЫЗОВ" onClose={onClose} className={`dialogue-panel ${cinematic ? 'dialogue-intro' : ''}`}>
    <div className="dialogue-layout">
      <div className="dialogue-portrait" aria-hidden="true" style={{ backgroundPosition: `${portrait === 0 ? '0%' : '100%'} 0` }} />
      <div className="dialogue-copy"><h3>{speaker}</h3>
        <button className="dialogue-text" onClick={advance} aria-label={revealed ? 'Продолжить диалог' : 'Показать текст диалога'} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); advance(); } }}>
          <span aria-hidden="true">{revealed ? line : line.slice(0, characters)}<span className="text-cursor">▌</span></span><span className="sr-only">{line}</span>
        </button>
        <div className="dialogue-actions"><span>{String(lineIndex + 1).padStart(2, '0')} / {String(lines.length).padStart(2, '0')}</span><button onClick={onClose}>НЕ ОТВЕЧАТЬ</button><button data-testid="dialogue-advance" onClick={advance} data-autofocus>{revealed ? '[ENTER] ДАЛЕЕ' : '[ENTER] ПОКАЗАТЬ'}</button></div>
      </div>
    </div>
  </Modal>;
}
