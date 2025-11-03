import React from 'react';
import { Checklist, Note } from '../../../api';
import { ChecklistSidebar } from './ChecklistSidebar';
import { ChecklistDetailView } from './ChecklistDetailView';
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
        <div style={{
          display: 'flex',
          height: 'calc(100vh - 80px)',
          backgroundColor: '#fefdfb',
          border: '1px solid #e8e4df',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <ChecklistSidebar
            checklists={checklists}
            selectedId={selectedId}
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
