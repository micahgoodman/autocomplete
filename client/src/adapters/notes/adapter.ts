import { Context } from '../core';
import { createModuleAdapter } from '../core/createAdapter';
import { Note, fetchNotes, fetchNotesByContext, createNote, updateNote, deleteNote } from '../../api';

export type CreateNoteInput = { text: string; context?: Context };
export type UpdateNoteInput = { text?: string };

export const NoteAdapter = createModuleAdapter<Note, CreateNoteInput, UpdateNoteInput>({
  moduleType: 'note',
  api: {
    list: fetchNotes,
    listByContext: fetchNotesByContext,
    create: createNote,
    update: updateNote,
    remove: deleteNote,
  },
  getTitle: (item) => item.text.substring(0, 50) + (item.text.length > 50 ? '...' : ''),
});
