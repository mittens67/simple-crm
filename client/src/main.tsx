import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import './index.scss'
import App from './app.tsx'
import { apollo_client } from './lib/apollo'
import { AuthProvider } from './auth/auth-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apollo_client}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
)
