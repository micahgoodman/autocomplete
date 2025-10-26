import React, { useState } from 'react';
import { ChecklistItem as ChecklistItemType } from '../../../api';
import { useAuth } from '../../../App';

import { AutocompleteDraft } from './AutocompleteDraft';
import { AgentSteps } from './AgentSteps';
import { ChecklistWorkTypeSelector } from './ChecklistWorkTypeSelector';

type Props = {
  item: ChecklistItemType;
  index: number;
  onToggle: (index: number) => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, newText: string) => void;
  onSetDraft: (index: number, draft: string | null) => void;
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
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editDraftText, setEditDraftText] = useState(item.draft || '');
  const [showWorkTypes, setShowWorkTypes] = useState(true);

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

  const handleApproveDraft = () => {
    // eslint-disable-next-line no-console
    console.log(`[ChecklistItem] Approved draft for checklist item ${index}`);
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

  const handleAutocomplete = async () => {
    if (disabled || isAutocompleting) return;

    // Check if running in Electron
    console.log('[Component] window.electron:', window.electron);
    console.log('[Component] typeof window:', typeof window);
    if (!window.electron || !window.electron.autocompleteTask) {
      console.error('[Component] Electron API not available');
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
    
    setIsAutocompleting(true);
    setAutocompleteError(null);
    
    try {
      const response = await window.electron.autocompleteTask(item.text);
      console.log('[Component] Autocomplete response:', response);
      
      if (response.success) {
        onSetSteps(index, response.steps || []);
      } else {
        setAutocompleteError(response.error || 'Autocomplete failed');
        setTimeout(() => setAutocompleteError(null), 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAutocompleteError(errorMessage);
      setTimeout(() => setAutocompleteError(null), 5000);
    } finally {
      setIsAutocompleting(false);
    }
  };

  return (
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

          {/* Error Message */}
          {autocompleteError && (
            <div style={{
              position: 'absolute',
              bottom: -30,
              right: 16,
              fontSize: '11px',
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '4px 8px',
              borderRadius: '4px',
              maxWidth: '300px',
              wordWrap: 'break-word',
              zIndex: 100,
            }}>
              {autocompleteError}
            </div>
          )}
        </div>

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
              disabled={disabled}
              isProcessing={isAutocompleting}
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
  );
}
