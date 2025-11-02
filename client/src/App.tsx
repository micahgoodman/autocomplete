import { useState, useEffect, createContext, useContext } from 'react';
import { Header, ViewMode } from './modules/Header';
import { ModuleGrid } from './ui/generic/ModuleGrid';
import { ConfirmModal } from './modules/ConfirmModal';
// Register association resolvers (each module registers its own)
import './modules/checklists/registerAssociations';

// Create context for auth modal control
interface AuthContextType {
  requestAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthContext.Provider');
  }
  return context;
};

export default function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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

  useEffect(() => {
    // Check Gmail authentication on app startup
    const checkAuth = async () => {
      if (window.electron?.checkGmailAuth) {
        try {
          const isAuthenticated = await window.electron.checkGmailAuth();
          if (!isAuthenticated) {
            setShowAuthModal(true);
          }
        } catch (error) {
          console.error('[App] Error checking Gmail auth:', error);
        }
      }
    };

    checkAuth();
  }, []);

  const requestAuth = () => {
    // Ensure fresh state each time modal opens
    setIsAuthenticating(false);
    setShowAuthModal(true);
  };

  const handleAuthConfirm = async () => {
    setIsAuthenticating(true);
    let started = false;
    try {
      await window.electron.triggerGmailAuth();
      started = true;
    } catch (error) {
      console.error('[App] Authentication start failed:', error);
      // Continue to poll; the browser may still open and complete
    }

    const timeoutMs = 180000;
    const intervalMs = 1000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        const isAuthenticated = await window.electron.checkGmailAuth();
        if (isAuthenticated) {
          setShowAuthModal(false);
          alert('Gmail authentication successful! You can now use the Autocomplete feature.');
          setIsAuthenticating(false);
          return;
        }
      } catch (e) {
        console.error('[App] Error polling Gmail auth:', e);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    alert('Gmail authentication was not completed. Please try again.');
    setShowAuthModal(false);
    setIsAuthenticating(false);
  };

  const handleAuthCancel = () => {
    // Allow user to re-open and retry immediately
    setIsAuthenticating(false);
    setShowAuthModal(false);
  };

  return (
    <AuthContext.Provider value={{ requestAuth }}>
      <div>
        <Header viewMode={viewMode} onViewModeChange={handleViewModeChange} />
        <main className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <ModuleGrid viewMode={viewMode} />
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
      </div>
    </AuthContext.Provider>
  );
}
