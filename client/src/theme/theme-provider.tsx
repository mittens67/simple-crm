import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useAuth } from '../auth/auth-context';
import { ThemeContext } from './theme-context';
import type { ThemeContextValue } from './theme-context';
import { UPDATE_THEME_MUTATION } from '../lib/graphql-queries';

interface User {
  id: string;
  name: string;
  email: string;
  theme_preference?: 'light' | 'dark';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { user } = useAuth() as { user: User | null };
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  const [updateThemeMutation] = useMutation(UPDATE_THEME_MUTATION, {
    onError: (error) => {
      console.error('Failed to update theme preference:', error);
    },
  });

  useEffect(() => {
    if (user) {
      const userTheme = user.theme_preference || 'light';
      setThemeState(userTheme);
      applyTheme(userTheme);
    }
    setIsLoading(false);
  }, [user]);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    if (user) {
      try {
        await updateThemeMutation({
          variables: { theme: newTheme },
        });
      } catch (error) {
        console.error('Failed to persist theme preference:', error);
      }
    }
  };

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
