import { useId } from 'react';
import type { Task } from '@deadline/shared';

interface TaskBriefProps {
  tasks: Task[];
  onOpen: () => void;
  onCreate?: () => void;
}

export function TaskBrief({ tasks, onOpen, onCreate }: TaskBriefProps) {
  const titleId = useId();
  const active = tasks.filter((task) => task.status === 'active');
  return <aside className="task-brief" aria-labelledby={titleId} data-testid="task-brief">
    <div className="task-brief-staple" aria-hidden="true" />
    <header><div><p className="task-brief-dateline">ЛИЧНОЕ / 1989</p><h2 id={titleId}>МОИ ДЕЛА</h2></div><button data-testid="task-brief-open" onClick={onOpen} aria-label="Открыть все мои дела">ВСЕ ДЕЛА <span aria-hidden="true">↗</span></button></header>
    {active.length ? <><p className="task-brief-count">В РАБОТЕ: <strong>{active.length}</strong></p><ul>{active.slice(0, 2).map((task) => <li key={task.id}><span className="task-brief-checkbox" aria-hidden="true" /><button onClick={onOpen}>{task.title}</button></li>)}</ul>{active.length > 2 && <p className="task-brief-more">Остальные — в терминале.</p>}</> : <div className="task-brief-empty"><p>{tasks.length ? 'Все записанные дела выполнены.' : 'Запиши первое настоящее дело.'}</p><span>{tasks.length ? 'Есть что-то ещё? Добавь в список.' : 'Отправить отчёт. Позвонить другу. Разобрать почту.'}</span></div>}
    <button className="task-brief-add" data-testid="task-brief-create" onClick={onCreate ?? onOpen}>+ ДОБАВИТЬ ДЕЛО</button>
    <p className="task-brief-reward">Выполненное дело <span aria-hidden="true">→</span> патроны и опыт</p>
  </aside>;
}
