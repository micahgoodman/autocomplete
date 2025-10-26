import React, { useState } from 'react';
import { updateChecklist, Checklist, ChecklistItem } from '../../../api';
import { BulkItemInput } from '../create/BulkItemInput';

interface EditChecklistProps {
  checklist: Checklist;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditChecklist({ checklist, onSuccess, onCancel }: EditChecklistProps) {
  const [name, setName] = useState(checklist.name);
  const [items, setItems] = useState<ChecklistItem[]>(checklist.items || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBulkInput, setUseBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Checklist name cannot be empty');
      return;
    }

    // Check if anything changed
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(checklist.items);
    if (trimmedName === checklist.name.trim() && !itemsChanged) {
      onCancel?.();
      return;
    }

    setLoading(true);
    setError(null);

    // Filter out empty items (match behavior in create module)
    const validItems = items.filter(item => item.text.trim());

    try {
      await updateChecklist(checklist.id, { name: trimmedName, items: validItems });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist');
    } finally {
      setLoading(false);
    }
  };

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
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { text: '', completed: false }]);
  };

  const handleBulkParse = (parsedItems: ChecklistItem[]) => {
    setItems(parsedItems);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <form id="form-edit-checklist" data-testid="edit-checklist-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="input-edit-checklist-title" className="block text-sm font-medium text-gray-700 mb-1">
            Checklist Name
          </label>
          <input
            id="input-edit-checklist-title"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter checklist name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            data-testid="edit-checklist-name-input"
          />
        </div>

        {/* Bulk Input Toggle */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="toggle-bulk-input-edit"
            type="checkbox"
            checked={useBulkInput}
            onChange={(e) => setUseBulkInput(e.target.checked)}
            disabled={loading}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <label htmlFor="toggle-bulk-input-edit" style={{ cursor: 'pointer', fontSize: '14px' }}>
            Use bulk input mode (paste multiple items)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Items
          </label>
          
          {useBulkInput ? (
            <BulkItemInput
              value={bulkText}
              onChange={setBulkText}
              onParse={handleBulkParse}
              disabled={loading}
            />
          ) : (
            <>
              {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleItemCompleted(index)}
                disabled={loading}
                style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
              />
              <input
                id={`input-edit-item-${index}`}
                type="text"
                value={item.text}
                onChange={(e) => updateItemText(index, e.target.value)}
                placeholder="Item text"
                disabled={loading}
                style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={loading}
                className="btn danger"
                style={{ padding: '12px 16px', fontSize: '14px' }}
              >
                Remove
              </button>
            </div>
              ))}
              <button
                id="btn-add-item-edit"
                type="button"
                onClick={addItem}
                disabled={loading}
                className="btn secondary"
                style={{ marginTop: 12 }}
              >
                Add Item
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="actions" style={{ marginTop: 16 }}>
          {onCancel && (
            <button id="btn-cancel-edit-checklist" type="button" className="btn secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          )}
          <button
            id="btn-submit-edit-checklist"
            type="submit"
            disabled={loading || !name.trim()}
            className="btn primary"
            style={{ minWidth: '120px' }}
          >
            {loading && <span className="spinner" />}
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
