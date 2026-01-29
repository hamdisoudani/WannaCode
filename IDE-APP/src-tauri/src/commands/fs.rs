// ==========================================================================
// File System Commands - Rust/Tauri Backend
// ==========================================================================

use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Represents a file or directory entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirStats {
    pub path: String,
    pub name: String,
    pub is_empty: bool,
    pub size_bytes: u64,
    pub file_count: usize,
    pub dir_count: usize,
    pub depth: u32,
    pub children: Option<Vec<DirStats>>,
}

/// Represents a file or directory entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(rename = "isFile")]
    pub is_file: bool,
    pub children: Option<Vec<FileEntry>>,
    pub extension: Option<String>,
}

/// Read directory contents recursively (limited depth for performance)
#[tauri::command]
pub fn read_directory(
    path: String,
    depth: Option<u32>,
    show_ignored: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    let max_depth = depth.unwrap_or(1);
    let show_ignored_dirs = show_ignored.unwrap_or(false);
    read_dir_recursive(&path, 0, max_depth, show_ignored_dirs)
}

/// Read directory statistics (size, counts) efficiently with .gitignore support
#[tauri::command]
pub fn read_directory_stats(path: String, max_depth: Option<u32>) -> Result<DirStats, String> {
    let depth_limit = max_depth.unwrap_or(2);
    let root_path = PathBuf::from(&path);
    
    if !root_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    // Build directory tree using WalkBuilder (respects .gitignore)
    let mut builder = WalkBuilder::new(&root_path);
    builder
        .max_depth(Some(depth_limit as usize + 1))
        .hidden(false) // Show hidden files but we'll filter . prefixed manually
        .git_ignore(true) // Respect .gitignore
        .git_global(true) // Respect global gitignore
        .git_exclude(true) // Respect .git/info/exclude
        .require_git(false) // Work even without git repo
        .ignore(true) // Respect .ignore files
        .parents(true); // Check parent directories for ignore files

    // Collect all entries with their depths
    let mut entries: Vec<(PathBuf, usize)> = Vec::new();
    
    for result in builder.build() {
        match result {
            Ok(entry) => {
                let entry_path = entry.path();
                let depth = entry.depth();
                
                // Skip the root itself
                if entry_path == root_path {
                    continue;
                }
                
                entries.push((entry_path.to_path_buf(), depth));
            }
            Err(_) => continue,
        }
    }

    // Build stats tree from collected entries
    build_stats_tree(&root_path, &entries, depth_limit)
}

fn build_stats_tree(
    root_path: &Path,
    entries: &[(PathBuf, usize)],
    max_depth: u32,
) -> Result<DirStats, String> {
    let name = root_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut stats = DirStats {
        path: root_path.to_string_lossy().to_string(),
        name,
        is_empty: true,
        size_bytes: 0,
        file_count: 0,
        dir_count: 0,
        depth: 0,
        children: if max_depth > 0 { Some(Vec::new()) } else { None },
    };

    // Group entries by parent directory
    let mut dir_map: HashMap<PathBuf, Vec<&PathBuf>> = HashMap::new();
    
    for (entry_path, _depth) in entries {
        if let Some(parent) = entry_path.parent() {
            dir_map.entry(parent.to_path_buf())
                .or_insert_with(Vec::new)
                .push(entry_path);
        }

        // Accumulate stats
        if entry_path.is_file() {
            stats.file_count += 1;
            if let Ok(metadata) = fs::metadata(entry_path) {
                stats.size_bytes += metadata.len();
            }
        } else if entry_path.is_dir() {
            stats.dir_count += 1;
        }
    }

    // Build children for depth 1 only (immediate children)
    if max_depth > 0 {
        if let Some(children_paths) = dir_map.get(root_path) {
            let mut children_stats = Vec::new();
            
            for child_path in children_paths {
                let child_name = child_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                let mut child_stat = DirStats {
                    path: child_path.to_string_lossy().to_string(),
                    name: child_name,
                    is_empty: true,
                    size_bytes: 0,
                    file_count: 0,
                    dir_count: 0,
                    depth: 1,
                    children: None,
                };

                if child_path.is_file() {
                    child_stat.file_count = 1;
                    if let Ok(metadata) = fs::metadata(child_path) {
                        child_stat.size_bytes = metadata.len();
                        child_stat.is_empty = child_stat.size_bytes == 0;
                    }
                } else if child_path.is_dir() {
                    // Count descendants
                    for (entry_path, _) in entries {
                        if entry_path.starts_with(child_path) && entry_path != *child_path {
                            if entry_path.is_file() {
                                child_stat.file_count += 1;
                                if let Ok(metadata) = fs::metadata(entry_path) {
                                    child_stat.size_bytes += metadata.len();
                                }
                            } else if entry_path.is_dir() {
                                child_stat.dir_count += 1;
                            }
                        }
                    }
                    child_stat.is_empty = child_stat.file_count == 0 && child_stat.dir_count == 0;
                }

                children_stats.push(child_stat);
            }

            // Sort children: directories first, then alphabetically
            children_stats.sort_by(|a, b| {
                match (a.dir_count > 0, b.dir_count > 0) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });

            stats.children = Some(children_stats);
        }
    }

    stats.is_empty = stats.file_count == 0 && stats.dir_count == 0;
    Ok(stats)
}

