'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { brandConfig } from '@/core/broker/config';
import type { ThemeMode } from '@/core/broker/types';
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from './themeStorage';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function getSnapshot(): ThemeMode {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function getServerSnapshot(): ThemeMode {
  return brandConfig.defaultMode;
}

export function setThemeMode(mode: ThemeMode): void {
  if (!brandConfig.allowedModes.includes(mode)) return;
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked (private mode); the mode still applies for this page view.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useThemeMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => setThemeMode(mode === 'dark' ? 'light' : 'dark'), [mode]);

  return {
    mode,
    toggle,
    setMode: setThemeMode,
    canToggle: brandConfig.allowedModes.length > 1,
  };
}
