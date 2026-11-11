import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationResult, RewardClaim, StateSnapshot, TaskInput } from '@deadline/shared';
import { api } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { TaskEditor } from './TaskEditor';
import { TaskDetails } from './TaskDetails';
import { DIFFICULTY_LABELS, FILTER_LABELS } from './labels';

interface TaskTerminalProps { onClose: () => void; onTaskCreated?: () => void; onReward?: (reward: RewardClaim) => void; initialCreate?: boolean }
type Command = { type: 'create'; input: TaskInput } | { type: 'edit'; id: string; input: TaskInput } | { type: 'complete' | 'reopen' | 'delete'; id: string };
type Filter = 'active' | 'completed' | 'all';

export function TaskTerminal({ onClose, onTaskCreated, onReward, initialCreate = false }: TaskTerminalProps) {
  const queryClient = useQueryClient();
  const stateQuery = useQuery({ queryKey: ['state'], queryFn: api.state });
  const [filter, setFilter] = useState<Filter>('active');
  const [tab, setTab] = useState<'tasks' | 'receipts'>('tasks');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<'new' | 'edit' | null>(initialCreate ? 'new' : null);
  const [reward, setReward] = useState<RewardClaim | null>(null);
  const [notice, setNotice] = useState('');
  const shownRewards = useRef(new Set<string>());
  const mutation = useMutation<MutationResult, Error, Command>({
    mutationFn: (command) => {
      switch (command.type) {
        case 'create': return api.createTask(command.input);
        case 'edit': return api.updateTask(command.id, command.input);
        case 'complete': return api.completeTask(command.id);
        case 'reopen': return api.reopenTask(command.id);
        case 'delete': return api.deleteTask(command.id);
      }
    },
    onSuccess: (result, command) => {
      queryClient.setQueryData<StateSnapshot>(['state'], (previous) => !previous || result.state.revision >= previous.revision ? result.state : previous);
      if (command.type === 'create') {
        onTaskCreated?.();
        const newTask = result.state.tasks.find((task) => !stateQuery.data?.tasks.some((old) => old.id === task.id));
        if (newTask) setSelectedId(newTask.id);
        setFilter('active');
      }
      if (command.type === 'delete') setSelectedId(null);
      setEditor(null);
      setNotice(command.type === 'create' ? 'КОНТРАКТ СОЗДАН. ПОРА ЗА ДЕЛО.' : command.type === 'delete' ? 'КОНТРАКТ УДАЛЁН. РЕСУРСЫ СОХРАНЕНЫ.' : command.type === 'reopen' ? 'КОНТРАКТ ОТКРЫТ СНОВА. НАГРАДА УЧТЕНА.' : command.type === 'complete' ? 'КОНТРАКТ ВЫПОЛНЕН. НАСТОЯЩАЯ РАБОТА — НАСТОЯЩИЙ РЕЗУЛЬТАТ.' : 'КОНТРАКТ ОБНОВЛЁН.');
      if (result.reward && !shownRewards.current.has(result.reward.id)) {
        shownRewards.current.add(result.reward.id); setReward(result.reward); onReward?.(result.reward);
      }
    },
  });
  useEffect(() => {
    if (!reward) return;
    const timer = window.setTimeout(() => setReward(null), 4200);
    return () => window.clearTimeout(timer);
  }, [reward]);
  const state = stateQuery.data;
  const tasks = state?.tasks ?? [];
  const active = tasks.filter((task) => task.status === 'active');
  const completed = tasks.filter((task) => task.status === 'completed');
  const visible = tasks.filter((task) => filter === 'all' || task.status === filter);
  const selected = tasks.find((task) => task.id === selectedId) ?? visible[0];
  const beginNew = () => { setEditor('new'); setTab('tasks'); mutation.reset(); setNotice(''); };
  const chooseTab = (next: Filter | 'receipts') => {
    setEditor(null); mutation.reset(); setSelectedId(null);
    if (next === 'receipts') setTab('receipts');
    else { setTab('tasks'); setFilter(next); }
  };
  const error = mutation.error?.message ?? stateQuery.error?.message;
  return <Modal title="КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3" onClose={onClose} className="terminal-modal">
    <div className="terminal-status"><span><i className={`connection-light ${stateQuery.isError ? 'offline' : ''}`} />{stateQuery.isError ? 'СВЯЗЬ ПРЕРВАНА' : stateQuery.isFetching ? 'СИНХРОНИЗАЦИЯ' : 'ЛОКАЛЬНОЕ СОЕДИНЕНИЕ'}</span><span>ОПЫТ <strong>{state?.player.xp.toLocaleString('ru-RU') ?? '—'}</strong></span><span>ПАТР. <strong>{state?.player.ammo ?? '—'}</strong></span></div>
    {error && <div className="terminal-error" role="alert"><span>ОШИБКА СВЯЗИ: {error}</span><button onClick={() => { mutation.reset(); void stateQuery.refetch(); }}>ПОДКЛЮЧИТЬСЯ</button></div>}
    {mutation.isPending && <p className="terminal-pending" role="status">ОТПРАВКА / ОЖИДАНИЕ СОХРАНЕНИЯ…</p>}
    <div className="terminal-workspace">
      <aside className="terminal-sidebar"><p className="sidebar-label">КАТАЛОГ</p>
        <button data-testid="task-filter-active" disabled={mutation.isPending} className={tab === 'tasks' && filter === 'active' ? 'active' : ''} onClick={() => chooseTab('active')}>В РАБОТЕ <span>{active.length.toString().padStart(2, '0')}</span></button>
        <button data-testid="task-filter-completed" disabled={mutation.isPending} className={tab === 'tasks' && filter === 'completed' ? 'active' : ''} onClick={() => chooseTab('completed')}>ВЫПОЛНЕНЫ <span>{completed.length.toString().padStart(2, '0')}</span></button>
        <button data-testid="task-filter-all" disabled={mutation.isPending} className={tab === 'tasks' && filter === 'all' ? 'active' : ''} onClick={() => chooseTab('all')}>ВСЕ ЗАДАЧИ <span>{tasks.length.toString().padStart(2, '0')}</span></button>
        <button data-testid="task-filter-receipts" disabled={mutation.isPending} className={tab === 'receipts' ? 'active' : ''} onClick={() => chooseTab('receipts')}>КВИТАНЦИИ <span>{(state?.rewards.length ?? 0).toString().padStart(2, '0')}</span></button>
        <div className="terminal-statistics"><span>ВЫПОЛНЕНО</span><strong>{tasks.length ? Math.round(completed.length / tasks.length * 100) : 0}%</strong><div className="completion-meter"><i style={{ width: `${tasks.length ? completed.length / tasks.length * 100 : 0}%` }} /></div><span>{completed.length} ИЗ {tasks.length} ЗАКРЫТО</span><p>ДЕЛА НАСТОЯЩИЕ.<br />ГОРОД ПОДОЖДЁТ.</p></div>
      </aside>
      <section className="terminal-directory" aria-label={tab === 'receipts' ? 'История наград' : 'Список задач'}><header><h3>{tab === 'receipts' ? 'КВИТАНЦИИ О НАГРАДАХ' : FILTER_LABELS[filter]}</h3>{tab === 'tasks' && <button data-testid="task-new" className="small-button" onClick={beginNew} disabled={!state || mutation.isPending}>+ НОВЫЙ</button>}</header>
        {stateQuery.isPending && <div className="terminal-empty" role="status"><span className="terminal-loader">▌</span><p>ПОДКЛЮЧЕНИЕ…</p></div>}
        {!state && stateQuery.isError && <div className="terminal-empty"><h4>НЕТ СВЯЗИ</h4><p>Черновики и задачи не перезаписаны. Подключитесь снова, чтобы загрузить сохранённые данные.</p><button className="button-secondary" onClick={() => void stateQuery.refetch()}>ПОВТОРИТЬ ПОДКЛЮЧЕНИЕ</button></div>}
        {state && tab === 'tasks' && <><div className="directory-columns"><span>КОНТРАКТ</span><span>СЛОЖНОСТЬ</span></div><ul className="task-list">{visible.map((task) => <li key={task.id}><button disabled={mutation.isPending} data-testid={`task-row-${task.id}`} className={selected?.id === task.id && !editor ? 'selected' : ''} onClick={() => { setSelectedId(task.id); setEditor(null); mutation.reset(); }}>
          <span className="task-checkbox" aria-hidden="true">{task.status === 'completed' ? '✓' : ''}</span><span className={`task-row-title ${task.status === 'completed' ? 'task-closed' : ''}`}>{task.title}{task.dueAt && <small>{new Date(task.dueAt).toLocaleDateString('ru-RU')}</small>}</span><span className={`task-difficulty difficulty-${task.difficulty}`}>{DIFFICULTY_LABELS[task.difficulty]}<span aria-hidden="true"> {'▮'.repeat(task.difficulty === 'easy' ? 1 : task.difficulty === 'normal' ? 2 : 3)}</span></span>
        </button></li>)}</ul>{!visible.length && <div className="terminal-empty"><span className="empty-symbol" aria-hidden="true">[ _ ]</span><h4>{filter === 'completed' ? 'НЕТ ВЫПОЛНЕННЫХ КОНТРАКТОВ' : 'КОНТРАКТОВ ПОКА НЕТ'}</h4><p>{filter === 'completed' ? 'Сначала выполните настоящую задачу, затем отметьте её здесь.' : 'Первый ход за вами. Запишите, что нужно сделать.'}</p><button className="button-secondary" onClick={beginNew}>СОЗДАТЬ КОНТРАКТ</button></div>}</>}
        {state && tab === 'receipts' && <div className="receipt-list">{state.rewards.length ? [...state.rewards].reverse().map((claim) => <article key={claim.id}><span className="receipt-stamp">ОПЛАЧЕНО</span><h4>{claim.title}</h4><p>+{claim.ammo} ПАТР. <span>+{claim.xp} ОПЫТА</span></p><time dateTime={claim.createdAt}>{new Date(claim.createdAt).toLocaleString('ru-RU')}</time></article>) : <div className="terminal-empty"><h4>КВИТАНЦИЙ ПОКА НЕТ</h4><p>Выполните настоящую задачу, чтобы получить первые патроны и опыт.</p></div>}</div>}
      </section>
      <section className="terminal-inspector" aria-label="Детали контракта">
        {state && tab === 'tasks' && editor && <TaskEditor key={editor === 'new' ? 'new' : selected?.id} task={editor === 'edit' ? selected : undefined} pending={mutation.isPending} onCancel={() => setEditor(null)} onSave={(input) => mutation.mutate(editor === 'edit' && selected ? { type: 'edit', id: selected.id, input } : { type: 'create', input })} />}
        {state && tab === 'tasks' && !editor && selected && <TaskDetails key={selected.id} task={selected} pending={mutation.isPending} onEdit={() => { mutation.reset(); setEditor('edit'); }} onComplete={() => mutation.mutate({ type: 'complete', id: selected.id })} onReopen={() => mutation.mutate({ type: 'reopen', id: selected.id })} onDelete={() => mutation.mutate({ type: 'delete', id: selected.id })} />}
        {(!state || tab === 'receipts' || (!selected && !editor)) && <div className="inspector-idle"><span aria-hidden="true">D / 89</span><h3>КАЖДЫЙ КОНТРАКТ<br />ОСТАВЛЯЕТ СЛЕД.</h3><p>Награда выдаётся один раз. Удаление и повторное открытие задачи не отнимают заработанное.</p><div className="system-seal">СИСТЕМА DEADLINE<br />ТОЛЬКО ДЛЯ СВОИХ</div></div>}
      </section>
    </div>
    <footer className="terminal-footer"><span role="status" aria-live="polite">{notice || 'ВЫБЕРИТЕ КОНТРАКТ ДЛЯ ПРОСМОТРА'}</span><span><kbd>TAB</kbd> ПЕРЕМЕЩЕНИЕ <kbd>ESC</kbd> ВЫХОД</span></footer>
    {reward && <div className="reward-overlay" role="status" aria-live="polite"><span>ОПЕРАЦИЯ СОХРАНЕНА</span><h3>КОНТРАКТ ВЫПОЛНЕН</h3><p>+{reward.ammo} ПАТР. <strong>+{reward.xp} ОПЫТА</strong></p><button data-testid="task-reward-acknowledge" onClick={() => setReward(null)}>ПРИНЯТО ↵</button></div>}
  </Modal>;
}
