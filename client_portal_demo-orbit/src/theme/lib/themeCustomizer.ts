'use client';

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_FONT,
  DEFAULT_PALETTE,
  HEX_COLOR_PATTERN,
  isFontId,
  isPaletteId,
  palettePresets,
  type FontId,
  type PaletteId,
} from './themePalette';
import { THEME_CUSTOM_EVENT, THEME_FONT_KEY, THEME_PALETTE_KEY, THEME_PICK_KEY } from './themeStorage';

export interface ThemeCustomization {
  palette: PaletteId;
  /** Base colour (`#rrggbb`) currently driving the brand tokens. */
  pick: string;
  font: FontId;
}

const defaultPick = palettePresets.find((preset) => preset.id === DEFAULT_PALETTE)?.pick ?? '#5ee7ff';
const defaults: ThemeCustomization = { palette: DEFAULT_PALETTE, pick: defaultPick, font: DEFAULT_FONT };

// useSyncExternalStore needs a stable snapshot, so the last read is cached by its serialised form.
let cachedKey = '';
let cachedValue: ThemeCustomization = defaults;

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_CUSTOM_EVENT, onChange);
  return () => window.removeEventListener(THEME_CUSTOM_EVENT, onChange);
}

function getSnapshot(): ThemeCustomization {
  const root = document.documentElement;
  const palette = isPaletteId(root.dataset.palette) ? root.dataset.palette : DEFAULT_PALETTE;
  const inlinePick = root.style.getPropertyValue('--brand-pick').trim();
  const pick = HEX_COLOR_PATTERN.test(inlinePick) ? inlinePick.toLowerCase() : defaultPick;
  const font = isFontId(root.dataset.font) ? root.dataset.font : DEFAULT_FONT;
  const key = `${palette}|${pick}|${font}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cachedValue = { palette, pick, font };
  }
  return cachedValue;
}

function getServerSnapshot(): ThemeCustomization {
  return defaults;
}

function persist(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the choice still applies for this page view.
  }
}

function applyPalette(palette: PaletteId, pick: string): void {
  const root = document.documentElement;
  // The default palette is the hand-tuned Orbit cyan in tokens.css, so it clears every override.
  if (palette === DEFAULT_PALETTE) {
    delete root.dataset.palette;
    root.style.removeProperty('--brand-pick');
    persist(THEME_PALETTE_KEY, null);
    persist(THEME_PICK_KEY, null);
  } else {
    root.dataset.palette = palette;
    root.style.setProperty('--brand-pick', pick);
    persist(THEME_PALETTE_KEY, palette);
    persist(THEME_PICK_KEY, pick);
  }
  window.dispatchEvent(new Event(THEME_CUSTOM_EVENT));
}

export function setPalette(palette: Exclude<PaletteId, 'custom'>): void {
  const preset = palettePresets.find((item) => item.id === palette);
  if (!preset) return;
  applyPalette(preset.id, preset.pick);
}

export function setCustomColor(hex: string): void {
  if (!HEX_COLOR_PATTERN.test(hex)) return;
  applyPalette('custom', hex.toLowerCase());
}

export function setFont(font: FontId): void {
  if (!isFontId(font)) return;
  const root = document.documentElement;
  if (font === DEFAULT_FONT) {
    delete root.dataset.font;
    persist(THEME_FONT_KEY, null);
  } else {
    root.dataset.font = font;
    persist(THEME_FONT_KEY, font);
  }
  window.dispatchEvent(new Event(THEME_CUSTOM_EVENT));
}

export function resetCustomization(): void {
  setFont(DEFAULT_FONT);
  setPalette(DEFAULT_PALETTE);
}

export function useThemeCustomizer() {
  const { palette, pick, font } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    palette,
    pick,
    font,
    isDefault: palette === DEFAULT_PALETTE && font === DEFAULT_FONT,
    setPalette,
    setCustomColor,
    setFont,
    reset: resetCustomization,
  };
}
