import React, { useState } from 'react';
import { useModuleList } from '../../adapters/core';
import { Note } from '../../api';
import { NoteAdapter } from '../../adapters/notes/adapter';
import { CreateNoteModal } from './create/CreateNoteModal';
import { NoteLayout } from './layout/NoteLayout';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  hideEmbedded?: boolean;
};

export function NoteManager({ hideEmbedded = false }: Props) {
  const { user, requestSignIn } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const showToast = (msg: string, ms = 2000) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), ms);
  };

  const { items: notes, refresh } = useModuleList<Note>(NoteAdapter);

  const { selectedId, selectedNote, selectNote } = useNoteSelection(notes);

  const handleCreateNote = () => {
    if (!user) {
      requestSignIn();
      return;
    }
    setShowAddModal(true);
  };

  return (
    <>
      <div style={{ padding: '0' }}>
        {notes.length === 0 && !showAddModal ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            backgroundColor: '#fefdfb',
            borderRadius: '16px',
            border: '1px solid #e8e4df',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📝</div>
            <h2 style={{ marginBottom: '16px', color: '#6b5d52' }}>No notes yet</h2>
            <p style={{ color: '#8a7c6f', marginBottom: '24px' }}>
              Create your first note to get started
            </p>
            <button
              id="btn-add-note"
              type="button"
              className="btn primary"
              onClick={handleCreateNote}
              style={{ padding: '16px 32px', fontSize: '16px' }}
            >
              + Create Your First Note
            </button>
          </div>
        ) : (
          <NoteLayout
            notes={notes}
            selectedId={selectedId}
            selectedNote={selectedNote}
            onSelect={selectNote}
            onAddNew={handleCreateNote}
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
          />
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <CreateNoteModal
          onClose={() => setShowAddModal(false)}
          onCreated={async () => {
            const result = await refresh();
            setShowAddModal(false);
            if (result.success) {
              showToast('Created');
            } else {
              showToast(result.error || 'Failed to refresh notes');
            }
          }}
          onError={showToast}
        />
      )}
    </>
  );
}
