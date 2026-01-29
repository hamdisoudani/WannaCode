import { useEffect } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';

import { TitleBar, StatusBar } from './components/Workbench';
import { Workbench } from './components/Workbench';
import { UnsavedChangesDialog } from './components/Dialogs/UnsavedChangesDialog';
import { LoginScreen } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useWindowClosePrevention } from './hooks/useWindowClosePrevention';
import { useSettingsStore } from './stores/settingsStore';
import './styles/app.css';

// ==========================================================================
// Main App Content - Conditionally shows Login or IDE
// ==========================================================================
function AppContent() {
  const { initialize } = useSettingsStore();
  const { isAuthenticated, isLoading, session } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const { 
    showUnsavedDialog, 
    dirtyFiles, 
    handleSaveAll, 
    handleDiscardAll, 
    handleCancel 
  } = useWindowClosePrevention();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="app app-loading">
        <div className="app-loading-spinner" />
        <span className="app-loading-text">Loading...</span>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show main IDE if authenticated - wrapped with CopilotKit and ErrorBoundary
  // AIPanel is now inside Workbench, not as a sidebar wrapper
  return (
    <ErrorBoundary>
      <CopilotKit
        runtimeUrl="http://localhost:5000/copilotkit"  // TODO: Update to https://api.codesurf.ai/copilotkit in production
        agent="codesurf_agent"  // Must match the agent name in backend/src/copilotkit/copilotkit.controller.ts
        headers={{
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        }}
        publicLicenseKey="ck_pub_fa79034fd22de4f39fafa83479af81db"
        publicApiKey="ck_pub_fa79034fd22de4f39fafa83479af81db"
        showDevConsole={false}
      >
        <div className="app">
          <TitleBar />
          <Workbench />
          <StatusBar />
          
          {showUnsavedDialog && (
            <UnsavedChangesDialog 
              dirtyFiles={dirtyFiles}
              onSave={handleSaveAll}
              onDiscard={handleDiscardAll}
              onCancel={handleCancel}
            />
          )}
        </div>
      </CopilotKit>
    </ErrorBoundary>
  );
}

// ==========================================================================
// App Root - Wraps everything in AuthProvider
// ==========================================================================
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
