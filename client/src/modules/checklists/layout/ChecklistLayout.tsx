import React from 'react';
import { Checklist } from '../../../api';
import { ChecklistSidebar } from './ChecklistSidebar';
import { ChecklistDetailView } from './ChecklistDetailView';
import { WhiteboardView } from './WhiteboardView';
import { Context } from '../../../adapters/core';
import { ViewMode } from '../../Header';

type Props = {
  checklists: Checklist[];
  selectedId: string | null;
  selectedChecklist: Checklist | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
  viewMode: ViewMode;
};

export function ChecklistLayout({
  checklists,
  selectedId,
  selectedChecklist,
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
          <ChecklistSidebar
            checklists={checklists}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddNew={onAddNew}
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
          selectedId={selectedId}
          selectedChecklist={selectedChecklist}
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
