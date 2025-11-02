import React, { useState, useEffect, useRef } from 'react';
import { ChecklistItem as ChecklistItemType } from '../../../api';
import { useAuth } from '../../../App';
import type { ProgressUpdate } from '../../../electron';

import { AutocompleteDraft } from './AutocompleteDraft';
import { AgentSteps } from './AgentSteps';
import { ChecklistWorkTypeSelector } from './ChecklistWorkTypeSelector';

type Props = {
  item: ChecklistItemType;
  index: number;
  onToggle: (index: number) => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, newText: string) => void;
  onSetDraft: (index: number, draft: string | null, isEmailTask?: boolean) => void;
  onSetSteps: (index: number, steps: Array<{ content: string; timestamp: string }>) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onSetWorkType: (index: number, type: 'email' | 'coding' | 'calendar', value: boolean) => void;
  disabled?: boolean;
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  dropTargetIndex: number | null;
  onDropTargetChange: (index: number | null) => void;
};

export function DraggableChecklistItem({
  item,
  index,
  onToggle,
  onDelete,
  onUpdate,
  onSetDraft,
  onSetSteps,
  onMoveItem,
  onSetWorkType,
  disabled = false,
  draggedIndex,
  onDragStart,
  onDragEnd,
  dropTargetIndex,
  onDropTargetChange,
}: Props) {
  const { requestAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editDraftText, setEditDraftText] = useState(item.draft || '');
  const [showWorkTypes, setShowWorkTypes] = useState(true);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<Array<{ content: string; timestamp: string }>>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  const isDragging = draggedIndex === index;
  const showDropZoneAbove = dropTargetIndex === index;
  const showDropZoneBelow = dropTargetIndex === index + 1;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart(index);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const handleDragOverTop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDropTargetChange(index);
  };

  const handleDragOverBottom = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDropTargetChange(index + 1);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (fromIndex !== targetIndex && fromIndex !== targetIndex - 1) {
      onMoveItem(fromIndex, targetIndex);
    }
    
    onDropTargetChange(null);
  };

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditText(item.text);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onUpdate(index, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleDeleteDraft = () => {
    if (disabled) return;
    onSetDraft(index, null);
    setIsEditingDraft(false);
  };

  const handleDeleteSteps = () => {
    if (disabled) return;
    onSetSteps(index, []);
  };

  const handleRetryDraft = () => {
    handleAutocomplete();
  };

  const handleApproveDraft = async () => {
    if (!item.draft || !item.isEmailTask) {
      console.log(`[ChecklistItem] Approved non-email draft for checklist item ${index}`);
      return;
    }

    // For email tasks, create the draft in Gmail via MCP server
    if (!window.electron || !window.electron.createGmailDraft) {
      console.error('[ChecklistItem] Electron API not available');
      setSuccessMessage(null);
      setAutocompleteError('Gmail draft creation is only available in the Electron app');
      setTimeout(() => setAutocompleteError(null), 5000);
      return;
    }

    console.log('[ChecklistItem] Creating Gmail draft...');
    setIsApproving(true);
    setAutocompleteError(null);

    try {
      const result = await window.electron.createGmailDraft(item.draft);
      if (result.success) {
        console.log('[ChecklistItem] Gmail draft created successfully:', result.draftId);
        // Show friendly success message even if no draftId is provided
        setAutocompleteError(null);
        setSuccessMessage(result.message || 'Success! Please check your drafts');
        setTimeout(() => setSuccessMessage(null), 5000);
        // Clear the draft and steps after successful creation
        onSetDraft(index, null);
        onSetSteps(index, []);
      } else {
        setSuccessMessage(null);
        setAutocompleteError(result.error || 'Failed to create Gmail draft');
        setTimeout(() => setAutocompleteError(null), 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSuccessMessage(null);
      setAutocompleteError(errorMessage);
      setTimeout(() => setAutocompleteError(null), 5000);
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveSteps = () => {
    // eslint-disable-next-line no-console
    console.log(`[ChecklistItem] Approved agent steps for checklist item ${index}`, item.steps);
    // Future: Could copy the last step to item.text, mark as completed, etc.
  };

  const handleUpdateStep = (stepIndex: number, content: string) => {
    if (!item.steps) return;
    const nextSteps = item.steps.map((s, i) =>
      i === stepIndex ? { ...s, content, timestamp: new Date().toISOString() } : s
    );
    onSetSteps(index, nextSteps);
  };

  const handleStartDraftEdit = () => {
    if (disabled) return;
    setIsEditingDraft(true);
    setEditDraftText(item.draft || '');
  };

  const handleSaveDraft = () => {
    const next = editDraftText.trim();
    onSetDraft(index, next || null);
    setIsEditingDraft(false);
  };

  const handleCancelDraft = () => {
    setEditDraftText(item.draft || '');
    setIsEditingDraft(false);
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelDraft();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveDraft();
    }
  };

  // Set up progress listener
  useEffect(() => {
    if (!window.electron?.onAutocompleteProgress) return;

    // Clean up previous listener if any
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Set up new listener when autocompleting
    if (isAutocompleting) {
      const cleanup = window.electron.onAutocompleteProgress((update: ProgressUpdate) => {
        console.log('[Component] Progress update:', update);
        
        if (update.type === 'status') {
          setProgressStatus(update.message || null);
        } else if (update.type === 'step' && update.content) {
          setProgressSteps(prev => {
            const newSteps = [...prev, { content: update.content!, timestamp: update.timestamp }];
            // Show progress steps in real-time during processing
            // These will be cleared when complete for email tasks
            onSetSteps(index, newSteps);
            return newSteps;
          });
        } else if (update.type === 'error') {
          setSuccessMessage(null);
          setAutocompleteError(update.message || 'An error occurred');
        }
      });
      
      cleanupRef.current = cleanup;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isAutocompleting, index, onSetSteps]);

  const handleAutocomplete = async () => {
    if (disabled || isAutocompleting) return;

    // Check if running in Electron
    console.log('[Component] window.electron:', window.electron);
    console.log('[Component] typeof window:', typeof window);
    if (!window.electron || !window.electron.autocompleteTask) {
      console.error('[Component] Electron API not available');
      setSuccessMessage(null);
      setAutocompleteError('Autocomplete is only available in the Electron app');
      setTimeout(() => setAutocompleteError(null), 5000);
      return;
    }

    // Check if Gmail is authenticated before attempting autocomplete
    try {
      const isAuthenticated = await window.electron.checkGmailAuth();
      if (!isAuthenticated) {
        console.log('[Component] Gmail not authenticated, showing auth modal...');
        requestAuth();
        return;
      }
    } catch (error) {
      console.error('[Component] Error checking Gmail auth:', error);
    }

    console.log('[Component] Calling autocompleteTask for:', item.text);
    
    // Reset progress state
    setProgressSteps([]);
    setProgressStatus('Starting...');
    setIsAutocompleting(true);
    setAutocompleteError(null);
    
    try {
      const response = await window.electron.autocompleteTask(item.text);
      console.log('[Component] Autocomplete response:', response);
      
      if (response.success) {
        // For email tasks, extract the draft content from steps and show in AutocompleteDraft
        if (response.isEmailTask && response.steps && response.steps.length > 0) {
          // Combine all steps into a single draft
          const draftContent = response.steps.map(s => s.content).join('\n\n');
          onSetDraft(index, draftContent, true);
          // Clear steps for email tasks - draft will be shown in AutocompleteDraft instead
          onSetSteps(index, []);
        } else {
          // For non-email tasks, show steps in AgentSteps
          onSetSteps(index, response.steps || []);
        }
      } else {
        setSuccessMessage(null);
        setAutocompleteError(response.error || 'Autocomplete failed');
        setTimeout(() => setAutocompleteError(null), 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSuccessMessage(null);
      setAutocompleteError(errorMessage);
      setTimeout(() => setAutocompleteError(null), 5000);
    } finally {
      setIsAutocompleting(false);
      setProgressStatus(null);
      setProgressSteps([]);
    }
  };

  return (
    <>
      <li
        id={`checklist-item-${index}`}
        style={{
          position: 'relative',
          marginBottom: '4px',
        }}
      >
      {/* Drop zone above */}
      <div
        onDragOver={handleDragOverTop}
        onDrop={(e) => handleDrop(e, index)}
        style={{
          position: 'absolute',
          top: -2,
          left: 0,
          right: 0,
          height: 8,
          zIndex: 10,
        }}
      />
      
      {showDropZoneAbove && (
        <div style={{
          position: 'absolute',
          top: -2,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: '#bc915c',
          borderRadius: 4,
          zIndex: 5,
        }} />
      )}

      {/* Item content */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0ede8',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          backgroundColor: item.completed ? '#f9f7f4' : '#fefdfb',
          borderRadius: '8px',
          opacity: isDragging ? 0.4 : 1,
          transition: 'opacity 0.2s, background-color 0.2s',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Drag Handle */}
          {!disabled && !isEditing && (
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                color: '#8a7c6f',
                fontSize: '16px',
                flexShrink: 0,
                lineHeight: 1,
                userSelect: 'none',
              }}
              title="Drag to reorder"
            >
              ⋮⋮
            </div>
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onToggle(index)}
            disabled={disabled}
            style={{
              width: 18,
              height: 18,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />

          {/* Item Text - Editable */}
          {isEditing ? (
            <input
              id={`input-edit-item-${index}`}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                flex: 1,
                fontSize: '14px',
                padding: '8px 12px',
                border: '2px solid #bc915c',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
          ) : (
            <span
              onClick={handleStartEdit}
              style={{
                flex: 1,
                fontSize: '14px',
                color: item.completed ? '#8a7c6f' : '#2d251f',
                textDecoration: item.completed ? 'line-through' : 'none',
                wordBreak: 'break-word',
                cursor: disabled ? 'default' : 'text',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.backgroundColor = '#f9f7f4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Click to edit"
            >
              {item.text}
            </span>
          )}

          {/* Preferences Button */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowWorkTypes((prev) => !prev)}
              className="checklist-item-preferences-button"
              aria-pressed={showWorkTypes}
              title={showWorkTypes ? 'Hide preferences' : 'Show preferences'}
              disabled={disabled}
            >
              ⚙️
            </button>
          )}

          {/* Autocomplete Button */}
          {!isEditing && (
            <button
              type="button"
              id={`autocomplete-btn-${index}`}
              onClick={handleAutocomplete}
              disabled={disabled || isAutocompleting}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: isAutocompleting ? '#8a7c6f' : '#2196f3',
                background: 'transparent',
                border: '1px solid #bbdefb',
                borderRadius: '8px',
                cursor: isAutocompleting ? 'wait' : 'pointer',
                flexShrink: 0,
                opacity: 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              title={autocompleteError || 'Use Claude AI to enhance this task'}
            >
              {isAutocompleting ? 'Processing...' : 'Autocomplete'}
            </button>
          )}

          {/* Delete Button */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => onDelete(index)}
              disabled={disabled}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: '#c4704f',
                background: 'transparent',
                border: '1px solid #e8e4df',
                borderRadius: '8px',
                cursor: 'pointer',
                flexShrink: 0,
                opacity: 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              Delete
            </button>
          )}

        </div>

        {/* Progress Status */}
        {isAutocompleting && progressStatus && (
          <div style={{
            marginLeft: '34px',
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#e3f2fd',
            border: '1px solid #bbdefb',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid #1976d2',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>{progressStatus}</span>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {showWorkTypes && (
          <ChecklistWorkTypeSelector
            workTypes={item.workTypes}
            disabled={disabled}
            onChange={(type, value) => onSetWorkType(index, type, value)}
          />
        )}

        {item.draft && !isEditingDraft && (
          <div style={{ marginLeft: '34px', cursor: disabled ? 'default' : 'text' }} title={disabled ? undefined : 'Click to edit draft'}>
            <AutocompleteDraft
              text={item.draft}
              onDelete={handleDeleteDraft}
              onRetry={handleRetryDraft}
              onApprove={handleApproveDraft}
              onEdit={handleStartDraftEdit}
              disabled={disabled || isApproving}
              isProcessing={isAutocompleting}
              isApproving={isApproving}
            />
          </div>
        )}

        {isEditingDraft && (
          <div style={{ marginLeft: '34px' }}>
            <textarea
              value={editDraftText}
              onChange={(e) => setEditDraftText(e.target.value)}
              onBlur={handleSaveDraft}
              onKeyDown={handleDraftKeyDown}
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
          </div>
        )}

        {item.steps && item.steps.length > 0 && (
          <div style={{ marginLeft: '34px' }}>
            <AgentSteps
              steps={item.steps}
              onDelete={handleDeleteSteps}
              onRetry={handleRetryDraft}
              onApprove={handleApproveSteps}
              onUpdateStep={handleUpdateStep}
              disabled={disabled}
              isProcessing={isAutocompleting}
            />
          </div>
        )}
      </div>

      {/* Drop zone below */}
      <div
        onDragOver={handleDragOverBottom}
        onDrop={(e) => handleDrop(e, index + 1)}
        style={{
          position: 'absolute',
          bottom: -2,
          left: 0,
          right: 0,
          height: 8,
          zIndex: 10,
        }}
      />
      
      {showDropZoneBelow && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: '#bc915c',
          borderRadius: 4,
          zIndex: 5,
        }} />
      )}
      </li>

      {(autocompleteError || successMessage) && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 28px',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            color: successMessage ? '#1b5e20' : '#b71c1c',
            backgroundColor: successMessage ? 'rgba(232, 245, 233, 0.95)' : 'rgba(255, 235, 238, 0.95)',
            border: successMessage ? '1px solid #a5d6a7' : '1px solid #ef9a9a',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            textAlign: 'center',
            minWidth: '280px',
            zIndex: 1000,
          }}
        >
          {successMessage || autocompleteError}
        </div>
      )}
    </>
  );
}
