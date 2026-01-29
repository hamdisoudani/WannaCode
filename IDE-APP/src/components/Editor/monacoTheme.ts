/* ==========================================================================
   Monaco Editor Theme - Tokyo Night Storm
   ========================================================================== */

import type { editor } from 'monaco-editor';

/**
 * Tokyo Night Storm theme definition for Monaco Editor
 * Professional dark theme matching the design system
 */
export const catppuccinMochaTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '565f89', fontStyle: 'italic' },

    // Strings
    { token: 'string', foreground: '9ece6a' },
    { token: 'string.escape', foreground: 'bb9af7' },
    { token: 'string.regexp', foreground: 'ff9e64' },

    // Numbers
    { token: 'number', foreground: 'ff9e64' },
    { token: 'number.hex', foreground: 'ff9e64' },

    // Keywords
    { token: 'keyword', foreground: 'bb9af7' },
    { token: 'keyword.control', foreground: 'bb9af7' },
    { token: 'keyword.operator', foreground: '89ddff' },
    { token: 'keyword.other', foreground: 'f7768e' },

    // Types
    { token: 'type', foreground: 'e0af68' },
    { token: 'type.identifier', foreground: '2ac3de' },
    { token: 'type.builtin', foreground: 'e0af68' },

    // Variables
    { token: 'variable', foreground: 'c8d3f5' },
    { token: 'variable.predefined', foreground: 'f7768e' },
    { token: 'variable.parameter', foreground: 'e0af68' },
    { token: 'variable.language', foreground: 'f7768e' },

    // Functions
    { token: 'function', foreground: '7aa2f7' },
    { token: 'function.declaration', foreground: '7aa2f7' },
    { token: 'function.builtin', foreground: '7dcfff' },

    // Classes
    { token: 'class', foreground: '2ac3de' },
    { token: 'class.name', foreground: '2ac3de' },

    // Operators
    { token: 'operator', foreground: '89ddff' },
    { token: 'delimiter', foreground: '9aa5ce' },
    { token: 'delimiter.bracket', foreground: '9aa5ce' },
    { token: 'delimiter.parenthesis', foreground: '9aa5ce' },

    // Tags (HTML/XML)
    { token: 'tag', foreground: 'f7768e' },
    { token: 'tag.attribute.name', foreground: '7aa2f7' },
    { token: 'tag.attribute.value', foreground: '9ece6a' },
    { token: 'metatag', foreground: 'bb9af7' },

    // Attributes
    { token: 'attribute.name', foreground: '7aa2f7' },
    { token: 'attribute.value', foreground: '9ece6a' },

    // Constants
    { token: 'constant', foreground: 'ff9e64' },
    { token: 'constant.language', foreground: 'ff9e64' },
    { token: 'constant.numeric', foreground: 'ff9e64' },
    { token: 'constant.rgb-value', foreground: '73daca' },

    // Markup (Markdown)
    { token: 'markup.heading', foreground: '7aa2f7', fontStyle: 'bold' },
    { token: 'markup.italic', foreground: 'bb9af7', fontStyle: 'italic' },
    { token: 'markup.bold', foreground: 'ff9e64', fontStyle: 'bold' },
    { token: 'markup.underline', foreground: 'e0af68', fontStyle: 'underline' },
    { token: 'markup.inline.raw', foreground: '9ece6a' },
    { token: 'markup.link', foreground: '7dcfff' },
    { token: 'markup.list', foreground: 'ff9e64' },
    { token: 'markup.quote', foreground: '565f89', fontStyle: 'italic' },

    // JSON
    { token: 'string.key.json', foreground: '7aa2f7' },
    { token: 'string.value.json', foreground: '9ece6a' },

    // CSS
    { token: 'support.type.property-name.css', foreground: '7dcfff' },
    { token: 'support.constant.property-value.css', foreground: 'ff9e64' },
    { token: 'constant.css', foreground: 'ff9e64' },
    { token: 'entity.name.tag.css', foreground: 'f7768e' },
    { token: 'selector.css', foreground: 'bb9af7' },

    // Rust
    { token: 'keyword.control.rust', foreground: 'bb9af7' },
    { token: 'storage.type.rust', foreground: 'e0af68' },
    { token: 'constant.language.rust', foreground: 'ff9e64' },
    { token: 'lifetime.rust', foreground: 'f7768e', fontStyle: 'italic' },
    { token: 'macro.rust', foreground: '73daca' },

    // TypeScript/JavaScript specific - Identifiers
    { token: 'identifier', foreground: 'c8d3f5' },
    { token: 'identifier.ts', foreground: 'c8d3f5' },
    { token: 'identifier.js', foreground: 'c8d3f5' },

    // TypeScript/JavaScript - Storage and modifiers
    { token: 'storage.type.ts', foreground: 'bb9af7' },
    { token: 'storage.modifier.ts', foreground: 'bb9af7' },
    { token: 'entity.name.type.ts', foreground: '2ac3de' },
    { token: 'entity.name.function.ts', foreground: '7aa2f7' },

    // Decorators (like @Controller, @Get)
    { token: 'meta.decorator', foreground: 'e0af68' },
    { token: 'punctuation.decorator', foreground: 'e0af68' },

    // Invalid/deprecated
    { token: 'invalid', foreground: 'f7768e', fontStyle: 'strikethrough' },
    { token: 'invalid.deprecated', foreground: 'ff9e64', fontStyle: 'italic strikethrough' },
  ],
  colors: {
    // Editor background
    'editor.background': '#1a1b26',
    'editor.foreground': '#c8d3f5',

    // Editor cursor
    'editorCursor.foreground': '#c8d3f5',
    'editorCursor.background': '#1a1b26',

    // Line numbers
    'editorLineNumber.foreground': '#3b4261',
    'editorLineNumber.activeForeground': '#737aa2',

    // Selection
    'editor.selectionBackground': '#2d3f76',
    'editor.selectionHighlightBackground': '#2d3f7650',
    'editor.inactiveSelectionBackground': '#2d3f7640',

    // Word highlighting
    'editor.wordHighlightBackground': '#2d3f7650',
    'editor.wordHighlightStrongBackground': '#2d3f7670',

    // Find matches
    'editor.findMatchBackground': '#e0af6840',
    'editor.findMatchHighlightBackground': '#e0af6825',
    'editor.findRangeHighlightBackground': '#2d3f7640',

    // Current line
    'editor.lineHighlightBackground': '#1f202e',
    'editor.lineHighlightBorder': '#00000000',

    // Bracket matching
    'editorBracketMatch.background': '#2d3f76',
    'editorBracketMatch.border': '#7aa2f7',

    // Indent guides
    'editorIndentGuide.background1': '#292a37',
    'editorIndentGuide.activeBackground1': '#3b4261',

    // Ruler
    'editorRuler.foreground': '#292a37',

    // Overview ruler
    'editorOverviewRuler.border': '#00000000',
    'editorOverviewRuler.findMatchForeground': '#e0af6880',
    'editorOverviewRuler.errorForeground': '#f7768e',
    'editorOverviewRuler.warningForeground': '#ff9e64',
    'editorOverviewRuler.infoForeground': '#7aa2f7',

    // Gutter
    'editorGutter.background': '#1a1b26',
    'editorGutter.addedBackground': '#9ece6a',
    'editorGutter.modifiedBackground': '#7aa2f7',
    'editorGutter.deletedBackground': '#f7768e',

    // Minimap
    'minimap.background': '#16161e',
    'minimap.selectionHighlight': '#2d3f76',
    'minimap.findMatchHighlight': '#e0af68',

    // Widget
    'editorWidget.background': '#16161e',
    'editorWidget.border': '#1f2029',
    'editorWidget.foreground': '#c8d3f5',
    'editorSuggestWidget.background': '#16161e',
    'editorSuggestWidget.border': '#292a37',
    'editorSuggestWidget.foreground': '#c8d3f5',
    'editorSuggestWidget.highlightForeground': '#7aa2f7',
    'editorSuggestWidget.selectedBackground': '#292a37',

    // Hover widget
    'editorHoverWidget.background': '#16161e',
    'editorHoverWidget.border': '#292a37',

    // Peek view
    'peekView.border': '#7aa2f7',
    'peekViewEditor.background': '#16161e',
    'peekViewResult.background': '#1a1b26',
    'peekViewTitle.background': '#16161e',
    'peekViewTitleLabel.foreground': '#c8d3f5',

    // Scrollbar
    'scrollbar.shadow': '#00000030',
    'scrollbarSlider.background': '#292a3750',
    'scrollbarSlider.hoverBackground': '#363848',
    'scrollbarSlider.activeBackground': '#3b4261',

    // Error lens
    'editorError.foreground': '#f7768e',
    'editorWarning.foreground': '#ff9e64',
    'editorInfo.foreground': '#7aa2f7',
    'editorHint.foreground': '#73daca',

    // Whitespace
    'editorWhitespace.foreground': '#292a37',
  },
};

