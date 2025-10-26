import React from 'react';

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  fullScreen?: boolean;
  headerActions?: React.ReactNode;
  contentClassName?: string;
};

export function Modal({ title, onClose, children, fullScreen = false, headerActions, contentClassName }: Props) {
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={(fullScreen ? 'modal-content modal-content--fullscreen' : 'modal-content') + (contentClassName ? ` ${contentClassName}` : '')}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <div className="modal-header-actions">
            {headerActions}
            <button type="button" className="modal-close-btn" aria-label="Close modal" onClick={onClose}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
        <div className="modal-children">
          {children}
        </div>
      </div>
    </div>
  );
}
