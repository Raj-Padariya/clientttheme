'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { boardCard, headerIconButton, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { Icon } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import { CreateAccountModal } from './CreateAccountModal';

/*
 * Aurora open-account: mode as two glass tiles (the picked one carries a running light beam round its border), the
 * plans on a rotary dial that springs round to put the picked plan under the pointer, and beside it a build panel
 * where the new account's spec stacks up as a ladder, with a light running down the rail and the submit at the foot.
 */

type Mode = 'live' | 'demo';

interface AccountType {
  id: string;
  name: string;
  minDeposit: number;
  spread: number;
  leverage: number;
  execution: string;
  swapFreeDays?: number;
  minLot: number;
  maxLot: number;
  stopOut: number;
  instruments: string;
}

const INSTRUMENTS = '+300 Instruments. Forex, Metals, Indices, Energy';
const CURRENCY = 'USD';
const DEFAULT_DEMO_FUND = '1000';

const MAX_SPREAD = 1.4;
const MAX_LEVERAGE = 500;
const SIGNAL_BARS = 5;
const LEVERAGE_SEGMENTS = 10;
/** Degrees between neighbouring plans on the dial; plans more than DIAL_VISIBLE_ANGLE from the pointer fade out. */
const DIAL_STEP = 34;
const DIAL_VISIBLE_ANGLE = 80;
const DIAL_TICKS = Array.from({ length: 72 }, (_, index) => index);
const INK_ON_PRIMARY = 'text-[#13201a]';

const accountTypes: Record<Mode, AccountType[]> = {
  live: [
    { id: 'standard', name: 'Standard', minDeposit: 10, spread: 1.4, leverage: 500, execution: 'Hedging', minLot: 0.01, maxLot: 100, stopOut: 30, instruments: INSTRUMENTS },
    { id: 'pro', name: 'Pro', minDeposit: 2500, spread: 0.9, leverage: 400, execution: 'Market Execution', swapFreeDays: 21, minLot: 0.01, maxLot: 100, stopOut: 30, instruments: INSTRUMENTS },
    { id: 'ecn', name: 'ECN', minDeposit: 5000, spread: 0.1, leverage: 300, execution: 'Market Execution', swapFreeDays: 21, minLot: 0.01, maxLot: 100, stopOut: 30, instruments: INSTRUMENTS },
    { id: 'cent-15', name: 'Cent 15', minDeposit: 100, spread: 0.9, leverage: 500, execution: 'Hedging', minLot: 0.01, maxLot: 100, stopOut: 30, instruments: INSTRUMENTS },
    { id: 'cent-20', name: 'cent 20', minDeposit: 2500, spread: 0.9, leverage: 400, execution: 'Hedging', minLot: 0.01, maxLot: 100, stopOut: 30, instruments: INSTRUMENTS },
  ],
  demo: [{ id: 'demo', name: 'demo', minDeposit: 100, spread: 0.9, leverage: 400, execution: 'Hedging', minLot: 0.01, maxLot: 100, stopOut: 30, instruments: INSTRUMENTS }],
};

const openText = {
  title: 'Open Account',
  subtitle: 'Pick live or demo, choose the account type that fits your trading, and submit.',
  back: 'Back to Accounts',
  live: 'Live Account',
  demo: 'Demo Account',
  currency: 'Account Currency',
  chooseType: 'Choose An Account Type',
  addFund: 'Add Fund',
  fundHint: 'Enter the initial fund amount for your demo account',
  fundError: 'Enter an amount greater than 0',
  submit: 'Submit',
  preview: 'Your new account',
  instruments: 'Instruments',
  spread: 'Spread',
  leverage: 'Leverage',
  minDeposit: 'Min Deposit',
  execution: 'Execution',
  swapFreeDays: 'Swap Free Days',
  minLot: 'Min Lot Size',
  maxLot: 'Max Lot Size',
  stopOut: 'Stop Out Level',
  initialFund: 'Initial Fund',
  previous: 'Previous',
  next: 'Next',
  submitted: (name: string) => `${name} account request submitted`,
  submittedText: 'We will notify you as soon as your account is ready.',
};

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const labelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

