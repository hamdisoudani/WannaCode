/* ==========================================================================
   useImportValidation Hook - Validates and Colors Import Paths
   ========================================================================== */

import { useEffect, useRef, useState, useDeferredValue } from 'react';
import type { editor } from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';

interface ImportInfo {
    range: { startLine: number; startCol: number; endLine: number; endCol: number };
    modulePath: string;
    isRelative: boolean;
    isNodeModule: boolean;
    isAlias?: boolean;
}

interface UseImportValidationOptions {
    editor: editor.IStandaloneCodeEditor | null;
    filePath: string | null;
    content: string;
    monaco: typeof import('monaco-editor') | null;
}

interface TsConfigPaths {
    baseUrl: string;
    paths: Record<string, string[]>;
}

/**
 * Extract import statements from TypeScript/JavaScript code
 */
function extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    // Match various import patterns:
    // import X from 'path'
    // import { X } from 'path'
    // import * as X from 'path'
    // import 'path'
    // const X = require('path')
    // require('path')
    const importRegex = /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?|require\s*\()\s*['"]([^'"]+)['"]/g;

    lines.forEach((line, lineIndex) => {
        let match;
        while ((match = importRegex.exec(line)) !== null) {
            const modulePath = match[1];
            const startCol = match.index + match[0].indexOf(modulePath) - 1; // Position of opening quote
            const endCol = startCol + modulePath.length + 2; // Include both quotes

            const isRelative = modulePath.startsWith('.') || modulePath.startsWith('/');

            imports.push({
                range: {
                    startLine: lineIndex + 1,
                    startCol: startCol + 1, // Monaco uses 1-indexed
                    endLine: lineIndex + 1,
                    endCol: endCol + 1,
                },
                modulePath,
                isRelative,
                isNodeModule: !isRelative, // Will be refined during validation if it matches an alias
            });
        }
    });

    return imports;
}

/**
 * Simple path joining utility for Windows paths
 */
function joinPath(...parts: string[]): string {
    // Filter out empty parts
    const filtered = parts.filter(p => p);

    // Join with backslash
    let joined = filtered.join('\\');

    // Handle relative paths (./ and ../)
    const segments = joined.split(/[\/\\]+/); // Split on either slash
    const result: string[] = [];

    for (const segment of segments) {
        if (segment === '..') {
            result.pop();
        } else if (segment !== '.' && segment !== '') {
            result.push(segment);
        }
    }

    return result.join('\\');
}

/**
 * Helper to strip comments from JSON (tsconfig allows comments)
 */
function stripJsonComments(json: string): string {
    return json.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
}

/**
 * Find the project root by looking for tsconfig.json or package.json
 */
