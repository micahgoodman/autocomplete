import React from 'react';
import { Note } from '../../../api';

type Props = {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onCardClick: (e: React.MouseEvent) => void;
};

export function WhiteboardNoteCard({ note, isSelected, onClick, onCardClick }: Props) {
  // Get preview text (first 200 characters)
  const previewText = note.text.substring(0, 200) + (note.text.length > 200 ? '...' : '');

  return (
    <div
      onClick={onCardClick}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#fefdfb',
        border: `2px solid ${isSelected ? '#bc915c' : '#e8e4df'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isSelected 
          ? '0 4px 12px rgba(188, 145, 92, 0.2)' 
          : '0 2px 8px rgba(45, 37, 31, 0.1)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#d4cfc7';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(45, 37, 31, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e8e4df';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(45, 37, 31, 0.1)';
        }
      }}
    >
      {/* Note Icon */}
      <div style={{
        fontSize: '24px',
        marginBottom: '12px',
      }}>
        📝
      </div>

      {/* Note Preview */}
      <div style={{
        flex: 1,
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#2d251f',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 6,
        WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {previewText}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e8e4df',
        fontSize: '11px',
        color: '#8a7c6f',
      }}>
        {note.text.length} characters
      </div>
    </div>
  );
}
