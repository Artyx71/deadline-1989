import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

export function Modal({ title, onClose, children, className = '' }: ModalProps) {
  const element = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = element.current;
    const first =
      dialog?.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onPointerDown={(event) => event.stopPropagation()}>
      <div
        ref={element}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal ${className}`}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            close.current();
          }
          if (event.key !== 'Tab') return;
          const nodes = [
            ...(element.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
          ].filter((node) => node.getClientRects().length > 0);
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (!first) {
            event.preventDefault();
            element.current?.focus();
          } else if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === element.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button className="close-button" onClick={onClose} aria-label={`Закрыть: ${title}`}>
            ESC <span aria-hidden="true">×</span>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
