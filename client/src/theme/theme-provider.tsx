import type { ReactNode } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { useAuth } from '../auth/auth-context';
import { ThemeContext } from './theme-context';
import type { ThemeContextValue } from './theme-context';
import { UPDATE_THEME_MUTATION } from '../lib/graphql-queries';
import {
  resolve_initial_theme,
  write_stored_theme,
  type Theme,
} from './theme-storage';

interface User {
  id: string;
  name: string;
  email: string;
  theme_preference?: 'light' | 'dark';
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Storage access lives in theme-storage.ts, which also guards against
// localStorage throwing in private browsing, and falls back to the OS
// preference rather than hardcoding light.
const applyTheme = (newTheme: Theme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
  write_stored_theme(newTheme);
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { user } = useAuth() as { user: User | null };
  const [theme, setThemeState] = useState<Theme>(resolve_initial_theme);
  const [isLoading, setIsLoading] = useState(false);

  const [updateThemeMutation] = useMutation(UPDATE_THEME_MUTATION, {
    onError: (error) => {
      console.error('Failed to update theme preference:', error);
    },
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (user?.theme_preference && user.theme_preference !== theme) {
      setThemeState(user.theme_preference);
    }
  }, [user?.theme_preference, theme]);

  const handleSetTheme = useCallback(
    async (newTheme: 'light' | 'dark') => {
      setIsLoading(true);
      try {
        setThemeState(newTheme);
        applyTheme(newTheme);

        if (user) {
          await updateThemeMutation({
            variables: { theme: newTheme },
          });
        }
      } catch (error) {
        console.error('Failed to persist theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, updateThemeMutation]
  );

  const value: ThemeContextValue = {
    theme,
    setTheme: handleSetTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
