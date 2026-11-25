'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useThemeCustomizer } from '../lib/themeCustomizer';
import { useThemeMode } from '../lib/themeMode';
import { HEX_COLOR_PATTERN, fontOptions, palettePresets } from '../lib/themePalette';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';

const sectionTitle = 'text-[10px] font-bold tracking-[0.16em] text-fg-subtle uppercase';
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const HUE_STRIP =
  'linear-gradient(90deg, #ef4444, #f59e0b, #eab308, #22c55e, #14b8a6, #0ea5e9, #3b82f6, #8b5cf6, #d946ef, #ec4899, #ef4444)';

// Custom colours come from the hue strip at a fixed saturation / lightness; tokens.css re-derives the
// per-mode shades from the hue anyway, so only the hue really matters.
function hueToHex(hue: number): string {
  const saturation = 0.65;
  const lightness = 0.5;
  const amplitude = saturation * Math.min(lightness, 1 - lightness);
  // Standard HSL → RGB: red, green and blue sample the same wave at offsets 0, 8 and 4.
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const level = lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(level * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function hexToHue(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  if (delta === 0) return 0;
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return Math.round((hue * 60 + 360) % 360);
}

interface ThemeCustomizerDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ThemeCustomizerDrawer({ open, onClose }: ThemeCustomizerDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { palette, pick, font, isDefault, setPalette, setCustomColor, setFont, reset } = useThemeCustomizer();
  const { mode, setMode, canToggle } = useThemeMode();
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  // Focus moves into the drawer on open and back to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      trigger?.focus();
    };
  }, [open, onClose]);

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const hexValue = hexDraft ?? pick;
  const hexInvalid = hexDraft !== null && !HEX_COLOR_PATTERN.test(hexDraft);

  function handleHexChange(value: string) {
    const next = value.startsWith('#') ? value : `#${value}`;
    setHexDraft(next);
    if (HEX_COLOR_PATTERN.test(next)) setCustomColor(next);
  }

  return (
    <div className={cx('fixed inset-0 z-[60]', !open && 'pointer-events-none')} aria-hidden={!open}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={translate('customizer.close')}
        onClick={onClose}
        className={cx(
          'absolute inset-0 bg-overlay backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        onKeyDown={trapFocus}
        className={cx(
          'absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-line bg-surface shadow-[var(--elev-3)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="flex items-center gap-2.5 text-base font-semibold text-fg">
            <span className="grid size-9 place-items-center rounded-xl text-[#18181b] [background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]">
              <Icon name="palette" size={17} />
            </span>
            {translate('customizer.title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={translate('customizer.close')}
            className="grid size-10 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-colors hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
          {canToggle && (
            <section>
              <h3 className={sectionTitle}>{translate('customizer.mode')}</h3>
              <div role="radiogroup" aria-label={translate('customizer.mode')} className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-line">
                {(['light', 'dark'] as const).map((option) => {
                  const isActive = mode === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => setMode(option)}
                      className={cx(
                        'flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                        isActive ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      <Icon name={option === 'light' ? 'sun' : 'moon'} size={15} className={cx(isActive && 'text-primary')} />
                      {translate(option === 'light' ? 'customizer.light' : 'customizer.dark')}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className={sectionTitle}>{translate('customizer.colour')}</h3>
            <div role="radiogroup" aria-label={translate('customizer.colour')} className="mt-3 grid grid-cols-4 gap-3">
              {palettePresets.map((preset) => {
                const isActive = palette === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={translate(preset.labelKey)}
                    title={translate(preset.labelKey)}
                    onClick={() => {
                      setHexDraft(null);
                      setPalette(preset.id);
                    }}
                    className="group flex flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span
                      style={{ backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${preset.pick} 55%, white), ${preset.pick} 55%, color-mix(in oklab, ${preset.pick} 60%, black))` }}
                      className={cx(
                        'grid size-11 place-items-center rounded-full text-white ring-2 ring-offset-2 ring-offset-surface transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none',
                        isActive ? 'ring-fg' : 'ring-transparent',
                      )}
                    >
                      {isActive && <Icon name="check" size={16} strokeWidth={2.5} />}
                    </span>
                    <span className={cx('max-w-full truncate text-[11px] font-medium', isActive ? 'text-fg' : 'text-fg-muted')}>{translate(preset.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className={cx(sectionTitle, 'flex items-center justify-between')}>
              {translate('customizer.custom')}
              {palette === 'custom' && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] tracking-normal text-primary normal-case">{translate('customizer.active')}</span>}
            </h3>
            <label className="mt-3 block">
              <span className="sr-only">{translate('customizer.hue')}</span>
              <input
                type="range"
                min={0}
                max={359}
                value={hexToHue(pick)}
                onChange={(event) => {
                  setHexDraft(null);
                  setCustomColor(hueToHex(Number(event.target.value)));
                }}
                style={{ backgroundImage: HUE_STRIP }}
                className="h-3 w-full cursor-pointer appearance-none rounded-full ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-md"
              />
            </label>
            <div className="mt-3 flex items-center gap-3">
              <span aria-hidden="true" style={{ background: hexInvalid ? undefined : hexValue }} className="size-10 shrink-0 rounded-xl bg-surface-2 ring-1 ring-line" />
              <Input
                value={hexValue}
                onChange={(event) => handleHexChange(event.target.value.trim())}
                onBlur={() => setHexDraft(null)}
                maxLength={7}
                spellCheck={false}
                aria-label={translate('customizer.hex')}
                aria-invalid={hexInvalid}
                className="font-mono uppercase"
              />
            </div>
            {hexInvalid && <p className="mt-1.5 text-xs text-danger">{translate('customizer.hexError')}</p>}
          </section>

          <section>
            <h3 className={sectionTitle}>{translate('customizer.font')}</h3>
            <div role="radiogroup" aria-label={translate('customizer.font')} className="mt-3 space-y-2">
              {fontOptions.map((option) => {
                const isActive = font === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setFont(option.id)}
                    style={{ fontFamily: `var(${option.cssVar}), ui-sans-serif, system-ui, sans-serif` }}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 transition-[box-shadow,background-color] focus-visible:outline-2 focus-visible:outline-ring',
                      isActive ? 'bg-primary/[0.07] ring-primary/60' : 'ring-line hover:ring-line-strong',
                    )}
                  >
                    <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl text-lg font-semibold', isActive ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg')}>Aa</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{option.label}</span>
                      <span className="block truncate text-xs text-fg-muted">{translate('customizer.fontSample')}</span>
                    </span>
                    {isActive && <Icon name="check" size={16} className="shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>{translate('customizer.preview')}</h3>
            <div className="mt-3 space-y-4 rounded-2xl bg-surface-2/60 p-4 ring-1 ring-line">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-on-primary">{translate('customizer.previewButton')}</span>
                <span className="inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold text-[#18181b] [background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]">
                  {translate('customizer.previewGradient')}
                </span>
              </div>
              <svg viewBox="0 0 200 48" className="h-12 w-full" aria-hidden="true">
                <path d="M0 40 C30 36 40 18 70 22 S120 38 140 20 S180 6 200 10 L200 48 L0 48 Z" className="fill-primary/15" />
                <path d="M0 40 C30 36 40 18 70 22 S120 38 140 20 S180 6 200 10" fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-primary" />
              </svg>
              <p className="text-sm text-fg-muted">
                <span className="font-semibold text-primary">{translate('customizer.previewLink')}</span> · {translate('customizer.fontSample')}
              </p>
            </div>
          </section>
        </div>

        <footer className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setHexDraft(null);
              reset();
            }}
            disabled={isDefault}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-fg ring-1 ring-line transition-colors hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="refresh" size={14} />
            {translate('customizer.reset')}
          </button>
        </footer>
      </aside>
    </div>
  );
}
