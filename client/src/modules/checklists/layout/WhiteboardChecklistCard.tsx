import React from 'react';
import { Checklist } from '../../../api';
import { MiniChecklistItem } from './MiniChecklistItem';

type Props = {
  checklist: Checklist;
  isSelected: boolean;
  onClick: () => void;
  onToggleItem: (index: number) => void;
  onCardClick: (e: React.MouseEvent) => void;
};

/**
 * WhiteboardChecklistCard - Mini checklist view for whiteboard
 * 
 * Displays a checklist with its title and all items in a simplified format.
 * No extra features like drag handles, delete buttons, autocomplete, etc.
 */
export function WhiteboardChecklistCard({ 
  checklist, 
  isSelected, 
  onClick, 
  onToggleItem,
  onCardClick,
}: Props) {
  const totalItems = checklist.items.length;
  const incompleteCount = checklist.items.filter(item => !item.completed).length;

  return (
    <div
      onClick={onCardClick}
      style={{
        backgroundColor: '#fefdfb',
        border: isSelected ? '3px solid #bc915c' : '2px solid #e8e4df',
        borderRadius: '12px',
        padding: '16px',
        width: '320px',
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.2s ease',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#d4cfc7';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e8e4df';
        }
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e8e4df',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: isSelected ? '#8b7355' : '#2d251f',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.3',
        }}>
          {checklist.name}
        </h3>
        
        {incompleteCount > 0 && (
          <div style={{
            backgroundColor: isSelected ? '#8b7355' : '#8a7c6f',
            color: '#fefdfb',
            borderRadius: '50%',
            padding: '4px',
            fontSize: '12px',
            fontWeight: 600,
            minWidth: '24px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {incompleteCount}
          </div>
        )}
      </div>

      {/* Items List */}
      {totalItems > 0 ? (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px',
        }}>
          {checklist.items.map((item, index) => (
            <MiniChecklistItem
              key={index}
              item={item}
              onToggle={() => onToggleItem(index)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          color: '#8a7c6f',
          fontSize: '13px',
          padding: '32px 16px',
        }}>
          No items yet
        </div>
      )}
    </div>
  );
}
