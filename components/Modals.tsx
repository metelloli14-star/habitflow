'use client';

import { CheckIcon, WarningIcon } from './icons';

interface ConfirmProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Red "are you sure?" dialog for destructive actions. */
export function ConfirmModal({ open, title, text, confirmLabel, busy, onConfirm, onClose }: ConfirmProps) {
  return (
    <div className={'modal-overlay' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-hidden={!open}>
      <div className="modal-card">
        <div className="modal-icon"><WarningIcon /></div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="modal-actions">
          <button className="modal-btn-confirm" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
          <button className="modal-btn-cancel" onClick={onClose} disabled={busy}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

/** Mint "done" dialog, e.g. after saving the profile. */
export function SuccessModal({ open, title, buttonLabel = 'Спасибо', onClose }: { open: boolean; title: string; buttonLabel?: string; onClose: () => void }) {
  return (
    <div className={'modal-overlay' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-hidden={!open}>
      <div className="modal-card">
        <div className="modal-icon success"><CheckIcon /></div>
        <h3>{title}</h3>
        <div className="modal-actions">
          <button className="modal-btn-confirm success" onClick={onClose}>{buttonLabel}</button>
        </div>
      </div>
    </div>
  );
}
