/* ==========================================================================
   Settings Store - Zustand
   Provides reactive, global state for application settings
   ========================================================================== */

import { create } from 'zustand';
import { settings as settingsService } from '../services/settings';
import type { EditorSettings, LLMSettings, UISettings, RecentEntry } from '../services/settings';

interface SettingsStore {
    // State
    editorSettings: EditorSettings;
    llmSettings: LLMSettings;
    uiSettings: UISettings;
    recentFiles: RecentEntry[];
    recentFolders: RecentEntry[];
    isLoading: boolean;

    // Actions
    initialize: () => Promise<void>;
    updateEditorSettings: (updates: Partial<EditorSettings>) => Promise<void>;
    updateLLMSettings: (updates: Partial<LLMSettings>) => Promise<void>;
    updateUISettings: (updates: Partial<UISettings>) => Promise<void>;

    // Recent items actions
    addRecentFile: (path: string, name: string) => Promise<void>;
    addRecentFolder: (path: string, name: string) => Promise<void>;
    removeRecentEntry: (path: string, type: 'file' | 'folder') => Promise<void>;
    clearRecentEntries: () => Promise<void>;
    refreshRecentEntries: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    // Initial State
    editorSettings: {
        autoSave: false,
        autoSaveDelayMs: 1000,
        fontSize: 14,
        tabSize: 2,
        wordWrap: false,
        minimap: true,
        lineNumbers: true,
    },
    llmSettings: {
        provider: null,
        model: null,
        baseUrl: null,
        maxTokens: 4096,
        temperature: 0.7,
        streamResponses: true,
    },
    uiSettings: {
        theme: 'tokyo-night',
        sidebarPosition: 'left',
        activityBarVisible: true,
        statusBarVisible: true,
    },
    recentFiles: [],
    recentFolders: [],
    isLoading: true,

    // Initialize
    initialize: async () => {
        try {
            const [editor, llm, ui, files, folders] = await Promise.all([
                settingsService.getEditorSettings(),
                settingsService.getLLMSettings(),
                settingsService.getUISettings(),
                settingsService.getRecentFiles(),
                settingsService.getRecentFolders(),
            ]);

            set({
                editorSettings: editor,
                llmSettings: llm,
                uiSettings: ui,
                recentFiles: files,
                recentFolders: folders,
                isLoading: false,
            });
        } catch (error) {
            console.error('[SettingsStore] Initialization failed:', error);
            set({ isLoading: false });
        }
    },

    // Editor Settings
    updateEditorSettings: async (updates) => {
        // Optimistic update
        set((state) => ({ editorSettings: { ...state.editorSettings, ...updates } }));

        try {
            await settingsService.updateEditorSettings(updates);
        } catch (error) {
            console.error('[SettingsStore] Failed to update editor settings:', error);
        }
    },

    // LLM Settings
    updateLLMSettings: async (updates) => {
        set((state) => ({ llmSettings: { ...state.llmSettings, ...updates } }));
        try {
            await settingsService.updateLLMSettings(updates);
        } catch (error) {
            console.error('[SettingsStore] Failed to update LLM settings:', error);
        }
    },

    // UI Settings
    updateUISettings: async (updates) => {
        set((state) => ({ uiSettings: { ...state.uiSettings, ...updates } }));
        try {
            await settingsService.updateUISettings(updates);
        } catch (error) {
            console.error('[SettingsStore] Failed to update UI settings:', error);
        }
    },

    // Recent Entries
    addRecentFile: async (path, name) => {
        try {
            await settingsService.addRecentFile(path, name);
            await get().refreshRecentEntries();
        } catch (error) {
            console.error('Failed to add recent file:', error);
        }
    },

    addRecentFolder: async (path, name) => {
        try {
            await settingsService.addRecentFolder(path, name);
            await get().refreshRecentEntries();
        } catch (error) {
            console.error('Failed to add recent folder:', error);
        }
    },

    removeRecentEntry: async (path, type) => {
        try {
            await settingsService.removeRecentEntry(path, type);
            await get().refreshRecentEntries();
        } catch (error) {
            console.error('Failed to remove recent entry:', error);
        }
    },

    clearRecentEntries: async () => {
        try {
            await settingsService.clearRecentEntries();
            set({ recentFiles: [], recentFolders: [] });
        } catch (error) {
            console.error('Failed to clear recent entries:', error);
        }
    },

    refreshRecentEntries: async () => {
        try {
            const [files, folders] = await Promise.all([
                settingsService.getRecentFiles(),
                settingsService.getRecentFolders(),
            ]);
            set({ recentFiles: files, recentFolders: folders });
        } catch (error) {
            console.error('Failed to refresh recent entries:', error);
        }
    },
}));
