/* ==========================================================================
   TerminalInstance - Single PTY-backed xterm.js terminal
   ========================================================================== */

import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm, IDisposable } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

interface PtyInfo {
  id: string;
  shell: string;
  cwd: string | null;
  pid: number | null;
}

export interface TerminalInstanceRef {
  restart: () => Promise<void>;
  fit: () => void;
  focus: () => void;
  clear: () => void;
  findNext: (term: string) => void;
  findPrevious: (term: string) => void;
}

interface TerminalInstanceProps {
  id: string;
  cwd: string | null;
  isVisible: boolean;
  onShellInfo?: (id: string, shell: string, pid: number | null) => void;
  onExit?: (id: string) => void;
}

export const TerminalInstance = forwardRef<TerminalInstanceRef, TerminalInstanceProps>(
  function TerminalInstance({ id, cwd, isVisible, onShellInfo, onExit }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const ptyIdRef = useRef<string | null>(null);
    const listenersRef = useRef<{
      output: UnlistenFn | null;
      exit: UnlistenFn | null;
      data: IDisposable | null;
      resize: IDisposable | null;
    }>({ output: null, exit: null, data: null, resize: null });
    
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSpawningRef = useRef(false);
    const cwdRef = useRef(cwd);

    const getShellDisplayName = useCallback((shellPath: string) => {
      const lowerPath = shellPath.toLowerCase();
      if (lowerPath.includes('powershell') || lowerPath.includes('pwsh')) return 'PowerShell';
      if (lowerPath.includes('cmd')) return 'Command Prompt';
      if (lowerPath.includes('bash')) return 'Bash';
      if (lowerPath.includes('zsh')) return 'Zsh';
      if (lowerPath.includes('fish')) return 'Fish';
      const parts = shellPath.split(/[/\\]/);
      return parts[parts.length - 1] || 'Terminal';
    }, []);

    const cleanupListeners = useCallback(() => {
      const listeners = listenersRef.current;
      if (listeners.data) { listeners.data.dispose(); listeners.data = null; }
      if (listeners.resize) { listeners.resize.dispose(); listeners.resize = null; }
      if (listeners.output) { listeners.output(); listeners.output = null; }
      if (listeners.exit) { listeners.exit(); listeners.exit = null; }
    }, []);

    const cleanupPty = useCallback(async () => {
      cleanupListeners();
      if (ptyIdRef.current) {
        const ptyId = ptyIdRef.current;
        ptyIdRef.current = null;
        try {
          await invoke('close_pty', { id: ptyId });
        } catch (e) {
          console.warn('Failed to close PTY:', e);
        }
      }
      setIsConnected(false);
    }, [cleanupListeners]);

    const fitTerminal = useCallback(() => {
      if (fitAddonRef.current && xtermRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          try { fitAddonRef.current.fit(); } catch (e) { /* ignore */ }
        }
      }
    }, []);

    const spawnPty = useCallback(async (terminal: XTerm, workingDir: string | null) => {
      if (isSpawningRef.current) return;
      isSpawningRef.current = true;

      try {
        await cleanupPty();

        let cols = 80, rows = 24;
        if (fitAddonRef.current) {
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims) { cols = dims.cols; rows = dims.rows; }
        }

        // Generate ID frontend-side to listen before spawn
        // Simple random ID akin to UUID v4
        const newPtyId = crypto.randomUUID 
          ? crypto.randomUUID() 
          : `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        ptyIdRef.current = newPtyId;
        
        // Setup listeners BEFORE spawning to catch initial output
        listenersRef.current.output = await listen<string>(
          `pty-output-${newPtyId}`,
          (event) => terminal.write(event.payload)
        );

        listenersRef.current.exit = await listen(
          `pty-exit-${newPtyId}`,
          () => {
            terminal.writeln('\r\n\x1b[90m[Process exited]\x1b[0m');
            setIsConnected(false);
            onExit?.(id);
          }
        );

        const ptyInfo = await invoke<PtyInfo>('spawn_pty', {
          id: newPtyId,
          shell: null,
          cwd: workingDir,
          cols,
          rows,
        });

        setIsConnected(true);
        setError(null);

        const displayName = getShellDisplayName(ptyInfo.shell);
        onShellInfo?.(id, displayName, ptyInfo.pid);

        listenersRef.current.data = terminal.onData((data) => {
          if (ptyIdRef.current === newPtyId) {
            invoke('write_pty', { id: newPtyId, data }).catch(console.error);
          }
        });

        listenersRef.current.resize = terminal.onResize(({ cols, rows }) => {
          if (ptyIdRef.current === newPtyId) {
            invoke('resize_pty', { id: newPtyId, cols, rows }).catch(console.error);
          }
        });

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
        terminal.writeln(`\r\n\x1b[31mFailed to start terminal: ${errorMessage}\x1b[0m`);
      } finally {
        isSpawningRef.current = false;
      }
    }, [cleanupPty, getShellDisplayName, onShellInfo, onExit, id]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      restart: async () => {
        if (xtermRef.current) {
          xtermRef.current.clear();
          xtermRef.current.reset();
          await spawnPty(xtermRef.current, cwdRef.current);
          xtermRef.current.focus();
        }
      },
      fit: fitTerminal,
      focus: () => xtermRef.current?.focus(),
      clear: () => xtermRef.current?.clear(),
      findNext: (term: string) => searchAddonRef.current?.findNext(term),
      findPrevious: (term: string) => searchAddonRef.current?.findPrevious(term),
    }), [spawnPty, fitTerminal]);

    // Initialize xterm
    useEffect(() => {
      if (!containerRef.current || xtermRef.current) return;

      const terminal = new XTerm({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
        lineHeight: 1.35,
        allowProposedApi: true,
        scrollback: 10000,
        theme: {
          background: '#13131a',
          foreground: '#c8d3f5',
          cursor: '#c8d3f5',
          cursorAccent: '#13131a',
          selectionBackground: 'rgba(122, 162, 247, 0.3)',
          black: '#363848',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#bb9af7',
          cyan: '#7dcfff',
          white: '#a9b1d6',
          brightBlack: '#565869',
          brightRed: '#f7768e',
          brightGreen: '#9ece6a',
          brightYellow: '#e0af68',
          brightBlue: '#7aa2f7',
          brightMagenta: '#bb9af7',
          brightCyan: '#7dcfff',
          brightWhite: '#c8d3f5',
        },
      });

      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(searchAddon);
      terminal.open(containerRef.current);

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;
      searchAddonRef.current = searchAddon;

      // Handle resize and initial fit
      const handleResize = () => requestAnimationFrame(fitTerminal);
      window.addEventListener('resize', handleResize);
      
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          fitTerminal();
          
          // Initial spawn: If not connected and we have valid dimensions, spawn now.
          // This avoids the 100ms race condition and ensures we only spawn when ready.
          if (!ptyIdRef.current && !isSpawningRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              spawnPty(terminal, cwdRef.current);
            }
          }
        });
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        cleanupPty();
        terminal.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
      };
    }, []); // Run on mount

    // Refit when visible
    useEffect(() => {
      if (isVisible && xtermRef.current) {
        const timers = [
          setTimeout(fitTerminal, 0),
          setTimeout(fitTerminal, 50),
          setTimeout(fitTerminal, 150),
        ];
        setTimeout(() => xtermRef.current?.focus(), 100);
        return () => timers.forEach(clearTimeout);
      }
    }, [isVisible, fitTerminal]);

    // Handle CWD changes (Reload terminal)
    useEffect(() => {
      // If CWD changes and we already have a session (or even if we don't, but are initialized),
      // we should attempt to restart to pick up the new directory.
      if (cwd !== cwdRef.current && xtermRef.current) {
        cwdRef.current = cwd;
        // Only restart if we have dimensions (to avoid double spawn race with mount)
        // or if we already have a running PTY.
        if (ptyIdRef.current || (containerRef.current?.getBoundingClientRect().height ?? 0) > 0) {
           // We use the accessible method which clears and respawns
           if (xtermRef.current) {
             xtermRef.current.clear();
             xtermRef.current.reset();
             spawnPty(xtermRef.current, cwd);
             xtermRef.current.focus();
           }
        }
      } else {
        // Just update ref if we haven't initialized yet
        cwdRef.current = cwd;
      }
    }, [cwd, spawnPty]);

    return (
      <div className="terminal">
        <div className="terminal__container" ref={containerRef} />
        {!isConnected && !error && (
          <div className="terminal__status terminal__status--connecting">
            <span className="terminal__status-dot terminal__status-dot--connecting" />
            <span>Connecting...</span>
          </div>
        )}
        {error && (
          <div className="terminal__status terminal__status--error">
            <span className="terminal__status-dot terminal__status-dot--error" />
            <span>Failed</span>
          </div>
        )}
      </div>
    );
  }
);
