import React, { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import { Position, useDraggableCanvas } from './DraggableCanvas';

type Props = {
  id: string;
  position: Position;
  onPositionChange: (id: string, position: Position) => void;
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  zIndex?: number;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
};

/**
 * DraggableCard - A reusable draggable wrapper component
 * 
 * Wraps any content and makes it draggable within a DraggableCanvas.
 * Uses native mouse events for precise control without external dependencies.
 * 
 * Features:
 * - Smooth dragging with mouse events
 * - Position snapping (optional, via onPositionChange)
 * - Disabled state support
 * - Z-index management for layering
 * - Customizable styling
 * 
 * @example
 * <DraggableCard
 *   id="my-card"
 *   position={{ x: 100, y: 100 }}
 *   onPositionChange={(id, pos) => updatePosition(id, pos)}
 *   width={300}
 * >
 *   <div>Your draggable content here</div>
 * </DraggableCard>
 */
export function DraggableCard({
  id,
  position,
  onPositionChange,
  children,
  width = 'auto',
  height = 'auto',
  zIndex = 1,
  className,
  style,
  disabled = false,
}: Props) {
  const { containerRef } = useDraggableCanvas();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate new position relative to container
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;

      // Keep card within container bounds
      const cardWidth = typeof width === 'number' ? width : cardRef.current?.offsetWidth || 0;
      const cardHeight = typeof height === 'number' ? height : cardRef.current?.offsetHeight || 0;
      
      const constrainedX = Math.max(0, Math.min(newX, containerRect.width - cardWidth));
      const constrainedY = Math.max(0, Math.min(newY, containerRect.height - cardHeight));

      onPositionChange(id, { x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, containerRef, id, onPositionChange, width, height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    // Prevent text selection while dragging
    e.preventDefault();
    
    if (!cardRef.current) return;

    const cardRect = cardRef.current.getBoundingClientRect();
    const offsetX = e.clientX - cardRect.left;
    const offsetY = e.clientY - cardRect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width,
        height,
        zIndex: isDragging ? 1000 : zIndex,
        cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
        boxShadow: isDragging
          ? '0 8px 24px rgba(45, 37, 31, 0.2)'
          : '0 2px 8px rgba(45, 37, 31, 0.1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
