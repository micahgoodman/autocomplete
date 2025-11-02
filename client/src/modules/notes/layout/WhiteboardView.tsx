import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../../../api';
import { DraggableCanvas, DraggableCard, Position } from '../../../ui/generic/draggable';
import { WhiteboardNoteCard } from './WhiteboardNoteCard';
import { NoteDetailView } from './NoteDetailView';
import { Context } from '../../../adapters/core';

type Props = {
  notes: Note[];
  selectedId: string | null;
  selectedNote: Note | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onShowToast: (message: string) => void;
  contextChain?: Context[];
  hideEmbedded?: boolean;
};

type NotePosition = {
  noteId: string;
  position: Position;
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const CARD_BORDER_RADIUS = 12;
const SPACING = 40;

/**
 * WhiteboardView - Canvas-based view for notes
 * 
 * Displays notes as draggable cards on a canvas. Users can arrange
 * notes spatially and select one to view details in a modal.
 */
export function WhiteboardView({
  notes,
  selectedId,
  selectedNote,
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
  const [frontCardId, setFrontCardId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Initialize positions for new notes
  useEffect(() => {
    const newPositions = new Map(positions);
    let needsUpdate = false;

    notes.forEach((note, index) => {
      if (!newPositions.has(note.id)) {
        // Calculate grid position for new notes
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = SPACING + col * (CARD_WIDTH + SPACING);
        const y = SPACING + row * (CARD_HEIGHT + SPACING);
        
        newPositions.set(note.id, { x, y });
        needsUpdate = true;
      }
    });

    // Remove positions for deleted notes
    newPositions.forEach((_, id) => {
      if (!notes.find(n => n.id === id)) {
        newPositions.delete(id);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      setPositions(newPositions);
    }
  }, [notes]);

  // Load positions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('note-whiteboard-positions');
    if (stored) {
      try {
        const parsed: NotePosition[] = JSON.parse(stored);
        const posMap = new Map<string, Position>();
        parsed.forEach(({ noteId, position }) => {
          posMap.set(noteId, position);
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
      const posArray: NotePosition[] = Array.from(positions.entries()).map(
        ([noteId, position]) => ({ noteId, position })
      );
      localStorage.setItem('note-whiteboard-positions', JSON.stringify(posArray));
    }
  }, [positions]);

  const handlePositionChange = (id: string, position: Position) => {
    setPositions(prev => new Map(prev).set(id, position));
    // Bring dragged card to front
    setFrontCardId(id);
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
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
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
            + New Note
          </button>
        </div>

        {/* Canvas */}
        <DraggableCanvas showGrid gridSize={20}>
          {notes.map((note) => {
            const position = positions.get(note.id) || { x: 0, y: 0 };
            return (
              <DraggableCard
                key={note.id}
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
                    isSelected={selectedId === note.id}
                    onClick={() => {}}
                    onCardClick={handleCardClick(note.id)}
                  />
                </div>
              </DraggableCard>
            );
          })}
        </DraggableCanvas>

        {/* Empty State */}
        {notes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#8a7c6f',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
            <h2 style={{ marginBottom: '8px', color: '#6b5d52' }}>No Notes Yet</h2>
            <p>Create a note to get started</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedNote && (
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
                Note Details
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
