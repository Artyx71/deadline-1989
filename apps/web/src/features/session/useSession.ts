import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_SETTINGS, type GameController, type GameEvent, type GamePort, type MissionStats, type MutationResult, type SceneId, type Settings, type StateSnapshot } from '@deadline/shared';
import { api } from '../../lib/api';
import { useUi } from '../../store/ui';
import { DIALOGUES } from '../../narrative/dialogue';
import { reduceTutorialStep } from '../../narrative/tutorial';
import { soundscape } from '../../audio/Soundscape';

export type Conversation = { id: string | null; speaker: string; lines: string[]; portrait: number };
export type Outcome = { result: 'dead' | 'cleared'; stats: MissionStats; settled: boolean };

export function useSession() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['state'], queryFn: api.state, refetchOnWindowFocus: false, retry: 1 });
  const state = query.data;
  const stateRef = useRef(state);
  stateRef.current = state;
  const controller = useRef<GameController | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(0);
  const [gameReady, setGameReady] = useState(false);
  const [readyVersion, setReadyVersion] = useState(0);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initialized = useRef(false);
  const tutorialQueue = useRef<Promise<void>>(Promise.resolve());
  const settingsQueue = useRef<Promise<void>>(Promise.resolve());
  const eventReceiver = useRef<(event: GameEvent) => void>(() => undefined);

  const apply = useCallback((result: MutationResult) => {
    client.setQueryData<StateSnapshot>(['state'], (previous) => {
      if (previous && previous.revision > result.state.revision) return previous;
      stateRef.current = result.state;
      return result.state;
    });
    return result.state;
  }, [client]);

  const reportError = useCallback((error: unknown) => {
    useUi.getState().setError(error instanceof Error ? error.message : 'Связь прервалась. Повторите операцию после подключения.');
  }, []);

  const perform = useCallback(async (operation: () => Promise<void>) => {
    setBusy(true); useUi.getState().setError(null);
    try { await operation(); } catch (error) { reportError(error); }
    finally { setBusy(false); }
  }, [reportError]);

  const enter = useCallback((scene: SceneId, ammunition?: number) => {
    setGameReady(false); setLoading(0);
    useUi.getState().setScene(scene); useUi.getState().setPrompt(null);
    controller.current?.enter(scene, ammunition);
  }, []);

  const advanceTutorial = useCallback((action: Parameters<typeof reduceTutorialStep>[1]) => {
    tutorialQueue.current = tutorialQueue.current.then(async () => {
      const tutorial = stateRef.current?.tutorial;
      if (!tutorial || tutorial.completed || tutorial.skipped) return;
      const next = reduceTutorialStep(tutorial.step, action);
      if (next === tutorial.step) return;
      apply(await api.tutorial({ step: next, ...(next === 'complete' ? { completed: true } : {}) }));
      if (next === 'second-call') {
        enter('apartment'); setNotice('ТРЕНИРОВКА ЗАВЕРШЕНА. ЗВОНИТ ТЕЛЕФОН.');
      }
    }).catch(reportError);
    return tutorialQueue.current;
  }, [apply, enter, reportError]);

  useEffect(() => {
    if (!state || initialized.current) return;
    initialized.current = true;
    if (state.attempt?.status === 'active') useUi.getState().setOverlay('recovery');
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const settleOutcome = useCallback((next: Outcome) => perform(async () => {
    const attempt = stateRef.current?.attempt;
    if (!attempt || attempt.status !== 'active') {
      if (attempt?.status === next.result) { setOutcome({ ...next, settled: true }); return; }
      throw new Error('Данные задания не найдены. Откройте терминал или обновите страницу для восстановления сохранённого состояния.');
    }
    const stats = { ...next.stats, shotsFired: attempt.spent, hits: Math.min(next.stats.hits, attempt.spent) };
    apply(await api.finishMission(attempt.id, next.result, stats));
    setOutcome({ ...next, stats, settled: true });
  }), [apply, perform]);

  const answerPhone = useCallback(() => perform(async () => {
    const result = await api.nextDialogue();
    if (!result.next && stateRef.current?.progress.unlocked) {
      useUi.getState().setOverlay('loadout');
      return;
    }
    const dialogue = result.next ? DIALOGUES[result.next] : null;
    setConversation(dialogue && result.next ? { ...dialogue, id: result.next } : { id: null, speaker: 'ЛИНИЯ', portrait: 1, lines: ['Тихий электрический гул. Где-то в городе кто-то ждёт следующего звонка.'] });
    useUi.getState().setOverlay('dialogue');
  }), [perform]);

  const enterTraining = useCallback(() => perform(async () => {
    await advanceTutorial('training');
    useUi.getState().setOverlay('none'); enter('training', 36);
  }), [advanceTutorial, enter, perform]);

  eventReceiver.current = (event) => {
    const ui = useUi.getState();
    if (event.type === 'ready') {
      setGameReady(true); setReadyVersion((version) => version + 1); setLoading(1); ui.setScene(event.scene);
      if (event.scene === 'training') void advanceTutorial('training');
      if (event.scene === 'apartment' && ui.screen === 'game' && stateRef.current?.tutorial.step === 'wake') {
        void perform(async () => { apply(await api.tutorial({ step: 'movement' })); });
      }
    } else if (event.type === 'loading') setLoading(event.progress);
    else if (event.type === 'hud') ui.setHud(event.hud);
    else if (event.type === 'prompt') ui.setPrompt(event.label);
    else if (event.type === 'error') ui.setError(event.message);
    else if (event.type === 'sound') {
      if (event.name === 'death') soundscape.setState('PLAYER_DEATH');
      soundscape.sfx(event.name);
    }
    else if (event.type === 'tutorial') void advanceTutorial(event.action);
    else if (event.type === 'outcome') {
      const next = { result: event.result, stats: event.stats, settled: false };
      setOutcome(next); ui.setOverlay('outcome'); void settleOutcome(next);
    } else if (event.type === 'interaction') {
      if (event.id === 'computer') { soundscape.sfx('computer'); void advanceTutorial('computer'); ui.setOverlay('terminal'); }
      else if (event.id === 'telephone') { soundscape.sfx('phone'); void answerPhone(); }
      else if (event.id === 'training') { if (ui.scene === 'training') enter('apartment'); else void enterTraining(); }
      else if (event.id === 'television') setNotice('КАНАЛ 03 / НЕТ СИГНАЛА. ГОРОДУ НЕЧЕГО СКАЗАТЬ.');
      else ui.setOverlay('loadout');
    }
  };

  const port = useRef<GamePort>({
    emit: (event) => eventReceiver.current(event),
    spendShot: async () => {
      const attempt = stateRef.current?.attempt;
      if (!attempt || attempt.status !== 'active') return false;
      try { apply(await api.shot(attempt.id)); return true; }
      catch (error) { reportError(error); useUi.getState().setOverlay('pause'); return false; }
    },
  });

  const start = () => perform(async () => {
    apply(await api.resetGame());
    apply(await api.tutorial({ step: 'movement' }));
    setOutcome(null); useUi.getState().setScreen('game'); useUi.getState().setOverlay('none'); enter('apartment');
  });

  const resume = () => {
    useUi.getState().setScreen('game');
    if (stateRef.current?.attempt?.status === 'active') { useUi.getState().setOverlay('recovery'); return; }
    useUi.getState().setOverlay('none'); enter('apartment');
    if (stateRef.current?.tutorial.step === 'wake') void perform(async () => { apply(await api.tutorial({ step: 'movement' })); });
  };

  const close = () => useUi.getState().setOverlay('none');
  const finishDialogue = (ignored = false) => perform(async () => {
    if (conversation?.id) {
      apply(await api.acknowledge(conversation.id, ignored));
      if (conversation.id === 'first-call') {
        if (stateRef.current?.tutorial.step === 'wake') await advanceTutorial('moved');
        if (stateRef.current?.tutorial.step === 'movement') await advanceTutorial('moved');
      }
      if (conversation.id === 'first-call' || conversation.id === 'second-call') await advanceTutorial(conversation.id);
    }
    setConversation(null); close();
  });

  const recover = () => perform(async () => {
    const attempt = stateRef.current?.attempt;
    if (attempt?.status === 'active') {
      apply(await api.finishMission(attempt.id, 'abandoned', { kills: 0, shotsFired: attempt.spent, hits: 0, meleeKills: 0, durationMs: Math.min(86400000, Math.max(0, Date.now() - Date.parse(attempt.startedAt))), emptyMagazine: attempt.remaining === 0 }));
    }
    setOutcome(null); useUi.getState().setScreen('game'); enter('apartment'); close();
  });

  const launchMission = (ammo: number) => perform(async () => {
    const next = apply(await api.startMission(ammo));
    if (!next.attempt) throw new Error('Сервер не подтвердил начало задания.');
    setOutcome(null); enter('combat', next.attempt.remaining); close();
  });

  const skipTutorial = () => perform(async () => {
    apply(await api.tutorial({ step: 'complete', completed: true, skipped: true }));
    if (useUi.getState().scene === 'training') enter('apartment');
    setNotice('ОБУЧЕНИЕ ПРОПУЩЕНО. ПЕРВОЕ ЗАДАНИЕ ДОСТУПНО.');
  });

  const updateSettings = (patch: Partial<Settings>) => {
    settingsQueue.current = settingsQueue.current.then(async () => { apply(await api.settings(patch)); }).catch(reportError);
  };

  return { query, state, settings: state?.settings ?? DEFAULT_SETTINGS, controller, port: port.current, busy, loading, gameReady, readyVersion,
    conversation, outcome, notice, apply, reportError, start, resume, close, finishDialogue, recover, launchMission, skipTutorial,
    updateSettings, enterTraining, advanceTutorial, enter, answerPhone,
    settleOutcome: () => { if (outcome) void settleOutcome(outcome); },
    returnApartment: () => { setOutcome(null); close(); enter('apartment'); },
  };
}
