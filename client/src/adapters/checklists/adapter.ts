import { Context } from '../core';
import { createModuleAdapter } from '../core/createAdapter';
import { Checklist, ChecklistItem, fetchChecklists, fetchChecklistsByContext, createChecklist, updateChecklist, deleteChecklist } from '../../api';

export type CreateChecklistInput = { name: string; items?: ChecklistItem[]; context?: Context };
export type UpdateChecklistInput = { name?: string; items?: ChecklistItem[] };

export const ChecklistAdapter = createModuleAdapter<Checklist, CreateChecklistInput, UpdateChecklistInput>({
  moduleType: 'checklist',
  api: {
    list: fetchChecklists,
    listByContext: fetchChecklistsByContext,
    create: createChecklist,
    update: updateChecklist,
    remove: deleteChecklist,
  },
  getTitle: (item) => item.name,
});
