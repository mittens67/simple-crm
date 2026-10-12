/**
 * Where the theme choice is persisted.
 *
 * Kept in its own module because both main.tsx (which sets the attribute before
 * React renders, to avoid a flash of the wrong theme) and theme-provider.tsx
 * need it. The literal was previously written out in both places.
 */
export const THEME_STORAGE_KEY = 'theme-preference';

export type Theme = 'light' | 'dark';

/**
 * Reads the stored preference. Returns null when nothing is stored *or* when
 * storage is unavailable — private browsing and blocked site data both throw
 * on access rather than returning null.
 */
export const read_stored_theme = (): Theme | null => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
};

export const write_stored_theme = (theme: Theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not fatal: the theme still applies for this session.
  }
};

/** The OS preference, used when the user has not chosen explicitly. */
export const preferred_theme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const resolve_initial_theme = (): Theme => read_stored_theme() ?? preferred_theme();
