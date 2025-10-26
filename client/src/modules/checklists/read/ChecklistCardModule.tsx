import React, { useState } from 'react';
import { Checklist, ChecklistItem, deleteChecklist, disassociateModule, updateChecklist } from '../../../api';
import { ModuleCard } from '../../../ui/generic/ModuleCard';
import { Modal } from '../../Modal';
import { EditChecklist } from '../update/EditChecklistModule';
import { Context } from '../../../adapters/core';
import { useModuleDrag } from '../../../ui/draganddrop/useModuleDrag';
import { Droppable } from '../../../ui/generic/Droppable';
import { EmbeddedModules } from '../../../ui/generic/EmbeddedModules';
import { ConfirmModal } from '../../ConfirmModal';

type Props = {
  checklist: Checklist;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  deleting?: boolean;
  onDeletingChange: (deleting: boolean) => void;
  currentContext?: Context; // If provided, allows removing association with this context
  contextChain?: Context[];
  hideEmbedded?: boolean;
};

export function ChecklistCard({
  checklist,
  onUpdated,
  onDeleted,
  onShowToast,
  deleting = false,
  onDeletingChange,
  currentContext,
  contextChain,
  hideEmbedded = false
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [removingAssociation, setRemovingAssociation] = useState(false);
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { draggableProps } = useModuleDrag({ moduleType: 'checklist', id: checklist.id, title: checklist.name });
  const cardContext = { type: 'checklist', id: checklist.id } as const;

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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    onDeletingChange(true);
    try {
      await deleteChecklist(checklist.id);
      onShowToast('Deleted');
      onDeleted();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to delete checklist');
    } finally {
      onDeletingChange(false);
    }
  };

  return (
    <>
      <Droppable
        parent={{ type: 'checklist', id: checklist.id }}
        onAssociated={(p) => onShowToast(`Associated ${p.moduleType}${p.title ? `: ${p.title}` : ''}`)}
        onError={(m) => onShowToast(m)}
        contextChain={contextChain}
      >
        <div className="module-card--checklist" {...draggableProps}>
          <ModuleCard
            title={checklist.name}
            actions={(
              <>
                <button
                  id="btn-edit-checklist"
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowEdit(true)}
                >
                  Edit
                </button>
                {currentContext && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={async () => {
                      try {
                        setRemovingAssociation(true);
                        // Removing association: disassociate checklist from current context
                        await disassociateModule({ parentType: currentContext.type, parentId: String(currentContext.id), childType: 'checklist', childId: checklist.id });
                        onUpdated();
                      } catch (err: any) {
                        // eslint-disable-next-line no-console
                        console.error(err);
                        onShowToast(err?.message || 'Failed to remove association');
                      } finally {
                        setRemovingAssociation(false);
                      }
                    }}
                    disabled={removingAssociation}
                  >
                    {removingAssociation && <span className="spinner" />}
                    {removingAssociation ? 'Removing...' : `Remove`}
                  </button>
                )}
                <button
                  id="btn-delete-checklist"
                  type="button"
                  className="btn danger"
                  onClick={handleDeleteClick}
                  style={{ fontSize: '14px', padding: '12px 16px' }}
                >
                  Delete
                </button>
              </>
            )}
          >
            {/* Checklist Items */}
            <div style={{ marginTop: 16 }}>
              {checklist.items && checklist.items.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {checklist.items.map((item, index) => (
                    <li key={index} style={{ 
                      padding: '8px 0', 
                      borderBottom: index < checklist.items.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleItem(index)}
                        disabled={togglingIndex === index}
                        style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ 
                        flex: 1,
                        textDecoration: item.completed ? 'line-through' : 'none',
                        opacity: item.completed ? 0.6 : 1,
                        wordBreak: 'break-word'
                      }}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#999', fontStyle: 'italic', margin: 0 }}>No items yet</p>
              )}
              
              {/* Add new item inline */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="Add item..."
                  disabled={addingItem}
                  style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleAddItem}
                  disabled={addingItem || !newItemText.trim()}
                  style={{ padding: '12px 16px', fontSize: '14px' }}
                >
                  {addingItem ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Embedded Modules */}
            {!hideEmbedded && (
              <EmbeddedModules
                parentContext={cardContext}
                parentIdPrefix={`checklist-${checklist.id}`}
                onToast={onShowToast}
                contextChain={contextChain}
              />
            )}
          </ModuleCard>
        </div>
      </Droppable>

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
    </>
  );
}
