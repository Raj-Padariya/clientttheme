'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';
import { FrostCard } from '../dashboard/FrostCard';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import { CreateAccountModal } from './CreateAccountModal';

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

const CARD_STAGGER_MS = 70;
const MAX_SPREAD = 1.4;
const MAX_LEVERAGE = 500;
const SIGNAL_BARS = 5;

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
  submitted: (name: string) => `${name} account request submitted`,
  submittedText: 'We will notify you as soon as your account is ready.',
};

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

const modeOptions: { id: Mode; label: string; icon: 'trendUp' | 'monitor' }[] = [
  { id: 'live', label: openText.live, icon: 'trendUp' },
  { id: 'demo', label: openText.demo, icon: 'monitor' },
];

// Live / demo as two big glass keys (the picked one turns to frost) plus the currency key, docked over the plans.
function ModeDock({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const isLive = mode === 'live';

  return (
    <div className={cx('grid grid-cols-2 gap-3 animate-rise [animation-delay:60ms] motion-reduce:animate-none', isLive && 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]')}>
      <div role="radiogroup" aria-label={openText.title} className="contents">
        {modeOptions.map((item) => {
          const isActive = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(item.id)}
              className={cx(
                'group/mode relative isolate flex min-w-0 items-center gap-3 overflow-hidden rounded-[20px] p-3.5 text-left transition-[translate,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                isActive
                  ? 'nova-edge-light bg-linear-to-br from-white to-[#cfdcf0] text-[#0a1220] shadow-[0_14px_30px_-18px_rgb(0_0_0/0.8)]'
                  : 'bg-surface text-fg-muted ring-1 ring-line hover:-translate-y-0.5 hover:text-fg hover:ring-line-strong',
              )}
            >
              {isActive && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}
              <span
                className={cx(
                  'grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover/mode:scale-105 motion-reduce:transition-none',
                  isActive ? 'bg-[#0a1220] text-white' : 'nova-gloss text-primary',
                )}
              >
                <Icon name={item.icon} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-sm font-semibold', isActive ? 'text-[#0a1220]' : 'text-fg')}>{item.label}</span>
                <span className={cx('mt-0.5 block font-mono text-[10px] tracking-[0.15em]', isActive ? 'text-[#4b5a70]' : 'text-fg-subtle')}>
                  {String(accountTypes[item.id].length).padStart(2, '0')}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  'relative grid size-6 shrink-0 place-items-center rounded-full transition-all duration-300 motion-reduce:transition-none',
                  isActive ? 'scale-100 bg-[#0a1220] text-white' : 'scale-75 ring-1 ring-line-strong text-transparent',
                )}
              >
                {isActive && <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#0a1220]/30 motion-reduce:hidden" />}
                <Icon name="check" size={12} className="relative" />
              </span>
            </button>
          );
        })}
      </div>

      {isLive && (
        <div role="radiogroup" aria-label={openText.currency} className="col-span-2 sm:col-span-1">
          <span
            role="radio"
            aria-checked="true"
            className="relative flex h-full items-center gap-3 overflow-hidden rounded-[20px] bg-surface px-4 py-3 ring-1 ring-line"
          >
            <UsFlag />
            <span className="min-w-0">
              <span className="block text-[10px] tracking-[0.12em] whitespace-nowrap text-fg-subtle uppercase">{openText.currency}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-fg">
                {CURRENCY}
                <Icon name="checkCircle" size={14} className="text-success" />
              </span>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

const statLabelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';
const frostInk = 'text-[#0a1220]';
const frostMuted = 'text-[#4b5a70]';
const frostLabelClass = 'block text-[10px] tracking-[0.14em] text-[#4b5a70] uppercase';
const LEVERAGE_ARC = 'M4,21 A16,16 0 0 1 36,21';

// Leverage as a share of MAX_LEVERAGE on a small half dial.
function MiniLeverageArc({ leverage }: { leverage: number }) {
  const fill = Math.round(Math.min(leverage / MAX_LEVERAGE, 1) * 100);
  return (
    <svg viewBox="0 0 40 24" aria-hidden="true" className="h-6 w-10 shrink-0 overflow-visible">
      <path d={LEVERAGE_ARC} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-line" />
      <path
        d={LEVERAGE_ARC}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${fill} 100`}
        className="stroke-primary transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
      />
    </svg>
  );
}

function MiniSpreadBars({ spread, tone = 'brand' }: { spread: number; tone?: 'brand' | 'ink' }) {
  const lit = Math.max(1, Math.round((1 - spread / MAX_SPREAD) * SIGNAL_BARS));
  const litClass = tone === 'ink' ? 'bg-[#0a1220]' : 'bg-primary';
  const offClass = tone === 'ink' ? 'bg-[#0a1220]/15' : 'bg-line';
  return (
    <span aria-hidden="true" className="flex h-8 shrink-0 items-end gap-[3px] py-1">
      {Array.from({ length: SIGNAL_BARS }, (_, bar) => (
        <span
          key={bar}
          style={{ height: `${((bar + 1) / SIGNAL_BARS) * 100}%`, animationDelay: `${150 + bar * 60}ms` }}
          className={cx('w-1 origin-bottom animate-bar-rise rounded-full motion-reduce:animate-none', bar < lit ? litClass : offClass)}
        />
      ))}
    </span>
  );
}

// One selectable plan as a comparison lane: identity on the left, then min deposit, leverage and spread as small
// visuals in fixed columns so the plans read against each other. The full spec of the selected plan is the FrostSpec.
function PlanLane({
  type,
  index,
  total,
  maxDeposit,
  selected,
  onSelect,
}: {
  type: AccountType;
  index: number;
  total: number;
  maxDeposit: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const depositShare = maxDeposit > 0 ? Math.max((type.minDeposit / maxDeposit) * 100, 4) : 0;

  return (
    <li className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${120 + index * CARD_STAGGER_MS}ms` }}>
      <label
        className={cx(
          'group @container relative isolate block cursor-pointer overflow-hidden rounded-[22px] p-px transition-[translate,box-shadow] duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring motion-reduce:transition-none',
          selected ? 'shadow-pop' : 'hover:-translate-y-0.5 hover:shadow-pop',
        )}
      >
        <input type="radio" name="account-type" value={type.id} checked={selected} onChange={onSelect} className="sr-only" />
        <span aria-hidden="true" className="absolute inset-0 -z-20 bg-line" />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute inset-0 -z-10 animate-rim-spin transition-opacity duration-500 motion-reduce:animate-none',
            'bg-[conic-gradient(from_var(--wallet-rim),transparent_0%,var(--brand-primary)_12%,transparent_26%,transparent_50%,color-mix(in_srgb,var(--brand-primary)_50%,transparent)_62%,transparent_76%)]',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
          )}
        />

        <span
          className={cx(
            'relative isolate flex flex-col gap-4 overflow-hidden rounded-[21px] p-4 transition-colors duration-300 @xl:flex-row @xl:items-center @xl:gap-6',
            selected ? 'nova-edge-light bg-elevated' : 'bg-surface',
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 left-1/3 -z-10 text-[120px] leading-none font-black text-transparent opacity-[0.12] transition-transform duration-700 select-none [-webkit-text-stroke:1.5px_var(--brand-primary)] group-hover:-translate-y-2 group-hover:-rotate-6 motion-reduce:transition-none"
          >
            {type.name.charAt(0).toUpperCase()}
          </span>
          {selected && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}

          <span className="flex min-w-0 flex-1 items-center gap-3.5">
            <span
              className={cx(
                'relative grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold transition-[background-color,color,transform] duration-300 motion-reduce:transition-none',
                selected ? 'scale-105 bg-linear-to-br from-white to-[#cfdcf0] text-[#0a1220]' : 'nova-gloss text-fg-muted group-hover:text-fg',
              )}
            >
              {selected && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-white/40 motion-reduce:hidden" />}
              {selected ? <Icon name="check" size={18} className="relative" /> : type.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-lg font-semibold tracking-[-0.01em] text-fg">{type.name}</span>
                <span className="shrink-0 font-mono text-[10px] tracking-[0.15em] text-fg-subtle">
                  {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
                </span>
              </span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/50 px-2.5 py-0.5 text-[11px]">
                  <span className="text-fg-subtle">{openText.execution}</span>
                  <span className="font-semibold text-fg">{type.execution}</span>
                </span>
                {type.swapFreeDays !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-0.5 text-[11px] text-primary">
                    <Icon name="clock" size={11} />
                    {openText.swapFreeDays}
                    <span className="font-bold tabular-nums">{type.swapFreeDays}</span>
                  </span>
                )}
              </span>
            </span>
          </span>

          <span className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-dashed border-line pt-3 @xl:w-[380px] @xl:shrink-0 @xl:gap-5 @xl:border-t-0 @xl:border-l @xl:pt-0 @xl:pl-5">
            <span className="block min-w-0">
              <span className={statLabelClass}>{openText.minDeposit}</span>
              <span className="mt-0.5 flex items-baseline gap-1">
                <span className="truncate text-lg font-light tracking-[-0.02em] text-fg tabular-nums">{money(type.minDeposit)}</span>
                <span className="text-[10px] font-semibold text-primary">{CURRENCY}</span>
              </span>
              <span aria-hidden="true" className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full origin-left animate-grow rounded-full bg-linear-to-r from-primary/40 to-primary motion-reduce:animate-none" style={{ width: `${depositShare}%` }} />
              </span>
            </span>
            <span className="flex items-center gap-2">
              <MiniLeverageArc leverage={type.leverage} />
              <span className="min-w-0">
                <span className={statLabelClass}>{openText.leverage}</span>
                <span className="block text-sm font-semibold text-fg tabular-nums">1:{type.leverage}</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <MiniSpreadBars spread={type.spread} />
              <span className="min-w-0">
                <span className={statLabelClass}>{openText.spread}</span>
                <span className="block text-sm font-semibold text-fg tabular-nums">{type.spread}</span>
              </span>
            </span>
          </span>
        </span>
      </label>
    </li>
  );
}

const LEVERAGE_SEGMENTS = 10;

// Leverage as a row of ink segments on the frost; the share of MAX_LEVERAGE decides how many fill.
function LeverageSegments({ leverage }: { leverage: number }) {
  const lit = Math.max(1, Math.round(Math.min(leverage / MAX_LEVERAGE, 1) * LEVERAGE_SEGMENTS));
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: LEVERAGE_SEGMENTS }, (_, segment) => (
        <span
          key={segment}
          style={{ animationDelay: `${200 + segment * 50}ms` }}
          className={cx('h-3 w-1.5 origin-bottom animate-bar-rise rounded-[2px] motion-reduce:animate-none', segment < lit ? 'bg-[#0a1220]' : 'bg-[#0a1220]/15')}
        />
      ))}
    </span>
  );
}

