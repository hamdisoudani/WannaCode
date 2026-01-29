/* ==========================================================================
   useSettings Hook - React Integration for Settings Service
   
   Wraps the global Zustand store for backward compatibility and cleaner API.
   ========================================================================== */

import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { settings, type RecentEntry, type EditorSettings, type LLMSettings, type UISettings } from './index';

// -------------------------------------------------------------------------
// Recent Files/Folders Hook
// -------------------------------------------------------------------------

interface UseRecentEntriesReturn {
    recentFiles: RecentEntry[];
    recentFolders: RecentEntry[];
    isLoading: boolean;
    addRecentFile: (path: string, name: string) => Promise<void>;
    addRecentFolder: (path: string, name: string) => Promise<void>;
    removeEntry: (path: string, type: 'file' | 'folder') => Promise<void>;
    clearAll: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useRecentEntries(): UseRecentEntriesReturn {
    const store = useSettingsStore();

    return {
        recentFiles: store.recentFiles,
        recentFolders: store.recentFolders,
        isLoading: store.isLoading,
        addRecentFile: store.addRecentFile,
        addRecentFolder: store.addRecentFolder,
        removeEntry: store.removeRecentEntry,
        clearAll: store.clearRecentEntries,
        refresh: store.refreshRecentEntries,
    };
}

// -------------------------------------------------------------------------
// Editor Settings Hook
// -------------------------------------------------------------------------

interface UseEditorSettingsReturn {
    settings: EditorSettings;
    isLoading: boolean;
    updateSettings: (updates: Partial<EditorSettings>) => Promise<void>;
}

export function useEditorSettings(): UseEditorSettingsReturn {
    const { editorSettings, isLoading, updateEditorSettings } = useSettingsStore();

    return {
        settings: editorSettings,
        isLoading,
        updateSettings: updateEditorSettings,
    };
}

// -------------------------------------------------------------------------
// LLM Settings Hook (Future)
// -------------------------------------------------------------------------

interface UseLLMSettingsReturn {
    settings: LLMSettings;
    isLoading: boolean;
    updateSettings: (updates: Partial<LLMSettings>) => Promise<void>;
    isConfigured: boolean;
}

export function useLLMSettings(): UseLLMSettingsReturn {
    const { llmSettings, isLoading, updateLLMSettings } = useSettingsStore();

    // Check if LLM is properly configured
    const isConfigured = llmSettings.provider !== null && llmSettings.model !== null;

    return {
        settings: llmSettings,
        isLoading,
        updateSettings: updateLLMSettings,
        isConfigured,
    };
}

// -------------------------------------------------------------------------
// UI Settings Hook
// -------------------------------------------------------------------------

interface UseUISettingsReturn {
    settings: UISettings;
    isLoading: boolean;
    updateSettings: (updates: Partial<UISettings>) => Promise<void>;
}

export function useUISettings(): UseUISettingsReturn {
    const { uiSettings, isLoading, updateUISettings } = useSettingsStore();

    return {
        settings: uiSettings,
        isLoading,
        updateSettings: updateUISettings,
    };
}

// -------------------------------------------------------------------------
// Last Opened Project Hook
// -------------------------------------------------------------------------

// Keeps using direct service call as it's a one-time fetch usage usually

export function useLastOpenedProject(): { path: string | null; isLoading: boolean } {
    const [path, setPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        settings.getLastOpenedProject()
            .then(setPath)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    return { path, isLoading };
}
