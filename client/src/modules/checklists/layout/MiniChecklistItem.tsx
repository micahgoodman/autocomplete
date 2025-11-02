import React from 'react';
import { ChecklistItem } from '../../../api';
import { shouldHighlightItem, formatDueDate } from '../utils/itemHighlight';

type Props = {
  item: ChecklistItem;
  onToggle: () => void;
  disabled?: boolean;
};

/**
 * MiniChecklistItem - Simplified checklist item for whiteboard mini view
 * 
 * Shows only the checkbox and text, without any additional features like
 * drag handles, autocomplete, delete buttons, etc.
 * Items with high urgency or due within 7 days are highlighted in red.
 */
export function MiniChecklistItem({ item, onToggle, disabled = false }: Props) {
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggle();
  };

  const isHighlighted = shouldHighlightItem(item);

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        padding: '6px 8px',
        backgroundColor: isHighlighted ? '#ffebee' : 'transparent',
        borderRadius: '6px',
        border: isHighlighted ? '1px solid #ef5350' : '1px solid transparent',
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.completed}
        onChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        style={{
          marginTop: '2px',
          width: '16px',
          height: '16px',
          cursor: disabled ? 'default' : 'pointer',
          flexShrink: 0,
        }}
      />

      {/* Item Text and Metadata */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            fontSize: '13px',
            lineHeight: '1.4',
            color: item.completed ? '#8a7c6f' : (isHighlighted ? '#c62828' : '#2d251f'),
            textDecoration: item.completed ? 'line-through' : 'none',
            fontWeight: isHighlighted ? 600 : 'normal',
            wordBreak: 'break-word',
          }}
        >
          {item.text}
        </div>
        
        {/* Show due date and/or urgency if present */}
        {(item.dueDate || item.urgency) && !item.completed && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: isHighlighted ? '#c62828' : '#8a7c6f' }}>
            {item.dueDate && (
              <span style={{ fontWeight: isHighlighted ? 600 : 'normal' }}>
                📅 {formatDueDate(item.dueDate)}
              </span>
            )}
            {item.urgency && (
              <span style={{ 
                fontWeight: item.urgency === 'high' ? 600 : 'normal',
                color: item.urgency === 'high' ? '#c62828' : (item.urgency === 'medium' ? '#f57c00' : '#8a7c6f')
              }}>
                {item.urgency === 'high' ? '🔴' : item.urgency === 'medium' ? '🟡' : '🟢'} {item.urgency}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
