import React, { useState } from 'react';
import { ChecklistItem as ChecklistItemType } from '../../../api';

type Props = {
  item: ChecklistItemType;
  index: number;
  onToggle: (index: number) => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, newText: string) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
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
  onMoveItem,
  disabled = false,
  draggedIndex,
  onDragStart,
  onDragEnd,
  dropTargetIndex,
  onDropTargetChange,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

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
    console.log('[Component] Calling autocompleteTask for:', item.text);
    
    setIsAutocompleting(true);
    setAutocompleteError(null);
    
    try {
      const response = await window.electron.autocompleteTask(item.text);
      
      if (response.success) {
        onUpdate(index, response.completedText);
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
          alignItems: 'center',
          gap: 12,
          backgroundColor: item.completed ? '#f9f7f4' : '#fefdfb',
          borderRadius: '8px',
          opacity: isDragging ? 0.4 : 1,
          transition: 'opacity 0.2s, background-color 0.2s',
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
