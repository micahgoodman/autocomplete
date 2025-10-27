import React, { useState } from 'react';

type Props = {
  text: string;
  onDelete?: () => void;
  onRetry?: () => void;
  onApprove?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  isApproving?: boolean;
};

export function AutocompleteDraft({
  text,
  onDelete,
  onRetry,
  onApprove,
  onEdit,
  disabled = false,
  isProcessing = false,
  isApproving = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const canEdit = !disabled && Boolean(onEdit);

  const handleApprove = () => {
    if (disabled) return;
    if (onApprove) {
      onApprove();
    } else {
      // eslint-disable-next-line no-console
      console.log('[AutocompleteDraft] Approved draft:', text);
    }
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid #e8e4df',
    backgroundColor: '#fff',
    color: '#2d251f',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.2s, opacity 0.2s',
  };

  return (
    <div
      style={{
        border: '1px solid #e8e4df',
        backgroundColor: '#f9f7f4',
        borderRadius: '8px',
        padding: '12px 14px',
        color: '#2d251f',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <strong style={{ fontSize: '13px' }}>Draft</strong>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            ...buttonBaseStyle,
            borderColor: '#bc915c',
            backgroundColor: '#fdf8f1',
            cursor: 'pointer',
            opacity: 1,
          }}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            onClick={canEdit ? onEdit : undefined}
            style={{
              padding: '10px 12px',
              border: '1px solid #e8e4df',
              borderRadius: '8px',
              backgroundColor: '#fff',
              fontSize: '13px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              cursor: canEdit ? 'text' : 'default',
            }}
            title={canEdit ? 'Click to edit draft' : undefined}
          >
            {text}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={disabled ? undefined : onDelete}
              style={{
                ...buttonBaseStyle,
                color: '#c4704f',
              }}
              disabled={disabled}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={disabled || isProcessing ? undefined : onRetry}
              style={{
                ...buttonBaseStyle,
                borderColor: '#bbdefb',
                color: '#2196f3',
                cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
                opacity: disabled || isProcessing ? 0.5 : 1,
              }}
              disabled={disabled || isProcessing}
            >
              {isProcessing ? 'Retrying…' : 'Retry'}
            </button>
            <button
              type="button"
              onClick={handleApprove}
              style={{
                ...buttonBaseStyle,
                borderColor: '#c8e6c9',
                color: '#2e7d32',
                cursor: disabled || isApproving ? 'not-allowed' : 'pointer',
                opacity: disabled || isApproving ? 0.5 : 1,
              }}
              disabled={disabled || isApproving}
            >
              {isApproving ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
