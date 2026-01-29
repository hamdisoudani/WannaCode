/* ==========================================================================
   useEditor Hook - Editor Actions & Keyboard Shortcuts
   ========================================================================== */

import { useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useFileSystem } from './useFileSystem';

/**
 * Custom hook for editor-related actions and keyboard shortcuts
 */
export function useEditor() {
    const { openFiles, activeFilePath } = useAppStore();
    const { saveFile } = useFileSystem();

    /**
     * Save the currently active file
     */
    const saveActiveFile = useCallback(async () => {
        if (!activeFilePath) return;

        const activeFile = openFiles.find((f) => f.path === activeFilePath);
        if (!activeFile) return;

        try {
            await saveFile(activeFilePath, activeFile.content);
            console.log(`Saved: ${activeFilePath}`);
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    }, [activeFilePath, openFiles, saveFile]);

    /**
     * Save a specific file by path and content
     */
    const saveFileByPath = useCallback(async (path: string, content: string) => {
        try {
            await saveFile(path, content);
            console.log(`Saved: ${path}`);
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    }, [saveFile]);

    /**
     * Check if any files have unsaved changes
     */
    const hasUnsavedChanges = useCallback(() => {
        return openFiles.some((f) => f.isDirty);
    }, [openFiles]);

    /**
     * Get list of files with unsaved changes
     */
    const getUnsavedFiles = useCallback(() => {
        return openFiles.filter((f) => f.isDirty);
    }, [openFiles]);

    /**
     * Register global keyboard shortcuts
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S / Cmd+S - Save file
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveActiveFile();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveActiveFile]);

    return {
        saveActiveFile,
        saveFileByPath,
        hasUnsavedChanges,
        getUnsavedFiles,
    };
}
