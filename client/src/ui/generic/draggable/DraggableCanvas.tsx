import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

export type Position = {
  x: number;
  y: number;
};

type DraggableCanvasContextType = {
  scale: number;
  panOffset: Position;
  containerRef: React.RefObject<HTMLDivElement>;
};

const DraggableCanvasContext = createContext<DraggableCanvasContextType | null>(null);

export function useDraggableCanvas() {
  const context = useContext(DraggableCanvasContext);
  if (!context) {
    throw new Error('useDraggableCanvas must be used within a DraggableCanvas');
  }
  return context;
}

type Props = {
  children: ReactNode;
  backgroundColor?: string;
  gridSize?: number;
  showGrid?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * DraggableCanvas - A reusable container for draggable items
 * 
 * This component provides a canvas where child components can be positioned
 * and dragged around. It's designed to be reusable and could be extracted
 * into a standalone npm package.
 * 
 * Features:
 * - Optional grid background
 * - Scale/pan support (for future enhancement)
 * - Context-based API for child components
 * 
 * @example
 * <DraggableCanvas showGrid gridSize={20}>
 *   <DraggableCard id="card1" position={{x: 100, y: 100}} onPositionChange={...}>
 *     <YourContent />
 *   </DraggableCard>
 * </DraggableCanvas>
 */
export function DraggableCanvas({
  children,
  backgroundColor = '#fefdfb',
  gridSize = 20,
  showGrid = false,
  className,
  style,
}: Props) {
  const [scale] = useState(1); // Future: add zoom functionality
  const [panOffset] = useState<Position>({ x: 0, y: 0 }); // Future: add pan functionality
  const containerRef = useRef<HTMLDivElement>(null);

  const gridStyle = showGrid
    ? {
        backgroundImage: `
          linear-gradient(rgba(140, 130, 115, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(140, 130, 115, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
      }
    : {};

  const contextValue: DraggableCanvasContextType = {
    scale,
    panOffset,
    containerRef,
  };

  return (
    <DraggableCanvasContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor,
          overflow: 'hidden',
          ...gridStyle,
          ...style,
        }}
      >
        {children}
      </div>
    </DraggableCanvasContext.Provider>
  );
}
