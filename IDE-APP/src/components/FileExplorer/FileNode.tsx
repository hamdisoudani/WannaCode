/* ==========================================================================
   FileNode - Individual file/folder in the tree with inline creation
   VS Code-like behavior with indent guides and inline inputs
   ========================================================================== */

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import type { FileEntry } from '../../types';
import { useFileSystem } from '../../hooks/useFileSystem';
import { getFileIcon, ChevronRightIcon, ChevronDownIcon, isFolderDimmed, shouldCollapseByDefault, FileIcon, FolderIcon } from './icons';
import { useCreateContext } from '../Workbench/Sidebar';
import './FileNode.css';

interface FileNodeProps {
  entry: FileEntry;
  depth: number;
  onFileOpen: (path: string, name: string) => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export const FileNode = memo(function FileNode({ 
  entry, 
  depth, 
  onFileOpen, 
  selectedPath,
  onSelect 
}: FileNodeProps) {
  // Get creation context from Sidebar
  const createContext = useCreateContext();
  
  // Determine initial expanded state - collapse special folders by default
  const getInitialExpandedState = () => {
    if (entry.isDirectory && shouldCollapseByDefault(entry.name)) {
      return false;
    }
    return false; // All folders start collapsed
  };

  const [isExpanded, setIsExpanded] = useState(getInitialExpandedState);
  const [children, setChildren] = useState<FileEntry[] | null>(entry.children || null);
  const [isLoading, setIsLoading] = useState(false);
  const { expandDirectory } = useFileSystem();

  const isSelected = selectedPath === entry.path;
  const isDimmed = entry.isDirectory && isFolderDimmed(entry.name);
  
  // Check if we're creating in THIS folder
  const isCreatingHere = createContext?.creatingInPath === entry.path && entry.isDirectory;
  
  // Auto-expand folder when creating inside it
  useEffect(() => {
    if (isCreatingHere && !isExpanded) {
      setIsExpanded(true);
      // Load children if needed
      if (children === null) {
        expandDirectory(entry.path).then(setChildren);
      }
    }
  }, [isCreatingHere, isExpanded, children, entry.path, expandDirectory]);

  const handleClick = useCallback(async () => {
    // Always select on click
    onSelect(entry.path);

    if (entry.isDirectory) {
      // Toggle expansion
      if (!isExpanded && children === null) {
        // Load children if not loaded
        setIsLoading(true);
        try {
          const loadedChildren = await expandDirectory(entry.path);
          setChildren(loadedChildren);
        } catch (error) {
          console.error('Failed to expand directory:', error);
        } finally {
          setIsLoading(false);
        }
      }
      setIsExpanded(!isExpanded);
    } else {
      // Open file in editor
      onFileOpen(entry.path, entry.name);
    }
  }, [entry, isExpanded, children, expandDirectory, onFileOpen, onSelect]);

  const IconComponent = getFileIcon(entry.name, entry.isDirectory, isExpanded);
  
  // Calculate padding - 8px base + 20px per depth level
  const paddingLeft = 8 + depth * 20;
  
  // Calculate guide positions for this depth
  const guidePositions = Array.from({ length: depth }, (_, i) => 8 + i * 20 + 8);

  // Build class names
  const itemClasses = [
    'file-node__item',
    entry.isDirectory ? 'file-node__item--directory' : '',
    isSelected ? 'file-node__item--selected' : '',
    isDimmed ? 'file-node__item--dimmed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="file-node">
      {/* Indent guide lines */}
      {guidePositions.map((left, i) => (
        <div 
          key={i} 
          className="file-node__guide" 
          style={{ left: `${left}px` }}
        />
      ))}
      
      {/* Node Item */}
      <div 
        className={itemClasses}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
      >
        {/* Chevron for directories */}
        {entry.isDirectory && (
          <span className={`file-node__chevron ${isExpanded ? 'file-node__chevron--expanded' : ''}`}>
            {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </span>
        )}
        
        {/* Spacer for files (no chevron) */}
        {!entry.isDirectory && (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        
        {/* File/Folder Icon */}
        <span className="file-node__icon">
          <IconComponent size={18} />
        </span>
        
        {/* Name */}
        <span className="file-node__name">
          {entry.name}
        </span>
        
        {/* Loading indicator */}
        {isLoading && (
          <span className="file-node__loading">...</span>
        )}
      </div>

      {/* Children (recursive) + Inline Creation Input */}
      {entry.isDirectory && isExpanded && (
        <div className="file-node__children" style={{ '--guide-left': `${paddingLeft + 8}px` } as React.CSSProperties}>
          {/* Inline creation input - shows at top of children when creating here */}
          {isCreatingHere && createContext && (
            <InlineCreateInput
              type={createContext.isCreating!}
              depth={depth + 1}
              value={createContext.newItemName}
              onChange={createContext.setNewItemName}
              onSubmit={createContext.handleSubmit}
              onCancel={createContext.handleCancel}
            />
          )}
          
          {children?.map((child) => (
            <FileNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileOpen={onFileOpen}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
          
          {children?.length === 0 && !isCreatingHere && (
            <div 
              className="file-node__empty"
              style={{ paddingLeft: `${paddingLeft + 20}px` }}
            >
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* -------------------------------------------------------------------------
   Inline Create Input - VS Code style input inside the tree
   ------------------------------------------------------------------------- */

interface InlineCreateInputProps {
  type: 'file' | 'folder';
  depth: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function InlineCreateInput({ type, depth, value, onChange, onSubmit, onCancel }: InlineCreateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const paddingLeft = 8 + depth * 20;

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      if (value.trim()) {
        onSubmit();
      } else {
        onCancel();
      }
    }, 100);
  };

  return (
    <div 
      className="file-node__create-input"
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {/* Spacer for chevron alignment */}
      <span style={{ width: 16, flexShrink: 0 }} />
      
      <span className="file-node__icon">
        {type === 'file' ? <FileIcon size={18} /> : <FolderIcon size={18} />}
      </span>
      <input
        ref={inputRef}
        type="text"
        className="file-node__create-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={type === 'file' ? 'filename.ext' : 'folder name'}
      />
    </div>
  );
}
