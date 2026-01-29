/* ==========================================================================
   useFileWatcher Hook - External File Change Detection
   ========================================================================== */

import { useEffect, useRef } from 'react';
import { watch } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../stores/appStore';

export function useFileWatcher() {
    const { openFiles, updateFileContent } = useAppStore();
    const watchersRef = useRef<Map<string, () => void>>(new Map());

    // Re-sync watchers when openFiles changes
    useEffect(() => {
        const syncWatchers = async () => {
            const currentPaths = new Set(openFiles.map(f => f.path));

            // Remove watchers for closed files
            for (const [path, unwatch] of watchersRef.current.entries()) {
                if (!currentPaths.has(path)) {
                    unwatch();
                    watchersRef.current.delete(path);
                    console.log(`[FileWatcher] Stopped watching: ${path}`);
                }
            }

            // Add watchers for new files
            for (const file of openFiles) {
                if (!watchersRef.current.has(file.path)) {
                    try {
                        console.log(`[FileWatcher] Starting watch on: ${file.path}`);

                        // We need to handle the promise returned by watch
                        const unwatch = await watch(
                            file.path,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            async (event: any) => {
                                console.log(`[FileWatcher] Event for ${file.path}:`, event);

                                // Check if the event indicates a modification
                                // debounced event doesn't give type "Write" directly?
                                // It usually gives a list of events.

                                // For simplicity, if we get an event, we check the content on disk
                                const fileEntry = useAppStore.getState().openFiles.find(f => f.path === file.path);

                                if (!fileEntry) return;

                                try {
                                    const diskContent = await invoke<string>('read_file', { path: file.path });

                                    if (diskContent !== fileEntry.content) {
                                        if (fileEntry.isDirty) {
                                            // TODO: Prompt user? For now, we log collision.
                                            console.warn(`[FileWatcher] Conflict! External change on dirty file: ${file.path}`);
                                            // We could add a "conflict" state to the file in the store
                                        } else {
                                            // Safe to auto-reload
                                            console.log(`[FileWatcher] Auto-reloading: ${file.path}`);
                                            updateFileContent(file.path, diskContent);
                                            // Mark as saved since it matches disk (unless we want to preserve cursor? updateFileContent preserves cursor conceptually if just value changes)
                                            // Actually updateFileContent marks it as dirty if different from original.
                                            // We need to update originalContent AND content.
                                            useAppStore.getState().markFileSaved(file.path, diskContent);
                                        }
                                    }
                                } catch (err) {
                                    console.error(`[FileWatcher] Failed to read file on change: ${file.path}`, err);
                                }
                            },
                            { delayMs: 1000 } // Debounce 1s
                        );

                        watchersRef.current.set(file.path, unwatch);
                    } catch (err) {
                        console.error(`[FileWatcher] Failed to watch ${file.path}:`, err);
                    }
                }
            }
        };

        syncWatchers();

        // Cleanup all on unmount
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            watchersRef.current.forEach(unwatch => unwatch());
            watchersRef.current.clear();
        };
    }, [openFiles.map(f => f.path).join(',')]); // Depend on paths list
}
