// ==========================================================================
// Login Screen - Premium Google OAuth Login for CodeSurf IDE
// ==========================================================================

import { useAuth } from '../../contexts/AuthContext';
import './LoginScreen.css';

// Google Logo SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export function LoginScreen() {
  const { signInWithGoogle, isLoading, error, clearError } = useAuth();

  const handleSignIn = async () => {
    clearError();
    await signInWithGoogle();
  };

  return (
    <div className="login-screen">
      {/* Ambient Background */}
      <div className="login-ambient">
        <div className="login-ambient__orb login-ambient__orb--1" />
        <div className="login-ambient__orb login-ambient__orb--2" />
        <div className="login-ambient__orb login-ambient__orb--3" />
      </div>

      {/* Grid Pattern */}
      <div className="login-grid" />

      {/* Main Content */}
      <div className="login-content">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo__icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="login-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7aa2f7" />
                  <stop offset="100%" stopColor="#bb9af7" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="24" height="24" rx="6" stroke="url(#login-logo-gradient)" strokeWidth="2" fill="rgba(122, 162, 247, 0.1)"/>
              <path d="M10 12L14 16L10 20" stroke="url(#login-logo-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 20H22" stroke="url(#login-logo-gradient)" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="login-logo__text">CodeSurf</span>
        </div>

        {/* Card */}
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <h1 className="login-title">Sign in to CodeSurf</h1>
            <p className="login-subtitle">The AI-native IDE for modern developers</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Button */}
          <button
            className={`login-button ${isLoading ? 'login-button--loading' : ''}`}
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="login-button__spinner" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <GoogleLogo />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="login-divider">
            <span>Secure authentication</span>
          </div>

          {/* Features */}
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span>End-to-end encrypted</span>
            </div>
            <div className="login-feature">
              <div className="login-feature__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span>Instant sync</span>
            </div>
            <div className="login-feature">
              <div className="login-feature__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <span>AI-powered</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="login-footer">
          By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
        </p>
      </div>

      {/* Version */}
      <span className="login-version">v0.1.0 Alpha</span>
    </div>
  );
}
