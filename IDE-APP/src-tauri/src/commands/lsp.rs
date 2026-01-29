// ==========================================================================
// LSP Commands - Language Server Protocol Backend
// Manages language server processes (tsserver, etc.)
// ==========================================================================

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};
use url::Url;

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

/// Server capabilities returned after initialization
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ServerCapabilities {
    #[serde(rename = "textDocumentSync")]
    pub text_document_sync: Option<Value>,
    #[serde(rename = "completionProvider")]
    pub completion_provider: Option<Value>,
    #[serde(rename = "hoverProvider")]
    pub hover_provider: Option<Value>,
    #[serde(rename = "signatureHelpProvider")]
    pub signature_help_provider: Option<Value>,
    #[serde(rename = "definitionProvider")]
    pub definition_provider: Option<Value>,
    #[serde(rename = "referencesProvider")]
    pub references_provider: Option<Value>,
    #[serde(rename = "documentSymbolProvider")]
    pub document_symbol_provider: Option<Value>,
    #[serde(rename = "codeActionProvider")]
    pub code_action_provider: Option<Value>,
    #[serde(rename = "renameProvider")]
    pub rename_provider: Option<Value>,
    #[serde(rename = "semanticTokensProvider")]
    pub semantic_tokens_provider: Option<Value>,
}

/// LSP server info returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspServerInfo {
    pub id: String,
    pub language_id: String,
    pub root_path: String,
    pub capabilities: ServerCapabilities,
}

/// LSP response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LspResponse {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub result: Option<Value>,
    pub error: Option<LspError>,
}

/// LSP error structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LspError {
    pub code: i32,
    pub message: String,
    pub data: Option<Value>,
}

/// Internal LSP instance
struct LspInstance {
    process: Child,
    stdin: Arc<Mutex<std::process::ChildStdin>>,
    language_id: String,
    root_path: String,
    capabilities: ServerCapabilities,
    is_alive: Arc<Mutex<bool>>,
}

/// Thread-safe LSP manager
pub struct LspManager {
    instances: Arc<Mutex<HashMap<String, LspInstance>>>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for LspManager {
    fn default() -> Self {
        Self::new()
    }
}

// -------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------

/// Format LSP message with Content-Length header
fn format_lsp_message(content: &str) -> String {
    format!("Content-Length: {}\r\n\r\n{}", content.len(), content)
}

/// Parse LSP message from raw input
fn parse_lsp_message(input: &str) -> Option<Value> {
    serde_json::from_str(input).ok()
}

// -------------------------------------------------------------------------
// Tauri Commands
// -------------------------------------------------------------------------

/// Start an LSP server for a language (Generic)
#[tauri::command]
pub async fn lsp_start(
    app: AppHandle,
    state: State<'_, LspManager>,
    id: String,
    language_id: String,
    root_path: String,
    cmd: String,
    args: Vec<String>,
) -> Result<LspServerInfo, String> {
    println!("[LSP] Starting {} server for {}", language_id, root_path);
    println!("[LSP] Executing: {} {:?}", cmd, args);

    // Spawn the language server process
    let mut command = Command::new(&cmd);
    command
        .args(&args)
        .current_dir(&root_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // On Windows, hide the console window
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut process = command
        .spawn()
        .map_err(|e| format!("Failed to spawn LSP server: {}", e))?;

    println!("[LSP] Server process spawned successfully");

    // Get stdin for writing
    let stdin = process.stdin.take().ok_or("Failed to get LSP stdin")?;
    let stdin = Arc::new(Mutex::new(stdin));

    // Get stdout for reading
    let stdout = process.stdout.take().ok_or("Failed to get LSP stdout")?;

    // Get stderr for logging
    let stderr = process.stderr.take();

    let is_alive = Arc::new(Mutex::new(true));
    let is_alive_clone = Arc::clone(&is_alive);

    // Send initialize request
    let init_params = json!({
        "processId": std::process::id(),
        "rootPath": root_path,
        "rootUri": Url::from_directory_path(&root_path)
            .map(|u| u.to_string())
            .unwrap_or_else(|_| format!("file:///{}", root_path.replace('\\', "/"))),
        "capabilities": {
            "textDocument": {
                "completion": {
                    "completionItem": {
                        "snippetSupport": true,
                        "documentationFormat": ["markdown", "plaintext"]
                    }
                },
                "hover": {
                    "contentFormat": ["markdown", "plaintext"]
                },
                "signatureHelp": {
                    "signatureInformation": {
                        "documentationFormat": ["markdown", "plaintext"]
                    }
                },
                "synchronization": {
                    "didSave": true,
                    "willSave": false,
                    "willSaveWaitUntil": false
                },
                "publishDiagnostics": {
                    "relatedInformation": true,
                    "tagSupport": {
                        "valueSet": [1, 2]
                    },
                    "versionSupport": true,
                    "codeDescriptionSupport": true,
                    "dataSupport": true
                },
                "semanticTokens": {
                    "dynamicRegistration": false,
                    "tokenTypes": [
                        "namespace", "type", "class", "enum", "interface",
                        "struct", "typeParameter", "parameter", "variable",
                        "property", "enumMember", "event", "function",
                        "method", "macro", "keyword", "modifier", "comment",
                        "string", "number", "regexp", "operator", "decorator"
                    ],
                    "tokenModifiers": [
                        "declaration", "definition", "readonly", "static",
                        "deprecated", "abstract", "async", "modification",
                        "documentation", "defaultLibrary"
                    ],
                    "formats": ["relative"],
                    "requests": {
                        "full": { "delta": true },
                        "range": false
                    },
                    "multilineTokenSupport": false,
                    "overlappingTokenSupport": false
                }
            },
            "workspace": {
                "workspaceFolders": true
            }
        },
        "workspaceFolders": [{
            "uri": Url::from_directory_path(&root_path)
                .map(|u| u.to_string())
                .unwrap_or_else(|_| format!("file:///{}", root_path.replace('\\', "/"))),
            "name": std::path::Path::new(&root_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "workspace".to_string())
        }]
    });

    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": init_params
    });

