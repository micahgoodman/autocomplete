import React from 'react';
import { Checklist } from '../../../api';
import { ChecklistSidebar } from './ChecklistSidebar';
import { ChecklistDetailView } from './ChecklistDetailView';
import { Context } from '../../../adapters/core';

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
}: Props) {
  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 180px)', // Account for header and margins
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
  );
}
