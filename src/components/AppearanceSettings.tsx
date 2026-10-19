import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { UserAppearance } from '../types/band.ts';
import { CUSTOM_COLOR_PATTERN, getAccentColor } from '../shared/theme.ts';

const ACCENTS = [
  { color: '#ffffff', name: 'Snow' },
  { color: '#f97316', name: 'Tangerine' },
  { color: '#ea580c', name: 'Burnt Orange' },
  { color: '#f59e0b', name: 'Vintage Gold' },
  { color: '#eab308', name: 'Sunflower' },
  { color: '#b4a400', name: 'Mustard' },
  { color: '#84cc16', name: 'Electric Lime' },
  { color: '#65a30d', name: 'Leaf' },
  { color: '#3f8f14', name: 'Meadow' },
  { color: '#15803d', name: 'Forest' },
  { color: '#16a34a', name: 'Grass' },
  { color: '#22c55e', name: 'Spring Green' },
  { color: '#10b981', name: 'Emerald' },
  { color: '#0d9488', name: 'Deep Teal' },
  { color: '#0f766e', name: 'Pine' },
  { color: '#14b8a6', name: 'Lagoon Teal' },
  { color: '#737373', name: 'Stone' },
  { color: '#f8b38b', name: 'Apricot' },
  { color: '#edc197', name: 'Sand' },
  { color: '#e3cc96', name: 'Champagne' },
  { color: '#d4cf8d', name: 'Khaki' },
  { color: '#b9c788', name: 'Sage' },
  { color: '#a4bd83', name: 'Olive Mist' },
  { color: '#89b489', name: 'Sea Glass' },
  { color: '#72ac8d', name: 'Eucalyptus' },
  { color: '#67b196', name: 'Mint' },
  { color: '#5ba68d', name: 'Juniper' },
  { color: '#53a095', name: 'Patina' },
  { color: '#4d9187', name: 'Silver Pine' },
  { color: '#3f827b', name: 'Evergreen' },
  { color: '#316e68', name: 'Spruce' },
  { color: '#244f4d', name: 'Deep Lagoon' },
  { color: '#06b6d4', name: 'Electric Cyan' },
  { color: '#0891b2', name: 'Deep Cyan' },
  { color: '#3b82f6', name: 'Ocean Blue' },
  { color: '#2563eb', name: 'Royal Blue' },
  { color: '#1d4ed8', name: 'Cobalt' },
  { color: '#4338ca', name: 'Deep Indigo' },
  { color: '#6366f1', name: 'Midnight Indigo' },
  { color: '#7c3aed', name: 'Violet' },
  { color: '#9333ea', name: 'Orchid' },
  { color: '#a855f7', name: 'Velvet Purple' },
  { color: '#c026d3', name: 'Fuchsia' },
  { color: '#db2777', name: 'Raspberry' },
  { color: '#ec4899', name: 'Hot Pink' },
  { color: '#f43f5e', name: 'Punk Rose' },
  { color: '#ef4444', name: 'Scarlet' },
  { color: '#dc2626', name: 'Crimson' },
  { color: '#4db6ac', name: 'Soft Teal' },
  { color: '#55b6c8', name: 'Glacier' },
  { color: '#64b5f6', name: 'Sky Blue' },
  { color: '#7da1ec', name: 'Periwinkle' },
  { color: '#818cf8', name: 'Soft Indigo' },
  { color: '#9290df', name: 'Iris' },
  { color: '#a78bfa', name: 'Lavender' },
  { color: '#b39ddb', name: 'Lilac' },
  { color: '#bf86d1', name: 'Wisteria' },
  { color: '#ce93d8', name: 'Mauve' },
  { color: '#d487bb', name: 'Dusty Orchid' },
  { color: '#de91ae', name: 'Dusty Rose' },
  { color: '#e49ca6', name: 'Blush' },
  { color: '#ef9a9a', name: 'Petal' },
  { color: '#ed7e88', name: 'Coral' },
  { color: '#e57373', name: 'Rosewood' },
];
const ACCENT_COLORS = ACCENTS.map(accent => accent.color);
const MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
] as const;
const RADII = [
  { id: 'none', label: 'Square', radius: 0 },
  { id: 'small', label: 'Small', radius: 4 },
  { id: 'medium', label: 'Rounded', radius: 8 },
  { id: 'full', label: 'Pill', radius: 999 },
] as const;

