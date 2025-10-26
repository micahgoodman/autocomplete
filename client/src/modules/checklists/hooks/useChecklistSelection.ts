import { useState, useEffect } from 'react';
import { Checklist } from '../../../api';

const STORAGE_KEY = 'checklist-selected-id';

/**
 * Hook for managing the currently selected checklist
 * Persists selection to localStorage and handles auto-selection
 */
export function useChecklistSelection(checklists: Checklist[]) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // Initialize from localStorage
    return localStorage.getItem(STORAGE_KEY);
  });

  // Auto-select first checklist if none selected or selected one doesn't exist
  useEffect(() => {
    if (checklists.length === 0) {
      setSelectedId(null);
      return;
    }

    const selectedExists = checklists.some(c => c.id === selectedId);
    if (!selectedId || !selectedExists) {
      // Auto-select the first checklist (most recent)
      setSelectedId(checklists[0].id);
    }
  }, [checklists, selectedId]);

  // Persist to localStorage when selection changes
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(STORAGE_KEY, selectedId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedId]);

  const selectedChecklist = checklists.find(c => c.id === selectedId) || null;

  return {
    selectedId,
    selectedChecklist,
    selectChecklist: setSelectedId,
  };
}
