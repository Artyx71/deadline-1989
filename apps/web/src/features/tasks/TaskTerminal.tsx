import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationResult, RewardClaim, StateSnapshot, TaskInput } from '@deadline/shared';
import { api } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { TaskEditor } from './TaskEditor';
import { TaskDetails } from './TaskDetails';

interface TaskTerminalProps { onClose: () => void; onTaskCreated?: () => void; onReward?: (reward: RewardClaim) => void }
type Command = { type: 'create'; input: TaskInput } | { type: 'edit'; id: string; input: TaskInput } | { type: 'complete' | 'reopen' | 'delete'; id: string };
type Filter = 'active' | 'completed' | 'all';

export function TaskTerminal({ onClose, onTaskCreated, onReward }: TaskTerminalProps) {
  const queryClient = useQueryClient();
  const stateQuery = useQuery({ queryKey: ['state'], queryFn: api.state });
  const [filter, setFilter] = useState<Filter>('active');
  const [tab, setTab] = useState<'tasks' | 'receipts'>('tasks');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<'new' | 'edit' | null>(null);
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
      setNotice(command.type === 'create' ? 'CONTRACT CREATED. MAKE IT COUNT.' : command.type === 'delete' ? 'CONTRACT DELETED. EARNED RESOURCES RETAINED.' : command.type === 'reopen' ? 'CONTRACT REOPENED. REWARD HISTORY RETAINED.' : command.type === 'complete' ? 'CONTRACT COMPLETE. REAL WORK, REAL PROGRESS.' : 'CONTRACT UPDATED.');
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
  return <Modal title="CONTRACT TERMINAL v1.3" onClose={onClose} className="terminal-modal">
    <div className="terminal-status"><span><i className={`connection-light ${stateQuery.isError ? 'offline' : ''}`} />{stateQuery.isError ? 'LINK INTERRUPTED' : stateQuery.isFetching ? 'SYNCHRONIZING' : 'SECURE LOCAL CONNECTION'}</span><span>XP <strong>{state?.player.xp.toLocaleString() ?? '—'}</strong></span><span>AMMO <strong>{state?.player.ammo ?? '—'}</strong></span></div>
    {error && <div className="terminal-error" role="alert"><span>TRANSMISSION ERROR: {error}</span><button onClick={() => { mutation.reset(); void stateQuery.refetch(); }}>RECONNECT</button></div>}
    {mutation.isPending && <p className="terminal-pending" role="status">TRANSMITTING / WAITING FOR COMMITTED STATE…</p>}
    <div className="terminal-workspace">
      <aside className="terminal-sidebar"><p className="sidebar-label">DIRECTORY</p>
        <button disabled={mutation.isPending} className={tab === 'tasks' && filter === 'active' ? 'active' : ''} onClick={() => chooseTab('active')}>ACTIVE <span>{active.length.toString().padStart(2, '0')}</span></button>
        <button disabled={mutation.isPending} className={tab === 'tasks' && filter === 'completed' ? 'active' : ''} onClick={() => chooseTab('completed')}>COMPLETED <span>{completed.length.toString().padStart(2, '0')}</span></button>
        <button disabled={mutation.isPending} className={tab === 'tasks' && filter === 'all' ? 'active' : ''} onClick={() => chooseTab('all')}>ALL TASKS <span>{tasks.length.toString().padStart(2, '0')}</span></button>
        <button disabled={mutation.isPending} className={tab === 'receipts' ? 'active' : ''} onClick={() => chooseTab('receipts')}>RECEIPTS <span>{(state?.rewards.length ?? 0).toString().padStart(2, '0')}</span></button>
        <div className="terminal-statistics"><span>COMPLETION RATE</span><strong>{tasks.length ? Math.round(completed.length / tasks.length * 100) : 0}%</strong><div className="completion-meter"><i style={{ width: `${tasks.length ? completed.length / tasks.length * 100 : 0}%` }} /></div><span>{completed.length} OF {tasks.length} CLOSED</span><p>THE WORK IS REAL.<br />THE CITY IS WAITING.</p></div>
      </aside>
      <section className="terminal-directory" aria-label={tab === 'receipts' ? 'Reward history' : 'Task list'}><header><h3>{tab === 'receipts' ? 'REWARD RECEIPTS' : `${filter.toUpperCase()} CONTRACTS`}</h3>{tab === 'tasks' && <button data-testid="task-new" className="small-button" onClick={beginNew} disabled={!state || mutation.isPending}>+ NEW</button>}</header>
        {stateQuery.isPending && <div className="terminal-empty" role="status"><span className="terminal-loader">▌</span><p>ESTABLISHING CONNECTION…</p></div>}
        {!state && stateQuery.isError && <div className="terminal-empty"><h4>NO CONNECTION</h4><p>Your drafts and tasks have not been overwritten. Reconnect to access persistent state.</p><button className="button-secondary" onClick={() => void stateQuery.refetch()}>RETRY CONNECTION</button></div>}
        {state && tab === 'tasks' && <><div className="directory-columns"><span>CONTRACT</span><span>DIFFICULTY</span></div><ul className="task-list">{visible.map((task) => <li key={task.id}><button disabled={mutation.isPending} data-testid={`task-row-${task.id}`} className={selected?.id === task.id && !editor ? 'selected' : ''} onClick={() => { setSelectedId(task.id); setEditor(null); mutation.reset(); }}>
          <span className="task-checkbox" aria-hidden="true">{task.status === 'completed' ? '✓' : ''}</span><span className={`task-row-title ${task.status === 'completed' ? 'task-closed' : ''}`}>{task.title}{task.dueAt && <small>{new Date(task.dueAt).toLocaleDateString()}</small>}</span><span className={`task-difficulty difficulty-${task.difficulty}`}>{task.difficulty}<span aria-hidden="true"> {'▮'.repeat(task.difficulty === 'easy' ? 1 : task.difficulty === 'normal' ? 2 : 3)}</span></span>
        </button></li>)}</ul>{!visible.length && <div className="terminal-empty"><span className="empty-symbol" aria-hidden="true">[ _ ]</span><h4>{filter === 'completed' ? 'NO CLOSED CONTRACTS' : 'NO CONTRACTS ON FILE'}</h4><p>{filter === 'completed' ? 'Finish a real task, then mark it complete here.' : 'The first move is yours. Put your real work on the record.'}</p><button className="button-secondary" onClick={beginNew}>CREATE A CONTRACT</button></div>}</>}
        {state && tab === 'receipts' && <div className="receipt-list">{state.rewards.length ? [...state.rewards].reverse().map((claim) => <article key={claim.id}><span className="receipt-stamp">PAID</span><h4>{claim.title}</h4><p>+{claim.ammo} AMMO <span>+{claim.xp} XP</span></p><time dateTime={claim.createdAt}>{new Date(claim.createdAt).toLocaleString()}</time></article>) : <div className="terminal-empty"><h4>NO RECEIPTS YET</h4><p>Complete a real task to earn your first ammunition and XP.</p></div>}</div>}
      </section>
      <section className="terminal-inspector" aria-label="Contract details">
        {state && tab === 'tasks' && editor && <TaskEditor key={editor === 'new' ? 'new' : selected?.id} task={editor === 'edit' ? selected : undefined} pending={mutation.isPending} onCancel={() => setEditor(null)} onSave={(input) => mutation.mutate(editor === 'edit' && selected ? { type: 'edit', id: selected.id, input } : { type: 'create', input })} />}
        {state && tab === 'tasks' && !editor && selected && <TaskDetails key={selected.id} task={selected} pending={mutation.isPending} onEdit={() => { mutation.reset(); setEditor('edit'); }} onComplete={() => mutation.mutate({ type: 'complete', id: selected.id })} onReopen={() => mutation.mutate({ type: 'reopen', id: selected.id })} onDelete={() => mutation.mutate({ type: 'delete', id: selected.id })} />}
        {(!state || tab === 'receipts' || (!selected && !editor)) && <div className="inspector-idle"><span aria-hidden="true">D / 89</span><h3>EVERY CONTRACT<br />LEAVES A TRACE.</h3><p>Rewards are issued once. Deleting or reopening a task never erases what you have earned.</p><div className="system-seal">DEADLINE SYSTEMS<br />AUTHORIZED PERSONNEL ONLY</div></div>}
      </section>
    </div>
    <footer className="terminal-footer"><span role="status" aria-live="polite">{notice || 'SELECT A CONTRACT TO VIEW DETAILS'}</span><span><kbd>TAB</kbd> NAVIGATE <kbd>ESC</kbd> DISCONNECT</span></footer>
    {reward && <div className="reward-overlay" role="status" aria-live="polite"><span>TRANSACTION COMMITTED</span><h3>CONTRACT COMPLETE</h3><p>+{reward.ammo} AMMO <strong>+{reward.xp} XP</strong></p><button onClick={() => setReward(null)}>ACKNOWLEDGE ↵</button></div>}
  </Modal>;
}
