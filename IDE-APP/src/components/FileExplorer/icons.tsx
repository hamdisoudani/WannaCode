/* ==========================================================================
   File Icons - SVG icons for common file types and special folders
   VS Code-style clean folder icons
   ========================================================================== */

import type { FC, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const iconStyle = (size: number = 16): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'currentColor',
});

// -------------------------------------------------------------------------
// VS Code-style Folder Icons - Clean, modern design
// -------------------------------------------------------------------------

// Default folder (closed) - Clean blue
export const FolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#90a4ae"
      stroke="#78909c"
      strokeWidth="0.3"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#b0bec5"
    />
  </svg>
);

// Folder open - Lighter shade
export const FolderOpenIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .39.08.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75V5H1V2.5z" 
      fill="#90a4ae"
    />
    <path 
      d="M0.5 5.5h13.5l-1.5 8H2L0.5 5.5z" 
      fill="#cfd8dc"
      stroke="#b0bec5"
      strokeWidth="0.3"
    />
  </svg>
);

// Node Modules - Green package
export const NodeModulesIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#81c784"
      opacity="0.7"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#a5d6a7"
      opacity="0.7"
    />
  </svg>
);

// Git folder - Orange/Red
export const GitFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#ef5350"
      opacity="0.8"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#e57373"
      opacity="0.8"
    />
  </svg>
);

// Src folder - Blue with code icon
export const SrcFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#42a5f5"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#64b5f6"
    />
    <path d="M5.5 8L7 9.5L5.5 11M10.5 8L9 9.5L10.5 11" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none"/>
  </svg>
);

// Public/Assets folder - Amber/Orange
export const PublicFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#ffb74d"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#ffcc80"
    />
  </svg>
);

// Components folder - Purple
export const ComponentsFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#ab47bc"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#ba68c8"
    />
  </svg>
);

// Hooks folder - Cyan
export const HooksFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#26c6da"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#4dd0e1"
    />
  </svg>
);

// Styles folder - Pink
export const StylesFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#ec407a"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#f06292"
    />
  </svg>
);

// Utils/Lib folder - Teal
export const UtilsFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#26a69a"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#4db6ac"
    />
  </svg>
);

// Types folder - Deep Blue
export const TypesFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#5c6bc0"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#7986cb"
    />
  </svg>
);

// Test folder - Green
export const TestFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#66bb6a"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#81c784"
    />
    <path d="M5.5 9.5L7 11L10.5 7.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

// Config/Settings folder - Gray
export const ConfigFolderIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path 
      d="M1.75 2.5A.75.75 0 0 1 2.5 1.75h4.086c.199 0 .389.079.53.22l1.414 1.414H13.5a.75.75 0 0 1 .75.75v9.12a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V2.5z" 
      fill="#78909c"
    />
    <path 
      d="M2 5h12v8.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V5z" 
      fill="#90a4ae"
    />
  </svg>
);

// -------------------------------------------------------------------------
// TypeScript / JavaScript Icons
// -------------------------------------------------------------------------

export const TypeScriptIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#3178c6"/>
    <path d="M5.5 10V7h2v6h-1.5v-3H4.5V7h1z M9 8.5h2.5V10H9v1.5h2.5V13H7.5V8.5a1.5 1.5 0 0 1 1.5-1.5z" fill="white"/>
  </svg>
);

export const JavaScriptIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e"/>
    <path d="M5 10.5V8h1.5v5H5v-2.5zM8.5 8H11v1.5H9v1H11V13H8.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="#323330"/>
  </svg>
);

// -------------------------------------------------------------------------
// React Icons
// -------------------------------------------------------------------------

export const ReactIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="2.5" fill="#61dafb"/>
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" strokeWidth="1" fill="none"/>
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" strokeWidth="1" fill="none" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" strokeWidth="1" fill="none" transform="rotate(120 12 12)"/>
  </svg>
);

// -------------------------------------------------------------------------
// Rust Icon
// -------------------------------------------------------------------------

