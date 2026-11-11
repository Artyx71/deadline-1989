import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface NewGamePanelProps {
  busy: boolean;
  onStory: () => void;
  onClean: () => void;
  onClose: () => void;
}

export function NewGamePanel({ busy, onStory, onClean, onClose }: NewGamePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [consent, setConsent] = useState(false);
  const storyButton = useRef<HTMLButtonElement>(null);
  const confirmCheckbox = useRef<HTMLInputElement>(null);
  useEffect(() => { (confirming ? confirmCheckbox.current : storyButton.current)?.focus(); }, [confirming]);

  return <Modal title="НОВАЯ ИГРА" onClose={onClose} className="newgame-panel">
    {!confirming ? <div className="newgame-body">
      <p className="newgame-kicker">НОВАЯ НОЧЬ / ТВОЙ ВЫБОР</p>
      <h3>Начать с чистого профиля?</h3>
      <section className="newgame-choice newgame-choice-clean" aria-labelledby="newgame-clean-heading">
        <h4 id="newgame-clean-heading">Новая игра — чистый профиль</h4>
        <p>Пустой список дел, ноль патронов и опыта. Обучение и миссии начинаются сначала.</p>
        <button ref={storyButton} data-autofocus data-testid="newgame-clean" className="button-primary" disabled={busy} onClick={() => { setConsent(false); setConfirming(true); }}>НАЧАТЬ НОВУЮ ИГРУ</button>
      </section>
      <section className="newgame-choice newgame-choice-story" aria-labelledby="newgame-story-heading">
        <h4 id="newgame-story-heading">Повторить только сюжет</h4>
        <p>Отдельный вариант: повторить вступление и миссии, сохранив реальные дела, патроны и опыт.</p>
        <button data-testid="newgame-story" className="button-secondary" disabled={busy} onClick={onStory}>{busy ? 'ПОДГОТОВКА…' : 'ПОВТОРИТЬ СЮЖЕТ · СОХРАНИТЬ ДЕЛА'}</button>
      </section>
      <p className="newgame-settings-note">Настройки звука и экрана сохраняются в обоих случаях.</p>
    </div> : <div className="newgame-body newgame-confirmation">
      <p className="newgame-kicker">ВЫБРАНО: ЧИСТЫЙ ПРОФИЛЬ</p>
      <h3>Удалить все данные профиля?</h3>
      <p className="newgame-confirm-intro">Будут безвозвратно удалены:</p>
      <ul><li>Все настоящие задачи, в том числе выполненные.</li><li>История наград, патроны и опыт.</li><li>Сюжет, обучение и прогресс миссий.</li></ul>
      <p className="newgame-settings-note">Настройки звука и экрана сохранятся. Удаление остальных данных нельзя отменить.</p>
      <label className="newgame-consent"><input ref={confirmCheckbox} data-testid="newgame-confirm" type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} /><span>Я понимаю, что все мои задачи и игровой прогресс будут удалены без возможности восстановления.</span></label>
      <button data-testid="newgame-confirm-clean" className="button-danger" disabled={busy || !consent} onClick={() => { if (consent && !busy) onClean(); }}>{busy ? 'ОЧИСТКА ПРОФИЛЯ…' : 'УДАЛИТЬ ДАННЫЕ И НАЧАТЬ ЗАНОВО'}</button>
      <button className="newgame-back" disabled={busy} onClick={() => { setConsent(false); setConfirming(false); }}>← ВЕРНУТЬСЯ К ВЫБОРУ</button>
    </div>}
  </Modal>;
}
