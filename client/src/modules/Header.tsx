import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { ProfileModal } from '../components/auth/ProfileModal';

export type ViewMode = 'sidebar' | 'whiteboard';

type Props = {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
};

export function Header({ viewMode, onViewModeChange }: Props) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <header>
      <div className="container">
        <div className="header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Nesting Modules Test" style={{ width: '40px', height: '40px' }} />
            <h1>Autocomplete</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          
          {/* Auth UI */}
          {!loading && (
            <div>
              {user ? (
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: '1px solid #e8e4df',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#f9f7f4',
                    color: '#6b5d52',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0ede8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9f7f4';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>👤</span>
                  <span>{user.email}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: '#bc915c',
                    color: '#fefdfb',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#a57e4d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#bc915c';
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Auth Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </header>
  );
}
