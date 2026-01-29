/* ==========================================================================
   useTypeScript - Load tsconfig and type definitions for Monaco IntelliSense
   ========================================================================== */

import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TypeLibrary {
  path: string;
  content: string;
}

interface TsConfig {
  compilerOptions?: {
    target?: string;
    module?: string;
    moduleResolution?: string;
    jsx?: string;
    strict?: boolean;
    esModuleInterop?: boolean;
    skipLibCheck?: boolean;
    allowSyntheticDefaultImports?: boolean;
    resolveJsonModule?: boolean;
    isolatedModules?: boolean;
    noEmit?: boolean;
    lib?: string[];
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
  include?: string[];
  exclude?: string[];
}

// Monaco instance type (using any to avoid deprecated type issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Monaco = any;

// Map tsconfig target to Monaco ScriptTarget values
function getScriptTarget(target?: string): number {
  const targetMap: Record<string, number> = {
    'es3': 0,
    'es5': 1,
    'es6': 2,
    'es2015': 2,
    'es2016': 3,
    'es2017': 4,
    'es2018': 5,
    'es2019': 6,
    'es2020': 7,
    'es2021': 8,
    'es2022': 9,
    'esnext': 99,
  };
  return targetMap[target?.toLowerCase() || 'es2020'] ?? 7;
}

// Map tsconfig jsx to Monaco JsxEmit values
function getJsxEmit(jsx?: string): number {
  const jsxMap: Record<string, number> = {
    'preserve': 1,
    'react': 2,
    'react-native': 3,
    'react-jsx': 4,
    'react-jsxdev': 5,
  };
  return jsxMap[jsx?.toLowerCase() || 'react-jsx'] ?? 4;
}

// Map tsconfig module to Monaco ModuleKind values
function getModuleKind(module?: string): number {
  const moduleMap: Record<string, number> = {
    'none': 0,
    'commonjs': 1,
    'amd': 2,
    'umd': 3,
    'system': 4,
    'es6': 5,
    'es2015': 5,
    'es2020': 6,
    'es2022': 7,
    'esnext': 99,
    'node16': 100,
    'nodenext': 199,
  };
  return moduleMap[module?.toLowerCase() || 'esnext'] ?? 99;
}

export function useTypeScript() {
  const loadedLibsRef = useRef<Set<string>>(new Set());
  const isConfiguredRef = useRef(false);

  /**
   * Configure Monaco TypeScript with project's tsconfig.json
   */
  const configureTypeScript = useCallback(async (
    monaco: Monaco,
    projectPath: string
  ) => {
    if (isConfiguredRef.current) return;

    try {
      // Load tsconfig.json
      const tsconfigStr = await invoke<string | null>('load_tsconfig', { projectPath });
      
      let tsconfig: TsConfig = {};
      if (tsconfigStr) {
        try {
          tsconfig = JSON.parse(tsconfigStr);
        } catch {
          console.warn('Failed to parse tsconfig.json');
        }
      }

      const opts = tsconfig.compilerOptions || {};
      const ts = monaco.languages.typescript;

      // Configure TypeScript compiler options
      ts.typescriptDefaults.setCompilerOptions({
        target: getScriptTarget(opts.target),
        module: getModuleKind(opts.module),
        moduleResolution: 2, // NodeJs
        jsx: getJsxEmit(opts.jsx),
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
        strict: opts.strict ?? true,
        esModuleInterop: opts.esModuleInterop ?? true,
        skipLibCheck: opts.skipLibCheck ?? true,
        allowSyntheticDefaultImports: opts.allowSyntheticDefaultImports ?? true,
        resolveJsonModule: opts.resolveJsonModule ?? true,
        isolatedModules: opts.isolatedModules ?? true,
        noEmit: true,
        lib: opts.lib,
      });

      // Configure JavaScript defaults similarly
      ts.javascriptDefaults.setCompilerOptions({
        target: getScriptTarget(opts.target),
        module: getModuleKind(opts.module),
        moduleResolution: 2, // NodeJs
        jsx: getJsxEmit(opts.jsx),
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
      });

      // Disable Monaco's semantic validation - LSP provides diagnostics
      ts.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: true,
      });

      // Enable eager model sync for better performance
      ts.typescriptDefaults.setEagerModelSync(true);

      isConfiguredRef.current = true;
      console.log('TypeScript configured with project settings');
    } catch (error) {
      console.error('Failed to configure TypeScript:', error);
    }
  }, []);

  /**
   * Load type definitions from node_modules/@types
   */
  const loadTypeDefinitions = useCallback(async (
    monaco: Monaco,
    projectPath: string
  ) => {
    try {
      const libraries = await invoke<TypeLibrary[]>('load_type_definitions', { projectPath });
      const ts = monaco.languages.typescript;
      
      for (const lib of libraries) {
        if (!loadedLibsRef.current.has(lib.path)) {
          ts.typescriptDefaults.addExtraLib(lib.content, lib.path);
          ts.javascriptDefaults.addExtraLib(lib.content, lib.path);
          loadedLibsRef.current.add(lib.path);
        }
      }

      console.log(`Loaded ${libraries.length} type definitions`);
    } catch (error) {
      console.error('Failed to load type definitions:', error);
    }
  }, []);

  /**
   * Load types for a specific package
   */
  const loadPackageTypes = useCallback(async (
    monaco: Monaco,
    projectPath: string,
    packageName: string
  ) => {
    const cacheKey = `${projectPath}:${packageName}`;
    if (loadedLibsRef.current.has(cacheKey)) return;

    try {
      const lib = await invoke<TypeLibrary | null>('load_package_types', { 
        projectPath, 
        packageName 
      });
      
      if (lib) {
        const ts = monaco.languages.typescript;
        ts.typescriptDefaults.addExtraLib(lib.content, lib.path);
        ts.javascriptDefaults.addExtraLib(lib.content, lib.path);
        loadedLibsRef.current.add(cacheKey);
        console.log(`Loaded types for ${packageName}`);
      }
    } catch (error) {
      console.error(`Failed to load types for ${packageName}:`, error);
    }
  }, []);

  /**
   * Reset TypeScript configuration (when switching projects)
   */
  const resetTypeScript = useCallback(() => {
    loadedLibsRef.current.clear();
    isConfiguredRef.current = false;
  }, []);

  return {
    configureTypeScript,
    loadTypeDefinitions,
    loadPackageTypes,
    resetTypeScript,
  };
}