    // Send initialize request
    {
        let mut stdin_lock = stdin.lock().map_err(|e| e.to_string())?;
        let msg = format_lsp_message(&init_request.to_string());
        stdin_lock
            .write_all(msg.as_bytes())
            .map_err(|e| format!("Failed to send initialize: {}", e))?;
        stdin_lock
            .flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;
    }

    // Read initialize response
    let mut reader = BufReader::new(stdout);
    let capabilities = read_initialize_response(&mut reader)?;

    // Send initialized notification
    let initialized_notification = json!({
        "jsonrpc": "2.0",
        "method": "initialized",
        "params": {}
    });

    {
        let mut stdin_lock = stdin.lock().map_err(|e| e.to_string())?;
        let msg = format_lsp_message(&initialized_notification.to_string());
        stdin_lock
            .write_all(msg.as_bytes())
            .map_err(|e| format!("Failed to send initialized: {}", e))?;
        stdin_lock
            .flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;
    }

    println!(
        "[LSP] Server initialized with capabilities: {:?}",
        capabilities
    );

    // Store instance
    let server_info = LspServerInfo {
        id: id.clone(),
        language_id: language_id.clone(),
        root_path: root_path.clone(),
        capabilities: capabilities.clone(),
    };

    {
        let mut instances = state.instances.lock().map_err(|e| e.to_string())?;
        instances.insert(
            id.clone(),
            LspInstance {
                process,
                stdin: Arc::clone(&stdin),
                language_id,
                root_path,
                capabilities,
                is_alive: Arc::clone(&is_alive),
            },
        );
    }

    // Spawn thread to read LSP responses
    let app_clone = app.clone();
    let id_for_thread = id.clone();

    thread::spawn(move || {
        read_lsp_output(reader, app_clone, id_for_thread, is_alive_clone);
    });

    // Spawn thread to read stderr (for debugging)
    if let Some(stderr) = stderr {
        let id_for_stderr = id.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                eprintln!("[LSP:{}:stderr] {}", id_for_stderr, line);
            }
        });
    }

    Ok(server_info)
}

