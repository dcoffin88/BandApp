import type { AppSettings, ThemeColor } from '../types/band.ts';

export const CUSTOM_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const THEME_COLORS: Record<Exclude<ThemeColor, 'custom'>, string> = {
  amber: '#f59e0b',
  cyan: '#06b6d4',
  purple: '#a855f7',
  emerald: '#10b981',
  rose: '#f43f5e',
  orange: '#f97316',
  blue: '#3b82f6',
  indigo: '#6366f1',
  teal: '#14b8a6',
  lime: '#84cc16',
  pink: '#ec4899',
};

export function getAccentColor(settings: AppSettings): string {
  return settings.primaryColor === 'custom' &&
    CUSTOM_COLOR_PATTERN.test(settings.customColor || '')
    ? settings.customColor!
    : THEME_COLORS[settings.primaryColor as keyof typeof THEME_COLORS] ||
        THEME_COLORS.amber;
}

export function applyTheme(settings: AppSettings): () => void {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.primaryColor);
  const color = getAccentColor(settings);
  const mode = settings.appearance || 'dark';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const updateAppearance = () => {
    const resolved =
      mode === 'system' ? (system.matches ? 'dark' : 'light') : mode;
    root.dataset.appearance = resolved;
    root.style.colorScheme = resolved;
  };
  updateAppearance();
  if (mode === 'system') system.addEventListener('change', updateAppearance);
  root.dataset.radius = settings.radius || 'medium';
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(color.slice(offset, offset + 2), 16),
  );
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const variables: Record<string, string> = {
    '--on-primary': luminance > 0.179 ? '#09090b' : '#ffffff',
  };
  if (settings.primaryColor === 'custom') {
    Object.assign(variables, {
      '--primary': color,
      '--primary-hover': `color-mix(in srgb, ${color} 85%, black)`,
      '--primary-light': `color-mix(in srgb, ${color} 25%, white)`,
      '--primary-rgb': rgb.join(', '),
      '--primary-glow': `0 0 25px rgba(${rgb.join(', ')}, 0.35)`,
    });
  }
  Object.entries(variables).forEach(([name, value]) =>
    root.style.setProperty(name, value),
  );
  return () => {
    Object.keys(variables).forEach((name) => root.style.removeProperty(name));
    system.removeEventListener('change', updateAppearance);
    root.style.removeProperty('color-scheme');
  };
}
