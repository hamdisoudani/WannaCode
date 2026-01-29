/* ==========================================================================
   FileExplorer - Tree view of project files
   Click on empty area to deselect
   ========================================================================== */

import { useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileNode } from './FileNode';
import './FileExplorer.css';

interface FileExplorerProps {
  selectedPath: string | null;
  onSelectPath: (path: string | null) => void;
}

export function FileExplorer({ selectedPath, onSelectPath }: FileExplorerProps) {
  const fileTree = useAppStore((state) => state.fileTree);
  const { openFile } = useFileSystem();

  const handleFileOpen = useCallback((filePath: string, fileName: string) => {
    openFile(filePath, fileName);
  }, [openFile]);

  const handleSelect = useCallback((path: string) => {
    onSelectPath(path);
  }, [onSelectPath]);

  // Click on empty area to deselect
  const handleEmptyClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking directly on the container (not bubbled from child)
    if (e.target === e.currentTarget) {
      onSelectPath(null);
    }
  }, [onSelectPath]);

  return (
    <div className="file-explorer" onClick={handleEmptyClick}>
      {/* File Tree */}
      <div className="file-explorer__tree">
        {fileTree.map((entry) => (
          <FileNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileOpen={handleFileOpen}
            selectedPath={selectedPath}
            onSelect={handleSelect}
          />
        ))}
      </div>
      
      {/* Clickable empty area at bottom */}
      <div className="file-explorer__empty-area" onClick={() => onSelectPath(null)} />
    </div>
  );
}