// The selected plan as a frosted account pass: identity and amount on the glass, a perforated tear line, then the
// spec as receipt rows on a white panel, with the submit button at the foot. Re-keyed per plan to replay the entrance.
function FrostSpec({ mode, type, fund }: { mode: Mode; type: AccountType; fund: number }) {
  const isLive = mode === 'live';
  const [instrumentCount, marketList = ''] = type.instruments.split('. ');
  const markets = marketList.split(', ');
  const rowClass = 'flex items-center justify-between gap-4 py-3';

  return (
    <FrostCard>
      <div key={`${mode}-${type.id}`} className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
        <div className="flex items-center justify-between gap-2">
          <p className={cx('text-[10.5px] font-medium tracking-[0.14em] uppercase', frostMuted)}>{openText.preview}</p>
          <span className={cx('flex items-center gap-1.5 text-xs font-semibold', frostInk)}>
            <UsFlag />
            {CURRENCY}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[#0a1220] px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-white">MT5</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#0a1220] ring-1 ring-white">
            <span className="relative flex size-1.5">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-[#0a1220] motion-reduce:animate-none" />
              <span className="relative size-1.5 rounded-full bg-[#0a1220]" />
            </span>
            {isLive ? 'Live' : 'Demo'}
          </span>
        </div>

        <div className="min-w-0">
          <p className={cx('truncate text-3xl font-bold tracking-[-0.02em]', frostInk)}>{type.name}</p>
          <p className={cx('mt-1 font-mono text-sm tracking-[0.25em]', frostMuted)}>#••••••</p>
          <p className={cx('mt-0.5 text-xs', frostMuted)}>
            {type.name} · 1:{type.leverage}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={cx('text-xs', frostMuted)}>{isLive ? openText.minDeposit : openText.initialFund}</p>
            <p className={cx('mt-0.5 truncate text-4xl font-bold tracking-[-0.03em] tabular-nums', frostInk)}>${money(isLive ? type.minDeposit : fund)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/75 px-2.5 py-1 text-[11px] text-[#0a1220] ring-1 ring-white">
            <span className={frostMuted}>{openText.execution}</span> <span className="font-semibold">{type.execution}</span>
          </span>
        </div>

        <div aria-hidden="true" className="relative h-3">
          <span className="absolute inset-x-0 top-1/2 border-t-2 border-dotted border-[#0a1220]/20" />
        </div>

        <ul className="divide-y divide-[#0a1220]/10 rounded-2xl bg-white/55 px-4 ring-1 ring-white/80 backdrop-blur-md">
          {type.swapFreeDays !== undefined && (
            <li className={rowClass}>
              <span className={frostLabelClass}>{openText.swapFreeDays}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0a1220] px-2.5 py-1 text-xs font-bold text-white tabular-nums">
                <Icon name="clock" size={11} />
                {type.swapFreeDays}
              </span>
            </li>
          )}
          <li className={rowClass}>
            <span className={frostLabelClass}>{openText.leverage}</span>
            <span className="flex items-center gap-3">
              <LeverageSegments leverage={type.leverage} />
              <span className={cx('text-sm font-semibold tabular-nums', frostInk)}>upto 1:{type.leverage}</span>
            </span>
          </li>
          <li className={rowClass}>
            <span className={frostLabelClass}>{openText.spread}</span>
            <span className="flex items-center gap-3">
              <MiniSpreadBars spread={type.spread} tone="ink" />
              <span className={cx('w-8 text-right text-sm font-semibold tabular-nums', frostInk)}>{type.spread}</span>
            </span>
          </li>
          <li className={rowClass}>
            <span className={frostLabelClass}>
              {openText.minLot} / {openText.maxLot}
            </span>
            <span className={cx('flex items-center gap-2 text-sm font-semibold tabular-nums', frostInk)}>
              {money(type.minLot)}
              <span aria-hidden="true" className="relative h-px w-8 bg-linear-to-r from-[#0a1220]/25 to-[#0a1220]">
                <span className="absolute -top-[3px] -right-0.5 size-[7px] rotate-45 border-t-[1.5px] border-r-[1.5px] border-[#0a1220]" />
              </span>
              {money(type.maxLot)}
            </span>
          </li>
          <li className={rowClass}>
            <span className={frostLabelClass}>{openText.stopOut}</span>
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[#0a1220]/10">
                <span className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-[#b42318]/75 motion-reduce:animate-none" style={{ width: `${type.stopOut}%` }} />
              </span>
              <span className="text-sm font-semibold text-[#b42318] tabular-nums">{type.stopOut}%</span>
            </span>
          </li>
          <li className="py-3">
            <span className="flex items-center justify-between gap-2">
              <span className={frostLabelClass}>{openText.instruments}</span>
              <span className={cx('text-xs font-semibold', frostInk)}>{instrumentCount}.</span>
            </span>
            <span className="mt-2.5 flex flex-wrap gap-1.5">
              {markets.map((market, marketIndex) => (
                <span
                  key={market}
                  style={{ animationDelay: `${300 + marketIndex * 70}ms` }}
                  className="animate-pop-in rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[#0a1220] ring-1 ring-white motion-reduce:animate-none"
                >
                  {market}
                </span>
              ))}
            </span>
          </li>
        </ul>

        {/* Below lg the pinned action bar above the bottom tab bar carries the submit instead. */}
        <button
          type="submit"
          className="group/cta relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a1220] text-sm font-semibold text-white shadow-[0_12px_26px_-14px_rgb(10_18_32/0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] max-lg:hidden motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name="plus" size={16} className="relative transition-transform duration-300 group-hover/cta:rotate-90 motion-reduce:transition-none" />
          <span className="relative">{openText.submit}</span>
        </button>
      </div>
    </FrostCard>
  );
}

export default function OpenAccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('live');
  const [typeIds, setTypeIds] = useState<Record<Mode, string>>({ live: accountTypes.live[0].id, demo: accountTypes.demo[0].id });
  const [fundInput, setFundInput] = useState(DEFAULT_DEMO_FUND);
  const [fundInvalid, setFundInvalid] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const types = accountTypes[mode];
  const maxDeposit = Math.max(...types.map((item) => item.minDeposit));
  const type = types.find((item) => item.id === typeIds[mode]) ?? types[0];
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

  // Nova configurator: a slim header band with mode + currency, the selected plan's frosted account pass pinned on
  // the left, and the plans as comparison lanes on the right.
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
        {/* No header band: an open title with the back link above it; mode and currency live in the dock over the plans. */}
        <header className="flex animate-rise flex-col gap-2 motion-reduce:animate-none">
          <Link
            href="/accounts"
            className="group/back inline-flex w-fit items-center gap-2 rounded-full text-xs font-semibold text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="nova-gloss grid size-7 place-items-center rounded-full transition-transform duration-300 group-hover/back:-translate-x-0.5 motion-reduce:transition-none">
              <Icon name="arrowLeft" size={13} />
            </span>
            {openText.back}
          </Link>
          <div className="flex min-w-0 items-end gap-4">
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{openText.title}</h2>
            <span aria-hidden="true" className="mb-3 hidden h-px flex-1 bg-linear-to-r from-line-strong via-primary/30 to-transparent sm:block" />
          </div>
          <p className="max-w-xl text-sm text-fg-muted">{openText.subtitle}</p>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[410px_minmax(0,1fr)]">
          <aside className="order-2 min-w-0 lg:sticky lg:top-24 lg:order-1">
            <FrostSpec mode={mode} type={type} fund={isFundValid ? fund : 0} />
          </aside>

          <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
            <ModeDock mode={mode} onChange={setMode} />
            <section aria-labelledby="open-type" className="animate-rise [animation-delay:80ms] motion-reduce:animate-none">
              <h2 id="open-type" className="flex items-center gap-3 text-base font-semibold text-fg">
                {openText.chooseType}
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] font-bold text-primary">{String(types.length).padStart(2, '0')}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent" />
              </h2>
              <ul key={mode} role="radiogroup" aria-labelledby="open-type" className="mt-4 flex flex-col gap-3">
                {types.map((item, index) => (
                  <PlanLane
                    key={item.id}
                    type={item}
                    index={index}
                    total={types.length}
                    maxDeposit={maxDeposit}
                    selected={item.id === type.id}
                    onSelect={() => setTypeIds((current) => ({ ...current, [mode]: item.id }))}
                  />
                ))}
              </ul>
            </section>

            {isDemo && (
              <section aria-labelledby="open-fund" className="orbit-card nova-edge-light relative isolate animate-rise overflow-hidden p-5 [animation-delay:160ms] motion-reduce:animate-none">
                <h2 id="open-fund" className="flex items-center gap-3 text-base font-semibold text-fg">
                  <span className="nova-gloss grid size-9 place-items-center rounded-full text-primary">
                    <Icon name="deposit" size={15} />
                  </span>
                  {openText.addFund}
                </h2>
                <Field label={openText.addFund} htmlFor="demo-fund" hint={openText.fundHint} error={fundInvalid ? openText.fundError : undefined} className="mt-4 max-w-md [&>label]:sr-only">
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
          </div>
        </div>

        {/* Mobile / tablet: the chosen account and its Create button stay pinned just above the bottom tab bar. */}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3 shadow-[0_-16px_32px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">
              {type.name} · 1:{type.leverage}
            </p>
            <p className="truncate text-xs text-fg-muted">
              {isDemo ? openText.initialFund : openText.minDeposit}{' '}
              <span className="font-semibold text-primary tabular-nums">${money(isDemo ? (isFundValid ? fund : 0) : type.minDeposit)}</span>
            </p>
          </div>
          <Button type="submit" leftIcon="plus" className="relative shrink-0 overflow-hidden">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <span className="relative">{openText.submit}</span>
          </Button>
        </div>
      </form>
    </>
  );
}
