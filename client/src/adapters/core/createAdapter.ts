import { ModuleAdapter, Context } from '../core';
import { supabase } from '../../supabaseClient';

/**
 * Configuration for creating a module adapter
 */
export type AdapterConfig<T extends { id: string }, CreateInput, UpdateInput> = {
  /** The module type identifier (e.g., 'note', 'category', 'lesson') */
  moduleType: string;
  
  /** API functions for CRUD operations */
  api: {
    list: () => Promise<T[]>;
    listByContext: (contextType: string, contextId: string) => Promise<T[]>;
    create: (input: CreateInput) => Promise<any>;
    update: (id: string, patch: UpdateInput) => Promise<any>;
    remove: (id: string) => Promise<any>;
  };
  
  /** Extract the title/name from an item for display */
  getTitle: (item: T) => string;
};

/**
 * Factory function to create a standardized ModuleAdapter
 * 
 * This centralizes the common logic across all module adapters:
 * - Context-aware listing
 * - Context-aware removal (disassociate vs delete)
 * - Realtime subscriptions via Supabase
 * - Standard getKey implementation
 * 
 * Each module remains independent but shares the same robust implementation.
 */
export function createModuleAdapter<T extends { id: string }, CreateInput, UpdateInput>(
  config: AdapterConfig<T, CreateInput, UpdateInput>
): ModuleAdapter<T, CreateInput, UpdateInput> {
  const { moduleType, api, getTitle } = config;

  return {
    async list(opts) {
      const ctx = opts?.context;
      if (ctx) return api.listByContext(ctx.type, ctx.id);
      return api.list();
    },

    async create(input) {
      return api.create(input);
    },

    async update(id, patch) {
      return api.update(id, patch);
    },

    async remove(id, opts) {
      const ctx = opts?.context;
      if (ctx) {
        // Disassociate from the parent context instead of deleting the instance
        const { disassociateModule } = await import('../../api');
        await disassociateModule({
          parentType: ctx.type,
          parentId: String(ctx.id),
          childType: moduleType,
          childId: id
        });
      } else {
        await api.remove(id);
      }
    },

    getKey(item) {
      return item.id;
    },

    getTitle(item) {
      return getTitle(item);
    },

    subscribe(onChange, opts) {
      try {
        const suffix = Math.random().toString(36).slice(2, 8);
        const topic = `${moduleType}-changes-${opts?.context ? `${opts.context.type}-${opts.context.id}` : 'all'}-${suffix}`;
        const channel = supabase.channel(topic);

        // Child row updates (module instance changes)
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'module_data',
        }, async (payload: any) => {
          try {
            const payloadModuleType = payload?.new?.module_type ?? payload?.old?.module_type;
            // Allow undefined moduleType to still trigger refresh (e.g., DELETE without replica identity full)
            if (payloadModuleType && payloadModuleType !== moduleType) return;
            await onChange();
          } catch {
            // noop
          }
        });

        // Parent association updates (when viewing by context)
        if (opts?.context) {
          channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'module_data',
          }, async (payload: any) => {
            try {
              const mt = payload?.new?.module_type ?? payload?.old?.module_type;
              const id = (payload?.new?.id ?? payload?.old?.id) as string | undefined;
              // If module_type is present and doesn't match the context type, ignore.
              // Otherwise, if the row id matches the parent context id, refresh.
              if (mt && mt !== opts.context!.type) return;
              if (String(id) === String(opts.context!.id)) {
                await onChange();
              }
            } catch {
              // noop
            }
          });
        }

        channel.subscribe();
        return () => { try { supabase.removeChannel(channel); } catch { /* noop */ } };
      } catch {
        return () => {};
      }
    }
  };
}
