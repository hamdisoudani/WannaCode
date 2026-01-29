/* ==========================================================================
   Tab Context Menu Component
   ========================================================================== */

import { useEffect, useRef } from 'react';
import './TabContextMenu.css';

interface TabContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  tabName: string;
}

export function TabContextMenu({ 
  x, 
  y, 
  onClose, 
  onCloseTab, 
  onCloseOthers, 
  onCloseAll,
  tabName 
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on window resize
    const handleResize = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleResize);
    };
  }, [onClose]);

  // Adjust position if menu goes off screen
  const style = {
    top:   Math.min(y, window.innerHeight - 150), // Prevent going off bottom
    left: Math.min(x, window.innerWidth - 180),   // Prevent going off right
  };

  return (
    <>
      <div className="tab-context-menu-overlay" onClick={onClose} />
      <div 
        ref={menuRef} 
        className="tab-context-menu" 
        style={style}
        onContextMenu={(e) => e.preventDefault()} // Prevent native menu on our menu
      >
        <div className="tab-context-menu__header">{tabName}</div>
        <div className="tab-context-menu__separator" />
        
        <button className="tab-context-menu__item" onClick={() => { onCloseTab(); onClose(); }}>
          Close
          <span className="tab-context-menu__shortcut">Ctrl+W</span>
        </button>
        
        <div className="tab-context-menu__separator" />
        
        <button className="tab-context-menu__item" onClick={() => { onCloseOthers(); onClose(); }}>
          Close Others
        </button>
        
        <button className="tab-context-menu__item" onClick={() => { onCloseAll(); onClose(); }}>
          Close All
        </button>
      </div>
    </>
  );
}
