import type { MessageKey } from '@/core/i18n';

// Plain module (no 'use client') so the server-rendered init script in meta.ts can read the same lists.

export type PalettePresetId = 'gold' | 'emerald' | 'sapphire' | 'royal' | 'ruby' | 'teal' | 'rose';
export type PaletteId = PalettePresetId | 'custom';
export type FontId = 'vietnam' | 'ubuntu' | 'sora' | 'manrope' | 'jakarta' | 'urbanist' | 'dmsans' | 'grotesk';

// Nova's own "Frost" palette keeps the stored id `teal`, so a saved choice from before the recolour still resolves.
export const DEFAULT_PALETTE: PalettePresetId = 'teal';
export const DEFAULT_FONT: FontId = 'vietnam';

export interface PalettePreset {
  id: PalettePresetId;
  labelKey: MessageKey;
  /** Base colour; tokens.css derives every brand shade from it for the current mode. */
  pick: string;
}

/** Frost is the theme's own palette: choosing it removes `data-palette`, so tokens.css applies untouched. */
export const palettePresets: readonly PalettePreset[] = [
  { id: 'teal', labelKey: 'customizer.paletteTeal', pick: '#a9c9f0' },
  { id: 'sapphire', labelKey: 'customizer.paletteSapphire', pick: '#5ee7ff' },
  { id: 'royal', labelKey: 'customizer.paletteRoyal', pick: '#8b5cf6' },
  { id: 'emerald', labelKey: 'customizer.paletteEmerald', pick: '#10b981' },
  { id: 'gold', labelKey: 'customizer.paletteGold', pick: '#c9a45c' },
  { id: 'ruby', labelKey: 'customizer.paletteRuby', pick: '#e11d48' },
  { id: 'rose', labelKey: 'customizer.paletteRose', pick: '#ec4899' },
];

export interface FontOption {
  id: FontId;
  /** Family names are proper nouns, so they are not translated. */
  label: string;
  /** Variable set by next/font in meta.ts; tokens.css points --font-brand at it. */
  cssVar: string;
}

export const fontOptions: readonly FontOption[] = [
  // The default font must stay first: the boot script in app/layout.tsx skips index 0 as "no override".
  { id: 'vietnam', label: 'Be Vietnam Pro', cssVar: '--font-opt-vietnam' },
  { id: 'ubuntu', label: 'Ubuntu', cssVar: '--font-opt-ubuntu' },
  { id: 'sora', label: 'Sora', cssVar: '--font-opt-sora' },
  { id: 'manrope', label: 'Manrope', cssVar: '--font-opt-manrope' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', cssVar: '--font-opt-jakarta' },
  { id: 'urbanist', label: 'Urbanist', cssVar: '--font-opt-urbanist' },
  { id: 'dmsans', label: 'DM Sans', cssVar: '--font-opt-dmsans' },

  { id: 'grotesk', label: 'Space Grotesk', cssVar: '--font-opt-grotesk' },
];

/** Only `#rrggbb` is accepted, so a tampered storage value can never inject CSS. */
export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isPaletteId(value: unknown): value is PaletteId {
  return value === 'custom' || palettePresets.some((preset) => preset.id === value);
}

export function isFontId(value: unknown): value is FontId {
  return fontOptions.some((font) => font.id === value);
}