export const RustIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <circle cx="8" cy="8" r="7" fill="#dea584"/>
    <path d="M8 3.5L8.5 5.5H7.5L8 3.5zM8 12.5L7.5 10.5H8.5L8 12.5zM3.5 8L5.5 7.5V8.5L3.5 8zM12.5 8L10.5 8.5V7.5L12.5 8z" fill="#1e1e2e"/>
    <circle cx="8" cy="8" r="3" stroke="#1e1e2e" strokeWidth="1.5" fill="none"/>
  </svg>
);

// -------------------------------------------------------------------------
// JSON Icon
// -------------------------------------------------------------------------

export const JsonIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#f9e2af"/>
    <text x="8" y="11" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#1e1e2e">{'{}'}</text>
  </svg>
);

// -------------------------------------------------------------------------
// HTML Icon
// -------------------------------------------------------------------------

export const HtmlIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#e34c26"/>
    <text x="8" y="11" fontSize="6" fontWeight="bold" textAnchor="middle" fill="white">{'<>'}</text>
  </svg>
);

// -------------------------------------------------------------------------
// CSS Icon
// -------------------------------------------------------------------------

export const CssIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#264de4"/>
    <text x="8" y="11" fontSize="6" fontWeight="bold" textAnchor="middle" fill="white">#</text>
  </svg>
);

// -------------------------------------------------------------------------
// Markdown Icon
// -------------------------------------------------------------------------

export const MarkdownIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#083fa1" stroke="#519aba" strokeWidth="0.5"/>
    <path d="M4 6v4l2-2 2 2V6M10 6v4M10 8h2" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// -------------------------------------------------------------------------
// TOML Icon
// -------------------------------------------------------------------------

export const TomlIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#9c4221"/>
    <text x="8" y="11" fontSize="5" fontWeight="bold" textAnchor="middle" fill="white">TOML</text>
  </svg>
);

// -------------------------------------------------------------------------
// Python Icon
// -------------------------------------------------------------------------

export const PythonIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#3776ab"/>
    <path d="M8 3C5.5 3 5.5 4.5 5.5 4.5V6H8v.5H4.5S3 6.5 3 8.5 4.5 10.5 4.5 10.5H6V9s0-1.5 2-1.5h3s1.5 0 1.5-1.5V4.5S12.5 3 8 3zM6.5 4a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1z" fill="#ffd43b"/>
    <path d="M8 13c2.5 0 2.5-1.5 2.5-1.5V10H8v-.5h3.5s1.5 0 1.5-2-1.5-2-1.5-2H10v1.5s0 1.5-2 1.5H5s-1.5 0-1.5 1.5v1.5S3.5 13 8 13zm1.5-1a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z" fill="#ffd43b"/>
  </svg>
);

// -------------------------------------------------------------------------
// YAML Icon
// -------------------------------------------------------------------------

export const YamlIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e"/>
    <text x="8" y="11" fontSize="5" fontWeight="bold" textAnchor="middle" fill="white">YML</text>
  </svg>
);

// -------------------------------------------------------------------------
// SVG Icon
// -------------------------------------------------------------------------

export const SvgIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#ffb13b"/>
    <circle cx="6" cy="8" r="2" fill="#1e1e2e"/>
    <rect x="9" y="6" width="3" height="4" fill="#1e1e2e"/>
  </svg>
);

// -------------------------------------------------------------------------
// Image Icon
// -------------------------------------------------------------------------

export const ImageIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="2" width="14" height="12" rx="1" fill="#73daca"/>
    <circle cx="5" cy="6" r="1.5" fill="#fff"/>
    <path d="M1 12L5 8L8 11L11 7L15 12V13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V12z" fill="#2ac3de"/>
  </svg>
);

// -------------------------------------------------------------------------
// Shell/Bash Icon
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Shell/Bash Icon
// -------------------------------------------------------------------------

export const PowerShellIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path d="M14 8h-3v5h3V8zm-4 5H7v-4h3v4zm-7 0h3v-3H3v3z" fill="#012456"/>
    <path d="M1 1h14v14H1V1z" fill="none"/>
    <path d="M3.5 4.5l3 3-3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M8.5 10.5h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

export const CmdIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="2" width="14" height="11" rx="1" fill="#4d4d4d"/>
    <path d="M4 5.5h8M4 7.5h5M4 9.5h8" stroke="#fff" strokeWidth="1" strokeLinecap="round"/>
    <path d="M2.5 3h2" stroke="#fff" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export const BashIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#293134"/>
    <path d="M3.5 5L6.5 8L3.5 11" stroke="#42b983" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M8 11H12.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

