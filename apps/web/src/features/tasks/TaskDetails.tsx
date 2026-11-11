import { useState } from 'react';
import type { Task } from '@deadline/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface TaskDetailsProps { task: Task; pending: boolean; onEdit: () => void; onComplete: () => void; onReopen: () => void; onDelete: () => void }

export function TaskDetails({ task, pending, onEdit, onComplete, onReopen, onDelete }: TaskDetailsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rules = useQuery({ queryKey: ['rules'], queryFn: api.rules, staleTime: Infinity });
  const preview = rules.data?.rewards[task.difficulty];
  return <div className="task-details">
    <p className="panel-kicker">CONTRACT / {task.id.slice(0, 8).toUpperCase()}</p>
    <h3>{task.title}</h3><p className="task-description">{task.description || 'No additional instructions.'}</p>
    <dl className="task-metadata"><div><dt>DIFFICULTY</dt><dd className={`difficulty-${task.difficulty}`}>{task.difficulty.toUpperCase()}</dd></div><div><dt>STATUS</dt><dd>{task.status.toUpperCase()}</dd></div>
      <div><dt>DEADLINE</dt><dd>{task.dueAt ? new Date(task.dueAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'NONE'}</dd></div>
      <div><dt>CREATED</dt><dd>{new Date(task.createdAt).toLocaleDateString()}</dd></div>
    </dl>
    <div className={`reward-note ${task.rewarded ? 'already-rewarded' : ''}`}><span>{task.rewarded ? 'REWARD ALREADY ISSUED' : 'REWARD AVAILABLE ON COMPLETION'}</span>{!task.rewarded && preview && <p className="reward-preview">+{preview.ammo} AMMO <strong>+{preview.xp} XP</strong></p>}<p>{task.rewarded ? 'Your earned ammunition and XP remain yours. Reopening will not issue another reward.' : 'The server issues ammunition and XP once when you finish this real task.'}</p></div>
    <div className="task-detail-actions"><button className="button-primary" disabled={pending} data-testid={task.status === 'active' ? 'task-complete' : 'task-reopen'} onClick={task.status === 'active' ? onComplete : onReopen}>{task.status === 'active' ? 'MARK COMPLETE ✓' : 'REOPEN CONTRACT ↶'}</button><button className="button-secondary" data-testid="task-edit" onClick={onEdit} disabled={pending}>EDIT CONTRACT</button></div>
    {confirmDelete ? <div className="delete-confirm"><p>Delete this task? Previously earned resources are kept.</p><button className="button-danger" data-testid="task-confirm-delete" disabled={pending} onClick={onDelete}>CONFIRM DELETE</button><button className="text-button" disabled={pending} onClick={() => setConfirmDelete(false)}>KEEP TASK</button></div> : <button className="text-button danger" data-testid="task-delete" disabled={pending} onClick={() => setConfirmDelete(true)}>DELETE CONTRACT</button>}
  </div>;
}
