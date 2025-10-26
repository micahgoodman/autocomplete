import React, { useState } from 'react';
import { Checklist } from '../../../api';

type Props = {
  checklists: Checklist[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
};

export function ChecklistSidebar({ checklists, selectedId, onSelect, onAddNew }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter checklists based on search query
  const filteredChecklists = checklists.filter(checklist =>
    checklist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate incomplete items count for each checklist
  const getIncompleteCount = (checklist: Checklist) => {
    return checklist.items.filter(item => !item.completed).length;
  };

  return (
    <div id="checklist-sidebar" style={{
      width: '280px',
      borderRight: '1px solid #e8e4df',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f9f7f4',
    }}>
      {/* Header with Add Button */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e8e4df',
        backgroundColor: '#fefdfb',
      }}>
        <button
          id="btn-add-checklist"
          type="button"
          className="btn primary"
          onClick={onAddNew}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + New Checklist
        </button>
      </div>

      {/* Search Input */}
      {checklists.length > 3 && (
        <div style={{ padding: '16px', borderBottom: '1px solid #e8e4df' }}>
          <input
            type="text"
            placeholder="Search checklists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1.5px solid #d4cfc7',
              borderRadius: '8px',
            }}
          />
        </div>
      )}

      {/* Checklist List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {filteredChecklists.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#8a7c6f',
            fontSize: '14px',
          }}>
            {searchQuery ? 'No checklists found' : 'No checklists yet'}
          </div>
        ) : (
          filteredChecklists.map((checklist, index) => {
            const isSelected = checklist.id === selectedId;
            const incompleteCount = getIncompleteCount(checklist);

            return (
              <div
                key={checklist.id}
                id={`sidebar-checklist-item-${index}`}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => onSelect(checklist.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f2efeb' : 'transparent',
                  borderLeft: isSelected ? '3px solid #bc915c' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f9f7f4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? '#8b7355' : '#2d251f',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {checklist.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b5d52',
                    marginTop: '4px',
                  }}>
                    {checklist.items.length} {checklist.items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>

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
                    textAlign: 'center',
                  }}>
                    {incompleteCount}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