export const TerminalIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path d="M6 9l1.5-1.5L6 6l-1 1 .5.5-1 1 .5.5.5-.5 1 1-.5.5z" stroke="currentColor" fill="none"/>
    <path d="M7 11h4v1H7v-1z" stroke="currentColor" fill="currentColor"/>
    <path fillRule="evenodd" d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11z"/>
  </svg>
);

// Fallback shell icon used in file explorer
export const ShellIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#4d5a5e"/>
    <path d="M4 6L7 8L4 10M8 11H12" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

// -------------------------------------------------------------------------
// Config Icon (for .env, .gitignore, etc.)
// -------------------------------------------------------------------------

export const ConfigIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path d="M4 1h5l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="#565f89"/>
    <circle cx="8" cy="9" r="2" fill="none" stroke="#c0caf5" strokeWidth="0.8"/>
    <circle cx="8" cy="9" r="0.6" fill="#c0caf5"/>
  </svg>
);

// Settings Icon (for the Settings tab)
export const SettingsIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props} viewBox="0 0 24 24">
    <defs>
      <linearGradient id="settings-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7aa2f7" />
        <stop offset="100%" stopColor="#bb9af7" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="3" stroke="url(#settings-icon-grad)" strokeWidth="2" fill="none"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="url(#settings-icon-grad)" strokeWidth="1.5" fill="none"/>
  </svg>
);

// -------------------------------------------------------------------------
// Lock Icon (for package-lock, yarn.lock)
// -------------------------------------------------------------------------

export const LockIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#f9e2af"/>
    <rect x="5" y="7" width="6" height="5" rx="0.5" fill="#1e1e2e"/>
    <path d="M6.5 7V5.5a1.5 1.5 0 0 1 3 0V7" stroke="#1e1e2e" strokeWidth="1" fill="none"/>
  </svg>
);

// -------------------------------------------------------------------------
// Docker Icon
// -------------------------------------------------------------------------

export const DockerIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2496ed"/>
    <path d="M2 8h2v2H2zM4.5 8h2v2h-2zM7 8h2v2H7zM7 5.5h2v2H7zM9.5 8h2v2h-2zM4.5 5.5h2v2h-2z" fill="#fff"/>
    <ellipse cx="13" cy="9" rx="1.5" ry="1" fill="#fff" opacity="0.7"/>
  </svg>
);

// -------------------------------------------------------------------------
// Generic File Icon
// -------------------------------------------------------------------------

export const FileIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path d="M4 1h5l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="#6c7086"/>
    <path d="M9 1v4h4" fill="#45475a"/>
  </svg>
);

// -------------------------------------------------------------------------
// Chevron Icons
// -------------------------------------------------------------------------

export const ChevronRightIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronDownIcon: FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...iconStyle(size)} {...props}>
    <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// -------------------------------------------------------------------------
// Special folder names that should have custom icons
// -------------------------------------------------------------------------

const SPECIAL_FOLDERS: Record<string, FC<IconProps>> = {
  'node_modules': NodeModulesIcon,
  '.git': GitFolderIcon,
  'src': SrcFolderIcon,
  'source': SrcFolderIcon,
  'public': PublicFolderIcon,
  'static': PublicFolderIcon,
  'assets': PublicFolderIcon,
  'images': PublicFolderIcon,
  'img': PublicFolderIcon,
  'components': ComponentsFolderIcon,
  'hooks': HooksFolderIcon,
  'styles': StylesFolderIcon,
  'css': StylesFolderIcon,
  'scss': StylesFolderIcon,
  'utils': UtilsFolderIcon,
  'lib': UtilsFolderIcon,
  'helpers': UtilsFolderIcon,
  'types': TypesFolderIcon,
  'interfaces': TypesFolderIcon,
  '@types': TypesFolderIcon,
  'test': TestFolderIcon,
  'tests': TestFolderIcon,
  '__tests__': TestFolderIcon,
  'spec': TestFolderIcon,
  '.vscode': ConfigFolderIcon,
  'config': ConfigFolderIcon,
  '.config': ConfigFolderIcon,
  'scripts': SrcFolderIcon,
  'services': UtilsFolderIcon,
  'stores': UtilsFolderIcon,
  'store': UtilsFolderIcon,
  'contexts': HooksFolderIcon,
  'context': HooksFolderIcon,
  'pages': ComponentsFolderIcon,
  'views': ComponentsFolderIcon,
  'layouts': ComponentsFolderIcon,
  'api': UtilsFolderIcon,
  'routes': SrcFolderIcon,
  'dist': PublicFolderIcon,
  'build': PublicFolderIcon,
  'out': PublicFolderIcon,
};

