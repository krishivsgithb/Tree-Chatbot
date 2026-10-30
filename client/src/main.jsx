import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import App from './App.jsx';
import './styles/topbar.css';
import './styles/modal.css';
import './styles/sidebar.css';
import '@xyflow/react/dist/style.css';
import './styles/canvas.css';
import './styles/menu.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);