import React, { useState } from 'react';
import { CreateChecklistModal } from './CreateChecklistModalModule';

export function AddChecklist({ onChecklistAdded, onError, contextType, contextId }: { onChecklistAdded: () => void; onError: (message: string) => void; contextType?: string; contextId?: string; }) {
  const [showCreate, setShowCreate] = useState(false);

  const handleCreated = () => {
    setShowCreate(false);
    onChecklistAdded();
  };

  return (
    <>
      <button
        id="btn-add-checklist"
        type="button"
        className="btn primary"
        onClick={() => setShowCreate(true)}
      >
        Add Checklist
      </button>

      {showCreate && (
        <CreateChecklistModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          onError={onError}
          contextType={contextType}
          contextId={contextId}
        />
      )}
    </>
  );
}