async function findProjectRoot(filePath: string): Promise<string | null> {
    try {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');

        for (let i = parts.length - 1; i >= 0; i--) {
            const dirPath = parts.slice(0, i + 1).join('/');

            // Check for tsconfig.json
            const tsConfigPath = `${dirPath}/tsconfig.json`;
            const hasTsConfig = await invoke<boolean>('path_exists', { path: tsConfigPath });
            if (hasTsConfig) return dirPath;

            // Check for package.json
            const pkgJsonPath = `${dirPath}/package.json`;
            const hasPkgJson = await invoke<boolean>('path_exists', { path: pkgJsonPath });
            if (hasPkgJson) return dirPath;
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Resolve a module path to its absolute file path
 */
async function resolveModulePath(
    importPath: string,
    currentFilePath: string,
    isRelative: boolean,
    isNodeModule: boolean,
    tsConfig: TsConfigPaths | null,
    projectRoot: string | null
): Promise<{ path: string | null; isAlias: boolean }> {
    try {
        // 1. Handle Relative Imports
        if (isRelative) {
            const currentDir = currentFilePath.split('\\').slice(0, -1).join('\\');
            const resolved = joinPath(currentDir, importPath);

            // Try extensions
            const validated = await checkPathWithExtensions(resolved);
            return { path: validated, isAlias: false };
        }

        // 2. Handle Path Aliases (if tsconfig exists)
        if (tsConfig && projectRoot) {
            for (const [aliasPattern, targetPatterns] of Object.entries(tsConfig.paths)) {
                // Handle wildcard aliases (e.g. "@/*")
                const aliasPrefix = aliasPattern.replace(/\*$/, '');

                if (importPath.startsWith(aliasPrefix)) {
                    const suffix = importPath.substring(aliasPrefix.length);

                    // Try each target pattern
                    for (const targetPattern of targetPatterns) {
                        const targetPrefix = targetPattern.replace(/\*$/, '');
                        const potentialPath = joinPath(projectRoot, tsConfig.baseUrl, targetPrefix, suffix);

                        const validated = await checkPathWithExtensions(potentialPath);
                        if (validated) {
                            return { path: validated, isAlias: true };
                        }
                    }
                }
            }
        }

        // 3. Handle Node Modules
        if (isNodeModule) {
            let currentDir = currentFilePath.split('\\').slice(0, -1).join('\\');
            const parts = currentDir.split('\\');

            for (let i = parts.length; i > 0; i--) {
                const dirPath = parts.slice(0, i).join('\\');
                const nodeModulesPath = `${dirPath}\\node_modules\\${importPath.split('/')[0]}`;

                const exists = await invoke<boolean>('path_exists', { path: nodeModulesPath });
                if (exists) return { path: nodeModulesPath, isAlias: false };
            }
        }

        return { path: null, isAlias: false };
    } catch (error) {
        console.error('[ImportValidation] Error resolving path:', error);
        return { path: null, isAlias: false };
    }
}

/**
 * Check if a path exists with various extensions
 */
async function checkPathWithExtensions(basePath: string): Promise<string | null> {
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.d.ts'];
    for (const ext of extensions) {
        const fullPath = basePath + ext;
        const exists = await invoke<boolean>('path_exists', { path: fullPath });
        if (exists) return fullPath;
    }

    const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const indexExt of indexExtensions) {
        const fullPath = basePath + indexExt;
        const exists = await invoke<boolean>('path_exists', { path: fullPath });
        if (exists) return fullPath;
    }

    return null;
}

export function useImportValidation({
    editor,
    filePath,
    content,
    monaco,
}: UseImportValidationOptions) {
    const decorationsRef = useRef<string[]>([]);
    const [tsConfig, setTsConfig] = useState<TsConfigPaths | null>(null);
    const [projectRoot, setProjectRoot] = useState<string | null>(null);

    // Defer the content used for validation to avoid blocking UI during typing
    // This allows the editor to remain responsive while validation runs in the background
    const deferredContent = useDeferredValue(content);

    // Load tsconfig when file changes (or initially)
    useEffect(() => {
        if (!filePath) return;

        const loadConfig = async () => {
            const root = await findProjectRoot(filePath);
            if (!root) return;
            setProjectRoot(root);

            // Use the backend command which we confirmed exists
            const configStr = await invoke<string | null>('load_tsconfig', { projectPath: root });
            if (configStr) {
                try {
                    const cleanJson = stripJsonComments(configStr);
                    const config = JSON.parse(cleanJson);

                    if (config.compilerOptions && config.compilerOptions.paths) {
                        setTsConfig({
                            baseUrl: config.compilerOptions.baseUrl || '.',
                            paths: config.compilerOptions.paths,
                        });
                        console.log('[ImportValidation] Loaded aliases:', config.compilerOptions.paths);
                    }
                } catch (e) {
                    console.error('[ImportValidation] Failed to parse tsconfig.json:', e);
                }
            }
        };

        loadConfig();
    }, [filePath]); // Reload if we switch to a file in a different project

    useEffect(() => {
        if (!editor || !filePath || !monaco || !deferredContent) return;

        const validateAndDecorate = async () => {
            const model = editor.getModel();
            if (!model) return;

            // Extract all imports from DEFERRED content
            const imports = extractImports(deferredContent);
            if (imports.length === 0) {
                decorationsRef.current = model.deltaDecorations(decorationsRef.current, []);
                return;
            }

            // Validate each import
            const validationResults = await Promise.all(
                imports.map(async (importInfo) => {
                    const result = await resolveModulePath(
                        importInfo.modulePath,
                        filePath,
                        importInfo.isRelative,
                        importInfo.isNodeModule,
                        tsConfig,
                        projectRoot
                    );

                    return {
                        importInfo,
                        exists: result.path !== null,
                        isAlias: result.isAlias
                    };
                })
            );

            // Create decorations based on validation results
            const newDecorations: editor.IModelDeltaDecoration[] = validationResults.map(
                ({ importInfo, exists, isAlias }) => {
                    let className: string;
                    let inlineClassName: string;
                    let hoverText: string;

                    if (exists) {
                        if (isAlias) {
                            // Alias (like @/...) - Distinct color (Purple/Magenta)
                            className = 'import-path-valid-alias';
                            inlineClassName = 'import-path-valid-alias-inline';
                            hoverText = '✓ Path alias resolved';
                        } else if (importInfo.isNodeModule) {
                            // Node module - Blue/Cyan
                            className = 'import-path-valid-node-module';
                            inlineClassName = 'import-path-valid-node-module-inline';
                            hoverText = '✓ Package found in node_modules';
                        } else {
                            // Relative path - Green
                            className = 'import-path-valid-relative';
                            inlineClassName = 'import-path-valid-relative-inline';
                            hoverText = '✓ Module found';
                        }
                    } else {
                        // Missing - Red
                        className = 'import-path-invalid';
                        inlineClassName = 'import-path-invalid-inline';
                        hoverText = `⚠️ Module not found: ${importInfo.modulePath}`;
                    }

                    return {
                        range: new monaco.Range(
                            importInfo.range.startLine,
                            importInfo.range.startCol,
                            importInfo.range.endLine,
                            importInfo.range.endCol
                        ),
                        options: {
                            inlineClassName,
                            className,
                            hoverMessage: { value: hoverText },
                        },
                    };
                }
            );

            // Apply decorations
            decorationsRef.current = model.deltaDecorations(decorationsRef.current, newDecorations);
        };

        // Run validation immediately on deferred content change
        // React handles the prioritization so we don't need manual debounce + setTimeout
        validateAndDecorate();

    }, [editor, filePath, deferredContent, monaco, tsConfig, projectRoot]); // Re-run when tsConfig loads

    // Clear decorations on unmount
    useEffect(() => {
        return () => {
            if (editor && decorationsRef.current.length > 0) {
                const model = editor.getModel();
                if (model) {
                    model.deltaDecorations(decorationsRef.current, []);
                }
            }
        };
    }, [editor]);
}
