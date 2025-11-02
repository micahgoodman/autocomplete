import { useState, useEffect } from 'react';
import { Note } from '../../../api';

export function useNoteSelection(notes: Note[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first note when list changes
  useEffect(() => {
    if (notes.length > 0) {
      // If no selection or selected note no longer exists, select first
      const exists = selectedId && notes.some(n => n.id === selectedId);
      if (!exists) {
        setSelectedId(notes[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [notes, selectedId]);

  const selectedNote = notes.find(n => n.id === selectedId) || null;

  return {
    selectedId,
    selectedNote,
    selectNote: setSelectedId,
  };
}
