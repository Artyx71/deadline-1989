import { useState } from 'react';
import type { Task } from '@deadline/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DIFFICULTY_LABELS, TASK_STATUS_LABELS } from './labels';

interface TaskDetailsProps { task: Task; pending: boolean; onEdit: () => void; onComplete: () => void; onReopen: () => void; onDelete: () => void }

export function TaskDetails({ task, pending, onEdit, onComplete, onReopen, onDelete }: TaskDetailsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rules = useQuery({ queryKey: ['rules'], queryFn: api.rules, staleTime: Infinity });
  const preview = rules.data?.rewards[task.difficulty];
  return <div className="task-details">
    <p className="panel-kicker">КОНТРАКТ / {task.id.slice(0, 8).toUpperCase()}</p>
    <h3>{task.title}</h3><p className="task-description">{task.description || 'Дополнительных указаний нет.'}</p>
    <dl className="task-metadata"><div><dt>СЛОЖНОСТЬ</dt><dd className={`difficulty-${task.difficulty}`}>{DIFFICULTY_LABELS[task.difficulty].toUpperCase()}</dd></div><div><dt>СТАТУС</dt><dd>{TASK_STATUS_LABELS[task.status].toUpperCase()}</dd></div>
      <div><dt>СРОК</dt><dd>{task.dueAt ? new Date(task.dueAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : 'НЕТ'}</dd></div>
      <div><dt>СОЗДАНО</dt><dd>{new Date(task.createdAt).toLocaleDateString('ru-RU')}</dd></div>
    </dl>
    <div className={`reward-note ${task.rewarded ? 'already-rewarded' : ''}`}><span>{task.rewarded ? 'НАГРАДА УЖЕ ПОЛУЧЕНА' : 'НАГРАДА ЗА ВЫПОЛНЕНИЕ'}</span>{!task.rewarded && preview && <p className="reward-preview">+{preview.ammo} ПАТР. <strong>+{preview.xp} ОПЫТА</strong></p>}<p>{task.rewarded ? 'Заработанные патроны и опыт остаются у вас. Повторное открытие не даёт новую награду.' : 'Сервер выдаст патроны и опыт один раз — за выполнение настоящей задачи.'}</p></div>
    <div className="task-detail-actions"><button className="button-primary" disabled={pending} data-testid={task.status === 'active' ? 'task-complete' : 'task-reopen'} onClick={task.status === 'active' ? onComplete : onReopen}>{task.status === 'active' ? 'ВЫПОЛНЕНО ✓' : 'ОТКРЫТЬ СНОВА ↶'}</button><button className="button-secondary" data-testid="task-edit" onClick={onEdit} disabled={pending}>ИЗМЕНИТЬ КОНТРАКТ</button></div>
    {confirmDelete ? <div className="delete-confirm"><p>Удалить задачу? Заработанные ресурсы сохранятся.</p><button className="button-danger" data-testid="task-confirm-delete" disabled={pending} onClick={onDelete}>ПОДТВЕРДИТЬ УДАЛЕНИЕ</button><button className="text-button" disabled={pending} onClick={() => setConfirmDelete(false)}>ОСТАВИТЬ</button></div> : <button className="text-button danger" data-testid="task-delete" disabled={pending} onClick={() => setConfirmDelete(true)}>УДАЛИТЬ КОНТРАКТ</button>}
  </div>;
}
