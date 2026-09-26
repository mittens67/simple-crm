import { useEffect, useState } from 'react';

/**
 * Resolves the chart colour tokens to concrete values.
 *
 * Recharts sets `fill` and `stroke` as SVG *attributes*. `var()` inside a
 * presentation attribute is not reliably supported, so passing
 * `fill="var(--series-1)"` risks rendering as an invalid colour rather than the
 * token. Reading the computed value and passing real hex removes the guesswork.
 *
 * Re-reads when the theme changes, so charts follow the light/dark toggle and
 * the OS preference rather than freezing at their first paint.
 */
const TOKENS = [
  'series-1',
  'series-2',
  'series-3',
  'series-4',
  'viz-grid',
  'viz-axis',
  'viz-surface',
] as const;

export type VizColors = Record<(typeof TOKENS)[number], string>;

const FALLBACKS: VizColors = {
  'series-1': '#2a78d6',
  'series-2': '#1baf7a',
  'series-3': '#eda100',
  'series-4': '#e87ba4',
  'viz-grid': '#eff1f5',
  'viz-axis': '#8b95a9',
  'viz-surface': '#ffffff',
};

const read_colors = (): VizColors => {
  if (typeof window === 'undefined') return FALLBACKS;

  const computed = getComputedStyle(document.documentElement);
  const resolved = { ...FALLBACKS };

  for (const token of TOKENS) {
    const value = computed.getPropertyValue(`--${token}`).trim();
    if (value) resolved[token] = value;
  }
  return resolved;
};

export const useVizColors = (): VizColors => {
  const [colors, set_colors] = useState<VizColors>(read_colors);

  useEffect(() => {
    const refresh = () => set_colors(read_colors());

    // The theme toggle swaps data-theme on <html>.
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // And the OS preference applies when no explicit choice is stored.
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', refresh);

    // The first read can happen before the stylesheet has applied.
    refresh();

    return () => {
      observer.disconnect();
      media?.removeEventListener('change', refresh);
    };
  }, []);

  return colors;
};
