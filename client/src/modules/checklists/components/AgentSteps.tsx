import React, { useState } from 'react';

type Step = {
  content: string;
  timestamp: string;
};

type Props = {
  steps: Step[];
  onDelete?: () => void;
  onRetry?: () => void;
  onApprove?: () => void;
  onUpdateStep?: (index: number, content: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
};

export function AgentSteps({
  steps,
  onDelete,
  onRetry,
  onApprove,
  onUpdateStep,
  disabled = false,
  isProcessing = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (idx: number) => {
    if (disabled || !onUpdateStep) return;
    setEditingIndex(idx);
    setEditText(steps[idx]?.content || '');
  };

  const saveEdit = () => {
    if (editingIndex === null || !onUpdateStep) return;
    const next = editText.trim();
    onUpdateStep(editingIndex, next);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
  };

  if (steps.length === 0) return null;

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
        <strong style={{ fontSize: '13px' }}>
          Draft ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
        </strong>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #e8e4df',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                {steps.length > 1 && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8a7c6f',
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    Step {idx + 1}
                  </div>
                )}
                {editingIndex === idx ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      border: '2px solid #bc915c',
                      backgroundColor: '#fefdfb',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#2d251f',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <div
                    onClick={() => startEdit(idx)}
                    style={{
                      fontSize: '13px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      cursor: disabled || !onUpdateStep ? 'default' : 'text',
                      borderRadius: '6px',
                      padding: '2px 4px',
                    }}
                    title={disabled || !onUpdateStep ? undefined : 'Click to edit'}
                  >
                    {step.content}
                  </div>
                )}
              </div>
            ))}
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
              onClick={disabled ? undefined : onApprove}
              style={{
                ...buttonBaseStyle,
                borderColor: '#c8e6c9',
                color: '#2e7d32',
              }}
              disabled={disabled}
            >
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
