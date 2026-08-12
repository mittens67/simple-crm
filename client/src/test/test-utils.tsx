import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ApolloProvider } from '@apollo/client';
import { AuthProvider } from '../auth/auth-context';
import { ThemeProvider } from '../theme/theme-provider';
import { DialogProvider } from '../components/dialogs/DialogProvider';
import { apollo_client } from '../lib/apollo';

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ApolloProvider client={apollo_client}>
      <AuthProvider>
        <ThemeProvider>
          <DialogProvider>
            {children}
          </DialogProvider>
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
