import type { ReactNode } from 'react';

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
};

export function Modal({ isOpen, title, description, children }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-card__header">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
