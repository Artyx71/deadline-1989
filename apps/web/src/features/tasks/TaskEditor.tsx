import { useState, type FormEvent } from 'react';
import type { Task, TaskInput } from '@deadline/shared';

interface TaskEditorProps {
  task?: Task;
  pending: boolean;
  onSave: (input: TaskInput) => void;
  onCancel: () => void;
}

function localDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function TaskEditor({ task, pending, onSave, onCancel }: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [difficulty, setDifficulty] = useState<TaskInput['difficulty']>(
    task?.difficulty ?? 'normal',
  );
  const [deadline, setDeadline] = useState(localDate(task?.dueAt ?? null));
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      difficulty,
      dueAt: deadline ? new Date(deadline).toISOString() : null,
    });
  };
  return (
    <form className="task-editor" onSubmit={save}>
      <p className="panel-kicker">
        {task ? 'ИЗМЕНИТЬ КОНТРАКТ' : 'НОВЫЙ КОНТРАКТ / НАСТОЯЩЕЕ ДЕЛО'}
      </p>
      <label>
        НАЗВАНИЕ
        <input
          data-autofocus
          data-testid="task-title"
          autoFocus
          required
          maxLength={160}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Что нужно сделать?"
        />
      </label>
      <label>
        ОПИСАНИЕ
        <textarea
          data-testid="task-description"
          maxLength={2000}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Подробности настоящей задачи."
        />
      </label>
      <div className="form-columns">
        <label>
          СЛОЖНОСТЬ
          <select
            data-testid="task-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as TaskInput['difficulty'])}
          >
            <option value="easy">Лёгкая</option>
            <option value="normal">Обычная</option>
            <option value="hard">Сложная</option>
          </select>
        </label>
        <label>
          СРОК <span className="muted">НЕОБЯЗАТЕЛЬНО</span>
          <input
            data-testid="task-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
      </div>
      <p className="form-hint">
        Отмечайте контракт выполненным только после настоящей работы. Повторное открытие не даёт
        новую награду.
      </p>
      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancel} disabled={pending}>
          ОТМЕНА
        </button>
        <button
          className="button-primary"
          data-testid="task-save"
          disabled={pending || !title.trim()}
        >
          {pending ? 'ОТПРАВКА…' : task ? 'СОХРАНИТЬ ↵' : 'СОЗДАТЬ КОНТРАКТ ↵'}
        </button>
      </div>
    </form>
  );
}
