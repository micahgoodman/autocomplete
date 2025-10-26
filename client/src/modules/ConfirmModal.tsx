import React from 'react';
import { Modal } from './Modal';

type Props = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isProcessing?: boolean;
};

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  isProcessing = false,
}: Props) {
  return (
    <Modal small title={title} onClose={onCancel} contentClassName="modal-content--sm">
      <div style={{ padding: '16px 24px' }}>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#3c3530' }}>
          {message}
        </p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '8px 24px 16px' }}>
        <button
          type="button"
          className="btn cancel"
          onClick={onCancel}
          id="btn-confirm-cancel"
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn ${isDestructive ? 'danger' : 'confirm'}`}
          onClick={onConfirm}
          id="btn-confirm-ok"
          disabled={isProcessing}
          style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
