
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/core/App';
import { DatabaseProvider } from './src/core/contexts/DatabaseContext';
import { AuthProvider } from './src/core/contexts/AuthContext';
import { NavigationProvider } from './src/core/contexts/NavigationContext';
import { WorkTimerProvider } from './src/core/contexts/WorkTimerContext';
import { SettingsProvider } from './src/core/contexts/SettingsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DatabaseProvider initialDatabase={null}>
      <SettingsProvider value={null}>
        <AuthProvider>
          <NavigationProvider>
            <WorkTimerProvider>
              <App />
            </WorkTimerProvider>
          </NavigationProvider>
        </AuthProvider>
      </SettingsProvider>
    </DatabaseProvider>
  </React.StrictMode>
);