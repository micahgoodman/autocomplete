/**
 * Draggable Canvas System
 * 
 * A reusable, dependency-free draggable canvas implementation for React.
 * Designed to be modular and potentially extractable as an npm package.
 * 
 * Components:
 * - DraggableCanvas: Container for draggable items
 * - DraggableCard: Wrapper that makes any content draggable
 * 
 * Usage:
 * ```tsx
 * <DraggableCanvas showGrid>
 *   <DraggableCard id="1" position={{x:100,y:100}} onPositionChange={handleChange}>
 *     <YourContent />
 *   </DraggableCard>
 * </DraggableCanvas>
 * ```
 */

export { DraggableCanvas, useDraggableCanvas } from './DraggableCanvas';
export { DraggableCard } from './DraggableCard';
export type { Position } from './DraggableCanvas';
