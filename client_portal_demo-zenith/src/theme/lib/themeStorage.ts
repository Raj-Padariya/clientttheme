// Kept outside the 'use client' module so the server-rendered init script can read it as a plain string.
// Zenith-specific keys, so saved picks from theme one (`cp-theme-*`), Orbit (`orbit-theme-*`) and Nova (`nova-theme-*`)
// never recolour Zenith.
export const THEME_STORAGE_KEY = 'zenith-theme-mode';
export const THEME_CHANGE_EVENT = 'zenith-theme-change';

export const THEME_PALETTE_KEY = 'zenith-theme-palette';
export const THEME_PICK_KEY = 'zenith-theme-pick';
export const THEME_FONT_KEY = 'zenith-theme-font';
export const THEME_CUSTOM_EVENT = 'zenith-theme-custom';
