import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import './index.scss'
import App from './App'
import { apollo_client } from './lib/apollo'
import { AuthProvider } from './auth/auth-context'
import { ThemeProvider } from './theme/theme-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apollo_client}>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
)
