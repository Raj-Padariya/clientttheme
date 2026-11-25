'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';

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

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const modes: { id: Mode; label: string; icon: 'trendUp' | 'monitor' }[] = [
    { id: 'live', label: openText.live, icon: 'trendUp' },
    { id: 'demo', label: openText.demo, icon: 'monitor' },
  ];
  return (
    <div role="radiogroup" aria-label={openText.title} className="relative grid w-full grid-cols-2 rounded-full border border-line bg-surface/70 p-1 sm:w-[360px]">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] overflow-hidden rounded-full bg-[image:var(--brand-gradient)] shadow-[0_8px_24px_-8px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)] motion-reduce:transition-none',
          mode === 'demo' && 'translate-x-full',
        )}
      >
        <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-white/30 to-transparent motion-reduce:animate-none" />
      </span>
      {modes.map((item) => {
        const isActive = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(item.id)}
            className={cx(
              'relative z-10 flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isActive ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

const statLabelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

// Leverage as a share of MAX_LEVERAGE on a small ring.
function MiniLeverageRing({ leverage }: { leverage: number }) {
  const fill = Math.round(Math.min(leverage / MAX_LEVERAGE, 1) * 100);
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="size-9 shrink-0 -rotate-90">
      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" className="stroke-line" />
      <circle
        cx="18"
        cy="18"
        r="14"
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

function MiniSpreadBars({ spread }: { spread: number }) {
  const lit = Math.max(1, Math.round((1 - spread / MAX_SPREAD) * SIGNAL_BARS));
  return (
    <span aria-hidden="true" className="flex h-9 shrink-0 items-end gap-[3px] py-1">
      {Array.from({ length: SIGNAL_BARS }, (_, bar) => (
        <span
          key={bar}
          style={{ height: `${((bar + 1) / SIGNAL_BARS) * 100}%` }}
          className={cx('w-1 rounded-full', bar < lit ? 'bg-primary' : 'bg-line')}
        />
      ))}
    </span>
  );
}

// One selectable plan as a "tier pass": a striped cover with the plan's monogram, then its key numbers as
// small visuals. The full spec of the selected plan is shown in the SpecSheet.
function PlanTile({
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
          'group relative isolate block h-full cursor-pointer overflow-hidden rounded-[22px] p-px transition-[translate,box-shadow] duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring motion-reduce:transition-none',
          selected ? 'shadow-[0_26px_50px_-30px_var(--brand-primary)]' : 'hover:-translate-y-1 hover:shadow-pop',
        )}
      >
        <input type="radio" name="account-type" value={type.id} checked={selected} onChange={onSelect} className="sr-only" />
        <span aria-hidden="true" className={cx('absolute inset-0 -z-20 transition-colors duration-300', selected ? 'bg-primary/50' : 'bg-line group-hover:bg-primary/30')} />
        {selected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -mt-[110%] -ml-[110%] aspect-square w-[220%] animate-orbit bg-[conic-gradient(from_0deg,transparent_0deg,transparent_220deg,var(--brand-primary)_320deg,transparent_360deg)] motion-reduce:animate-none"
          />
        )}

        <span className="relative flex h-full flex-col overflow-hidden rounded-[21px] bg-surface">
          <span
            className={cx(
              'relative block h-28 overflow-hidden border-b border-line transition-colors duration-500',
              selected ? 'bg-linear-to-br from-primary/30 via-primary/10 to-transparent' : 'bg-linear-to-br from-primary/12 via-transparent to-transparent',
            )}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_14%,transparent)_0_1px,transparent_1px_11px)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -bottom-12 text-[140px] leading-none font-black text-transparent opacity-30 transition-transform duration-700 select-none [-webkit-text-stroke:1.5px_var(--brand-primary)] group-hover:-translate-y-2 group-hover:-rotate-6 motion-reduce:transition-none"
            >
              {type.name.charAt(0).toUpperCase()}
            </span>
            {selected && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}

            <span className="absolute inset-x-4 top-3.5 flex items-center justify-between">
              <span className="rounded-full bg-surface/70 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-fg-muted ring-1 ring-line backdrop-blur">
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <span
                className={cx(
                  'relative grid size-7 place-items-center rounded-full border transition-all duration-300',
                  selected ? 'scale-100 border-primary bg-primary text-on-primary' : 'scale-90 border-line-strong bg-surface/70 text-transparent group-hover:border-primary/50',
                )}
              >
                {selected && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/50 motion-reduce:hidden" />}
                <Icon name="check" size={14} />
              </span>
            </span>

            <span className="absolute bottom-3 left-4 block max-w-[70%] truncate text-2xl font-semibold tracking-[-0.02em] text-fg">{type.name}</span>
          </span>

          <span className="flex flex-1 flex-col gap-4 p-4">
            <span className="block">
              <span className="flex items-baseline justify-between gap-2">
                <span className={statLabelClass}>{openText.minDeposit}</span>
                <span className="flex items-baseline gap-1">
                  <span className="text-xl font-light tracking-[-0.02em] text-fg tabular-nums">{money(type.minDeposit)}</span>
                  <span className="text-[10px] font-semibold text-primary">{CURRENCY}</span>
                </span>
              </span>
              <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full origin-left animate-grow rounded-full bg-linear-to-r from-primary/40 to-primary motion-reduce:animate-none" style={{ width: `${depositShare}%` }} />
              </span>
            </span>

            <span className="grid grid-cols-2 gap-2">
              <span className="flex items-center gap-2.5 rounded-xl bg-surface-2/70 p-2.5 ring-1 ring-line">
                <MiniLeverageRing leverage={type.leverage} />
                <span className="min-w-0">
                  <span className={statLabelClass}>{openText.leverage}</span>
                  <span className="block text-sm font-semibold text-fg tabular-nums">1:{type.leverage}</span>
                </span>
              </span>
              <span className="flex items-center gap-2.5 rounded-xl bg-surface-2/70 p-2.5 ring-1 ring-line">
                <MiniSpreadBars spread={type.spread} />
                <span className="min-w-0">
                  <span className={statLabelClass}>{openText.spread}</span>
                  <span className="block text-sm font-semibold text-fg tabular-nums">{type.spread}</span>
                </span>
              </span>
            </span>

            <span className="mt-auto flex flex-wrap gap-1.5 border-t border-dashed border-line pt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/50 px-2.5 py-1 text-[11px]">
                <span className="text-fg-subtle">{openText.execution}</span>
                <span className="font-semibold text-fg">{type.execution}</span>
              </span>
              {type.swapFreeDays !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-[11px] text-primary">
                  <Icon name="clock" size={11} />
                  {openText.swapFreeDays}
                  <span className="font-bold tabular-nums">{type.swapFreeDays}</span>
                </span>
              )}
            </span>
          </span>
        </span>
      </label>
    </li>
  );
}

