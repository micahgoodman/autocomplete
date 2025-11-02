import React, { useState, useEffect, useRef } from 'react';
import { Checklist, updateChecklist } from '../../../api';
import { DraggableCanvas, DraggableCard, Position } from '../../../ui/generic/draggable';
import { WhiteboardChecklistCard } from './WhiteboardChecklistCard';
import { ChecklistDetailView } from './ChecklistDetailView';
import { Context } from '../../../adapters/core';

type Props = {
  checklists: Checklist[];
  selectedId: string | null;
  selectedChecklist: Checklist | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
};

type ChecklistPosition = {
  checklistId: string;
  position: Position;
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const CARD_BORDER_RADIUS = 12;
const SPACING = 40;

/**
 * WhiteboardView - Canvas-based view for checklists
 * 
 * Displays checklists as draggable cards on a canvas. Users can arrange
 * checklists spatially and select one to view details in a modal.
 */
export function WhiteboardView({
  checklists,
  selectedId,
  selectedChecklist,
  onSelect,
  onAddNew,
  onUpdated,
  onDeleted,
  onShowToast,
  contextChain,
  hideEmbedded = false,
}: Props) {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [togglingItem, setTogglingItem] = useState<{ checklistId: string; itemIndex: number } | null>(null);
  const [frontCardId, setFrontCardId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Initialize positions for new checklists
  useEffect(() => {
    const newPositions = new Map(positions);
    let needsUpdate = false;

    checklists.forEach((checklist, index) => {
      if (!newPositions.has(checklist.id)) {
        // Calculate grid position for new checklists
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = SPACING + col * (CARD_WIDTH + SPACING);
        const y = SPACING + row * (CARD_HEIGHT + SPACING);
        
        newPositions.set(checklist.id, { x, y });
        needsUpdate = true;
      }
    });

    // Remove positions for deleted checklists
    newPositions.forEach((_, id) => {
      if (!checklists.find(c => c.id === id)) {
        newPositions.delete(id);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      setPositions(newPositions);
    }
  }, [checklists]);

  // Load positions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('checklist-whiteboard-positions');
    if (stored) {
      try {
        const parsed: ChecklistPosition[] = JSON.parse(stored);
        const posMap = new Map<string, Position>();
        parsed.forEach(({ checklistId, position }) => {
          posMap.set(checklistId, position);
        });
        setPositions(posMap);
      } catch (err) {
        console.error('Failed to parse stored positions:', err);
      }
    }
  }, []);

  // Save positions to localStorage when they change
  useEffect(() => {
    if (positions.size > 0) {
      const posArray: ChecklistPosition[] = Array.from(positions.entries()).map(
        ([checklistId, position]) => ({ checklistId, position })
      );
      localStorage.setItem('checklist-whiteboard-positions', JSON.stringify(posArray));
    }
  }, [positions]);

  const handlePositionChange = (id: string, position: Position) => {
    setPositions(prev => new Map(prev).set(id, position));
    // Bring dragged card to front
    setFrontCardId(id);
  };

  const handleToggleItem = async (checklistId: string, itemIndex: number) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;

    setTogglingItem({ checklistId, itemIndex });
    try {
      const updatedItems = [...checklist.items];
      const item = updatedItems[itemIndex];
      const newCompletedState = !item.completed;
      
      // Toggle completion
      updatedItems[itemIndex] = { ...item, completed: newCompletedState };
      
      // If marking as completed, move to bottom
      if (newCompletedState) {
        const [completedItem] = updatedItems.splice(itemIndex, 1);
        updatedItems.push(completedItem);
      }
      
      await updateChecklist(checklist.id, { items: updatedItems });
      onUpdated();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update item');
    } finally {
      setTogglingItem(null);
    }
  };

  const handleCardMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      // If moved more than 5 pixels, consider it a drag
      if (dx > 5 || dy > 5) {
        isDraggingRef.current = true;
      }
    }
  };

  const handleCardClick = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only open modal if we didn't drag
    if (!isDraggingRef.current) {
      // Bring clicked card to front
      setFrontCardId(id);
      onSelect(id);
      setShowDetailModal(true);
    }
    
    // Reset drag state
    dragStartPos.current = null;
    isDraggingRef.current = false;
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
  };

  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        backgroundColor: '#fefdfb',
        border: '1px solid #e8e4df',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '4px 24px',
          borderBottom: '1px solid #e8e4df',
          backgroundColor: '#f9f7f4',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#6b5d52',
            fontWeight: 500,
          }}>
            {checklists.length} {checklists.length === 1 ? 'checklist' : 'checklists'}
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={onAddNew}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            + New Checklist
          </button>
        </div>

        {/* Canvas */}
        <DraggableCanvas showGrid gridSize={20}>
          {checklists.map((checklist) => {
            const position = positions.get(checklist.id) || { x: 0, y: 0 };
            return (
              <DraggableCard
                key={checklist.id}
                id={checklist.id}
                position={position}
                onPositionChange={handlePositionChange}
                width={CARD_WIDTH}
                zIndex={frontCardId === checklist.id ? 10 : 1}
                style={{ borderRadius: CARD_BORDER_RADIUS, overflow: 'visible' }}
              >
                <div
                  onMouseDown={handleCardMouseDown}
                  onMouseMove={handleCardMouseMove}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: CARD_BORDER_RADIUS,
                    overflow: 'hidden',
                  }}
                >
                  <WhiteboardChecklistCard
                    checklist={checklist}
                    isSelected={selectedId === checklist.id}
                    onClick={() => {}}
                    onToggleItem={(index) => handleToggleItem(checklist.id, index)}
                    onCardClick={handleCardClick(checklist.id)}
                  />
                </div>
              </DraggableCard>
            );
          })}
        </DraggableCanvas>

        {/* Empty State */}
        {checklists.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#8a7c6f',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
            <h2 style={{ marginBottom: '8px', color: '#6b5d52' }}>No Checklists Yet</h2>
            <p>Create a checklist to get started</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedChecklist && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(45, 37, 31, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '32px',
          }}
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fefdfb',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '1200px',
              height: '90vh',
              maxHeight: '800px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(45, 37, 31, 0.3)',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e8e4df',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9f7f4',
              flexShrink: 0,
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2d251f' }}>
                Checklist Details
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b5d52',
                  padding: '0 8px',
                  lineHeight: 1,
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto',
              minHeight: 0, // Important for flex child to allow scrolling
            }}>
              <div style={{ height: '100%' }}>
                <ChecklistDetailView
                  checklist={selectedChecklist}
                  onUpdated={onUpdated}
                  onDeleted={() => {
                    onDeleted();
                    handleCloseModal();
                  }}
                  onShowToast={onShowToast}
                  contextChain={contextChain}
                  hideEmbedded={hideEmbedded}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