/// Read the initialize response and extract capabilities
/// This function keeps reading messages until it finds the response with id: 0
fn read_initialize_response<R: BufRead>(reader: &mut R) -> Result<ServerCapabilities, String> {
    println!("[LSP] Waiting for initialize response...");

    // Keep reading messages until we get the initialize response (id: 0)
    loop {
        // Read Content-Length header
        let mut header_line = String::new();
        let mut content_length: usize = 0;

        loop {
            header_line.clear();
            match reader.read_line(&mut header_line) {
                Ok(0) => return Err("Server closed connection before sending response".to_string()),
                Ok(_) => {}
                Err(e) => return Err(format!("Failed to read header: {}", e)),
            }

            let line = header_line.trim();

            if line.is_empty() {
                break;
            }

            if line.to_lowercase().starts_with("content-length:") {
                let len_str = line
                    .split(':')
                    .nth(1)
                    .ok_or("Invalid Content-Length header")?
                    .trim();
                content_length = len_str
                    .parse()
                    .map_err(|_| "Invalid Content-Length value")?;
            }
        }

        if content_length == 0 {
            return Err("No Content-Length in response".to_string());
        }

        // Read content
        let mut content = vec![0u8; content_length];
        reader
            .read_exact(&mut content)
            .map_err(|e| format!("Failed to read content: {}", e))?;

        let content_str =
            String::from_utf8(content).map_err(|e| format!("Invalid UTF-8: {}", e))?;

        // Parse message
        let message: Value = serde_json::from_str(&content_str)
            .map_err(|e| format!("Failed to parse message: {}", e))?;

        // Check if this is a notification (has "method" but no "id") - skip it
        if message.get("method").is_some() && message.get("id").is_none() {
            println!(
                "[LSP] Skipping notification: {}",
                message
                    .get("method")
                    .and_then(|m| m.as_str())
                    .unwrap_or("unknown")
            );
            continue;
        }

        // Check if this is our initialize response (id: 0)
        if let Some(id) = message.get("id") {
            if id.as_i64() == Some(0) || id.as_u64() == Some(0) {
                println!("[LSP] Got initialize response");

                // Check for error
                if let Some(error) = message.get("error") {
                    return Err(format!("LSP initialization error: {}", error));
                }

                // Extract capabilities
                let capabilities = message
                    .get("result")
                    .and_then(|r| r.get("capabilities"))
                    .cloned()
                    .unwrap_or_else(|| {
                        println!("[LSP] Warning: No capabilities in response");
                        json!({})
                    });

                println!(
                    "[LSP] Capabilities: {}",
                    serde_json::to_string_pretty(&capabilities).unwrap_or_default()
                );

                let caps: ServerCapabilities =
                    serde_json::from_value(capabilities).unwrap_or_else(|e| {
                        println!("[LSP] Warning: Failed to parse capabilities: {}", e);
                        ServerCapabilities::default()
                    });

                return Ok(caps);
            }
        }

        // Unknown message, skip it
        println!("[LSP] Skipping unknown message");
    }
}

