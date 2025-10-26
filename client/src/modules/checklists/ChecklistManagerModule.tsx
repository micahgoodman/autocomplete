import React, { useState } from 'react';
import { useModuleList } from '../../adapters/core';
import { Checklist } from '../../api';
import { ChecklistAdapter } from '../../adapters/checklists/adapter';
import { CreateChecklistModal } from './create/CreateChecklistModalModule';
import { ChecklistLayout } from './layout/ChecklistLayout';
import { useChecklistSelection } from './hooks/useChecklistSelection';

type Props = { hideEmbedded?: boolean; };

export function ChecklistManager({ hideEmbedded = false }: Props = {}) {
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const showToast = (msg: string, ms = 2000) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), ms);
  };

  const { items: checklists, refresh } = useModuleList<Checklist>(ChecklistAdapter);

  const { selectedId, selectedChecklist, selectChecklist } = useChecklistSelection(checklists);

  return (
    <>
      <div style={{ padding: '0' }}>
        {checklists.length === 0 && !showAddModal ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            backgroundColor: '#fefdfb',
            borderRadius: '16px',
            border: '1px solid #e8e4df',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📋</div>
            <h2 style={{ marginBottom: '16px', color: '#6b5d52' }}>No checklists yet</h2>
            <p style={{ color: '#8a7c6f', marginBottom: '24px' }}>
              Create your first checklist to get started
            </p>
            <button
              id="btn-add-checklist"
              type="button"
              className="btn primary"
              onClick={() => setShowAddModal(true)}
              style={{ padding: '16px 32px', fontSize: '16px' }}
            >
              + Create Your First Checklist
            </button>
          </div>
        ) : (
          <ChecklistLayout
            checklists={checklists}
            selectedId={selectedId}
            selectedChecklist={selectedChecklist}
            onSelect={selectChecklist}
            onAddNew={() => setShowAddModal(true)}
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

      {/* Add Checklist Modal */}
      {showAddModal && (
        <CreateChecklistModal
          onClose={() => setShowAddModal(false)}
          onCreated={async () => {
            const result = await refresh();
            setShowAddModal(false);
            if (result.success) {
              showToast('Created');
            } else {
              showToast(result.error || 'Failed to refresh checklists');
            }
          }}
          onError={showToast}
        />
      )}
    </>
  );
}
