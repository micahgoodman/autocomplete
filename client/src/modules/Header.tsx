import React from 'react';

export type ViewMode = 'sidebar' | 'whiteboard';

type Props = {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
};

export function Header({ viewMode, onViewModeChange }: Props) {
  return (
    <header>
      <div className="container">
        <div className="header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Nesting Modules Test" style={{ width: '40px', height: '40px' }} />
            <h1>Autocomplete</h1>
          </div>
          
          {/* View Mode Toggle */}
          {viewMode && onViewModeChange && (
            <div style={{
              display: 'inline-flex',
              backgroundColor: '#f9f7f4',
              border: '1px solid #e8e4df',
              borderRadius: '10px',
              padding: '4px',
            }}>
              <button
                type="button"
                onClick={() => onViewModeChange('sidebar')}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'sidebar' ? '#bc915c' : 'transparent',
                  color: viewMode === 'sidebar' ? '#fefdfb' : '#6b5d52',
                  transition: 'all 0.2s ease',
                }}
              >
                📋 List View
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('whiteboard')}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'whiteboard' ? '#bc915c' : 'transparent',
                  color: viewMode === 'whiteboard' ? '#fefdfb' : '#6b5d52',
                  transition: 'all 0.2s ease',
                }}
              >
                🎨 Whiteboard
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