/// Read LSP output and emit events
fn read_lsp_output<R: BufRead>(
    mut reader: R,
    app: AppHandle,
    id: String,
    is_alive: Arc<Mutex<bool>>,
) {
    loop {
        // Check if still alive
        {
            if let Ok(alive) = is_alive.lock() {
                if !*alive {
                    break;
                }
            }
        }

        // Read Content-Length header
        let mut header_line = String::new();
        let mut content_length: usize = 0;

        loop {
            header_line.clear();
            match reader.read_line(&mut header_line) {
                Ok(0) => {
                    // EOF
                    println!("[LSP:{}] Server closed connection", id);
                    return;
                }
                Ok(_) => {
                    let line = header_line.trim();
                    if line.is_empty() {
                        break;
                    }
                    if line.to_lowercase().starts_with("content-length:") {
                        if let Some(len_str) = line.split(':').nth(1) {
                            content_length = len_str.trim().parse().unwrap_or(0);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[LSP:{}] Read error: {}", id, e);
                    return;
                }
            }
        }

        if content_length == 0 {
            continue;
        }

        // Read content
        let mut content = vec![0u8; content_length];
        if reader.read_exact(&mut content).is_err() {
            continue;
        }

        let content_str = match String::from_utf8(content) {
            Ok(s) => s,
            Err(_) => continue,
        };

        // Parse and emit
        if let Some(message) = parse_lsp_message(&content_str) {
            // Check if it's a notification (no id) or response (has id)
            if let Some(method) = message.get("method").and_then(|m| m.as_str()) {
                // It's a notification
                println!("[LSP:{}] Received notification: {}", id, method);

                if method == "textDocument/publishDiagnostics" {
                    println!("[LSP:{}] === DIAGNOSTICS RECEIVED ===", id);
                    if let Some(params) = message.get("params") {
                        println!("[LSP:{}] Diagnostics: {}", id, params);
                        let _ = app.emit(&format!("lsp-diagnostics-{}", id), params.clone());
                    }
                } else {
                    // Other notifications - log them all for debugging
                    let _ = app.emit(&format!("lsp-notification-{}", id), message.clone());
                }
            } else {
                // It's a response
                let response = LspResponse {
                    jsonrpc: "2.0".to_string(),
                    id: message.get("id").cloned(),
                    result: message.get("result").cloned(),
                    error: message
                        .get("error")
                        .and_then(|e| serde_json::from_value(e.clone()).ok()),
                };
                let _ = app.emit(&format!("lsp-response-{}", id), response);
            }
        }
    }
}

/// Stop an LSP server
#[tauri::command]
pub async fn lsp_stop(state: State<'_, LspManager>, id: String) -> Result<(), String> {
    println!("[LSP] Stopping server: {}", id);

    let mut instances = state.instances.lock().map_err(|e| e.to_string())?;

    if let Some(mut instance) = instances.remove(&id) {
        // Signal thread to stop
        if let Ok(mut alive) = instance.is_alive.lock() {
            *alive = false;
        }

        // Send shutdown request
        let shutdown_request = json!({
            "jsonrpc": "2.0",
            "id": 999999,
            "method": "shutdown",
            "params": null
        });

        if let Ok(mut stdin) = instance.stdin.lock() {
            let msg = format_lsp_message(&shutdown_request.to_string());
            let _ = stdin.write_all(msg.as_bytes());
            let _ = stdin.flush();

            // Send exit notification
            let exit_notification = json!({
                "jsonrpc": "2.0",
                "method": "exit",
                "params": null
            });
            let msg = format_lsp_message(&exit_notification.to_string());
            let _ = stdin.write_all(msg.as_bytes());
            let _ = stdin.flush();
        }

        // Kill process if still running
        let _ = instance.process.kill();
    }

    Ok(())
}

/// Send an LSP request (expects response)
#[tauri::command]
pub async fn lsp_request(
    state: State<'_, LspManager>,
    id: String,
    request_id: i64,
    method: String,
    params: Value,
) -> Result<(), String> {
    let instances = state.instances.lock().map_err(|e| e.to_string())?;

    let instance = instances
        .get(&id)
        .ok_or_else(|| format!("LSP server not found: {}", id))?;

    let request = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params
    });

    let mut stdin = instance.stdin.lock().map_err(|e| e.to_string())?;
    let msg = format_lsp_message(&request.to_string());

    stdin
        .write_all(msg.as_bytes())
        .map_err(|e| format!("Failed to send request: {}", e))?;
    stdin
        .flush()
        .map_err(|e| format!("Failed to flush: {}", e))?;

    Ok(())
}

/// Send an LSP notification (no response expected)
#[tauri::command]
pub async fn lsp_notify(
    state: State<'_, LspManager>,
    id: String,
    method: String,
    params: Value,
) -> Result<(), String> {
    let instances = state.instances.lock().map_err(|e| e.to_string())?;

    let instance = instances
        .get(&id)
        .ok_or_else(|| format!("LSP server not found: {}", id))?;

    let notification = json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params
    });

    let mut stdin = instance.stdin.lock().map_err(|e| e.to_string())?;
    let msg = format_lsp_message(&notification.to_string());

    stdin
        .write_all(msg.as_bytes())
        .map_err(|e| format!("Failed to send notification: {}", e))?;
    stdin
        .flush()
        .map_err(|e| format!("Failed to flush: {}", e))?;

    Ok(())
}

/// List active LSP servers
#[tauri::command]
pub async fn lsp_list(state: State<'_, LspManager>) -> Result<Vec<LspServerInfo>, String> {
    let instances = state.instances.lock().map_err(|e| e.to_string())?;

    let list: Vec<LspServerInfo> = instances
        .iter()
        .map(|(id, inst)| LspServerInfo {
            id: id.clone(),
            language_id: inst.language_id.clone(),
            root_path: inst.root_path.clone(),
            capabilities: inst.capabilities.clone(),
        })
        .collect();

    Ok(list)
}
