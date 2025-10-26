import React from 'react';
import { parseDragData } from './payload';
import { associateModule } from '../../api';
import { Context } from '../../adapters/core';

export type UseModuleDropArgs = {
  parent: { type: string; id: string };
  onAssociated?: (payload: { moduleType: string; id: string; title?: string }) => void;
  onError?: (message: string) => void;
  preventSelfNest?: boolean;
  contextChain?: Context[]; // Chain of parent contexts to prevent circular embeddings
};

export function useModuleDrop({ parent, onAssociated, onError, preventSelfNest = true, contextChain = [] }: UseModuleDropArgs) {
  const [isOver, setIsOver] = React.useState(false);

  const onDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOver) setIsOver(true);
  }, [isOver]);

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isOver) setIsOver(true);
  }, [isOver]);

  const onDragLeave = React.useCallback(() => {
    // No event arg in current usage; use native to stop bubbling when wired
    setIsOver(false);
  }, []);

  const onDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    try {
      const payload = parseDragData(e);
      if (!payload) return;

      if (preventSelfNest && payload.moduleType === parent.type && String(payload.id) === String(parent.id)) {
        onError?.('Cannot associate an item with itself');
        return;
      }

      // Check if this would create a circular embedding
      const wouldCreateCircle = contextChain.some(ctx => ctx.type === payload.moduleType && String(ctx.id) === String(payload.id));
      if (wouldCreateCircle) {
        onError?.(`Cannot create circular embedding. That instance is already in the parent chain`);
        return;
      }

      await associateModule({ parentType: parent.type, parentId: String(parent.id), childType: payload.moduleType, childId: payload.id });
      onAssociated?.(payload);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      onError?.(err?.message || 'Failed to associate');
    }
  }, [parent.type, parent.id, onAssociated, onError, preventSelfNest, contextChain]);

  const droppableProps = React.useMemo(() => ({ onDragEnter, onDragOver, onDragLeave, onDrop }), [onDragEnter, onDragOver, onDragLeave, onDrop]);

  return { droppableProps, isOver } as const;
}