// Semantic token color rules for Monaco's TypeScript semantic highlighting
// These match the token types from typescript-language-server:
// ["class","enum","interface","namespace","typeParameter","type","parameter","variable","enumMember","property","function","member"]
export const semanticTokenRules: { [key: string]: { foreground: string; fontStyle?: string } } = {
  // Types
  'class': { foreground: '#2ac3de' }, // Cyan
  'enum': { foreground: '#2ac3de' },
  'interface': { foreground: '#2ac3de' },
  'struct': { foreground: '#2ac3de' },
  'type': { foreground: '#2ac3de' },
  'typeParameter': { foreground: '#73daca' }, // Teal
  'namespace': { foreground: '#7dcfff' }, // Light Blue

  // Variables & Parameters
  'variable': { foreground: '#c8d3f5' }, // Text white/blue
  'variable.readonly': { foreground: '#ff9e64' }, // Orange for const/readonly
  'variable.defaultLibrary': { foreground: '#f7768e' }, // Red for globals
  'parameter': { foreground: '#e0af68' }, // Yellow/Orange
  'property': { foreground: '#7dcfff' }, // Light Blue
  'property.readonly': { foreground: '#7dcfff' },
  'enumMember': { foreground: '#ff9e64' }, // Orange

  // Functions & Methods
  'function': { foreground: '#7aa2f7' }, // Blue
  'method': { foreground: '#7aa2f7' },
  'macro': { foreground: '#73daca' }, // Teal
  'event': { foreground: '#e0af68' }, // Yellow

  // Keywords & Modifiers
  'keyword': { foreground: '#bb9af7' }, // Purple
  'modifier': { foreground: '#bb9af7' },
  'decorator': { foreground: '#9ece6a' }, // Green (like Annotations)

  // Literals
  'string': { foreground: '#9ece6a' }, // Green
  'number': { foreground: '#ff9e64' }, // Orange
  'regexp': { foreground: '#ff9e64' },
  'operator': { foreground: '#89ddff' }, // Cyan
  'comment': { foreground: '#565f89', fontStyle: 'italic' }, // Grey Italic
};

export const THEME_NAME = 'catppuccin-mocha';
