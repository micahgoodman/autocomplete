import React from 'react';
import { Note } from '../../../api';
import { NoteSidebar } from './NoteSidebar';
import { NoteDetailView } from './NoteDetailView';
import { WhiteboardView } from './WhiteboardView';
import { Context } from '../../../adapters/core';
import { ViewMode } from '../../Header';

type Props = {
  notes: Note[];
  selectedId: string | null;
  selectedNote: Note | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
  viewMode: ViewMode;
};

export function NoteLayout({
  notes,
  selectedId,
  selectedNote,
  onSelect,
  onAddNew,
  onUpdated,
  onDeleted,
  onShowToast,
  contextChain,
  hideEmbedded = false,
  viewMode,
}: Props) {
  return (
    <>
      {/* Content based on view mode */}
      {viewMode === 'sidebar' ? (
        <div style={{
          display: 'flex',
          height: 'calc(100vh - 80px)',
          backgroundColor: '#fefdfb',
          border: '1px solid #e8e4df',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <NoteSidebar
            notes={notes}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddNew={onAddNew}
          />
          
          <NoteDetailView
            note={selectedNote}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            onShowToast={onShowToast}
            contextChain={contextChain}
            hideEmbedded={hideEmbedded}
          />
        </div>
      ) : (
        <WhiteboardView
          notes={notes}
          selectedId={selectedId}
          selectedNote={selectedNote}
          onSelect={onSelect}
          onAddNew={onAddNew}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          onShowToast={onShowToast}
          contextChain={contextChain}
          hideEmbedded={hideEmbedded}
        />
      )}
    </>
  );
}
