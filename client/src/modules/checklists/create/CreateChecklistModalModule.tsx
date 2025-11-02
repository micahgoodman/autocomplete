import React, { useState, useEffect } from 'react';
import { Modal } from '../../Modal';
import { createChecklist, ChecklistItem } from '../../../api';
import { BulkItemInput } from './BulkItemInput';

export function CreateChecklistModal({ onClose, onCreated, onError, contextType, contextId }: { onClose: () => void; onCreated: () => void; onError: (msg: string) => void; contextType?: string; contextId?: string; }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([
    { text: '', completed: false, dueDate: null, urgency: null },
  ]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBulkInput, setUseBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Please enter a checklist name');
      return;
    }

    // Filter out empty items
    const validItems = items.filter(item => item.text.trim());
    
    const body = {
      name: trimmedName,
      items: validItems,
      ...(contextType && contextId ? { context: { type: contextType, id: contextId } } : {})
    } as any;

    try {
      setCreating(true);
      await createChecklist(body);
      setName('');
      setItems([{ text: '', completed: false, dueDate: null, urgency: null }]);
      onCreated();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to create checklist';
      setError(msg);
      onError(msg);
    } finally {
      setCreating(false);
    }
  }

  const updateItemText = (index: number, text: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], text };
    setItems(updated);
  };

  const toggleItemCompleted = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { text: '', completed: false, dueDate: null, urgency: null },
    ]);
  };

  const setItemDueDate = (index: number, dueDate: string | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], dueDate };
    setItems(updated);
  };

  const setItemUrgency = (
    index: number,
    urgency: 'low' | 'medium' | 'high' | null,
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], urgency };
    setItems(updated);
  };

  const handleBulkParse = (parsedItems: ChecklistItem[]) => {
    const normalized = parsedItems.map((item) => ({
      ...item,
      dueDate: item.dueDate ?? null,
      urgency: item.urgency ?? null,
    }));
    setItems(normalized);
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('form-create-checklist') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Modal title="Add Checklist" onClose={onClose}>
      <form onSubmit={onSubmit} id="form-create-checklist">
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="input-checklist-title" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Checklist Name
          </label>
          <input
            id="input-checklist-title"
            type="text"
            name="name"
            placeholder="Enter checklist name..."
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Bulk Input Toggle */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="toggle-bulk-input"
            type="checkbox"
            checked={useBulkInput}
            onChange={(e) => setUseBulkInput(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <label htmlFor="toggle-bulk-input" style={{ cursor: 'pointer', fontSize: '14px' }}>
            Use bulk input mode (paste multiple items)
          </label>
        </div>

        {/* Items Section - Toggle between bulk and individual */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Items</label>
          
          {useBulkInput ? (
            <BulkItemInput
              value={bulkText}
              onChange={setBulkText}
              onParse={handleBulkParse}
              disabled={creating}
            />
          ) : (
            <>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '8px 10px',
                    border: '1px solid #e8e4df',
                    borderRadius: '8px',
                    marginBottom: 8,
                    backgroundColor: '#fefdfb',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItemCompleted(index)}
                      style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <input
                      id={`input-create-item-${index}`}
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItemText(index, e.target.value)}
                      placeholder="Item text"
                      style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="btn danger"
                        style={{ padding: '12px 16px', fontSize: '14px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      paddingLeft: 26,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <label
                        htmlFor={`due-date-${index}`}
                        style={{ fontSize: '12px', color: '#6b5d52', fontWeight: 500 }}
                      >
                        Due:
                      </label>
                      <input
                        id={`due-date-${index}`}
                        type="date"
                        value={item.dueDate || ''}
                        onChange={(e) =>
                          setItemDueDate(index, e.target.value ? e.target.value : null)
                        }
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid #d4cfc7',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                        }}
                      />
                      {item.dueDate && (
                        <button
                          type="button"
                          onClick={() => setItemDueDate(index, null)}
                          className="btn secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <label
                        htmlFor={`urgency-${index}`}
                        style={{ fontSize: '12px', color: '#6b5d52', fontWeight: 500 }}
                      >
                        Urgency:
                      </label>
                      <select
                        id={`urgency-${index}`}
                        value={item.urgency || ''}
                        onChange={(e) =>
                          setItemUrgency(
                            index,
                            (e.target.value as 'low' | 'medium' | 'high') || null,
                          )
                        }
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid #d4cfc7',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                        }}
                      >
                        <option value="">None</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                id="btn-add-item-create"
                type="button"
                onClick={addItem}
                className="btn secondary"
                style={{ marginTop: 12, fontSize: '14px' }}
              >
                Add Item
              </button>
            </>
          )}
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
          <button id="btn-cancel-create-checklist" type="button" className="btn cancel" onClick={onClose}>Cancel</button>
          <button id="btn-submit-create-checklist" type="submit" className="btn confirm" disabled={creating}>
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