fn read_dir_recursive(
    path: &str,
    current_depth: u32,
    max_depth: u32,
    show_ignored: bool,
) -> Result<Vec<FileEntry>, String> {
    let path_obj = Path::new(path);

    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !path_obj.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    // Use WalkBuilder for proper .gitignore support
    let mut builder = WalkBuilder::new(path_obj);
    builder
        .max_depth(Some(1)) // Only immediate children
        .hidden(false) // We'll handle hidden files manually
        .git_ignore(!show_ignored) // Respect .gitignore unless showing ignored
        .git_global(!show_ignored)
        .git_exclude(!show_ignored)
        .require_git(false)
        .ignore(!show_ignored)
        .parents(true);

    for result in builder.build() {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };

        let entry_path = entry.path();
        
        // Skip the root directory itself
        if entry_path == path_obj {
            continue;
        }

        let file_name = entry_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Skip hidden files/folders (starting with .) unless showing ignored
        if !show_ignored && file_name.starts_with('.') {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let is_file = entry_path.is_file();
        let full_path = entry_path.to_string_lossy().to_string();

        let extension = if is_file {
            entry_path
                .extension()
                .map(|e| e.to_string_lossy().to_string())
        } else {
            None
        };

        let children = if is_dir && current_depth < max_depth {
            Some(
                read_dir_recursive(&full_path, current_depth + 1, max_depth, show_ignored)
                    .unwrap_or_default(),
            )
        } else if is_dir {
            None // Will be loaded on expand
        } else {
            None
        };

        entries.push(FileEntry {
            name: file_name,
            path: full_path,
            is_directory: is_dir,
            is_file,
            children,
            extension,
        });
    }

    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Read file contents as text
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a file
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// Create a new file
#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    fs::File::create(&path).map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(())
}

/// Create a new directory
#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

/// Delete a file or directory
#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);

    if path_obj.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

/// Rename a file or directory
#[tauri::command]
pub fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))
}

/// Check if path exists
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// TypeScript library definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeLibrary {
    pub path: String,
    pub content: String,
}

/// Load tsconfig.json from project root
#[tauri::command]
pub fn load_tsconfig(project_path: String) -> Result<Option<String>, String> {
    let tsconfig_path = Path::new(&project_path).join("tsconfig.json");

    if tsconfig_path.exists() {
        fs::read_to_string(&tsconfig_path)
            .map(Some)
            .map_err(|e| format!("Failed to read tsconfig.json: {}", e))
    } else {
        Ok(None)
    }
}

