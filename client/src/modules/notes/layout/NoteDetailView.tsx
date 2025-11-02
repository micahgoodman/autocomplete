import React, { useState, useEffect } from 'react';
import { Note, updateNote, deleteNote } from '../../../api';
import { Droppable } from '../../../ui/generic/Droppable';
import { EmbeddedModules } from '../../../ui/generic/EmbeddedModules';
import { Context } from '../../../adapters/core';
import { ConfirmModal } from '../../ConfirmModal';

type Props = {
  note: Note | null;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
};

export function NoteDetailView({
  note,
  onUpdated,
  onDeleted,
  onShowToast,
  contextChain,
  hideEmbedded = false,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local state when note changes
  useEffect(() => {
    if (note) {
      setEditedText(note.text);
      setHasUnsavedChanges(false);
    }
  }, [note?.id]); // Only update when note ID changes

  const handleTextChange = (newText: string) => {
    setEditedText(newText);
    setHasUnsavedChanges(note ? newText !== note.text : false);
  };

  const handleSave = async () => {
    if (!note) return;
    const trimmed = editedText.trim();
    if (!trimmed) {
      onShowToast('Note text cannot be empty');
      return;
    }
    if (trimmed === note.text) {
      setHasUnsavedChanges(false);
      return;
    }

    setSaving(true);
    try {
      await updateNote(note.id, { text: trimmed });
      setHasUnsavedChanges(false);
      onUpdated();
      onShowToast('Note saved');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!note) return;
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await deleteNote(note.id);
      onShowToast('Deleted');
      onDeleted();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  // Auto-save on keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && note) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, editedText, note]);

  if (!note) {
    return (
      <div id="note-detail-view" style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        backgroundColor: '#fefdfb',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#8a7c6f',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h2 style={{ marginBottom: '8px', color: '#6b5d52' }}>No Note Selected</h2>
          <p>Select a note from the sidebar to view its details</p>
        </div>
      </div>
    );
  }

  const cardContext = { type: 'note', id: note.id } as const;

  return (
    <Droppable
      parent={{ type: 'note', id: note.id }}
      onAssociated={(p) => onShowToast(`Associated ${p.moduleType}${p.title ? `: ${p.title}` : ''}`)}
      onError={(m) => onShowToast(m)}
      contextChain={contextChain}
    >
      <div id="note-detail-view" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#fefdfb',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e8e4df',
          backgroundColor: '#fefdfb',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 600,
              color: '#2d251f',
            }}>
              Note
            </h1>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {hasUnsavedChanges && (
                <button
                  id="btn-save-note"
                  type="button"
                  className="btn primary"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '12px 24px' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                id="btn-delete-note"
                type="button"
                className="btn danger"
                onClick={handleDeleteClick}
                disabled={deleting}
                style={{ padding: '12px 16px' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          maxWidth: '100%',
        }}>
          {/* Note Editor */}
          <textarea
            id="input-note-text"
            value={editedText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Write your note here..."
            style={{
              width: '100%',
              minHeight: '300px',
              padding: '16px',
              fontSize: '16px',
              lineHeight: '1.6',
              border: '1.5px solid #d4cfc7',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit',
              backgroundColor: '#ffffff',
            }}
          />

          {hasUnsavedChanges && (
            <div style={{
              marginTop: '12px',
              fontSize: '14px',
              color: '#8a7c6f',
              fontStyle: 'italic',
            }}>
              Unsaved changes (Press Ctrl+S or Cmd+S to save)
            </div>
          )}

          {/* Embedded Modules */}
          {!hideEmbedded && (
            <div style={{ marginTop: '32px' }}>
              <EmbeddedModules
                parentContext={cardContext}
                parentIdPrefix={`note-${note.id}`}
                onToast={onShowToast}
                contextChain={contextChain}
              />
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <ConfirmModal
            title="Delete Note"
            message="Are you sure you want to delete this note? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            isDestructive={true}
            onConfirm={handleConfirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </Droppable>
  );
}
