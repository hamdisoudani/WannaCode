// ==========================================================================
// IDE App - Main Tauri Library
// ==========================================================================

mod commands;

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

use commands::{
    cancel_search,
    close_pty,
    // File system commands
    create_directory,
    create_file,
    delete_entry,
    kill_pty,
    list_ptys,
    load_all_type_definitions,
    load_package_types,
    load_tsconfig,
    load_type_definitions,
    // LSP commands
    lsp_list,
    lsp_notify,
    lsp_request,
    lsp_start,
    lsp_stop,
    path_exists,
    read_directory,
    read_directory_stats, // New stats command
    read_file,
    rename_entry,
    resize_pty,
    // Search
    search_in_files,
    // PTY commands
    spawn_pty,
    write_file,
    write_pty,
    LspManager,
    PtyManager,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        // Single instance plugin - ensures deep links go to running instance
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // When a second instance is launched with deep link args,
            // emit an event to the running instance
            if let Some(url) = args.get(1) {
                println!("[SingleInstance] Received URL: {}", url);
                // The deep-link plugin will handle this automatically
                // because we enabled the "deep-link" feature
            }
            // Focus the main window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Register the custom URL scheme for OAuth callbacks (desktop only)
            #[cfg(desktop)]
            {
                if let Err(e) = app.deep_link().register("codesurf") {
                    eprintln!("Failed to register deep link: {:?}", e);
                }
            }
            Ok(())
        })
        // Register PTY manager as state
        .manage(PtyManager::new())
        // Register LSP manager as state
        .manage(LspManager::new())
        .invoke_handler(tauri::generate_handler![
            // General
            greet,
            // File system
            read_directory,
            read_directory_stats,
            read_file,
            write_file,
            create_file,
            create_directory,
            delete_entry,
            rename_entry,
            path_exists,
            // TypeScript support
            load_tsconfig,
            load_type_definitions,
            load_all_type_definitions,
            load_package_types,
            // PTY
            spawn_pty,
            write_pty,
            resize_pty,
            close_pty,
            list_ptys,
            kill_pty,
            // LSP
            lsp_start,
            lsp_stop,
            lsp_request,
            lsp_notify,
            lsp_list,
            // Search
            search_in_files,
            cancel_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
