/* ==========================================================================
   Main Entry Point
   ========================================================================== */

import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Note: StrictMode is disabled because it causes double-initialization issues
// with imperative libraries like xterm.js that manage their own DOM and state.
// The terminal would register duplicate event listeners in Strict Mode.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
);
