import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDebouncedCallback } from 'use-debounce';
import { useAppStore } from '../../stores/appStore';
import { getFileIcon } from '../FileExplorer/icons';
import './SearchPanel.css';

interface SearchResult {
  file: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

interface GroupedResults {
  [filePath: string]: SearchResult[];
}

export function SearchPanel() {
  const { projectPath, openFile } = useAppStore();
  
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GroupedResults>({});
  const [resultCount, setResultCount] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !projectPath) {
        setResults({});
        setResultCount(0);
        return;
    }

    setIsSearching(true);
    // don't clear results immediately to avoid flicker? actually better to clear or show loading overlay
    // setResults({}); 
    
    try {
      console.time('search');
      const searchOptions = {
        query: searchQuery,
        path: projectPath,
        is_regex: isRegex,
        is_case_sensitive: isCaseSensitive,
        is_whole_word: isWholeWord,
        exclude: [],
        include: [],
        max_results: 2000
      };

      const searchResults = await invoke<SearchResult[]>('search_in_files', {
        options: searchOptions
      });
      console.timeEnd('search');

      // Group results by file
      const grouped: GroupedResults = {};
      searchResults.forEach(result => {
        if (!grouped[result.file]) {
          grouped[result.file] = [];
        }
        grouped[result.file].push(result);
      });

      setResults(grouped);
      setResultCount(searchResults.length);
      
      if (Object.keys(grouped).length < 20) {
        setExpandedFiles(new Set(Object.keys(grouped)));
      } else {
        setExpandedFiles(new Set());
      }
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, 400); // 400ms delay

  // Trigger search when dependencies change
  useEffect(() => {
    if (query.trim()) {
        debouncedSearch(query);
    } else {
        setResults({});
        setResultCount(0);
    }
  }, [query, isRegex, isCaseSensitive, isWholeWord, debouncedSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      debouncedSearch(query);
    }
  };

  const toggleFileExpand = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const handleResultClick = (result: SearchResult) => {
    openFile({
      path: result.file,
      name: result.file.split(/[\\/]/).pop() || '',
      language: 'typescript', // Basic default, real logic is in Editor
      content: '', // Will load
      isDirty: false,
      originalContent: ''
    });
    
    // Dispatch event to scroll to line
    // We need a small timeout to allow editor to open/mount
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-to-line', { 
            detail: { 
                line: result.line_number,
                column: result.match_start + 1 
            } 
        }));
    }, 100);
  };

  return (
    <div className="search-panel">
      <div className="search-panel__header">
        <h2 className="search-panel__title">Search</h2>
      </div>

      <div className="search-panel__input-container">
        <div className="search-panel__input-wrapper">
          <input
            ref={searchInputRef}
            className="search-panel__input"
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="search-panel__input-actions">
            <button 
                className={`search-action-btn ${isCaseSensitive ? 'active' : ''}`}
                onClick={() => setIsCaseSensitive(!isCaseSensitive)}
                title="Match Case (Alt+C)"
            >
                Aa
            </button>
            <button 
                className={`search-action-btn ${isWholeWord ? 'active' : ''}`}
                onClick={() => setIsWholeWord(!isWholeWord)}
                title="Match Whole Word (Alt+W)"
            >
                ab
            </button>
            <button 
                className={`search-action-btn ${isRegex ? 'active' : ''}`}
                onClick={() => setIsRegex(!isRegex)}
                title="Use Regular Expression (Alt+R)"
            >
                .*
            </button>
          </div>
        </div>
      </div>

      <div className="search-panel__results-info">
        {isSearching ? (
             <span className="search-panel__loading">Searching...</span>
        ) : resultCount > 0 ? (
            <span>{resultCount} results in {Object.keys(results).length} files</span>
        ) : query && !isSearching ? (
            <span>No results found.</span>
        ) : null}
      </div>

      <div className="search-panel__results-list">
        {Object.entries(results).map(([filePath, fileResults]) => {
            const fileName = filePath.split(/[\\/]/).pop() || '';
            const relativePath = filePath.replace(projectPath || '', '');
            const Icon = getFileIcon(fileName, false);
            const isExpanded = expandedFiles.has(filePath);

            return (
                <div key={filePath} className="search-result-group">
                    <div 
                        className="search-result-file" 
                        onClick={() => toggleFileExpand(filePath)}
                    >
                        <span className={`search-result-arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
                        <Icon size={14} className="search-result-icon" />
                        <span className="search-result-filename">{fileName}</span>
                        <span className="search-result-path" title={filePath}>{relativePath}</span>
                        <span className="search-result-badge">{fileResults.length}</span>
                    </div>
                    
                    {isExpanded && (
                        <div className="search-result-matches">
                            {fileResults.map((result, idx) => (
                                <div 
                                    key={idx} 
                                    className="search-result-match"
                                    onClick={() => handleResultClick(result)}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleResultClick(result);
                                        }
                                    }}
                                >
                                    <span className="search-result-line-num">{result.line_number}:</span>
                                    <span className="search-result-code">
                                        {result.line_content.substring(0, Math.min(result.match_start, 100))}
                                        <span className="search-result-highlight">
                                            {result.line_content.substring(result.match_start, result.match_end)}
                                        </span>
                                        {result.line_content.substring(result.match_end)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}
