import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import './index.scss'
import App from './App.tsx'
import { apollo_client } from './lib/apollo.ts'
import { AuthProvider } from './auth/auth-context'
import { ThemeProvider } from './theme/theme-provider'
import { DialogProvider } from './components/dialogs/DialogProvider'

// Initialize theme before React renders to prevent FOUC (flash of unstyled content)
const initializeTheme = () => {
  const saved = localStorage.getItem('theme-preference') as 'light' | 'dark' | null;
  const theme = saved || 'light';
  document.documentElement.setAttribute('data-theme', theme);
};

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apollo_client}>
      <AuthProvider>
        <ThemeProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
)
