import React from 'react';
import { setDragData } from './payload';

export type UseModuleDragArgs = {
  moduleType: string;
  id: string;
  title?: string;
};

export function useModuleDrag({ moduleType, id, title }: UseModuleDragArgs) {
  const onDragStart = React.useCallback((e: React.DragEvent) => {
    setDragData(e, { moduleType, id, title });
  }, [moduleType, id, title]);

  const draggableProps = React.useMemo(() => ({
    draggable: true,
    onDragStart,
  }), [onDragStart]);

  return { draggableProps } as const;
}
