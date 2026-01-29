/* ==========================================================================
   useWindowClosePrevention Hook
   ========================================================================== */

import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../stores/appStore';

export function useWindowClosePrevention() {
    const { openFiles, markFileSaved } = useAppStore();
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

    const dirtyFiles = openFiles.filter(f => f.isDirty);

    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const setupListener = async () => {
            // Listen for window close requests
            unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
                const hasDirty = useAppStore.getState().hasDirtyFiles();

                if (hasDirty) {
                    // Prevent close and show dialog
                    event.preventDefault();
                    setShowUnsavedDialog(true);
                }
                // If no dirty files, let it close normally
            });
        };

        setupListener();

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const handleSaveAll2 = useCallback(async () => {
        const dirty = useAppStore.getState().openFiles.filter(f => f.isDirty);

        try {
            // Save all dirty files
            await Promise.all(dirty.map(async (file) => {
                await invoke('write_file', { path: file.path, content: file.content });
                markFileSaved(file.path, file.content);
            }));

            // Close window
            setShowUnsavedDialog(false);
            await getCurrentWindow().close();
        } catch (error) {
            console.error('Failed to save files:', error);
            // Keep dialog open if save fails (maybe show error - tricky without toast)
        }
    }, [markFileSaved]);

    const handleDiscardAll = useCallback(async () => {
        // Just close the window, ignoring changes
        setShowUnsavedDialog(false);

        // We need to unlisten or bypass the check. 
        // Since we preventDefault inside the listener, recursively calling close() triggers it again?
        // The Tauri docs say `close()` emits `closeRequested`.
        // We should probably remove the checking logic or have a flag.

        // Easiest hack: Clean up dirty state in store so the check passes.
        // Or, we can use `getCurrentWindow().destroy()` to force close.
        // But safely, let's just use destroy() as it bypasses checks usually?
        // Docs say: "To force close, use destroy()."

        await getCurrentWindow().destroy();
    }, []);

    const handleCancel = useCallback(() => {
        setShowUnsavedDialog(false);
    }, []);

    return {
        showUnsavedDialog,
        dirtyFiles,
        handleSaveAll: handleSaveAll2,
        handleDiscardAll,
        handleCancel
    };
}