interface AppearanceSettingsProps {
  settings: UserAppearance;
  onChange: (settings: UserAppearance) => void;
  onInvalidColorChange: (invalid: boolean) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  onChange,
  onInvalidColorChange,
}) => {
  const accent = getAccentColor(settings).toLowerCase();
  const [hexInput, setHexInput] = useState(accent);
  useEffect(() => {
    setHexInput(accent);
    onInvalidColorChange(false);
  }, [accent, onInvalidColorChange]);
  const invalid = !CUSTOM_COLOR_PATTERN.test(hexInput);
  const choose = (color: string) => {
    setHexInput(color);
    onInvalidColorChange(false);
    onChange({ ...settings, primaryColor: 'custom', customColor: color });
  };
  return (
    <div className="w-full space-y-7">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-400 mb-2">
          Theme
        </legend>
        <div className="inline-flex gap-1 rounded-xl border border-zinc-700 bg-zinc-950 p-1">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={(settings.appearance || 'dark') === id}
              onClick={() => onChange({ ...settings, appearance: id })}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${(settings.appearance || 'dark') === id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-400 mb-2">
          Accent
        </legend>
        <div
          role="radiogroup"
          aria-label="Accent color"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8"
        >
          {ACCENTS.map(({ color, name }, index) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={accent === color}
              aria-label={`${name} (${color})`}
              title={`${name} (${color})`}
              tabIndex={
                accent === color || (!ACCENT_COLORS.includes(accent) && index === 0)
                  ? 0
                  : -1
              }
              onClick={() => choose(color)}
              onKeyDown={(event) => {
                const columns = getComputedStyle(event.currentTarget.parentElement!).gridTemplateColumns.split(' ').length;
                const offset = {
                  ArrowRight: 1,
                  ArrowLeft: -1,
                  ArrowDown: columns,
                  ArrowUp: -columns,
                }[event.key];
                if (offset === undefined) return;
                event.preventDefault();
                const next = (index + offset + ACCENTS.length) % ACCENTS.length;
                choose(ACCENTS[next].color);
                (
                  event.currentTarget.parentElement?.children[
                    next
                  ] as HTMLButtonElement
                )?.focus();
              }}
              className={`appearance-swatch flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${accent === color ? 'border-amber-500 bg-amber-500/10 text-zinc-100' : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-600'}`}
            >
              <span aria-hidden="true" className="block h-5 w-5 shrink-0 border border-zinc-600/40"
                style={{ backgroundColor:color, borderRadius:'50%', outline:accent === color ? `2px solid ${color === '#ffffff' ? '#94a3b8' : color}` : undefined, outlineOffset:2 }} />
              <span className={`min-w-0 break-words text-xs leading-snug ${accent === color ? 'font-semibold' : 'font-medium'}`}>{name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            id="custom-theme-color"
            aria-label="Choose custom accent"
            type="color"
            value={accent}
            onChange={(event) => choose(event.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 p-0.5"
          />
          <label htmlFor="custom-theme-hex" className="sr-only">
            Custom accent hex color
          </label>
          <input
            id="custom-theme-hex"
            value={hexInput}
            maxLength={7}
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby="appearance-color-help"
            onChange={(event) => {
              const value = event.target.value;
              setHexInput(value);
              onInvalidColorChange(!CUSTOM_COLOR_PATTERN.test(value));
              if (CUSTOM_COLOR_PATTERN.test(value))
                onChange({
                  ...settings,
                  primaryColor: 'custom',
                  customColor: value,
                });
            }}
            className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-200"
          />
          <span className="text-xs text-zinc-500">Custom color</span>
        </div>
        <p
          id="appearance-color-help"
          className={`text-xs ${invalid ? 'text-rose-400' : 'text-zinc-500'}`}
        >
          {invalid
            ? 'Enter # followed by six hex digits.'
            : 'Choose a swatch or enter your own hex color.'}
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-400 mb-2">
          Radius
        </legend>
        <div className="flex items-center gap-2">
          {RADII.map(({ id, label, radius }) => (
            <button
              key={id}
              type="button"
              aria-label={`${label} corners`}
              title={label}
              aria-pressed={(settings.radius || 'medium') === id}
              onClick={() => onChange({ ...settings, radius: id })}
              className={`flex h-10 w-14 items-center justify-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${(settings.radius || 'medium') === id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500'}`}
            >
              <span
                className={`block h-5 w-9 border-2 ${(settings.radius || 'medium') === id ? 'border-amber-500' : 'border-zinc-500'}`}
                style={{ borderRadius: radius }}
              />
              <span className="sr-only">
                {(settings.radius || 'medium') === id ? 'Selected' : ''}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
};
