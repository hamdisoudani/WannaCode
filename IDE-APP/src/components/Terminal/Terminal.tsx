/* ==========================================================================
   Terminal - Full PTY-backed xterm.js terminal
   State preserved when hidden (component stays mounted)
   ========================================================================== */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm, IDisposable } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/appStore';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

interface TerminalProps {
  className?: string;
  onShellInfo?: (shell: string, pid: number | null) => void;
  isVisible?: boolean;
}

interface PtyInfo {
  id: string;
  shell: string;
  cwd: string | null;
  pid: number | null;
}

export function Terminal({ className, onShellInfo, isVisible = true }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const listenersRef = useRef<{
    output: UnlistenFn | null;
    exit: UnlistenFn | null;
    data: IDisposable | null;
    resize: IDisposable | null;
  }>({ output: null, exit: null, data: null, resize: null });
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectPath = useAppStore((state) => state.projectPath);
  const prevProjectPathRef = useRef<string | null | undefined>(undefined);
  const isSpawningRef = useRef(false);

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

  // Cleanup all listeners
  const cleanupListeners = useCallback(() => {
    const listeners = listenersRef.current;
    
    if (listeners.data) {
      listeners.data.dispose();
      listeners.data = null;
    }
    if (listeners.resize) {
      listeners.resize.dispose();
      listeners.resize = null;
    }
    if (listeners.output) {
      listeners.output();
      listeners.output = null;
    }
    if (listeners.exit) {
      listeners.exit();
      listeners.exit = null;
    }
  }, []);

  // Cleanup PTY
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

  // Fit terminal to container
  const fitTerminal = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          // Ignore fit errors
        }
      }
    }
  }, []);

  const spawnPty = useCallback(async (terminal: XTerm, cwd: string | null) => {
    // Prevent concurrent spawns
    if (isSpawningRef.current) return;
    isSpawningRef.current = true;

    try {
      // Clean up existing PTY first
      await cleanupPty();

      let cols = 80;
      let rows = 24;
      
      if (fitAddonRef.current) {
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          cols = dims.cols;
          rows = dims.rows;
        }
      }

      const ptyInfo = await invoke<PtyInfo>('spawn_pty', {
        shell: null,
        cwd: cwd,
        cols,
        rows,
      });

      ptyIdRef.current = ptyInfo.id;
      setIsConnected(true);
      setError(null);

      const displayName = getShellDisplayName(ptyInfo.shell);
      onShellInfo?.(displayName, ptyInfo.pid);

      // Set up listeners with the current PTY ID captured
      const currentPtyId = ptyInfo.id;

      // Listen for PTY output
      listenersRef.current.output = await listen<string>(
        `pty-output-${currentPtyId}`,
        (event) => {
          terminal.write(event.payload);
        }
      );

      // Listen for PTY exit
      listenersRef.current.exit = await listen(
        `pty-exit-${currentPtyId}`,
        () => {
          terminal.writeln('\r\n\x1b[90m[Process exited]\x1b[0m');
          setIsConnected(false);
        }
      );

      // Handle terminal input -> PTY
      listenersRef.current.data = terminal.onData((data) => {
        if (ptyIdRef.current === currentPtyId) {
          invoke('write_pty', { id: currentPtyId, data }).catch(console.error);
        }
      });

      // Handle terminal resize -> PTY
      listenersRef.current.resize = terminal.onResize(({ cols, rows }) => {
        if (ptyIdRef.current === currentPtyId) {
          invoke('resize_pty', { id: currentPtyId, cols, rows }).catch(console.error);
        }
      });

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Failed to spawn PTY:', errorMessage);
      setError(errorMessage);
      terminal.writeln(`\r\n\x1b[31mFailed to start terminal: ${errorMessage}\x1b[0m`);
    } finally {
      isSpawningRef.current = false;
    }
  }, [cleanupPty, getShellDisplayName, onShellInfo]);

  // Initialize xterm.js once
  useEffect(() => {
    if (!containerRef.current) return;
    
    // If terminal already exists, don't create another
    if (xtermRef.current) return;

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
      lineHeight: 1.35,
      letterSpacing: 0,
      allowProposedApi: true,
      scrollback: 10000,
      theme: {
        background: '#13131a',
        foreground: '#c8d3f5',
        cursor: '#c8d3f5',
        cursorAccent: '#13131a',
        selectionBackground: 'rgba(122, 162, 247, 0.3)',
        selectionForeground: '#c8d3f5',
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
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial setup
    const initTimer = setTimeout(() => {
      fitAddon.fit();
      terminal.focus();
      spawnPty(terminal, projectPath);
      prevProjectPathRef.current = projectPath;
    }, 100);

    // Handle window resize
    const handleWindowResize = () => {
      requestAnimationFrame(fitTerminal);
    };
    window.addEventListener('resize', handleWindowResize);

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(fitTerminal);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      cleanupPty();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Refit terminal when visibility changes
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

  // Handle project path changes - respawn PTY when project changes
  useEffect(() => {
    // Skip if terminal not initialized yet (initial spawn handles this)
    if (!xtermRef.current) return;
    
    // Skip if this is the initial render (prevProjectPathRef not set yet)
    if (prevProjectPathRef.current === undefined) return;
    
    // Only respawn if path actually changed
    if (prevProjectPathRef.current !== projectPath) {
      const terminal = xtermRef.current;
      terminal.writeln('');
      terminal.writeln(`\x1b[90m[Changing directory to: ${projectPath || 'home'}]\x1b[0m`);
      terminal.writeln('');
      spawnPty(terminal, projectPath);
      prevProjectPathRef.current = projectPath;
    }
  }, [projectPath, spawnPty]);

  const handleRestart = useCallback(async () => {
    if (xtermRef.current) {
      const terminal = xtermRef.current;
      terminal.clear();
      terminal.reset();
      await spawnPty(terminal, projectPath);
    }
  }, [spawnPty, projectPath]);

  return (
    <div className={`terminal ${className || ''}`}>
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
          <span>Connection failed</span>
          <button className="terminal__restart-btn" onClick={handleRestart}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
