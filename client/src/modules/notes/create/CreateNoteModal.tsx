import React, { useState, useEffect } from 'react';
import { Modal } from '../../Modal';
import { createNote } from '../../../api';

export function CreateNoteModal({ 
  onClose, 
  onCreated, 
  onError, 
  contextType, 
  contextId 
}: { 
  onClose: () => void; 
  onCreated: () => void; 
  onError: (msg: string) => void; 
  contextType?: string; 
  contextId?: string; 
}) {
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      setError('Please enter some text for your note');
      return;
    }

    const body = {
      text: trimmedText,
      dateCreated: new Date().toISOString(),
      ...(contextType && contextId ? { context: { type: contextType, id: contextId } } : {})
    } as any;

    try {
      setCreating(true);
      await createNote(body);
      setText('');
      onCreated();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to create note';
      setError(msg);
      onError(msg);
    } finally {
      setCreating(false);
    }
  }

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('form-create-note') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Modal title="Add Note" onClose={onClose}>
      <form onSubmit={onSubmit} id="form-create-note">
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="input-note-text" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Note Text
          </label>
          <textarea
            id="input-note-text"
            name="text"
            placeholder="Enter your note..."
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            style={{ 
              width: '100%', 
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.6',
              border: '1.5px solid #d4cfc7',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            autoFocus
          />
        </div>

        {contextType && contextId && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md" style={{ marginTop: 12 }}>
            <p><strong>Context:</strong> {contextType}</p>
            <p><strong>ID:</strong> <code className="text-xs font-mono">{contextId}</code></p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <div className="actions" style={{ marginTop: 16 }}>
          <button id="btn-cancel-create-note" type="button" className="btn cancel" onClick={onClose}>Cancel</button>
          <button id="btn-submit-create-note" type="submit" className="btn confirm" disabled={creating}>
            {creating && <span className="spinner" />}
            {creating ? 'Creating...' : 'Create'}
          </button>
          <div style={{ fontSize: '12px', color: '#6b5d52', marginTop: '12px' }}>
            Tip: Press Ctrl+Enter (or Cmd+Enter) to create quickly
          </div>
        </div>
      </form>
    </Modal>
  );
}
