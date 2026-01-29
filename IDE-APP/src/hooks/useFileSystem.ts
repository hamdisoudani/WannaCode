/* ==========================================================================
   useFileSystem Hook - Tauri File System Operations
   ========================================================================== */

import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore';
import type { FileEntry, OpenFile } from '../types';
import { getLanguageFromPath } from '../types';
import { resetTypeDefinitions } from '../components/Editor/Editor';
import { settings } from '../services/settings';

export function useFileSystem() {
  const {
    projectPath,
    openProject,
    setFileTree,
    openFile: openFileInEditor,
    markFileSaved,
    hasDirtyFiles,
  } = useAppStore(useShallow((state) => ({
    projectPath: state.projectPath,
    openProject: state.openProject,
    setFileTree: state.setFileTree,
    openFile: state.openFile,
    markFileSaved: state.markFileSaved,
    hasDirtyFiles: state.hasDirtyFiles,
  })));

  /**
   * Open a folder as a new project
   * This will close all open files and reset the workspace
   */
  const openFolder = useCallback(async (folderPath: string, force = false) => {
    // Check for unsaved files
    if (!force && hasDirtyFiles()) {
      // In a real app, you'd show a confirmation dialog here
      // For now, we'll just log a warning
      console.warn('Opening new project with unsaved files');
    }

    try {
      // Reset type definitions when switching projects
      resetTypeDefinitions();

      const entries = await invoke<FileEntry[]>('read_directory', {
        path: folderPath,
        depth: 1,
        showIgnored: false, // Hide node_modules, dist, etc. by default
      });

      // Use openProject to reset workspace state
      openProject(folderPath, entries);

      // Track in recent folders (async, non-blocking)
      const folderName = folderPath.split(/[\\/]/).pop() || folderPath;
      settings.addRecentFolder(folderPath, folderName).catch(err => {
        console.warn('[useFileSystem] Failed to track recent folder:', err);
      });

      return entries;
    } catch (error) {
      console.error('Failed to open folder:', error);
      throw error;
    }
  }, [openProject, hasDirtyFiles]);

  /**
   * Refresh the current project's file tree without closing files
   */
  const refreshFileTree = useCallback(async (showIgnored = false) => {
    if (!projectPath) return;

    try {
      const entries = await invoke<FileEntry[]>('read_directory', {
        path: projectPath,
        depth: 1,
        showIgnored,
      });

      setFileTree(entries);
      return entries;
    } catch (error) {
      console.error('Failed to refresh file tree:', error);
      throw error;
    }
  }, [projectPath, setFileTree]);

  /**
   * Expand a directory and load its children
   */
  const expandDirectory = useCallback(async (dirPath: string, showIgnored = false): Promise<FileEntry[]> => {
    try {
      const entries = await invoke<FileEntry[]>('read_directory', {
        path: dirPath,
        depth: 1,
        showIgnored,
      });
      return entries;
    } catch (error) {
      console.error('Failed to expand directory:', error);
      throw error;
    }
  }, []);

  /**
   * Read a file and open it in the editor
   */
  const openFile = useCallback(async (filePath: string, fileName: string) => {
    try {
      const content = await invoke<string>('read_file', { path: filePath });

      const file: OpenFile = {
        path: filePath,
        name: fileName,
        content,
        originalContent: content, // Track original content for dirty detection
        language: getLanguageFromPath(filePath),
        isDirty: false,
      };

      openFileInEditor(file);

      // Track in recent files (async, non-blocking)
      settings.addRecentFile(filePath, fileName).catch(err => {
        console.warn('[useFileSystem] Failed to track recent file:', err);
      });

      return file;
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }, [openFileInEditor]);

  /**
   * Save file content to disk
   */
  const saveFile = useCallback(async (filePath: string, content: string) => {
    try {
      await invoke('write_file', { path: filePath, content });
      markFileSaved(filePath, content);
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  }, [markFileSaved]);

  /**
   * Create a new file
   */
  const createFile = useCallback(async (filePath: string) => {
    try {
      await invoke('create_file', { path: filePath });
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  }, []);

  /**
   * Create a new directory
   */
  const createDirectory = useCallback(async (dirPath: string) => {
    try {
      await invoke('create_directory', { path: dirPath });
    } catch (error) {
      console.error('Failed to create directory:', error);
      throw error;
    }
  }, []);

  /**
   * Delete a file or directory
   */
  const deleteEntry = useCallback(async (entryPath: string) => {
    try {
      await invoke('delete_entry', { path: entryPath });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    }
  }, []);

  /**
   * Rename a file or directory
   */
  const renameEntry = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await invoke('rename_entry', { oldPath, newPath });
    } catch (error) {
      console.error('Failed to rename entry:', error);
      throw error;
    }
  }, []);

  return {
    openFolder,
    refreshFileTree,
    expandDirectory,
    openFile,
    saveFile,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
  };
}
