// Kept outside the 'use client' module so the server-rendered init script can read it as a plain string.
// Orbit-specific keys: the frozen theme stores its own picks under `cp-theme-*` on the same origin, and those
// must not recolour Orbit (a saved emerald there was overriding Orbit's violet default).
export const THEME_STORAGE_KEY = 'orbit-theme-mode';
export const THEME_CHANGE_EVENT = 'orbit-theme-change';

export const THEME_PALETTE_KEY = 'orbit-theme-palette';
export const THEME_PICK_KEY = 'orbit-theme-pick';
export const THEME_FONT_KEY = 'orbit-theme-font';
export const THEME_CUSTOM_EVENT = 'orbit-theme-custom';
