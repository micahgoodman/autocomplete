import React, { useState } from 'react';
import { Checklist, ChecklistItem as ChecklistItemType, updateChecklist, deleteChecklist } from '../../../api';
import { Modal } from '../../Modal';
import { EditChecklist } from '../update/EditChecklistModule';
import { Droppable } from '../../../ui/generic/Droppable';
import { EmbeddedModules } from '../../../ui/generic/EmbeddedModules';
import { Context } from '../../../adapters/core';
import { ConfirmModal } from '../../ConfirmModal';
import { BulkItemInput } from '../create/BulkItemInput';
import { DraggableChecklistItem } from '../components/DraggableChecklistItem';

type Props = {
  checklist: Checklist | null;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
};

export function ChecklistDetailView({
  checklist,
  onUpdated,
  onDeleted,
  onShowToast,
  contextChain,
  hideEmbedded = false,
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [useBulkAddMode, setUseBulkAddMode] = useState(false);
  const [bulkAddText, setBulkAddText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  if (!checklist) {
    return (
      <div id="checklist-detail-view" style={{
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ marginBottom: '8px', color: '#6b5d52' }}>No Checklist Selected</h2>
          <p>Select a checklist from the sidebar to view its details</p>
        </div>
      </div>
    );
  }

  const handleToggleItem = async (index: number) => {
    setTogglingIndex(index);
    try {
      const updatedItems = [...checklist.items];
      updatedItems[index] = { ...updatedItems[index], completed: !updatedItems[index].completed };
      await updateChecklist(checklist.id, { items: updatedItems });
      onUpdated();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update item');
    } finally {
      setTogglingIndex(null);
    }
  };

  const handleAddItem = async () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    
    setAddingItem(true);
    try {
      const updatedItems = [...checklist.items, { text: trimmed, completed: false }];
      await updateChecklist(checklist.id, { items: updatedItems });
      setNewItemText('');
      onUpdated();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleBulkAddParse = async (parsedItems: ChecklistItemType[]) => {
    if (parsedItems.length === 0) return;
    
    setAddingItem(true);
    try {
      const updatedItems = [...checklist.items, ...parsedItems];
      await updateChecklist(checklist.id, { items: updatedItems });
      setBulkAddText('');
      onUpdated();
      onShowToast(`Added ${parsedItems.length} items`);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to add items');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await deleteChecklist(checklist.id);
      onShowToast('Deleted');
      onDeleted();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to delete checklist');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartTitleEdit = () => {
    if (checklist) {
      setEditedTitle(checklist.name);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = async () => {
    if (!checklist) return;
    const trimmed = editedTitle.trim();
    if (!trimmed || trimmed === checklist.name) {
      setIsEditingTitle(false);
      return;
    }

    setSavingTitle(true);
    try {
      await updateChecklist(checklist.id, { name: trimmed });
      setIsEditingTitle(false);
      onUpdated();
      onShowToast('Title updated');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update title');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleMoveItem = async (fromIndex: number, toIndex: number) => {
    // Create new array with item moved to new position
    const items = [...checklist.items];
    const [movedItem] = items.splice(fromIndex, 1);
    
    // Adjust target index if we removed an item before it
    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    items.splice(adjustedToIndex, 0, movedItem);
    
    try {
      await updateChecklist(checklist.id, { items });
      onUpdated();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to reorder items');
    }
  };

  const handleDeleteItem = async (index: number) => {
    try {
      const updatedItems = checklist.items.filter((_, i) => i !== index);
      await updateChecklist(checklist.id, { items: updatedItems });
      onUpdated();
      onShowToast('Item deleted');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to delete item');
    }
  };

  const handleUpdateItem = async (index: number, newText: string) => {
    try {
      const updatedItems = [...checklist.items];
      updatedItems[index] = { ...updatedItems[index], text: newText };
      await updateChecklist(checklist.id, { items: updatedItems });
      onUpdated();
      onShowToast('Item updated');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update item');
    }
  };

  const cardContext = { type: 'checklist', id: checklist.id } as const;

  return (
    <Droppable
      parent={{ type: 'checklist', id: checklist.id }}
      onAssociated={(p) => onShowToast(`Associated ${p.moduleType}${p.title ? `: ${p.title}` : ''}`)}
      onError={(m) => onShowToast(m)}
      contextChain={contextChain}
    >
      <div id="checklist-detail-view" style={{
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
            marginBottom: '16px',
          }}>
            {isEditingTitle ? (
              <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="input-edit-checklist-title"
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelTitleEdit();
                  }}
                  disabled={savingTitle}
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: '28px',
                    fontWeight: 600,
                    padding: '8px 12px',
                    border: '2px solid #bc915c',
                    borderRadius: '8px',
                  }}
                />
                <button
                  id="btn-save-checklist-title"
                  type="button"
                  className="btn primary"
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}
                >
                  {savingTitle ? 'Saving...' : 'Save'}
                </button>
                <button
                  id="btn-cancel-checklist-title"
                  type="button"
                  className="btn secondary"
                  onClick={handleCancelTitleEdit}
                  disabled={savingTitle}
                  style={{ padding: '12px 16px' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1
                id="selected-checklist-title"
                onClick={handleStartTitleEdit}
                style={{
                  margin: 0,
                  fontSize: '28px',
                  fontWeight: 600,
                  color: '#2d251f',
                  flex: 1,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f7f4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Click to edit"
              >
                {checklist.name}
              </h1>
            )}
            
            <div style={{ display: 'flex', margin: '0 8px', flexShrink: 0 }}>
              <button
                id="btn-delete-checklist"
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
          {/* Checklist Items */}
          {checklist.items && checklist.items.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {checklist.items.map((item, index) => (
                <DraggableChecklistItem
                  key={index}
                  item={item}
                  index={index}
                  onToggle={handleToggleItem}
                  onDelete={handleDeleteItem}
                  onUpdate={handleUpdateItem}
                  onMoveItem={handleMoveItem}
                  disabled={togglingIndex === index || addingItem}
                  draggedIndex={draggedIndex}
                  onDragStart={setDraggedIndex}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDropTargetIndex(null);
                  }}
                  dropTargetIndex={dropTargetIndex}
                  onDropTargetChange={setDropTargetIndex}
                />
              ))}
            </ul>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px',
              color: '#8a7c6f',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✓</div>
              <p style={{ fontSize: '16px', margin: 0 }}>No items yet. Add your first item below!</p>
            </div>
          )}
          
          {/* Add new items section */}
          <div style={{ marginTop: checklist.items.length > 0 ? 24 : 16 }}>
            {/* Bulk input toggle */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="toggle-bulk-add"
                type="checkbox"
                checked={useBulkAddMode}
                onChange={(e) => setUseBulkAddMode(e.target.checked)}
                disabled={addingItem}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="toggle-bulk-add" style={{ cursor: 'pointer', fontSize: '14px', color: '#6b5d52' }}>
                Bulk add mode (paste multiple items)
              </label>
            </div>

            {useBulkAddMode ? (
              <div>
                <BulkItemInput
                  value={bulkAddText}
                  onChange={setBulkAddText}
                  onParse={handleBulkAddParse}
                  disabled={addingItem}
                />
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                gap: 12,
                padding: '16px',
                backgroundColor: '#f9f7f4',
                borderRadius: '8px',
              }}>
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="Add a new item..."
                  disabled={addingItem}
                  style={{ 
                    flex: 1, 
                    padding: '12px 16px', 
                    fontSize: '14px',
                    border: '1.5px solid #d4cfc7',
                    borderRadius: '8px',
                  }}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleAddItem}
                  disabled={addingItem || !newItemText.trim()}
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  {addingItem ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>

          {/* Embedded Modules */}
          {!hideEmbedded && (
            <div style={{ marginTop: '32px' }}>
              <EmbeddedModules
                parentContext={cardContext}
                parentIdPrefix={`checklist-${checklist.id}`}
                onToast={onShowToast}
                contextChain={contextChain}
              />
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showEdit && (
          <Modal title={"Edit Checklist"} onClose={() => setShowEdit(false)}>
            <EditChecklist
              checklist={checklist}
              onSuccess={() => { setShowEdit(false); onShowToast('Saved'); onUpdated(); }}
              onCancel={() => setShowEdit(false)}
            />
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <ConfirmModal
            title="Delete Checklist"
            message={`Are you sure you want to delete "${checklist.name}"? This action cannot be undone.`}
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