const LEVERAGE_SEGMENTS = 10;

// Leverage as a row of segments; the share of MAX_LEVERAGE decides how many light up.
function LeverageSegments({ leverage }: { leverage: number }) {
  const lit = Math.max(1, Math.round(Math.min(leverage / MAX_LEVERAGE, 1) * LEVERAGE_SEGMENTS));
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: LEVERAGE_SEGMENTS }, (_, segment) => (
        <span
          key={segment}
          style={{ animationDelay: `${200 + segment * 50}ms` }}
          className={cx(
            'h-3 w-1.5 origin-bottom animate-bar-rise rounded-[2px] motion-reduce:animate-none',
            segment < lit ? 'bg-primary shadow-[0_0_6px_-1px_var(--brand-primary)]' : 'bg-line',
          )}
        />
      ))}
    </span>
  );
}

// The selected plan as a ticket: a gradient account pass on top, a perforated tear line, then the spec as
// receipt rows, with the submit button at the foot.
function SpecSheet({ mode, type, fund }: { mode: Mode; type: AccountType; fund: number }) {
  const isLive = mode === 'live';
  const [instrumentCount, marketList = ''] = type.instruments.split('. ');
  const markets = marketList.split(', ');
  const rowClass = 'flex items-center justify-between gap-4 py-3';

  return (
    <div key={`${mode}-${type.id}`} className="relative isolate animate-rise rounded-[28px] border border-line bg-surface/85 p-3 shadow-pop backdrop-blur-xl motion-reduce:animate-none">
      <div className="relative isolate overflow-hidden rounded-[22px] bg-[image:var(--brand-gradient)] p-5 text-on-primary shadow-[0_24px_48px_-28px_var(--brand-primary)]">
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-24 -right-24 -z-10 size-64 animate-orbit-spin opacity-60 motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 -z-10 size-52 animate-drift rounded-full bg-white/15 blur-3xl motion-reduce:animate-none" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-3 -bottom-14 -z-10 text-[170px] leading-none font-black text-transparent opacity-25 select-none [-webkit-text-stroke:1.5px_white]"
        >
          {type.name.charAt(0).toUpperCase()}
        </span>
        <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />

        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase opacity-75">{openText.preview}</p>
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            <UsFlag />
            {CURRENCY}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-lg bg-white/15 px-2 py-1 font-mono text-[11px] font-semibold tracking-wider ring-1 ring-white/25">MT5</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/25">
            <span className="relative flex size-1.5">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-white motion-reduce:animate-none" />
              <span className="relative size-1.5 rounded-full bg-white" />
            </span>
            {isLive ? 'Live' : 'Demo'}
          </span>
        </div>

        <p className="mt-5 text-3xl font-semibold tracking-[-0.02em]">{type.name}</p>
        <p className="mt-1 font-mono text-sm tracking-[0.25em] opacity-70">#••••••</p>
        <p className="mt-0.5 text-xs opacity-75">
          {type.name} · 1:{type.leverage}
        </p>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs opacity-75">{isLive ? openText.minDeposit : openText.initialFund}</p>
            <p className="mt-0.5 truncate text-4xl font-light tracking-[-0.03em] tabular-nums">${money(isLive ? type.minDeposit : fund)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] ring-1 ring-white/25">
            <span className="opacity-75">{openText.execution}</span> <span className="font-semibold">{type.execution}</span>
          </span>
        </div>
      </div>

      <div aria-hidden="true" className="relative mx-2 my-1 h-5">
        <span className="absolute inset-x-3 top-1/2 border-t-2 border-dotted border-line-strong" />
      </div>

      <ul className="divide-y divide-line px-3">
        {type.swapFreeDays !== undefined && (
          <li className={rowClass}>
            <span className={statLabelClass}>{openText.swapFreeDays}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
              <Icon name="clock" size={11} />
              {type.swapFreeDays}
            </span>
          </li>
        )}
        <li className={rowClass}>
          <span className={statLabelClass}>{openText.leverage}</span>
          <span className="flex items-center gap-3">
            <LeverageSegments leverage={type.leverage} />
            <span className="text-sm font-semibold text-fg tabular-nums">upto 1:{type.leverage}</span>
          </span>
        </li>
        <li className={rowClass}>
          <span className={statLabelClass}>{openText.spread}</span>
          <span className="flex items-center gap-3">
            <MiniSpreadBars spread={type.spread} />
            <span className="w-8 text-right text-sm font-semibold text-fg tabular-nums">{type.spread}</span>
          </span>
        </li>
        <li className={rowClass}>
          <span className={statLabelClass}>
            {openText.minLot} / {openText.maxLot}
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold text-fg tabular-nums">
            {money(type.minLot)}
            <span aria-hidden="true" className="relative h-px w-8 bg-linear-to-r from-primary/30 to-primary">
              <span className="absolute -top-[3px] -right-0.5 size-[7px] rotate-45 border-t-[1.5px] border-r-[1.5px] border-primary" />
            </span>
            {money(type.maxLot)}
          </span>
        </li>
        <li className={rowClass}>
          <span className={statLabelClass}>{openText.stopOut}</span>
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="relative h-1.5 w-20 overflow-hidden rounded-full bg-line">
              <span className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-danger/70 motion-reduce:animate-none" style={{ width: `${type.stopOut}%` }} />
            </span>
            <span className="text-sm font-semibold text-danger tabular-nums">{type.stopOut}%</span>
          </span>
        </li>
        <li className="py-3">
          <span className="flex items-center justify-between gap-2">
            <span className={statLabelClass}>{openText.instruments}</span>
            <span className="text-xs font-semibold text-primary">{instrumentCount}.</span>
          </span>
          <span className="mt-2.5 flex flex-wrap gap-1.5">
            {markets.map((market, marketIndex) => (
              <span
                key={market}
                style={{ animationDelay: `${300 + marketIndex * 70}ms` }}
                className="animate-pop-in rounded-full bg-primary-soft/60 px-2.5 py-0.5 text-[11px] font-medium text-primary motion-reduce:animate-none"
              >
                {market}
              </span>
            ))}
          </span>
        </li>
      </ul>

      {/* Below lg the pinned action bar above the bottom tab bar carries the submit instead. */}
      <div className="px-3 pt-2 pb-3 max-lg:hidden">
        <Button type="submit" size="lg" fullWidth leftIcon="plus" className="relative overflow-hidden">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span className="relative">{openText.submit}</span>
        </Button>
      </div>
    </div>
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

  // Orbit configurator: a header band carries mode + currency, plans run down the left as a selectable list,
  // and the selected plan's full spec sheet (with preview and submit) stays pinned on the right.
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
        <header className="orbit-card relative isolate flex animate-rise flex-col gap-5 overflow-hidden p-5 motion-reduce:animate-none sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-24 -left-24 -z-10 size-64 animate-orbit-spin motion-reduce:animate-none" />
          <span aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-28 -z-10 size-72 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

          <div className="flex min-w-0 items-start justify-between gap-4 xl:max-w-sm">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-fg">{openText.title}</h2>
              <p className="mt-1 text-sm text-fg-muted">{openText.subtitle}</p>
            </div>
            <LinkButton href="/accounts" size="sm" variant="outline" leftIcon="arrowLeft" className="shrink-0 xl:hidden">
              {openText.back}
            </LinkButton>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ModeSwitch mode={mode} onChange={setMode} />
            {!isDemo && (
              <div role="radiogroup" aria-label={openText.currency} className="flex items-center gap-2">
                <span className="hidden text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase sm:inline">{openText.currency}</span>
                <span
                  role="radio"
                  aria-checked="true"
                  className="relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full border border-primary bg-primary-soft/40 px-4 text-sm font-semibold text-fg"
                >
                  <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                  <UsFlag />
                  {CURRENCY}
                  <Icon name="checkCircle" size={15} className="text-primary" />
                </span>
              </div>
            )}
            <LinkButton href="/accounts" size="sm" variant="outline" leftIcon="arrowLeft" className="max-xl:hidden">
              {openText.back}
            </LinkButton>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="flex min-w-0 flex-col gap-8">
            <section aria-labelledby="open-type" className="animate-rise [animation-delay:80ms] motion-reduce:animate-none">
              <h2 id="open-type" className="flex items-center gap-3 text-base font-semibold text-fg">
                {openText.chooseType}
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] font-bold text-primary">{String(types.length).padStart(2, '0')}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent" />
              </h2>
              <ul key={mode} role="radiogroup" aria-labelledby="open-type" className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {types.map((item, index) => (
                  <PlanTile
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
              <section aria-labelledby="open-fund" className="orbit-card relative isolate animate-rise overflow-hidden p-5 [animation-delay:160ms] motion-reduce:animate-none">
                <h2 id="open-fund" className="flex items-center gap-3 text-base font-semibold text-fg">
                  <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/30">
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

          <aside className="min-w-0 lg:sticky lg:top-24">
            <SpecSheet mode={mode} type={type} fund={isFundValid ? fund : 0} />
          </aside>
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
