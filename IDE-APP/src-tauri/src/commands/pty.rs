// ==========================================================================
// PTY Commands - Full pseudo-terminal backend for interactive shells
// ==========================================================================

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

/// Information about a PTY process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PtyInfo {
    pub id: String,
    pub shell: String,
    pub cwd: Option<String>,
    pub pid: Option<u32>,
}

/// PTY instance holder - contains the writer and master
struct PtyInstance {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    shell: String,
    cwd: Option<String>,
    is_alive: Arc<Mutex<bool>>,
}

/// Thread-safe PTY manager
pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

// -------------------------------------------------------------------------
// Tauri Commands
// -------------------------------------------------------------------------

/// Spawn a new PTY process
#[tauri::command]
pub async fn spawn_pty(
    app: AppHandle,
    state: State<'_, PtyManager>,
    id: Option<String>,
    shell: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<PtyInfo, String> {
    let pty_system = native_pty_system();

    // Default size
    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    // Create PTY pair
    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Determine shell to use
    let shell_path = shell.unwrap_or_else(|| {
        if cfg!(windows) {
            // Try to find PowerShell Core (pwsh), then Windows PowerShell, then cmd
            if let Ok(path) = which::which("pwsh") {
                path.to_string_lossy().to_string()
            } else if let Ok(path) = which::which("powershell") {
                path.to_string_lossy().to_string()
            } else {
                std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
            }
        } else {
            // Try to find zsh, then bash, then sh
            if let Ok(path) = which::which("zsh") {
                path.to_string_lossy().to_string()
            } else if let Ok(path) = which::which("bash") {
                path.to_string_lossy().to_string()
            } else {
                std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
            }
        }
    });

    // Build command
    let mut cmd = CommandBuilder::new(&shell_path);

    // Set working directory
    if let Some(ref dir) = cwd {
        cmd.cwd(dir);
    }

    // Spawn child process
    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Get process ID if available
    let pid = child.process_id();

    // Use provided ID or generate unique ID
    let id = id.unwrap_or_else(|| Uuid::new_v4().to_string());

    // Take writer from master
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    // Get reader for output
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    // Track if PTY is alive
    let is_alive = Arc::new(Mutex::new(true));
    let is_alive_clone = Arc::clone(&is_alive);

    // Store instance
    {
        let mut instances = state.instances.lock().map_err(|e| e.to_string())?;
        instances.insert(
            id.clone(),
            PtyInstance {
                writer,
                master: pair.master,
                shell: shell_path.clone(),
                cwd: cwd.clone(),
                is_alive,
            },
        );
    }

    // Spawn thread to read PTY output and emit events
    let app_clone = app.clone();
    let id_for_thread = id.clone();

    thread::spawn(move || {
        let mut buffer = [0u8; 4096];

        loop {
            // Check if still alive
            {
                if let Ok(alive) = is_alive_clone.lock() {
                    if !*alive {
                        break;
                    }
                }
            }

            // Read from PTY
            match reader.read(&mut buffer) {
                Ok(0) => {
                    // EOF - shell exited
                    let _ = app_clone.emit(&format!("pty-exit-{}", id_for_thread), ());
                    break;
                }
                Ok(n) => {
                    // Convert to string (lossy) and emit
                    let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = app_clone.emit(&format!("pty-output-{}", id_for_thread), output);
                }
                Err(e) => {
                    // Check if it's a would-block error (non-fatal)
                    if e.kind() != std::io::ErrorKind::WouldBlock
                        && e.kind() != std::io::ErrorKind::Interrupted
                    {
                        eprintln!("PTY read error: {}", e);
                        let _ = app_clone.emit(&format!("pty-exit-{}", id_for_thread), ());
                        break;
                    }
                }
            }
        }

        // Mark as dead
        if let Ok(mut alive) = is_alive_clone.lock() {
            *alive = false;
        }
    });

    Ok(PtyInfo {
        id,
        shell: shell_path,
        cwd,
        pid,
    })
}

/// Write data to PTY stdin
#[tauri::command]
pub async fn write_pty(
    state: State<'_, PtyManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut instances = state.instances.lock().map_err(|e| e.to_string())?;

    let instance = instances
        .get_mut(&id)
        .ok_or_else(|| format!("PTY not found: {}", id))?;

    instance
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;

    instance
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush PTY: {}", e))?;

    Ok(())
}

/// Resize PTY
#[tauri::command]
pub async fn resize_pty(
    state: State<'_, PtyManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let instances = state.instances.lock().map_err(|e| e.to_string())?;

    let instance = instances
        .get(&id)
        .ok_or_else(|| format!("PTY not found: {}", id))?;

    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    instance
        .master
        .resize(size)
        .map_err(|e| format!("Failed to resize PTY: {}", e))?;

    Ok(())
}

/// Close PTY and cleanup resources
#[tauri::command]
pub async fn close_pty(state: State<'_, PtyManager>, id: String) -> Result<(), String> {
    let mut instances = state.instances.lock().map_err(|e| e.to_string())?;

    if let Some(instance) = instances.remove(&id) {
        // Signal thread to stop
        if let Ok(mut alive) = instance.is_alive.lock() {
            *alive = false;
        }
        // Drop will clean up resources
    }

    Ok(())
}

/// Get list of active PTY instances
#[tauri::command]
pub async fn list_ptys(state: State<'_, PtyManager>) -> Result<Vec<PtyInfo>, String> {
    let instances = state.instances.lock().map_err(|e| e.to_string())?;

    let list: Vec<PtyInfo> = instances
        .iter()
        .map(|(id, inst)| PtyInfo {
            id: id.clone(),
            shell: inst.shell.clone(),
            cwd: inst.cwd.clone(),
            pid: None,
        })
        .collect();

    Ok(list)
}

/// Kill a specific PTY process
#[tauri::command]
pub async fn kill_pty(state: State<'_, PtyManager>, id: String) -> Result<(), String> {
    close_pty(state, id).await
}
