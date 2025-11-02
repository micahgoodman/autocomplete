import React, { useState } from 'react';
import { Note } from '../../../api';

type Props = {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
};

export function NoteSidebar({ notes, selectedId, onSelect, onAddNew }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter notes based on search query
  const filteredNotes = notes.filter(note =>
    note.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get preview text (first 100 characters)
  const getPreviewText = (note: Note) => {
    const preview = note.text.substring(0, 100);
    return preview + (note.text.length > 100 ? '...' : '');
  };

  return (
    <div id="note-sidebar" style={{
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
          id="btn-add-note"
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
          + New Note
        </button>
      </div>

      {/* Search Input */}
      {notes.length > 3 && (
        <div style={{ padding: '16px', borderBottom: '1px solid #e8e4df' }}>
          <input
            type="text"
            placeholder="Search notes..."
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

      {/* Note List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {filteredNotes.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#8a7c6f',
            fontSize: '14px',
          }}>
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </div>
        ) : (
          filteredNotes.map((note, index) => {
            const isSelected = note.id === selectedId;

            return (
              <div
                key={note.id}
                id={`sidebar-note-item-${index}`}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => onSelect(note.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f2efeb' : 'transparent',
                  borderLeft: isSelected ? '3px solid #bc915c' : '3px solid transparent',
                  transition: 'all 0.2s ease',
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
                <div style={{
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#8b7355' : '#2d251f',
                  lineHeight: '1.5',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  textOverflow: 'ellipsis',
                }}>
                  {getPreviewText(note)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