/// Load type definitions from node_modules/@types for IntelliSense
#[tauri::command]
pub fn load_type_definitions(project_path: String) -> Result<Vec<TypeLibrary>, String> {
    let node_modules = Path::new(&project_path).join("node_modules");
    let mut libraries: Vec<TypeLibrary> = Vec::new();

    if !node_modules.exists() {
        return Ok(libraries);
    }

    // 1. Load from @types directory
    let types_path = node_modules.join("@types");
    if types_path.exists() {
        if let Ok(read_dir) = fs::read_dir(&types_path) {
            for entry in read_dir.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    let index_dts = entry_path.join("index.d.ts");
                    if index_dts.exists() {
                        if let Ok(content) = fs::read_to_string(&index_dts) {
                            let package_name = entry.file_name().into_string().unwrap_or_default();
                            libraries.push(TypeLibrary {
                                path: format!(
                                    "file:///node_modules/@types/{}/index.d.ts",
                                    package_name
                                ),
                                content,
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Load from packages that bundle their own types (check package.json dependencies)
    let package_json_path = Path::new(&project_path).join("package.json");
    if package_json_path.exists() {
        if let Ok(package_json_content) = fs::read_to_string(&package_json_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&package_json_content) {
                // Collect all dependencies
                let mut deps: Vec<String> = Vec::new();

                if let Some(dependencies) = json.get("dependencies").and_then(|d| d.as_object()) {
                    deps.extend(dependencies.keys().cloned());
                }
                if let Some(dev_dependencies) =
                    json.get("devDependencies").and_then(|d| d.as_object())
                {
                    deps.extend(dev_dependencies.keys().cloned());
                }

                // Check each dependency for bundled types
                for dep in deps {
                    // Skip @types packages (already loaded above)
                    if dep.starts_with("@types/") {
                        continue;
                    }

                    let dep_path = node_modules.join(&dep);
                    let dep_package_json = dep_path.join("package.json");

                    if dep_package_json.exists() {
                        if let Ok(dep_json_content) = fs::read_to_string(&dep_package_json) {
                            if let Ok(dep_json) =
                                serde_json::from_str::<serde_json::Value>(&dep_json_content)
                            {
                                // Look for types or typings field
                                let types_field = dep_json
                                    .get("types")
                                    .or_else(|| dep_json.get("typings"))
                                    .and_then(|v| v.as_str());

                                if let Some(types_file) = types_field {
                                    let types_file_path = dep_path.join(types_file);
                                    if types_file_path.exists() {
                                        if let Ok(content) = fs::read_to_string(&types_file_path) {
                                            libraries.push(TypeLibrary {
                                                path: format!(
                                                    "file:///node_modules/{}/{}",
                                                    dep, types_file
                                                ),
                                                content,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(libraries)
}

/// Load specific package types (e.g., react, react-dom)
#[tauri::command]
pub fn load_package_types(
    project_path: String,
    package_name: String,
) -> Result<Option<TypeLibrary>, String> {
    // First try @types package
    let types_path = Path::new(&project_path)
        .join("node_modules")
        .join("@types")
        .join(&package_name)
        .join("index.d.ts");

    if types_path.exists() {
        let content = fs::read_to_string(&types_path)
            .map_err(|e| format!("Failed to read type definition: {}", e))?;
        return Ok(Some(TypeLibrary {
            path: format!("file:///node_modules/@types/{}/index.d.ts", package_name),
            content,
        }));
    }

    // Try package's own types (e.g., node_modules/package/dist/index.d.ts)
    let package_types = Path::new(&project_path)
        .join("node_modules")
        .join(&package_name);

    // Check package.json for "types" or "typings" field
    let package_json_path = package_types.join("package.json");
    if package_json_path.exists() {
        if let Ok(package_json) = fs::read_to_string(&package_json_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&package_json) {
                // Look for types field
                let types_field = json
                    .get("types")
                    .or_else(|| json.get("typings"))
                    .and_then(|v| v.as_str());

                if let Some(types_file) = types_field {
                    let types_file_path = package_types.join(types_file);
                    if types_file_path.exists() {
                        let content = fs::read_to_string(&types_file_path)
                            .map_err(|e| format!("Failed to read type definition: {}", e))?;
                        return Ok(Some(TypeLibrary {
                            path: format!("file:///node_modules/{}/{}", package_name, types_file),
                            content,
                        }));
                    }
                }
            }
        }
    }

    Ok(None)
}

/// Load ALL .d.ts files from a package directory recursively
fn load_dts_files_recursive(
    package_root: &Path,
    current_path: &Path,
    package_name: &str,
    libraries: &mut Vec<TypeLibrary>,
    max_depth: u32,
    current_depth: u32,
) {
    if current_depth > max_depth {
        return;
    }

    if let Ok(entries) = fs::read_dir(current_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().into_string().unwrap_or_default();

            // Skip node_modules inside packages and hidden files
            if file_name == "node_modules" || file_name.starts_with('.') {
                continue;
            }

            if path.is_dir() {
                // Recurse into subdirectories
                load_dts_files_recursive(
                    package_root,
                    &path,
                    package_name,
                    libraries,
                    max_depth,
                    current_depth + 1,
                );
            } else if file_name.ends_with(".d.ts") {
                // Load .d.ts file
                if let Ok(content) = fs::read_to_string(&path) {
                    // Calculate relative path from package root
                    let rel_path = path
                        .strip_prefix(package_root)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .replace('\\', "/");

                    // Create the full module path
                    let module_path = if rel_path.is_empty() {
                        format!("file:///node_modules/{}/{}", package_name, file_name)
                    } else {
                        format!("file:///node_modules/{}/{}", package_name, rel_path)
                    };

                    libraries.push(TypeLibrary {
                        path: module_path,
                        content,
                    });
                }
            }
        }
    }
}

/// Load comprehensive type definitions including all .d.ts files from packages
/// This provides better IntelliSense for subpath imports like @langchain/core/messages
#[tauri::command]
pub fn load_all_type_definitions(
    project_path: String,
    max_files: Option<usize>,
) -> Result<Vec<TypeLibrary>, String> {
    let node_modules = Path::new(&project_path).join("node_modules");
    let mut libraries: Vec<TypeLibrary> = Vec::new();
    let max_files = max_files.unwrap_or(500); // Limit to prevent memory issues

    if !node_modules.exists() {
        return Ok(libraries);
    }

    // Get dependencies from package.json
    let package_json_path = Path::new(&project_path).join("package.json");
    let mut deps: Vec<String> = Vec::new();

    if package_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&package_json_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(dependencies) = json.get("dependencies").and_then(|d| d.as_object()) {
                    deps.extend(dependencies.keys().cloned());
                }
                if let Some(dev_dependencies) =
                    json.get("devDependencies").and_then(|d| d.as_object())
                {
                    deps.extend(dev_dependencies.keys().cloned());
                }
            }
        }
    }

    // 1. Load from @types directory (all .d.ts files)
    let types_path = node_modules.join("@types");
    if types_path.exists() {
        if let Ok(entries) = fs::read_dir(&types_path) {
            for entry in entries.flatten() {
                if libraries.len() >= max_files {
                    break;
                }
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    let package_name = entry.file_name().into_string().unwrap_or_default();
                    load_dts_files_recursive(
                        &entry_path,
                        &entry_path,
                        &format!("@types/{}", package_name),
                        &mut libraries,
                        3,
                        0,
                    );
                }
            }
        }
    }

    // 2. Load from scoped packages (@scope/package)
    if let Ok(entries) = fs::read_dir(&node_modules) {
        for entry in entries.flatten() {
            if libraries.len() >= max_files {
                break;
            }
            let entry_path = entry.path();
            let name = entry.file_name().into_string().unwrap_or_default();

            // Handle scoped packages (@scope/*)
            if name.starts_with('@') && name != "@types" && entry_path.is_dir() {
                if let Ok(scoped_entries) = fs::read_dir(&entry_path) {
                    for scoped_entry in scoped_entries.flatten() {
                        if libraries.len() >= max_files {
                            break;
                        }
                        let scoped_path = scoped_entry.path();
                        let scoped_name =
                            scoped_entry.file_name().into_string().unwrap_or_default();
                        let full_name = format!("{}/{}", name, scoped_name);

                        // Only load if it's a dependency
                        if deps.contains(&full_name) && scoped_path.is_dir() {
                            load_dts_files_recursive(
                                &scoped_path,
                                &scoped_path,
                                &full_name,
                                &mut libraries,
                                4,
                                0,
                            );
                        }
                    }
                }
            }
        }
    }

    // 3. Load from regular packages that bundle types
    for dep in &deps {
        if libraries.len() >= max_files {
            break;
        }
        // Skip scoped packages (already handled) and @types
        if dep.starts_with('@') {
            continue;
        }

        let dep_path = node_modules.join(dep);
        if dep_path.is_dir() {
            load_dts_files_recursive(&dep_path, &dep_path, dep, &mut libraries, 3, 0);
        }
    }

    Ok(libraries)
}
