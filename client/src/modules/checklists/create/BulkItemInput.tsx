import React from 'react';
import { ChecklistItem } from '../../../api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onParse: (items: ChecklistItem[]) => void;
  disabled?: boolean;
};

export function BulkItemInput({ value, onChange, onParse, disabled = false }: Props) {
  const handleAddItems = () => {
    // Parse the text into items when user clicks the button
    const lines = value.split('\n').filter(line => line.trim());
    const items: ChecklistItem[] = lines.map(line => ({
      text: line.trim(),
      completed: false,
    }));
    if (items.length > 0) {
      onParse(items);
    }
  };

  const lineCount = value.split('\n').filter(line => line.trim()).length;
  const minHeight = Math.max(120, value.split('\n').length * 24);

  return (
    <div>
      <textarea
        id="bulk-input-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter items, one per line...
Example:
Milk
Bread
Eggs"
        style={{
          width: '100%',
          minHeight: `${minHeight}px`,
          padding: '16px',
          fontSize: '14px',
          fontFamily: 'inherit',
          border: '1.5px solid #d4cfc7',
          borderRadius: '8px',
          resize: 'vertical',
        }}
      />
      <div style={{
        marginTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6b5d52',
        }}>
          {lineCount} {lineCount === 1 ? 'item' : 'items'} ready
        </div>
        <button
          id="btn-add-bulk-items"
          type="button"
          className="btn primary"
          onClick={handleAddItems}
          disabled={disabled || lineCount === 0}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
          }}
        >
          Add {lineCount > 0 ? lineCount : ''} {lineCount === 1 ? 'Item' : 'Items'}
        </button>
      </div>
    </div>
  );
}
