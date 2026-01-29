/* ==========================================================================
   StatusBar - Bottom status bar with file info, cursor position, etc.
   ========================================================================== */

import { useAppStore } from '../../stores/appStore';
import './StatusBar.css';

export function StatusBar() {
  const { 
    activeFilePath, 
    openFiles, 
    cursorPosition,
    projectPath,
    isLspLoading,
    lspLoadingMessage
  } = useAppStore();

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  // Get language display name
  const getLanguageDisplay = (language: string): string => {
    const languageMap: Record<string, string> = {
      javascript: 'JavaScript',
      javascriptreact: 'JavaScript JSX',
      typescript: 'TypeScript',
      typescriptreact: 'TypeScript JSX',
      json: 'JSON',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      less: 'Less',
      markdown: 'Markdown',
      rust: 'Rust',
      python: 'Python',
      toml: 'TOML',
      yaml: 'YAML',
      plaintext: 'Plain Text',
    };
    return languageMap[language] || language;
  };

  return (
    <div className="statusbar">
      {/* Left Section */}
      <div className="statusbar__left">
        {projectPath && (
          <StatusItem icon={<BranchIcon />} tooltip="Source Control">
            main
          </StatusItem>
        )}
        {projectPath && (
          <StatusItem icon={<SyncIcon />} tooltip="Synchronize Changes">
            0↓ 0↑
          </StatusItem>
        )}
        {/* Loading Indicator */}
        {isLspLoading && (
          <div className="statusbar__item statusbar__loading">
             <span className="statusbar__spinner spin-animation">⟳</span>
             <span>{lspLoadingMessage}</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="statusbar__right">
        {activeFile && (
          <>
            {/* Cursor Position */}
            <StatusItem tooltip="Go to Line/Column">
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </StatusItem>

            {/* Selection */}
            {cursorPosition.selected > 0 && (
              <StatusItem tooltip="Selection">
                ({cursorPosition.selected} selected)
              </StatusItem>
            )}

            {/* Indentation */}
            <StatusItem tooltip="Select Indentation">
              Spaces: 2
            </StatusItem>

            {/* Encoding */}
            <StatusItem tooltip="Select Encoding">
              UTF-8
            </StatusItem>

            {/* Line Endings */}
            <StatusItem tooltip="Select End of Line Sequence">
              {getLineEnding()}
            </StatusItem>

            {/* Language */}
            <StatusItem 
              tooltip="Select Language Mode"
              className="statusbar__language"
            >
              {getLanguageDisplay(activeFile.language)}
            </StatusItem>
          </>
        )}

        {/* Notifications */}
        <StatusItem icon={<BellIcon />} tooltip="Notifications" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Helper Functions
   ------------------------------------------------------------------------- */

function getLineEnding(): string {
  // On Windows, default to CRLF, otherwise LF
  return navigator.platform.includes('Win') ? 'CRLF' : 'LF';
}

/* -------------------------------------------------------------------------
   StatusItem Component
   ------------------------------------------------------------------------- */

interface StatusItemProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
  className?: string;
  onClick?: () => void;
}

function StatusItem({ children, icon, tooltip, className = '', onClick }: StatusItemProps) {
  return (
    <button 
      className={`statusbar__item ${className}`}
      title={tooltip}
      onClick={onClick}
    >
      {icon && <span className="statusbar__icon">{icon}</span>}
      {children && <span className="statusbar__text">{children}</span>}
    </button>
  );
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/>
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2.5a5.5 5.5 0 0 1 5.406 4.5H15l-2.5 3-2.5-3h1.5a4 4 0 0 0-7.865-1H2.5A5.5 5.5 0 0 1 8 2.5zm0 11a5.5 5.5 0 0 1-5.406-4.5H1l2.5-3 2.5 3H4.5a4 4 0 0 0 7.865 1h1.135A5.5 5.5 0 0 1 8 13.5z"/>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
    </svg>
  );
}
