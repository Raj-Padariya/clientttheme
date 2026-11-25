// Kept outside the 'use client' module so the server-rendered init script can read it as a plain string.
// Aurora-specific keys, so saved picks from theme one (`cp-theme-*`), Orbit (`orbit-theme-*`), Nova (`nova-theme-*`)
// and Zenith (`zenith-theme-*`) never recolour Aurora.
export const THEME_STORAGE_KEY = 'aurora-theme-mode';
export const THEME_CHANGE_EVENT = 'aurora-theme-change';

export const THEME_PALETTE_KEY = 'aurora-theme-palette';
export const THEME_PICK_KEY = 'aurora-theme-pick';
export const THEME_FONT_KEY = 'aurora-theme-font';
export const THEME_CUSTOM_EVENT = 'aurora-theme-custom';
