/* ==========================================================================
   Terminal Panel - xterm.js Container
   ========================================================================== */

import { useAppStore } from '../../stores/appStore';
import './TerminalPanel.css';

export function TerminalPanel() {
  const { toggleTerminal } = useAppStore();

  return (
    <div className="terminal-panel">
      {/* Terminal Header */}
      <header className="terminal-panel__header">
        <div className="terminal-panel__tabs">
          <span className="terminal-panel__tab terminal-panel__tab--active">
            <TerminalIcon />
            <span>Terminal</span>
          </span>
        </div>
        <div className="terminal-panel__actions">
          <button
            className="terminal-panel__action"
            onClick={() => console.log('New terminal')}
            aria-label="New Terminal"
            title="New Terminal"
          >
            <PlusIcon />
          </button>
          <button
            className="terminal-panel__action"
            onClick={toggleTerminal}
            aria-label="Close Panel"
            title="Close Panel"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      {/* Terminal Content */}
      <div className="terminal-panel__content">
        {/* xterm.js will be integrated in Phase 4 */}
        <div className="terminal-panel__placeholder">
          <span className="terminal-panel__prompt">
            <span className="terminal-panel__user">user</span>
            <span className="terminal-panel__separator">@</span>
            <span className="terminal-panel__host">ide</span>
            <span className="terminal-panel__path"> ~/project</span>
            <span className="terminal-panel__symbol"> $</span>
          </span>
          <span className="terminal-panel__cursor"></span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-9zM3 4v8h10V4H3z"/>
      <path d="M4 6l2 2-2 2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
    </svg>
  );
}