function money(value: number) {
  return value.toFixed(2);
}

function UsFlag() {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true" className="h-5 w-7 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-fg/15">
      <rect width="28" height="20" fill="#fff" />
      {Array.from({ length: 7 }, (_, index) => (
        <rect key={index} y={index * (20 / 6.5)} width="28" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="12" height={(20 / 13) * 7} fill="#3c3b6e" />
    </svg>
  );
}

function WaveLines({ color = 'white', opacity = 0.45 }: { color?: string; opacity?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-[200%]">
      {WAVE_PATHS.map((path) => (
        <path key={path} d={path} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function SubmitButton({ className }: { className?: string }) {
  return (
    <button
      type="submit"
      className={cx(
        'group/cta relative isolate inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-(--hero-buy) px-7 text-sm font-bold shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_26px_-14px_var(--hero-buy)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
        INK_ON_PRIMARY,
        focusRing,
        className,
      )}
    >
      <WaveLines />
      <span aria-hidden="true" className="aurora-deck-sheen pointer-events-none absolute inset-0 -z-10" />
      <Icon name="plus" size={16} className="transition-transform duration-300 group-hover/cta:rotate-90 motion-reduce:transition-none" />
      {openText.submit}
    </button>
  );
}

function SpreadBars({ spread }: { spread: number }) {
  const lit = Math.max(1, Math.round((1 - spread / MAX_SPREAD) * SIGNAL_BARS));
  return (
    <span aria-hidden="true" className="flex h-6 shrink-0 items-end gap-[3px]">
      {Array.from({ length: SIGNAL_BARS }, (_, bar) => (
        <span
          key={bar}
          style={{ height: `${((bar + 1) / SIGNAL_BARS) * 100}%`, animationDelay: `${150 + bar * 60}ms` }}
          className={cx('w-1.5 origin-bottom animate-bar-rise rounded-full motion-reduce:animate-none', bar < lit ? 'bg-(--hero-buy)' : 'bg-fg/12')}
        />
      ))}
    </span>
  );
}

function LeverageSegments({ leverage }: { leverage: number }) {
  const lit = Math.max(1, Math.round(Math.min(leverage / MAX_LEVERAGE, 1) * LEVERAGE_SEGMENTS));
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: LEVERAGE_SEGMENTS }, (_, segment) => (
        <span
          key={segment}
          style={{ animationDelay: `${200 + segment * 50}ms` }}
          className={cx('h-3.5 w-1.5 origin-bottom animate-bar-rise rounded-full motion-reduce:animate-none', segment < lit ? 'bg-(--hero-buy)' : 'bg-fg/12')}
        />
      ))}
    </span>
  );
}

/* ───────────── Mode tiles ───────────── */

const modeOptions: { id: Mode; label: string; icon: 'trendUp' | 'monitor' }[] = [
  { id: 'live', label: openText.live, icon: 'trendUp' },
  { id: 'demo', label: openText.demo, icon: 'monitor' },
];

/** Live / demo as two glass tiles; the picked one gets a light beam running round its border and a pulsing icon. */
function ModeTiles({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label={openText.title} className="grid grid-cols-2 gap-3">
      {modeOptions.map((item) => {
        const isActive = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(item.id)}
            className={cx('relative isolate overflow-hidden rounded-[22px] p-[1.5px] text-left transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none', focusRing)}
          >
            <span aria-hidden="true" className={cx('aurora-beam absolute -inset-[80%] -z-10 transition-opacity duration-500', isActive ? 'opacity-100' : 'opacity-0')} />
            <span className={cx('flex h-full min-w-0 items-center gap-3 rounded-[20.5px] p-3 transition-colors duration-300 sm:p-4', isActive ? 'bg-surface' : 'bg-fg/[0.04] ring-1 ring-fg/10 ring-inset hover:bg-fg/[0.07]')}>
              <span
                className={cx(
                  'relative grid size-11 shrink-0 place-items-center rounded-2xl transition-colors duration-300',
                  isActive ? cx('bg-(--hero-buy)', INK_ON_PRIMARY) : 'bg-fg/[0.07] text-fg-muted',
                )}
              >
                {isActive && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-2xl bg-(--hero-buy)/40 motion-reduce:hidden" />}
                <Icon name={item.icon} size={18} className="relative" />
              </span>
              <span className="min-w-0">
                <span className={cx('block truncate text-sm font-semibold sm:text-base', isActive ? 'text-fg' : 'text-fg-muted')}>{item.label}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-fg-subtle">{String(accountTypes[item.id].length).padStart(2, '0')}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CurrencyChip() {
  return (
    <div role="radiogroup" aria-label={openText.currency}>
      <span role="radio" aria-checked="true" className="inline-flex items-center gap-3 rounded-full bg-fg/[0.05] py-2 pr-4 pl-2.5 ring-1 ring-fg/10">
        <UsFlag />
        <span className="text-[10px] tracking-[0.12em] whitespace-nowrap text-fg-subtle uppercase">{openText.currency}</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          {CURRENCY}
          <Icon name="checkCircle" size={14} className="text-success" />
        </span>
      </span>
    </div>
  );
}

/* ───────────── Rotary plan dial ───────────── */

interface PlanDialProps {
  types: AccountType[];
  selectedIndex: number;
  maxDeposit: number;
  onSelect: (index: number) => void;
}

/**
 * The plans sit on the rim of a half dial. The wheel turns so the picked plan lands under the pointer; each plan
 * counter-rotates by the same amount on the same curve, so its label stays upright while the wheel springs round.
 */
function PlanDial({ types, selectedIndex, maxDeposit, onSelect }: PlanDialProps) {
  const rotation = -selectedIndex * DIAL_STEP;
  const selected = types[selectedIndex];
  const depositShare = maxDeposit > 0 ? Math.max((selected.minDeposit / maxDeposit) * 100, 4) : 0;
  const canStep = types.length > 1;
  const step = (delta: number) => onSelect((selectedIndex + delta + types.length) % types.length);
  const wheelMotion = 'duration-[900ms] ease-[cubic-bezier(.34,1.35,.64,1)] motion-reduce:transition-none';

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-[1.75] w-full max-w-[560px] overflow-hidden">
        <span aria-hidden="true" className="aurora-ring-glow absolute top-0 left-1/2 h-[42%] w-28 -translate-x-1/2 rounded-b-full bg-linear-to-b from-(--hero-buy)/40 to-transparent blur-xl" />
        <span aria-hidden="true" className="absolute top-[2%] left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-x-[8px] border-t-[11px] border-x-transparent border-t-(--hero-buy) drop-shadow-[0_0_6px_var(--hero-buy)]" />

        <div role="radiogroup" aria-labelledby="open-type" className={cx('absolute inset-0 origin-[50%_100%] transition-[rotate]', wheelMotion)} style={{ rotate: `${rotation}deg` }}>
          <svg viewBox="0 0 175 100" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
            {DIAL_TICKS.map((tick) => (
              <line
                key={tick}
                x1="87.5"
                y1={tick % 6 === 0 ? 3 : 5}
                x2="87.5"
                y2="9"
                stroke="var(--color-fg)"
                strokeOpacity={tick % 6 === 0 ? 0.4 : 0.15}
                strokeWidth={tick % 6 === 0 ? 0.7 : 0.45}
                strokeLinecap="round"
                transform={`rotate(${tick * 5} 87.5 100)`}
              />
            ))}
            <circle cx="87.5" cy="100" r="80" fill="none" stroke="var(--color-fg)" strokeOpacity={0.14} strokeWidth={0.6} strokeDasharray="1.5 2.5" />
            <circle cx="87.5" cy="100" r="62" fill="none" stroke="var(--color-fg)" strokeOpacity={0.08} strokeWidth={0.5} />
          </svg>

          {types.map((type, index) => {
            const angle = index * DIAL_STEP;
            const isSelected = index === selectedIndex;
            const isVisible = Math.abs(angle + rotation) <= DIAL_VISIBLE_ANGLE;
            return (
              <span key={type.id} className="absolute bottom-0 left-1/2 h-[80%] w-0 origin-bottom" style={{ rotate: `${angle}deg` }}>
                <label
                  className={cx(
                    'group absolute top-0 left-0 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-1.5 transition-[rotate,opacity] has-[:focus-visible]:[&>span:first-of-type]:outline-2 has-[:focus-visible]:[&>span:first-of-type]:outline-offset-4 has-[:focus-visible]:[&>span:first-of-type]:outline-ring',
                    wheelMotion,
                  )}
                  style={{ rotate: `${-(angle + rotation)}deg`, opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? undefined : 'none' }}
                >
                  <input type="radio" name="account-type" value={type.id} checked={isSelected} onChange={() => onSelect(index)} tabIndex={isVisible ? undefined : -1} className="sr-only" />
                  <span
                    className={cx(
                      'relative grid size-12 place-items-center rounded-full text-sm font-bold transition-[background-color,color,scale] duration-500 sm:size-14',
                      isSelected ? cx('scale-110 bg-(--hero-buy) shadow-[0_0_24px_-4px_var(--hero-buy)]', INK_ON_PRIMARY) : 'aurora-chip text-fg-muted group-hover:scale-105 group-hover:text-fg',
                    )}
                  >
                    {isSelected && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy)/40 motion-reduce:hidden" />}
                    {isSelected ? <Icon name="check" size={18} className="relative" /> : type.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={cx('text-[11px] font-semibold whitespace-nowrap sm:text-xs', isSelected ? 'text-fg' : 'text-fg-subtle')}>{type.name}</span>
                </label>
              </span>
            );
          })}
        </div>

        <div key={selected.id} className="absolute inset-x-[24%] bottom-0 flex animate-rise flex-col items-center text-center motion-reduce:animate-none">
          <span className="font-mono text-[10px] tracking-[0.15em] text-fg-subtle">
            {String(selectedIndex + 1).padStart(2, '0')}/{String(types.length).padStart(2, '0')}
          </span>
          <span className="mt-1 max-w-full truncate text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">{selected.name}</span>
          <span className={cx(labelClass, 'mt-2')}>{openText.minDeposit}</span>
          <span className="flex items-baseline gap-1">
            <span className="text-xl font-light tracking-[-0.02em] text-fg tabular-nums sm:text-2xl">{money(selected.minDeposit)}</span>
            <span className="text-[10px] font-semibold text-(--hero-buy)">{CURRENCY}</span>
          </span>
        </div>
      </div>

      <span aria-hidden="true" className="mx-auto block h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-fg/[0.08]">
        <span key={selected.id} className="block h-full origin-left animate-grow rounded-full bg-(--hero-buy) motion-reduce:animate-none" style={{ width: `${depositShare}%` }} />
      </span>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => step(-1)} disabled={!canStep} aria-label={openText.previous} title={openText.previous} className={cx(headerIconButton, 'disabled:opacity-40')}>
          <Icon name="chevronDown" size={16} className="rotate-90" />
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-2.5 py-1 text-[11px] ring-1 ring-fg/10">
          <span className="text-fg-subtle">{openText.execution}</span>
          <span className="font-semibold text-fg">{selected.execution}</span>
        </span>
        {selected.swapFreeDays !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-(--hero-buy)/12 px-2.5 py-1 text-[11px] text-(--hero-buy) ring-1 ring-(--hero-buy)/35">
            <Icon name="clock" size={11} />
            {openText.swapFreeDays}
            <span className="font-bold tabular-nums">{selected.swapFreeDays}</span>
          </span>
        )}
        <button type="button" onClick={() => step(1)} disabled={!canStep} aria-label={openText.next} title={openText.next} className={cx(headerIconButton, 'disabled:opacity-40')}>
          <Icon name="chevronDown" size={16} className="-rotate-90" />
        </button>
      </div>
    </div>
  );
}

/* ───────────── Build panel ───────────── */

interface Spec {
  key: string;
  label: ReactNode;
  value: ReactNode;
  visual?: ReactNode;
}

/**
 * The picked plan as the account being built: identity and amount on top, then every spec as a rung on a ladder
 * whose rail carries a running light. Re-keyed per plan so the rungs stack in again whenever the pick changes.
 */
function BuildPanel({ mode, type, fund }: { mode: Mode; type: AccountType; fund: number }) {
  const isLive = mode === 'live';
  const [instrumentCount, marketList = ''] = type.instruments.split('. ');
  const markets = marketList.split(', ');

  const specs: Spec[] = [
    { key: 'leverage', label: openText.leverage, value: `upto 1:${type.leverage}`, visual: <LeverageSegments leverage={type.leverage} /> },
    { key: 'spread', label: openText.spread, value: type.spread, visual: <SpreadBars spread={type.spread} /> },
    { key: 'execution', label: openText.execution, value: type.execution },
    ...(type.swapFreeDays !== undefined
      ? [
          {
            key: 'swap',
            label: openText.swapFreeDays,
            value: (
              <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-(--hero-buy) px-2.5 py-1 text-xs font-bold tabular-nums', INK_ON_PRIMARY)}>
                <Icon name="clock" size={11} />
                {type.swapFreeDays}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'lots',
      label: `${openText.minLot} / ${openText.maxLot}`,
      value: (
        <span className="flex items-center gap-2">
          {money(type.minLot)}
          <span aria-hidden="true" className="relative h-px w-6 bg-linear-to-r from-fg/20 to-(--hero-buy)">
            <span className="absolute -top-[3px] -right-0.5 size-[7px] rotate-45 border-t-[1.5px] border-r-[1.5px] border-(--hero-buy)" />
          </span>
          {money(type.maxLot)}
        </span>
      ),
    },
    {
      key: 'stopOut',
      label: openText.stopOut,
      value: <span className="text-(--zenith-red)">{type.stopOut}%</span>,
      visual: (
        <span aria-hidden="true" className="relative block h-1.5 w-20 overflow-hidden rounded-full bg-fg/[0.08]">
          <span className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-(--zenith-red) motion-reduce:animate-none" style={{ width: `${type.stopOut}%` }} />
        </span>
      ),
    },
    {
      key: 'instruments',
      label: openText.instruments,
      value: `${instrumentCount}.`,
      visual: (
        <span className="flex flex-wrap justify-end gap-1.5">
          {markets.map((market, marketIndex) => (
            <span
              key={market}
              style={{ animationDelay: `${500 + marketIndex * 70}ms` }}
              className="animate-pop-in rounded-full bg-fg/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-fg ring-1 ring-fg/10 motion-reduce:animate-none"
            >
              {market}
            </span>
          ))}
        </span>
      ),
    },
  ];

  return (
    <section aria-labelledby="open-preview" className={cx(boardCard, 'relative isolate flex flex-col gap-5 overflow-hidden p-5 sm:p-6 lg:sticky lg:top-6')}>
      <span aria-hidden="true" className="aurora-drift pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full bg-(--hero-buy) opacity-[0.14] blur-[70px]" />

      <div className="flex flex-wrap items-center gap-2">
        <p id="open-preview" className="mr-auto text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
          {openText.preview}
        </p>
        <span className="rounded-lg bg-fg px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-surface">MT5</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.06] px-2.5 py-1 text-[11px] font-semibold text-fg ring-1 ring-fg/10">
          <span className="relative flex size-1.5">
            <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy) motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-(--hero-buy)" />
          </span>
          {isLive ? 'Live' : 'Demo'}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          <UsFlag />
          {CURRENCY}
        </span>
      </div>

      <div key={`${mode}-${type.id}`} className="flex flex-col gap-5">
        <div className="aurora-panel-in aurora-chip relative isolate overflow-hidden rounded-[24px] p-5">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 overflow-hidden opacity-70">
            <WaveLines color="var(--hero-buy)" opacity={0.35} />
          </span>
          <p className="truncate text-3xl font-semibold tracking-[-0.02em] text-fg">{type.name}</p>
          <p aria-hidden="true" className="mt-1 flex gap-1 font-mono text-sm text-fg-muted">
            #
            {Array.from({ length: 6 }, (_, dot) => (
              <span key={dot} className="animate-blink motion-reduce:animate-none" style={{ animationDelay: `${dot * 140}ms` }}>
                •
              </span>
            ))}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {type.name} · 1:{type.leverage}
          </p>
          <p className="mt-4 text-xs text-fg-muted">{isLive ? openText.minDeposit : openText.initialFund}</p>
          <p className="mt-0.5 truncate text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">${money(isLive ? type.minDeposit : fund)}</p>
        </div>

        <dl className="relative flex flex-col gap-2 pl-7">
          <span aria-hidden="true" className="absolute top-3 bottom-3 left-[10px] w-px bg-fg/12">
            <span className="aurora-ladder-dot absolute left-1/2 size-2 -translate-x-1/2 rounded-full bg-(--hero-buy) shadow-[0_0_12px_3px_var(--hero-buy)]" />
          </span>
          {specs.map((spec, index) => (
            <div
              key={spec.key}
              className="aurora-panel-in relative flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl bg-fg/[0.03] px-3.5 py-3 ring-1 ring-fg/[0.07]"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <span aria-hidden="true" className="absolute top-1/2 -left-[22px] size-2.5 -translate-y-1/2 rounded-full border-2 border-(--hero-buy) bg-surface" />
              <div className="min-w-0">
                <dt className={labelClass}>{spec.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-fg tabular-nums">{spec.value}</dd>
              </div>
              {spec.visual && <div aria-hidden="true">{spec.visual}</div>}
            </div>
          ))}
        </dl>
      </div>

      {/* Below lg the pinned action bar above the bottom tab bar carries the submit instead. */}
      <SubmitButton className="h-14 w-full max-lg:hidden" />
    </section>
  );
}

/* ───────────── Page ───────────── */

export default function OpenAccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('live');
  const [typeIds, setTypeIds] = useState<Record<Mode, string>>({ live: accountTypes.live[0].id, demo: accountTypes.demo[0].id });
  const [fundInput, setFundInput] = useState(DEFAULT_DEMO_FUND);
  const [fundInvalid, setFundInvalid] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const types = accountTypes[mode];
  const maxDeposit = Math.max(...types.map((item) => item.minDeposit));
  const selectedIndex = Math.max(
    types.findIndex((item) => item.id === typeIds[mode]),
    0,
  );
  const type = types[selectedIndex];
  const fund = Number(fundInput);
  const isFundValid = Number.isFinite(fund) && fund > 0;
  const isDemo = mode === 'demo';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDemo && !isFundValid) {
      setFundInvalid(true);
      // The sticky mobile bar can submit while the fund field is off-screen, so bring the error into view.
      document.getElementById('open-fund')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsSettingPassword(true);
  }

  function handleCreated() {
    toast(openText.submitted(type.name), { description: openText.submittedText });
    router.push('/accounts');
  }

  return (
    <>
      {isSettingPassword && (
        <CreateAccountModal
          summary={{
            isLive: !isDemo,
            typeName: type.name,
            leverage: type.leverage,
            amountLabel: isDemo ? openText.initialFund : openText.minDeposit,
            amount: money(isDemo ? fund : type.minDeposit),
            currency: CURRENCY,
          }}
          onClose={() => setIsSettingPassword(false)}
          onCreated={handleCreated}
        />
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <header className="flex animate-rise flex-col gap-1 motion-reduce:animate-none">
          <Link
            href="/accounts"
            className={cx('group/back inline-flex w-fit items-center gap-2 rounded-full text-xs font-semibold text-fg-muted transition-colors hover:text-fg', focusRing)}
          >
            <span className="grid size-7 place-items-center rounded-full ring-1 ring-fg/15 transition-transform duration-300 group-hover/back:-translate-x-0.5 motion-reduce:transition-none">
              <Icon name="arrowLeft" size={13} />
            </span>
            {openText.back}
          </Link>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-fg sm:text-4xl">{openText.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">{openText.subtitle}</p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section aria-labelledby="open-type" className={cx(boardCard, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 sm:p-6')}>
            <ModeTiles mode={mode} onChange={setMode} />
            {!isDemo && <CurrencyChip />}

            <h2 id="open-type" className="flex items-center gap-3 text-base font-semibold text-fg">
              {openText.chooseType}
              <span className="rounded-full bg-(--hero-buy)/12 px-2 py-0.5 font-mono text-[11px] font-bold text-(--hero-buy)">{String(types.length).padStart(2, '0')}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-fg/15 to-transparent" />
            </h2>

            <PlanDial
              key={mode}
              types={types}
              selectedIndex={selectedIndex}
              maxDeposit={maxDeposit}
              onSelect={(index) => setTypeIds((current) => ({ ...current, [mode]: types[index].id }))}
            />

            {isDemo && (
              <section aria-labelledby="open-fund" className="aurora-panel-in rounded-[22px] bg-fg/[0.03] p-4 ring-1 ring-fg/[0.07] sm:p-5">
                <h2 id="open-fund" className="flex items-center gap-3 text-base font-semibold text-fg">
                  <span className={cx('grid size-10 place-items-center rounded-full bg-(--hero-buy)', INK_ON_PRIMARY)}>
                    <Icon name="deposit" size={16} />
                  </span>
                  {openText.addFund}
                </h2>
                <Field label={openText.addFund} htmlFor="demo-fund" hint={openText.fundHint} error={fundInvalid ? openText.fundError : undefined} className="mt-4 [&>label]:sr-only">
                  <Input
                    id="demo-fund"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="1"
                    leftIcon="deposit"
                    value={fundInput}
                    invalid={fundInvalid}
                    onChange={(event) => {
                      setFundInput(event.target.value);
                      setFundInvalid(false);
                    }}
                    className="text-lg font-semibold tabular-nums"
                    rightSlot={<span className="pr-3 text-sm text-fg-subtle">{CURRENCY}</span>}
                  />
                </Field>
              </section>
            )}
          </section>

          <BuildPanel mode={mode} type={type} fund={isFundValid ? fund : 0} />
        </div>

        {/* Mobile / tablet: the chosen account and its submit stay pinned just above the bottom tab bar. */}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-full bg-surface/90 py-2 pr-2 pl-5 shadow-[0_-16px_32px_-20px_rgb(0_0_0/0.6)] ring-1 ring-fg/10 backdrop-blur-xl lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">
              {type.name} · 1:{type.leverage}
            </p>
            <p className="truncate text-xs text-fg-muted">
              {isDemo ? openText.initialFund : openText.minDeposit}{' '}
              <span className="font-semibold text-(--hero-buy) tabular-nums">${money(isDemo ? (isFundValid ? fund : 0) : type.minDeposit)}</span>
            </p>
          </div>
          <SubmitButton className="h-11 px-5" />
        </div>
      </form>
    </>
  );
}
