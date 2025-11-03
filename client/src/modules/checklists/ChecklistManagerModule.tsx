import React, { useState } from 'react';
import { useModuleList } from '../../adapters/core';
import { Checklist, Note } from '../../api';
import { ChecklistAdapter } from '../../adapters/checklists/adapter';
import { NoteAdapter } from '../../adapters/notes/adapter';
import { CreateChecklistModal } from './create/CreateChecklistModalModule';
import { CreateNoteModal } from '../notes/create/CreateNoteModal';
import { ChecklistLayout } from './layout/ChecklistLayout';
import { ViewMode } from '../Header';
import { useChecklistSelection } from './hooks/useChecklistSelection';
import { useNoteSelection } from '../notes/hooks/useNoteSelection';

type Props = {
  hideEmbedded?: boolean;
  viewMode: ViewMode;
};

export function ChecklistManager({ hideEmbedded = false, viewMode }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'checklist' | 'note' | null>(null);

  const showToast = (msg: string, ms = 2000) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), ms);
  };

  const { items: checklists, refresh: refreshChecklists } = useModuleList<Checklist>(ChecklistAdapter);
  const { items: notes, refresh: refreshNotes } = useModuleList<Note>(NoteAdapter);

  const { selectedId: selectedChecklistId, selectedChecklist, selectChecklist } = useChecklistSelection(checklists);
  const { selectedId: selectedNoteId, selectedNote, selectNote } = useNoteSelection(notes);

  // Unified selection state
  const selectedId = selectedType === 'checklist' ? selectedChecklistId : selectedType === 'note' ? selectedNoteId : null;

  const handleSelect = (id: string, type: 'checklist' | 'note') => {
    setSelectedType(type);
    if (type === 'checklist') {
      selectChecklist(id);
    } else {
      selectNote(id);
    }
  };

  const refresh = async () => {
    const checklistResult = await refreshChecklists();
    const noteResult = await refreshNotes();
    return checklistResult.success && noteResult.success ? { success: true } : { success: false, error: 'Failed to refresh' };
  };

  return (
    <>
      <div style={{ padding: '0' }}>
        {checklists.length === 0 && notes.length === 0 && !showAddChecklistModal && !showAddNoteModal ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            backgroundColor: '#fefdfb',
            borderRadius: '16px',
            border: '1px solid #e8e4df',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📋</div>
            <h2 style={{ marginBottom: '16px', color: '#6b5d52' }}>No items yet</h2>
            <p style={{ color: '#8a7c6f', marginBottom: '24px' }}>
              Create your first checklist or note to get started
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                id="btn-add-note"
                type="button"
                className="btn primary"
                onClick={() => setShowAddNoteModal(true)}
                style={{ padding: '16px 32px', fontSize: '16px' }}
              >
                + Create Your First Note
              </button>
              <button
                id="btn-add-checklist"
                type="button"
                className="btn primary"
                onClick={() => setShowAddChecklistModal(true)}
                style={{ padding: '16px 32px', fontSize: '16px' }}
              >
                + Create Your First Checklist
              </button>
            </div>
          </div>
        ) : (
          <ChecklistLayout
            checklists={checklists}
            notes={notes}
            selectedId={selectedId}
            selectedType={selectedType}
            selectedChecklist={selectedChecklist}
            selectedNote={selectedNote}
            onSelect={handleSelect}
            onAddNewChecklist={() => setShowAddChecklistModal(true)}
            onAddNewNote={() => setShowAddNoteModal(true)}
            onUpdated={() => {
              refresh();
              showToast('Saved');
            }}
            onDeleted={() => {
              refresh();
              showToast('Deleted');
            }}
            onShowToast={showToast}
            hideEmbedded={hideEmbedded}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* Add Checklist Modal */}
      {showAddChecklistModal && (
        <CreateChecklistModal
          onClose={() => setShowAddChecklistModal(false)}
          onCreated={async () => {
            const result = await refresh();
            setShowAddChecklistModal(false);
            if (result.success) {
              showToast('Created');
            } else {
              showToast(result.error || 'Failed to refresh');
            }
          }}
          onError={showToast}
        />
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <CreateNoteModal
          onClose={() => setShowAddNoteModal(false)}
          onCreated={async () => {
            const result = await refresh();
            setShowAddNoteModal(false);
            if (result.success) {
              showToast('Created');
            } else {
              showToast(result.error || 'Failed to refresh');
            }
          }}
          onError={showToast}
        />
      )}
    </>
  );
}
