use ignore::WalkBuilder;
use regex::RegexBuilder;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub file: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize, // Column index
    pub match_end: usize,   // Column index
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchOptions {
    pub query: String,
    pub path: String,
    pub is_regex: bool,
    pub is_case_sensitive: bool,
    pub is_whole_word: bool,
    pub exclude: Vec<String>, // Glob patterns to exclude
    pub include: Vec<String>, // Glob patterns to include
    pub max_results: Option<usize>,
}

// Global cancellation token for search operations
// In a more robust implementation, this would be a map of IDs to AtomicBools
static IS_SEARCH_CANCELLED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub async fn cancel_search() {
    IS_SEARCH_CANCELLED.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn search_in_files(options: SearchOptions) -> Result<Vec<SearchResult>, String> {
    // Reset cancellation flag
    IS_SEARCH_CANCELLED.store(false, Ordering::Relaxed);

    let SearchOptions {
        query,
        path,
        is_regex,
        is_case_sensitive,
        is_whole_word,
        exclude: _, // Unused for now
        include: _, // Unused for now
        max_results,
    } = options;

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let results = Arc::new(Mutex::new(Vec::new()));
    let max_results = max_results.unwrap_or(1000);

    // Build regex pattern
    let pattern = if is_regex {
        query.clone()
    } else {
        regex::escape(&query)
    };

    let pattern = if is_whole_word {
        format!(r"\b{}\b", pattern)
    } else {
        pattern
    };

    let regex = RegexBuilder::new(&pattern)
        .case_insensitive(!is_case_sensitive)
        .build()
        .map_err(|e| format!("Invalid regex: {}", e))?;

    // Configure walker with smart defaults - respects .gitignore automatically
    let mut builder = WalkBuilder::new(&path);
    builder
        .hidden(false) // Don't auto-skip hidden files, we'll filter manually
        .git_ignore(true) // Respect .gitignore files
        .git_global(true) // Respect global gitignore
        .git_exclude(true) // Respect .git/info/exclude
        .require_git(false) // Work even without git repo
        .ignore(true) // Respect .ignore files
        .parents(true) // Check parent directories for ignore files
        .max_depth(None); // No depth limit

    // Add custom ignores for common patterns not in .gitignore
    builder
        .add_custom_ignore_filename(".ideignore") // Custom ignore file
        .filter_entry(|entry| {
            let path = entry.path();
            let file_name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");

            // Skip lock files and minified files
            if file_name.ends_with(".lock")
                || file_name.ends_with(".min.js")
                || file_name.ends_with(".min.css")
                || file_name.ends_with(".map")
            {
                return false;
            }

            // Skip common binary/media extensions
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            
            let binary_exts = [
                "png", "jpg", "jpeg", "gif", "ico", "svg", "webp",
                "mp4", "mp3", "wav", "avi", "mov",
                "zip", "tar", "gz", "rar", "7z",
                "exe", "dll", "so", "dylib",
                "pdf", "doc", "docx", "xls", "xlsx",
                "woff", "woff2", "ttf", "eot", "otf",
            ];

            if binary_exts.contains(&ext) {
                return false;
            }

            true
        });

    // Process parallel search
    let results_clone = results.clone();
    let regex_ref = &regex;

    builder.build_parallel().run(|| {
        let results = results_clone.clone();
        let regex = regex_ref.clone();

        Box::new(move |entry| {
            if IS_SEARCH_CANCELLED.load(Ordering::Relaxed) {
                return ignore::WalkState::Quit;
            }

            // Check if we reached max results
            if let Ok(guard) = results.lock() {
                if guard.len() >= max_results {
                    return ignore::WalkState::Quit;
                }
            }

            let entry = match entry {
                Ok(e) => e,
                Err(_) => return ignore::WalkState::Continue,
            };

            if !entry.file_type().map_or(false, |ft| ft.is_file()) {
                return ignore::WalkState::Continue;
            }

            let path = entry.path();

            // Smart Binary Check using mime_guess
            // This is more robust than just checking extensions
            let mime_type = mime_guess::from_path(path).first_or_octet_stream();

            // We generally only want to search text files
            // Allow: text/*, application/javascript, application/json, application/xml
            if mime_type.type_() != "text"
                && mime_type.subtype() != "javascript"
                && mime_type.subtype() != "json"
                && mime_type.subtype() != "xml"
                && mime_type.subtype() != "html"
            {
                // Fallback extension check for common source files that might be missed or misidentified
                // e.g. .ts, .tsx, .rs might not always be detected as text by basic mime DB
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                let is_source_code = matches!(
                    ext,
                    "ts" | "tsx"
                        | "js"
                        | "jsx"
                        | "rs"
                        | "py"
                        | "md"
                        | "json"
                        | "css"
                        | "scss"
                        | "html"
                        | "toml"
                        | "yaml"
                        | "yml"
                        | "sql"
                        | "java"
                        | "c"
                        | "cpp"
                        | "h"
                        | "go"
                );

                if !is_source_code {
                    return ignore::WalkState::Continue;
                }
            }

            // Read file content
            // We use standard read_to_string - for huge files this is bad.
            // But for source code search it's usually fine.
            if let Ok(content) = std::fs::read_to_string(path) {
                let mut file_results = Vec::new();

                for (line_idx, line) in content.lines().enumerate() {
                    for mat in regex.find_iter(line) {
                        let result = SearchResult {
                            file: path.to_string_lossy().to_string(),
                            line_number: line_idx + 1,
                            line_content: line.trim().to_string(), // Trim for display
                            match_start: mat.start(),
                            match_end: mat.end(),
                        };
                        file_results.push(result);

                        // Break after finding complex matches in one line?
                        // VS Code usually shows all matches.
                    }
                }

                if !file_results.is_empty() {
                    let mut guard = results.lock().unwrap();
                    if guard.len() < max_results {
                        guard.extend(file_results);
                    } else {
                        return ignore::WalkState::Quit;
                    }
                }
            }

            ignore::WalkState::Continue
        })
    });

    let final_results = results.lock().unwrap().clone();
    Ok(final_results)
}
