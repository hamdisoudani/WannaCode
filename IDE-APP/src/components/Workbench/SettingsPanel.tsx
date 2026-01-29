/* ==========================================================================
   Settings Panel - User Preferences UI
   
   Clean, modern settings panel with toggle switches and input controls.
   ========================================================================== */

import { useCallback } from 'react';
import { useEditorSettings, useLLMSettings } from '../../services/settings/hooks';
import './SettingsPanel.css';

export function SettingsPanel() {
  const { 
    settings: editorSettings, 
    isLoading: isEditorLoading, 
    updateSettings: updateEditorSettings 
  } = useEditorSettings();
  
  const {
    settings: llmSettings,
    isLoading: isLLMLoading,
  } = useLLMSettings();

  const isLoading = isEditorLoading || isLLMLoading;

  // Editor settings handlers
  const handleAutoSaveToggle = useCallback(() => {
    updateEditorSettings({ autoSave: !editorSettings.autoSave });
  }, [editorSettings.autoSave, updateEditorSettings]);

  const handleMinimapToggle = useCallback(() => {
    updateEditorSettings({ minimap: !editorSettings.minimap });
  }, [editorSettings.minimap, updateEditorSettings]);

  const handleWordWrapToggle = useCallback(() => {
    updateEditorSettings({ wordWrap: !editorSettings.wordWrap });
  }, [editorSettings.wordWrap, updateEditorSettings]);

  const handleLineNumbersToggle = useCallback(() => {
    updateEditorSettings({ lineNumbers: !editorSettings.lineNumbers });
  }, [editorSettings.lineNumbers, updateEditorSettings]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 8 && value <= 32) {
      updateEditorSettings({ fontSize: value });
    }
  }, [updateEditorSettings]);

  const handleTabSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    updateEditorSettings({ tabSize: value });
  }, [updateEditorSettings]);

  const handleAutoSaveDelayChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    updateEditorSettings({ autoSaveDelayMs: value });
  }, [updateEditorSettings]);

  if (isLoading) {
    return (
      <div className="settings-panel">
        <header className="settings-panel__header">
          <span className="settings-panel__title">Settings</span>
        </header>
        <div className="settings-panel__loading">
          <div className="settings-panel__spinner" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <header className="settings-panel__header">
        <span className="settings-panel__title">Settings</span>
      </header>

      <div className="settings-panel__content">
        {/* Editor Section */}
        <section className="settings-section">
          <h3 className="settings-section__title">
            <EditorIcon />
            Editor
          </h3>

          <div className="settings-group">
            <SettingToggle
              label="Auto Save"
              description="Automatically save files after changes"
              checked={editorSettings.autoSave}
              onChange={handleAutoSaveToggle}
            />

            {editorSettings.autoSave && (
              <SettingSelect
                label="Auto Save Delay"
                description="Time to wait before saving"
                value={editorSettings.autoSaveDelayMs.toString()}
                onChange={handleAutoSaveDelayChange}
                options={[
                  { value: '500', label: '500ms' },
                  { value: '1000', label: '1 second' },
                  { value: '2000', label: '2 seconds' },
                  { value: '5000', label: '5 seconds' },
                ]}
              />
            )}

            <SettingToggle
              label="Minimap"
              description="Show minimap overview on the right"
              checked={editorSettings.minimap}
              onChange={handleMinimapToggle}
            />

            <SettingToggle
              label="Word Wrap"
              description="Wrap long lines to fit the editor width"
              checked={editorSettings.wordWrap}
              onChange={handleWordWrapToggle}
            />

            <SettingToggle
              label="Line Numbers"
              description="Show line numbers in the gutter"
              checked={editorSettings.lineNumbers}
              onChange={handleLineNumbersToggle}
            />

            <SettingNumber
              label="Font Size"
              description="Editor font size in pixels"
              value={editorSettings.fontSize}
              min={8}
              max={32}
              onChange={handleFontSizeChange}
              unit="px"
            />

            <SettingSelect
              label="Tab Size"
              description="Number of spaces for a tab"
              value={editorSettings.tabSize.toString()}
              onChange={handleTabSizeChange}
              options={[
                { value: '2', label: '2 spaces' },
                { value: '4', label: '4 spaces' },
                { value: '8', label: '8 spaces' },
              ]}
            />
          </div>
        </section>

        {/* AI/LLM Section (Future) */}
        <section className="settings-section">
          <h3 className="settings-section__title">
            <AIIcon />
            AI Assistant
            <span className="settings-section__badge">Coming Soon</span>
          </h3>

          <div className="settings-group settings-group--disabled">
            <SettingSelect
              label="AI Provider"
              description="Select your preferred AI provider"
              value={llmSettings.provider || ''}
              onChange={() => {}}
              disabled
              options={[
                { value: '', label: 'Not configured' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'ollama', label: 'Ollama (Local)' },
              ]}
            />

            <div className="settings-item settings-item--info">
              <div className="settings-item__icon">
                <InfoIcon />
              </div>
              <div className="settings-item__content">
                <p className="settings-item__description">
                  AI integration is coming soon. Configure your LLM provider to enable code assistance, chat, and automated refactoring.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="settings-section">
          <h3 className="settings-section__title">
            <AboutIcon />
            About
          </h3>

          <div className="settings-about">
            <div className="settings-about__logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="settings-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7aa2f7" />
                    <stop offset="100%" stopColor="#bb9af7" />
                  </linearGradient>
                </defs>
                <rect x="4" y="4" width="24" height="24" rx="5" stroke="url(#settings-logo-gradient)" strokeWidth="2" fill="rgba(122, 162, 247, 0.1)"/>
                <path d="M10 12L14 16L10 20" stroke="url(#settings-logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 20H22" stroke="url(#settings-logo-gradient)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="settings-about__info">
              <h4 className="settings-about__name">CodeSurf</h4>
              <p className="settings-about__version">Version 0.1.0</p>
              <p className="settings-about__tagline">The AI-Native IDE for Vibe Coders</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Setting Components
   ------------------------------------------------------------------------- */

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function SettingToggle({ label, description, checked, onChange, disabled }: SettingToggleProps) {
  return (
    <div className={`settings-item ${disabled ? 'settings-item--disabled' : ''}`}>
      <div className="settings-item__content">
        <span className="settings-item__label">{label}</span>
        <span className="settings-item__description">{description}</span>
      </div>
      <button 
        className={`settings-toggle ${checked ? 'settings-toggle--on' : ''}`}
        onClick={onChange}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
      >
        <span className="settings-toggle__track" />
        <span className="settings-toggle__thumb" />
      </button>
    </div>
  );
}

interface SettingSelectProps {
  label: string;
  description: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function SettingSelect({ label, description, value, onChange, options, disabled }: SettingSelectProps) {
  return (
    <div className={`settings-item ${disabled ? 'settings-item--disabled' : ''}`}>
      <div className="settings-item__content">
        <span className="settings-item__label">{label}</span>
        <span className="settings-item__description">{description}</span>
      </div>
      <select 
        className="settings-select"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface SettingNumberProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  disabled?: boolean;
}

function SettingNumber({ label, description, value, min, max, onChange, unit, disabled }: SettingNumberProps) {
  return (
    <div className={`settings-item ${disabled ? 'settings-item--disabled' : ''}`}>
      <div className="settings-item__content">
        <span className="settings-item__label">{label}</span>
        <span className="settings-item__description">{description}</span>
      </div>
      <div className="settings-number">
        <input
          type="number"
          className="settings-number__input"
          value={value}
          min={min}
          max={max}
          onChange={onChange}
          disabled={disabled}
        />
        {unit && <span className="settings-number__unit">{unit}</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function EditorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <circle cx="7.5" cy="14.5" r="1.5" />
      <circle cx="16.5" cy="14.5" r="1.5" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
