import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import type { Overlay } from './store/ui';
import { useUi } from './store/ui';
import { useSession } from './features/session/useSession';
import { TaskTerminal } from './features/tasks/TaskTerminal';
import { MainMenu } from './components/MainMenu';
import { Modal } from './components/Modal';
import { SettingsPanel } from './components/SettingsPanel';
import { OutcomeScreen } from './components/OutcomeScreen';
import { DialoguePanel } from './components/DialoguePanel';
import { LoadoutPanel } from './components/LoadoutPanel';
import { TutorialGuide } from './components/TutorialGuide';
import { BootSequence } from './components/BootSequence';
import { soundscape, type MusicState } from './audio/Soundscape';
import { interactionText } from './game/interactionText';
import { TaskBrief } from './components/TaskBrief';
import { TelevisionPanel } from './components/TelevisionPanel';
import { NewGamePanel } from './components/NewGamePanel';
import { NightContract } from './components/NightContract';

if (import.meta.hot) import.meta.hot.accept('./game/createGame', () => window.location.reload());

export default function App() {
  const ui = useUi();
  const session = useSession();
  const host = useRef<HTMLDivElement>(null);
  const terminalReturn = useRef<Overlay>('none');
  const settingsReturn = useRef<Overlay>('none');
  const lastOverlay = useRef<Overlay>('none');
  const [focused, setFocused] = useState(document.hasFocus());
  const [gameFailed, setGameFailed] = useState(false);
  const [createOnOpen, setCreateOnOpen] = useState(false);
  const introShown = useRef(false);
  const call = useQuery({
    queryKey: ['next-call', session.state?.revision], queryFn: api.nextDialogue,
    enabled: Boolean(session.state) && ui.screen === 'game' && ui.scene === 'apartment',
    refetchInterval: 10000, retry: 1,
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (ui.overlay === 'terminal' && lastOverlay.current !== 'terminal') terminalReturn.current = lastOverlay.current;
    if (ui.overlay === 'settings' && lastOverlay.current !== 'settings') settingsReturn.current = lastOverlay.current;
    lastOverlay.current = ui.overlay;
  }, [ui.overlay]);

  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;
    import('./game/createGame').then(({ createGame }) => {
      if (disposed || !host.current) return;
      const game = createGame(host.current, sessionRef.current.port);
      sessionRef.current.controller.current = game;
      game.setPaused(true);
      game.setEffects(sessionRef.current.settings.reducedMotion);
      destroy = () => game.destroy();
    }).catch((error: unknown) => { setGameFailed(true); sessionRef.current.reportError(error); });
    return () => { disposed = true; destroy?.(); sessionRef.current.controller.current = null; };
  }, []);

  useEffect(() => {
    session.controller.current?.setPaused(ui.screen !== 'game' || ui.overlay !== 'none' || !focused || !session.gameReady);
  }, [ui.screen, ui.overlay, ui.scene, focused, session.readyVersion, session.controller]);
  useEffect(() => {
    // Replace an old mounted simulation after a layout update in development.
    if (import.meta.hot && session.gameReady && document.querySelector<HTMLCanvasElement>('canvas')?.dataset.layoutVersion !== 'studio-v3') window.location.reload();
  }, [session.gameReady, session.readyVersion]);
  useEffect(() => { session.controller.current?.setEffects(session.settings.reducedMotion); }, [session.settings.reducedMotion, session.controller]);
  useEffect(() => {
    const tutorial = session.state?.tutorial;
    const seen = session.state?.dialogueHistory.some(entry => entry.id === 'first-call');
    if (seen || tutorial?.completed || tutorial?.skipped) { introShown.current = false; return; }
    if (!tutorial || !['wake', 'movement', 'first-call'].includes(tutorial.step) || introShown.current || !session.gameReady || session.busy || ui.screen !== 'game' || ui.scene !== 'apartment' || ui.overlay !== 'none') return;
    const timer = window.setTimeout(() => { introShown.current = true; void sessionRef.current.answerPhone(); }, 850);
    return () => window.clearTimeout(timer);
  }, [session.state?.tutorial, session.state?.dialogueHistory, session.gameReady, session.busy, ui.screen, ui.scene, ui.overlay]);
  useEffect(() => {
    const tutorial = session.state?.tutorial;
    const objective = !tutorial ? null : tutorial.completed || tutorial.skipped ? session.state?.progress.unlocked ? 'exit' : null : ['wake', 'movement', 'first-call', 'second-call'].includes(tutorial.step) ? 'telephone' : ['computer', 'create-task'].includes(tutorial.step) ? 'computer' : tutorial.step === 'rewards' ? 'training' : null;
    session.controller.current?.setObjective?.(objective);
  }, [session.state?.tutorial, session.state?.progress.unlocked, session.gameReady, session.controller]);
  useEffect(() => {
    session.controller.current?.setPhoneRinging?.(Boolean(call.data?.next) && ui.scene === 'apartment');
  }, [call.data?.next, ui.scene, session.gameReady, session.controller]);
  useEffect(() => {
    if (ui.screen !== 'game' || ui.scene !== 'apartment' || ui.overlay !== 'none' || !focused) return;
    const ambience = window.setInterval(() => soundscape.sfx('ambience'), 11000);
    const phone = call.data?.next ? window.setInterval(() => soundscape.sfx('phone'), 4800) : null;
    if (call.data?.next) soundscape.sfx('phone');
    return () => { window.clearInterval(ambience); if (phone !== null) window.clearInterval(phone); };
  }, [ui.screen, ui.scene, ui.overlay, call.data?.next, focused]);
  useEffect(() => { soundscape.setSettings(session.settings); }, [session.settings]);
  useEffect(() => { soundscape.setSilenced(ui.overlay === 'television'); return () => soundscape.setSilenced(false); }, [ui.overlay]);
  useEffect(() => {
    let music: MusicState = 'APARTMENT';
    if (ui.screen !== 'game') music = 'MAIN_MENU';
    else if (ui.scene === 'combat') music = 'COMBAT';
    if (ui.overlay === 'terminal') music = 'TASK_TERMINAL';
    if (ui.overlay === 'dialogue') music = 'PHONE_DIALOGUE';
    if (ui.overlay === 'outcome' && session.outcome) music = session.outcome.result === 'dead' ? 'PLAYER_DEATH' : 'MISSION_CLEARED';
    soundscape.setState(music);
    soundscape.setPaused(!focused || ['pause', 'settings', 'credits', 'loadout', 'recovery', 'newgame'].includes(ui.overlay));
  }, [ui.screen, ui.scene, ui.overlay, focused, session.outcome]);
  useEffect(() => {
    const unlock = () => { void soundscape.unlock(); };
    window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
    return () => { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); soundscape.destroy(); };
  }, []);
  useEffect(() => {
    const focus = () => setFocused(document.hasFocus() && !document.hidden);
    const blur = () => setFocused(false);
    window.addEventListener('focus', focus); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', focus);
    return () => { window.removeEventListener('focus', focus); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', focus); };
  }, []);

  const openTerminal = () => {
    setCreateOnOpen(false);
    terminalReturn.current = ui.overlay === 'terminal' ? terminalReturn.current : ui.overlay;
    ui.setOverlay('terminal');
    if (session.state?.tutorial.step === 'computer') void session.advanceTutorial('computer');
  };
  const createTask = () => { openTerminal(); setCreateOnOpen(true); };
  const closeTerminal = () => ui.setOverlay(terminalReturn.current);
  const openSettings = () => { settingsReturn.current = ui.overlay; ui.setOverlay('settings'); };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
      const current = useUi.getState();
      if (current.overlay !== 'none') return;
      if (event.key === 'Tab') {
        event.preventDefault(); terminalReturn.current = 'none'; current.setOverlay('terminal');
        if (sessionRef.current.state?.tutorial.step === 'computer') void sessionRef.current.advanceTutorial('computer');
      }
      else if (event.key === 'Escape' && current.screen === 'game') { event.preventDefault(); current.setOverlay('pause'); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const settings = session.settings;
  const state = session.state;
  return <main className={`app-shell ${settings.crt ? 'crt-enabled' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`} onClick={(event) => { if (event.target instanceof HTMLElement && event.target.closest('button')) soundscape.sfx('menu'); }}>
    <div className={`game-canvas ${ui.screen === 'game' ? 'visible' : ''}`} ref={host} aria-label="Игровой мир DEADLINE" />
    {ui.screen === 'boot' && <BootSequence progress={session.loading} ready={session.gameReady} failed={gameFailed || Boolean(ui.error)} reducedMotion={settings.reducedMotion} onContinue={() => ui.setScreen('menu')} />}
    {ui.screen === 'menu' && <MainMenu onStart={() => ui.setOverlay('newgame')} onContinue={session.resume} onSettings={openSettings} onCredits={() => ui.setOverlay('credits')} canStart={Boolean(state) && session.gameReady && !session.busy} canContinue={Boolean(state) && session.gameReady && !session.busy} />}
    <header className="shell-topbar"><button className="shell-brand" aria-label="Вернуться в главное меню" onClick={() => { if (ui.scene === 'combat' && state?.attempt?.status === 'active') ui.setOverlay('pause'); else ui.setScreen('menu'); }}>D / 89</button><div className="shell-controls"><button data-testid="open-terminal" onClick={openTerminal}><kbd>TAB</kbd> МОИ ДЕЛА</button><button data-testid="open-settings" onClick={openSettings} aria-label="Открыть настройки">НАСТРОЙКИ</button>{ui.screen === 'game' && <button onClick={() => ui.setOverlay('pause')} aria-label="Пауза">Ⅱ</button>}</div></header>
    {ui.screen === 'game' && <>
      {!session.gameReady && <div className="scene-loading" role="status"><span>ПОИСК СИГНАЛА…</span><progress aria-label="Загрузка ресурсов сцены" value={session.loading} max={1} /></div>}
      <div className="hud" aria-label="Состояние игрока"><div className="hud-portrait" /><div><div className="hud-health">ОЗ 1 / 1</div><div className="hud-ammo">{ui.scene === 'apartment' ? <>ПАТРОНЫ <strong>{state?.player.ammo ?? '—'}</strong></> : <>{ui.hud.weapon === 'melee' ? 'РУКОПАШНАЯ' : 'ПАТРОНЫ'} <strong>{ui.hud.magazine} / {ui.hud.reserve}</strong>{ui.hud.reloading && <small> ПЕРЕЗАРЯДКА</small>}</>}</div><p className="hud-xp">XP {state?.player.xp.toLocaleString() ?? '—'} {ui.scene === 'combat' && ` / ${ui.hud.kills} ИЗ ${ui.hud.enemies} УСТРАНЕНО`}{ui.scene === 'training' && ' / УЧЕБНЫЕ ПАТРОНЫ'}</p></div></div>
      {ui.scene === 'apartment' && ui.overlay === 'none' && state && <TaskBrief tasks={state.tasks} onOpen={openTerminal} onCreate={createTask} />}
      {ui.scene === 'apartment' && ui.overlay === 'none' && state?.progress.unlocked && <NightContract onLoadout={() => ui.setOverlay('loadout')} />}
      {ui.prompt && ui.overlay === 'none' && <div className="interaction-prompt"><kbd>E</kbd> {interactionText(ui.prompt)}</div>}
      {state && ui.overlay === 'none' && <TutorialGuide tutorial={state.tutorial} busy={session.busy} onSkip={() => void session.skipTutorial()} onTraining={() => void session.enterTraining()} onTerminal={openTerminal} onPhone={() => void session.answerPhone()} />}
      {ui.scene === 'training' && ui.overlay === 'none' && <button className="training-return" onClick={session.returnApartment}>ВЕРНУТЬСЯ В КВАРТИРУ ↵</button>}
      <footer className="game-bottom-bar"><span><kbd>WASD</kbd> ДВИЖЕНИЕ <kbd>E</kbd> ДЕЙСТВИЕ <kbd>R</kbd> ПЕРЕЗАРЯДКА <kbd>SHIFT</kbd> РЫВОК <kbd>F</kbd> РУКОПАШНАЯ</span><span>{ui.scene === 'apartment' ? 'КВАРТИРА / БЕЗОПАСНАЯ ЗОНА' : ui.scene === 'training' ? 'ТРЕНИРОВКА / УЧЕБНЫЕ ПАТРОНЫ' : 'НОЧНАЯ СМЕНА / КОНТРАКТ 01'}</span></footer>
    </>}
    {session.notice && <p className="ambient-notice" role="status">{session.notice}</p>}
    {session.query.isError && !ui.error && <p className="error-banner" role="alert">НЕТ СВЯЗИ С ХРАНИЛИЩЕМ. Откройте терминал для повторного подключения.</p>}
    {ui.error && <div className="error-banner" role="alert"><span>{ui.error}</span>{!session.gameReady && <button onClick={() => window.location.reload()}>ПОВТОРИТЬ ЗАГРУЗКУ</button>}<button onClick={() => ui.setError(null)}>ЗАКРЫТЬ</button></div>}
    {ui.overlay === 'terminal' && <TaskTerminal initialCreate={createOnOpen} onClose={closeTerminal} onTaskCreated={() => { void session.advanceTutorial('task-created'); }} onReward={() => soundscape.sfx('task-complete')} />}
    {ui.overlay === 'settings' && <SettingsPanel settings={settings} onChange={session.updateSettings} onClose={() => ui.setOverlay(settingsReturn.current)} />}
    {ui.overlay === 'television' && <TelevisionPanel onClose={session.close} />}
    {ui.overlay === 'newgame' && <NewGamePanel busy={session.busy} onStory={() => void session.start()} onClean={() => void session.cleanStart()} onClose={session.close} />}
    {ui.overlay === 'credits' && <Modal title="DEADLINE: 1989 / ОБ ИГРЕ" onClose={session.close}><div className="credits-copy"><h3>КРИМИНАЛЬНЫЙ ТРИЛЛЕР О ВАШИХ ЗАДАЧАХ</h3><p>Графика, локации, портреты и синтезированный саундтрек созданы специально для DEADLINE: 1989.</p><p>Создано на React, Phaser 3, Fastify, SQLite и Drizzle. Инструменты и происхождение материалов указаны в реестре ресурсов проекта.</p><p>Вдохновлено криминальным кино конца 1980-х и экшенами с видом сверху. Графика, персонажи, музыка и карты других игр не использованы.</p><button className="button-secondary" onClick={session.close}>В МЕНЮ ↵</button></div></Modal>}
    {ui.overlay === 'pause' && <Modal title="СИГНАЛ ПРИОСТАНОВЛЕН" onClose={session.close}><div className="pause-content"><h3>ПЕРЕВЕДИТЕ ДЫХАНИЕ.</h3><p>Ваши задачи и заработанные ресурсы сохранены.</p><button className="button-primary" data-testid="pause-resume" onClick={session.close}>ПРОДОЛЖИТЬ ↵</button><button className="button-secondary" data-testid="pause-terminal" onClick={openTerminal}>ТЕРМИНАЛ ЗАДАЧ</button><button className="button-secondary" onClick={openSettings}>НАСТРОЙКИ</button>{state?.attempt?.status === 'active' ? <button className="button-secondary" onClick={() => ui.setOverlay('recovery')}>ПРЕРВАТЬ ЗАДАНИЕ</button> : <div><button className="button-secondary" disabled={session.busy} onClick={() => void session.start()}>ПОВТОРИТЬ ПЕРВЫЙ ЗВОНОК</button><p className="replay-note">Игровой прогресс начнётся заново. Реальные задачи, заработанные патроны и XP сохранятся.</p><button className="text-button" onClick={() => { session.close(); ui.setScreen('menu'); }}>ГЛАВНОЕ МЕНЮ</button></div>}</div></Modal>}
    {ui.overlay === 'loadout' && <LoadoutPanel available={state?.player.ammo ?? 0} unlocked={Boolean(state?.progress.unlocked)} busy={session.busy || !session.gameReady} onLaunch={(ammo) => void session.launchMission(ammo)} onTraining={() => void session.enterTraining()} onClose={session.close} />}
    {ui.overlay === 'dialogue' && session.conversation && <DialoguePanel key={session.conversation.id ?? 'silence'} {...session.conversation} cinematic={session.conversation.id === 'first-call'} onComplete={() => void session.finishDialogue()} onClose={() => void session.finishDialogue(true)} onTextSound={() => soundscape.sfx('text')} reducedMotion={settings.reducedMotion} />}
    {ui.overlay === 'outcome' && session.outcome && (session.outcome.settled ? <OutcomeScreen result={session.outcome.result} stats={session.outcome.stats} onReturn={session.returnApartment} onRetry={session.outcome.result === 'dead' ? () => ui.setOverlay('loadout') : undefined} /> : <Modal title="СОХРАНЕНИЕ РЕЗУЛЬТАТА" onClose={openTerminal}><div className="recovery-content"><h3>ОСТАВАЙТЕСЬ НА ЛИНИИ.</h3><p>Подтверждаем расход и возвращаем оставшиеся патроны. Ваши реальные задачи не изменятся.</p><button className="button-primary" disabled={session.busy} onClick={session.settleOutcome}>{session.busy ? 'СОХРАНЕНИЕ…' : 'ПОВТОРИТЬ СОХРАНЕНИЕ'}</button><button className="button-secondary" onClick={openTerminal}>ОТКРЫТЬ ТЕРМИНАЛ</button></div></Modal>)}
    {ui.overlay === 'recovery' && <Modal title="ПРЕРВАННОЕ ЗАДАНИЕ / ВОССТАНОВЛЕНИЕ" onClose={openTerminal}><div className="recovery-content"><h3>СВЯЗЬ ОБОРВАЛАСЬ.</h3><p>Задание прервалось. Израсходованные патроны не восстановятся; оставшиеся вернутся после подтверждения. Ваши реальные задачи не изменились.</p><p>ПОТРАЧЕНО: {state?.attempt?.spent ?? 0} / ОСТАЛОСЬ: {state?.attempt?.remaining ?? 0}</p><button className="button-primary" data-testid="recover-mission" disabled={session.busy} onClick={() => void session.recover()}>{session.busy ? 'СОХРАНЕНИЕ…' : 'ЗАВЕРШИТЬ И ВЕРНУТЬСЯ В КВАРТИРУ'}</button><button className="button-secondary" onClick={openTerminal}>ОТКРЫТЬ ТЕРМИНАЛ</button></div></Modal>}
  </main>;
}
