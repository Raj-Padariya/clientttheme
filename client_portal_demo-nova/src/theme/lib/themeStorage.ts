// Kept outside the 'use client' module so the server-rendered init script can read it as a plain string.
// Nova-specific keys: theme one (`cp-theme-*`) and Orbit (`orbit-theme-*`) run on the same localhost origin,
// and their saved picks must not recolour Nova.
export const THEME_STORAGE_KEY = 'nova-theme-mode';
export const THEME_CHANGE_EVENT = 'nova-theme-change';

export const THEME_PALETTE_KEY = 'nova-theme-palette';
export const THEME_PICK_KEY = 'nova-theme-pick';
export const THEME_FONT_KEY = 'nova-theme-font';
export const THEME_CUSTOM_EVENT = 'nova-theme-custom';
