import { useState, useEffect } from 'react';
import { Header, ViewMode } from './modules/Header';
import { ModuleGrid } from './ui/generic/ModuleGrid';
import { ConfirmModal } from './modules/ConfirmModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
// Register association resolvers (each module registers its own)
import './modules/checklists/registerAssociations';
import './modules/notes/registerAssociations';

function AppContent() {
  const { user, showAuthModal, isAuthenticating, handleAuthConfirm, handleAuthCancel, showSignInModal, closeSignInModal } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('sidebar');

  // Load persisted view mode preference
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem('checklist-view-mode') as ViewMode | null;
      if (storedMode === 'sidebar' || storedMode === 'whiteboard') {
        setViewMode(storedMode);
      }
    } catch (error) {
      console.warn('[App] Failed to load checklist view mode from storage:', error);
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('checklist-view-mode', mode);
    } catch (error) {
      console.warn('[App] Failed to persist checklist view mode:', error);
    }
  };

  return (
    <div>
      <Header viewMode={viewMode} onViewModeChange={handleViewModeChange} />
      <main className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ModuleGrid key={user?.id || 'anonymous'} viewMode={viewMode} />
      </main>
      
      {showAuthModal && (
        <ConfirmModal
          title="Gmail Authentication Required"
          message="To use the Autocomplete feature, you need to authenticate with your Gmail account. This will open a browser window where you can sign in and grant permissions."
          confirmText={isAuthenticating ? 'Authenticating...' : 'Authenticate Now'}
          cancelText="Skip for Now"
          onConfirm={handleAuthConfirm}
          onCancel={handleAuthCancel}
          isDestructive={false}
          isProcessing={isAuthenticating}
        />
      )}
      
      {showSignInModal && <AuthModal onClose={closeSignInModal} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
