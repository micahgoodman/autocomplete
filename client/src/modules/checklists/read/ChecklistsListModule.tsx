import React, { useState } from 'react';
import { Context, useModuleList } from '../../../adapters/core';
import { ChecklistAdapter } from '../../../adapters/checklists/adapter';
import { Checklist } from '../../../api';
import { AddChecklist } from '../create/AddChecklistModule';
import { ChecklistCard } from './ChecklistCardModule';

export type ChecklistsListProps = {
  context: Context;
  idPrefix: string; // used to keep DOM ids stable for tests/automation
  onToast?: (message: string) => void;
  title?: string; // default: 'Checklists'
  contextChain?: Context[]; // chain of parent contexts for circular reference prevention
};

export function ChecklistsList({ context, idPrefix, onToast, title = 'Checklists', contextChain }: ChecklistsListProps) {
  const { items: checklists, loading, refresh } = useModuleList<Checklist>(ChecklistAdapter, { context });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdded = async () => {
    const result = await refresh();
    if (result.success) onToast?.('Created');
    else onToast?.(result.error || 'Failed to refresh checklists');
  };

  const listId = `${idPrefix}-checklists-list`;
  const countId = `${idPrefix}-checklists-count`;

  return (
    <div>
      <div className="header-bar" style={{ marginBottom: 8, justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="muted small">
            Total: <b id={countId}>{checklists.length}</b>
          </div>
          <AddChecklist onChecklistAdded={handleAdded} onError={(m) => onToast?.(m)} contextType={context.type} contextId={context.id} />
        </div>
      </div>

      {loading ? (
        <div className="loading-center">
          <span className="spinner" />Loading...
        </div>
      ) : (
        <div className="list" id={listId}>
          {checklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              onUpdated={async () => { await refresh(); onToast?.('Saved'); }}
              onDeleted={async () => { setDeletingId(null); await refresh(); onToast?.('Deleted'); }}
              onShowToast={(msg) => onToast?.(msg)}
              deleting={deletingId === checklist.id}
              onDeletingChange={(deleting) => setDeletingId(deleting ? checklist.id : null)}
              currentContext={context}
              contextChain={contextChain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
