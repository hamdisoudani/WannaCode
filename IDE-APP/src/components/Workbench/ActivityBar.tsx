/* ==========================================================================
   Activity Bar - Left icon strip (Explorer, Search, Settings)
   With toggle sidebar support
   ========================================================================== */

import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAuth } from '../../contexts/AuthContext';
import './ActivityBar.css';

export type ActivityBarView = 'explorer' | 'search';

interface ActivityBarProps {
  activeView: ActivityBarView;
  onViewChange: (view: ActivityBarView) => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const { isSidebarVisible, toggleSidebar, openSettings, activeFilePath, isAIPanelVisible, toggleAIPanel } = useAppStore();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle view click - if same view is clicked, toggle sidebar
  const handleViewClick = (view: ActivityBarView) => {
    if (activeView === view && isSidebarVisible) {
      // Same view clicked while visible -> hide sidebar
      toggleSidebar();
    } else if (activeView === view && !isSidebarVisible) {
      // Same view clicked while hidden -> show sidebar
      toggleSidebar();
    } else {
      // Different view clicked -> switch view and ensure sidebar is visible
      if (!isSidebarVisible) {
        toggleSidebar();
      }
      onViewChange(view);
    }
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
  };

  return (
    <div className="activity-bar">
      <div className="activity-bar__top">
        <ActivityBarItem
          icon={<ExplorerIcon />}
          label="Explorer"
          isActive={activeView === 'explorer' && isSidebarVisible}
          onClick={() => handleViewClick('explorer')}
        />
        <ActivityBarItem
          icon={<SearchIcon />}
          label="Search"
          isActive={activeView === 'search' && isSidebarVisible}
          onClick={() => handleViewClick('search')}
        />
        
        {/* AI Assistant */}
        <ActivityBarItem
          icon={<SparklesIcon />}
          label="AI Assistant (Ctrl+Shift+I)"
          isActive={isAIPanelVisible}
          onClick={toggleAIPanel}
        />
      </div>
      <div className="activity-bar__bottom">
        <ActivityBarItem
          icon={<SettingsIcon />}
          label="Settings (Ctrl+,)"
          isActive={activeFilePath === '::settings'}
          onClick={() => openSettings()}
        />
        
        {/* User Profile */}
        {user && (
          <div className="activity-bar__user-container">
            <button
              className="activity-bar__user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user.email || 'User'}
            >
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="activity-bar__avatar"
                />
              ) : (
                <div className="activity-bar__avatar-placeholder">
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </button>
            
            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div 
                  className="activity-bar__user-backdrop"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="activity-bar__user-menu">
                  <div className="activity-bar__user-info">
                    {user.user_metadata?.avatar_url && (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="Profile" 
                        className="activity-bar__menu-avatar"
                      />
                    )}
                    <div className="activity-bar__user-details">
                      <span className="activity-bar__user-name">
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </span>
                      <span className="activity-bar__user-email">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <div className="activity-bar__menu-divider" />
                  <button
                    className="activity-bar__menu-item activity-bar__menu-item--danger"
                    onClick={handleSignOut}
                  >
                    <SignOutIcon />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Activity Bar Item
   ------------------------------------------------------------------------- */

interface ActivityBarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ActivityBarItem({ icon, label, isActive, disabled, onClick }: ActivityBarItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className={`activity-bar__item ${isActive ? 'activity-bar__item--active' : ''} ${disabled ? 'activity-bar__item--disabled' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      title={label}
    >
      <span className="activity-bar__icon">{icon}</span>
      {isActive && <span className="activity-bar__indicator" />}
      
      {/* Tooltip */}
      {isHovered && (
        <span className="activity-bar__tooltip">{label}</span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function ExplorerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      <path d="M19 12l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
    </svg>
  );
}

