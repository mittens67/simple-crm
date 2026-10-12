import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import './index.scss';
import App from './App.tsx';
import { apollo_client } from './lib/apollo.ts';
import { AuthProvider } from './auth/auth-context';
import { ThemeProvider } from './theme/theme-provider';
import { DialogProvider } from './components/dialogs/DialogProvider';
import { ToastProvider } from './components/ui';
import { ErrorBoundary } from './components/error-boundary/ErrorBoundary';
import { resolve_initial_theme } from './theme/theme-storage';

/**
 * Sets the theme before React renders, to avoid a flash of the wrong theme.
 *
 * Falls back to the OS preference rather than hardcoding light, which is what
 * the CSS `prefers-color-scheme` block expects. The previous version always
 * defaulted to light, so a dark-mode user got a light flash and then a light app.
 */
document.documentElement.setAttribute('data-theme', resolve_initial_theme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outermost, so a render error anywhere below shows a fallback rather
        than a blank page. It was written and styled but never mounted. */}
    <ErrorBoundary>
      <ApolloProvider client={apollo_client}>
        <AuthProvider>
          <ThemeProvider>
            <DialogProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </DialogProvider>
          </ThemeProvider>
        </AuthProvider>
      </ApolloProvider>
    </ErrorBoundary>
  </StrictMode>
);
