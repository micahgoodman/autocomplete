import React from 'react';
import { Checklist, Note } from '../../../api';
import { ChecklistSidebar } from './ChecklistSidebar';
import { ChecklistDetailView } from './ChecklistDetailView';
import { NoteSidebar } from '../../notes/layout/NoteSidebar';
import { NoteDetailView } from '../../notes/layout/NoteDetailView';
import { WhiteboardView } from './WhiteboardView';
import { Context } from '../../../adapters/core';
import { ViewMode } from '../../Header';

type Props = {
  checklists: Checklist[];
  notes: Note[];
  selectedId: string | null;
  selectedType: 'checklist' | 'note' | null;
  selectedChecklist: Checklist | null;
  selectedNote: Note | null;
  onSelect: (id: string, type: 'checklist' | 'note') => void;
  onAddNewChecklist: () => void;
  onAddNewNote: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
  viewMode: ViewMode;
};

export function ChecklistLayout({
  checklists,
  notes,
  selectedId,
  selectedType,
  selectedChecklist,
  selectedNote,
  onSelect,
  onAddNewChecklist,
  onAddNewNote,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Checklists Section */}
          <div style={{
            display: 'flex',
            height: '600px',
            backgroundColor: '#fefdfb',
            border: '1px solid #e8e4df',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <ChecklistSidebar
              checklists={checklists}
              selectedId={selectedType === 'checklist' ? selectedId : null}
              onSelect={(id) => onSelect(id, 'checklist')}
              onAddNew={onAddNewChecklist}
            />
            
            <ChecklistDetailView
              checklist={selectedChecklist}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
              onShowToast={onShowToast}
              contextChain={contextChain}
              hideEmbedded={hideEmbedded}
            />
          </div>

          {/* Notes Section */}
          <div style={{
            display: 'flex',
            height: '600px',
            backgroundColor: '#fefdfb',
            border: '1px solid #e8e4df',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <NoteSidebar
              notes={notes}
              selectedId={selectedType === 'note' ? selectedId : null}
              onSelect={(id) => onSelect(id, 'note')}
              onAddNew={onAddNewNote}
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
        </div>
      ) : (
        <WhiteboardView
          checklists={checklists}
          notes={notes}
          selectedId={selectedId}
          selectedType={selectedType}
          selectedChecklist={selectedChecklist}
          selectedNote={selectedNote}
          onSelect={onSelect}
          onAddNewChecklist={onAddNewChecklist}
          onAddNewNote={onAddNewNote}
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
