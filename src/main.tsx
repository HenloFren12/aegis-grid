import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically run accessibility checks in development mode
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);