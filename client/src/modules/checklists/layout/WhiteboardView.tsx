import React, { useState, useEffect, useRef } from 'react';
import { Checklist, updateChecklist, Note } from '../../../api';
import { DraggableCanvas, DraggableCard, Position } from '../../../ui/generic/draggable';
import { WhiteboardChecklistCard } from './WhiteboardChecklistCard';
import { ChecklistDetailView } from './ChecklistDetailView';
import { WhiteboardNoteCard } from '../../notes/layout/WhiteboardNoteCard';
import { NoteDetailView } from '../../notes/layout/NoteDetailView';
import { Context } from '../../../adapters/core';

type Props = {
  checklists: Checklist[];
  notes: Note[];
  selectedId: string | null;
  selectedType: 'checklist' | 'note' | null;
  selectedChecklist: Checklist | null;
  selectedNote: Note | null;
  onSelect: (id: string, type: 'checklist' | 'note') => void;
  onAddNewChecklist: () => void;
  onAddNewNote: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
};

type ItemPosition = {
  id: string;
  type: 'checklist' | 'note';
  position: Position;
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const CARD_BORDER_RADIUS = 12;
const SPACING = 40;

/**
 * WhiteboardView - Canvas-based view for checklists and notes
 * 
 * Displays both checklists and notes as draggable cards on a unified canvas.
 * Users can arrange items spatially and select one to view details in a modal.
 */
export function WhiteboardView({
  checklists,
  notes,
  selectedId,
  selectedType,
  selectedChecklist,
  selectedNote,
  onSelect,
  onAddNewChecklist,
  onAddNewNote,
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

  // Initialize positions for new checklists and notes
  useEffect(() => {
    const newPositions = new Map(positions);
    let needsUpdate = false;
    let index = 0;

    // Add positions for new checklists
    checklists.forEach((checklist) => {
      if (!newPositions.has(checklist.id)) {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = SPACING + col * (CARD_WIDTH + SPACING);
        const y = SPACING + row * (CARD_HEIGHT + SPACING);
        
        newPositions.set(checklist.id, { x, y });
        needsUpdate = true;
      }
      index++;
    });

    // Add positions for new notes
    notes.forEach((note) => {
      if (!newPositions.has(note.id)) {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = SPACING + col * (CARD_WIDTH + SPACING);
        const y = SPACING + row * (CARD_HEIGHT + SPACING);
        
        newPositions.set(note.id, { x, y });
        needsUpdate = true;
      }
      index++;
    });

    // Remove positions for deleted items
    newPositions.forEach((_, id) => {
      const checklistExists = checklists.find(c => c.id === id);
      const noteExists = notes.find(n => n.id === id);
      if (!checklistExists && !noteExists) {
        newPositions.delete(id);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      setPositions(newPositions);
    }
  }, [checklists, notes]);

  // Load positions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('unified-whiteboard-positions');
    if (stored) {
      try {
        const parsed: ItemPosition[] = JSON.parse(stored);
        const posMap = new Map<string, Position>();
        parsed.forEach(({ id, position }) => {
          posMap.set(id, position);
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
      const posArray: ItemPosition[] = [];
      positions.forEach((position, id) => {
        // Determine type by checking which array contains this id
        const isChecklist = checklists.some(c => c.id === id);
        const type = isChecklist ? 'checklist' : 'note';
        posArray.push({ id, type, position });
      });
      localStorage.setItem('unified-whiteboard-positions', JSON.stringify(posArray));
    }
  }, [positions, checklists, notes]);

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

  const handleCardClick = (id: string, type: 'checklist' | 'note') => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only open modal if we didn't drag
    if (!isDraggingRef.current) {
      // Bring clicked card to front
      setFrontCardId(id);
      onSelect(id, type);
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
            {checklists.length} {checklists.length === 1 ? 'checklist' : 'checklists'} • {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn primary"
              onClick={onAddNewNote}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              + New Note
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onAddNewChecklist}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              + New Checklist
            </button>
          </div>
        </div>

        {/* Canvas */}
        <DraggableCanvas showGrid gridSize={20}>
          {/* Render checklists */}
          {checklists.map((checklist) => {
            const position = positions.get(checklist.id) || { x: 0, y: 0 };
            return (
              <DraggableCard
                key={`checklist-${checklist.id}`}
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
                    isSelected={selectedId === checklist.id && selectedType === 'checklist'}
                    onClick={() => {}}
                    onToggleItem={(index) => handleToggleItem(checklist.id, index)}
                    onCardClick={handleCardClick(checklist.id, 'checklist')}
                  />
                </div>
              </DraggableCard>
            );
          })}
          {/* Render notes */}
          {notes.map((note) => {
            const position = positions.get(note.id) || { x: 0, y: 0 };
            return (
              <DraggableCard
                key={`note-${note.id}`}
                id={note.id}
                position={position}
                onPositionChange={handlePositionChange}
                width={CARD_WIDTH}
                zIndex={frontCardId === note.id ? 10 : 1}
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
                  <WhiteboardNoteCard
                    note={note}
                    isSelected={selectedId === note.id && selectedType === 'note'}
                    onClick={() => {}}
                    onCardClick={handleCardClick(note.id, 'note')}
                  />
                </div>
              </DraggableCard>
            );
          })}
        </DraggableCanvas>

        {/* Empty State */}
        {checklists.length === 0 && notes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#8a7c6f',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋📝</div>
            <h2 style={{ marginBottom: '8px', color: '#6b5d52' }}>No Items Yet</h2>
            <p>Create a checklist or note to get started</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (selectedChecklist || selectedNote) && (
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
                {selectedType === 'checklist' ? 'Checklist Details' : 'Note Details'}
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
                {selectedType === 'checklist' && selectedChecklist ? (
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
                ) : selectedType === 'note' && selectedNote ? (
                  <NoteDetailView
                    note={selectedNote}
                    onUpdated={onUpdated}
                    onDeleted={() => {
                      onDeleted();
                      handleCloseModal();
                    }}
                    onShowToast={onShowToast}
                    contextChain={contextChain}
                    hideEmbedded={hideEmbedded}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
