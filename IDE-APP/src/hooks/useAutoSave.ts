/* ==========================================================================
   useAutoSave Hook - Handles automatic saving of dirty files
   ========================================================================== */

import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useEditorSettings } from '../services/settings/hooks';
import { useEditor } from './useEditor';

export function useAutoSave() {
    const { openFiles } = useAppStore();
    const { settings } = useEditorSettings();
    const { saveFileByPath } = useEditor();

    useEffect(() => {
        if (!settings.autoSave) return;

        // Filter for real files that are dirty
        const dirtyFiles = openFiles.filter(f => f.isDirty && !f.path.startsWith('::'));

        if (dirtyFiles.length === 0) return;

        const timeoutId = setTimeout(() => {
            console.log(`[AutoSave] Saving ${dirtyFiles.length} dirty files...`);
            dirtyFiles.forEach(async (file) => {
                try {
                    await saveFileByPath(file.path, file.content);
                } catch (error) {
                    console.error(`[AutoSave] Failed to save ${file.path}:`, error);
                }
            });
        }, settings.autoSaveDelayMs);

        return () => clearTimeout(timeoutId);
    }, [openFiles, settings.autoSave, settings.autoSaveDelayMs, saveFileByPath]);
}