// Folders that should be dimmed (less important)
export const DIMMED_FOLDERS = new Set([
  'node_modules',
  '.git',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '.cache',
  'coverage',
  '.turbo',
]);

// Folders that should be collapsed by default
export const COLLAPSED_BY_DEFAULT = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '.cache',
  'coverage',
]);

// -------------------------------------------------------------------------
// Get Folder Icon by Name
// -------------------------------------------------------------------------

export function getFolderIcon(folderName: string, isExpanded: boolean): FC<IconProps> {
  const lowerName = folderName.toLowerCase();
  const specialIcon = SPECIAL_FOLDERS[lowerName];
  
  if (specialIcon) {
    return specialIcon;
  }
  
  return isExpanded ? FolderOpenIcon : FolderIcon;
}

// -------------------------------------------------------------------------
// Get Icon by File Extension
// -------------------------------------------------------------------------

export function getFileIcon(filename: string, isDirectory: boolean, isExpanded: boolean = false): FC<IconProps> {
  // Handle special virtual files
  if (filename === '::settings' || filename === 'Settings') {
    return SettingsIcon;
  }

  if (isDirectory) {
    return getFolderIcon(filename, isExpanded);
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const lowerFilename = filename.toLowerCase();
  
  // Check for React files
  if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
    return ReactIcon;
  }

  // Check for special filenames
  if (lowerFilename === 'dockerfile' || lowerFilename.startsWith('dockerfile.')) {
    return DockerIcon;
  }
  
  if (lowerFilename === 'docker-compose.yml' || lowerFilename === 'docker-compose.yaml') {
    return DockerIcon;
  }
  
  if (lowerFilename.includes('.lock') || lowerFilename === 'package-lock.json' || lowerFilename === 'yarn.lock') {
    return LockIcon;
  }
  
  if (lowerFilename.startsWith('.env') || lowerFilename === '.gitignore' || lowerFilename === '.npmrc' || lowerFilename === '.editorconfig') {
    return ConfigIcon;
  }

  const iconMap: Record<string, FC<IconProps>> = {
    'ts': TypeScriptIcon,
    'js': JavaScriptIcon,
    'mjs': JavaScriptIcon,
    'cjs': JavaScriptIcon,
    'json': JsonIcon,
    'html': HtmlIcon,
    'htm': HtmlIcon,
    'css': CssIcon,
    'scss': CssIcon,
    'sass': CssIcon,
    'less': CssIcon,
    'md': MarkdownIcon,
    'mdx': MarkdownIcon,
    'rs': RustIcon,
    'py': PythonIcon,
    'toml': TomlIcon,
    'yaml': YamlIcon,
    'yml': YamlIcon,
    'svg': SvgIcon,
    'png': ImageIcon,
    'jpg': ImageIcon,
    'jpeg': ImageIcon,
    'gif': ImageIcon,
    'webp': ImageIcon,
    'ico': ImageIcon,
    'sh': ShellIcon,
    'bash': ShellIcon,
    'zsh': ShellIcon,
    'fish': ShellIcon,
    'ps1': ShellIcon,
    'bat': ShellIcon,
    'cmd': ShellIcon,
  };

  return iconMap[ext] || FileIcon;
}

// Check if a folder should be dimmed
export function isFolderDimmed(folderName: string): boolean {
  return DIMMED_FOLDERS.has(folderName.toLowerCase());
}

// Check if a folder should be collapsed by default
export function shouldCollapseByDefault(folderName: string): boolean {
  return COLLAPSED_BY_DEFAULT.has(folderName.toLowerCase());
}
