import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The login page advertises a demo password and the seed sets it, in two
 * different packages with nothing tying them together. They drifted: the page
 * said `Demo123` after the seed had moved on to `Demo123!`, so the credentials
 * printed on the login screen logged nobody in.
 *
 * This reads both source files rather than importing them, because the seed
 * needs a database environment to load and the page needs a browser build.
 */
const read = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../..', relative), 'utf8');

/** The literal a file falls back to when no password is configured. */
const dev_default = (source: string, pattern: RegExp): string => {
  const match = source.match(pattern);
  if (!match) throw new Error(`could not find the demo password default with ${pattern}`);
  return match[1];
};

describe('demo credentials', () => {
  const seed_default = dev_default(
    read('server/src/scripts/seed.ts'),
    /process\.env\.DEMO_PASSWORD[\s\S]*?return '([^']+)'/
  );
  const login_default = dev_default(
    read('client/src/pages/(login)/index.tsx'),
    /VITE_DEMO_PASSWORD \?\? \(import\.meta\.env\.DEV \? '([^']+)'/
  );

  it('shows on the login page the password the seed actually sets', () => {
    expect(login_default).toBe(seed_default);
  });

  it('lists only accounts the seed creates', () => {
    const seed = read('server/src/scripts/seed.ts');
    const login = read('client/src/pages/(login)/index.tsx');

    const advertised = [...login.matchAll(/email: '([^']+@example\.com)'/g)].map((m) => m[1]);
    expect(advertised.length).toBeGreaterThan(0);

    for (const email of advertised) {
      expect(seed, `${email} is on the login page but not created by the seed`).toContain(email);
    }
  });
});
