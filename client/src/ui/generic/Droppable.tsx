import React from 'react';
import { Context } from '../../adapters/core';
import { useModuleDrop } from '../draganddrop/useModuleDrop';

export type DroppableProps = {
  parent: { type: string; id: string };
  children: React.ReactNode;
  onAssociated?: (payload: { moduleType: string; id: string; title?: string }) => void;
  onError?: (message: string) => void;
  className?: string;
  style?: React.CSSProperties;
  contextChain?: Context[]; // Chain of parent contexts to prevent circular embeddings
};

export function Droppable({ parent, children, onAssociated, onError, className, style, contextChain }: DroppableProps) {
  const { droppableProps, isOver } = useModuleDrop({ parent, onAssociated, onError, contextChain });

  const mergedStyle: React.CSSProperties = {
    // Ensure wrapper spans available width in flex/grid layouts
    width: '100%',
    minWidth: 0,
    ...(style || {}),
    // Do not render a hover outline by default; allow explicit override via style.outline
    outline: (style && style.outline) || undefined,
    outlineOffset: undefined,
  };

  return (
    <div className={className} style={mergedStyle} {...droppableProps}>
      {children}
    </div>
  );
}
