import React from 'react';
import { ChecklistItem } from '../../../api';

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
 */
export function MiniChecklistItem({ item, onToggle, disabled = false }: Props) {
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        padding: '6px 0',
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

      {/* Item Text */}
      <div
        style={{
          flex: 1,
          fontSize: '13px',
          lineHeight: '1.4',
          color: item.completed ? '#8a7c6f' : '#2d251f',
          textDecoration: item.completed ? 'line-through' : 'none',
          wordBreak: 'break-word',
        }}
      >
        {item.text}
      </div>
    </div>
  );
}
