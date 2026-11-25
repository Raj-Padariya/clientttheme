'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
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
const LEVERAGE_SEGMENTS = 10;

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

/** Drifting wave lines used inside ember capsules (same motif as the dashboard wallet capsules). */
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
        'group/cta relative isolate inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-(--hero-buy) px-7 text-sm font-bold text-[#160904] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_26px_-14px_var(--hero-buy)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
        focusRing,
        className,
      )}
    >
      <WaveLines />
      <Icon name="plus" size={16} className="transition-transform duration-300 group-hover/cta:rotate-90 motion-reduce:transition-none" />
      {openText.submit}
    </button>
  );
}

const modeOptions: { id: Mode; label: string; icon: 'trendUp' | 'monitor' }[] = [
  { id: 'live', label: openText.live, icon: 'trendUp' },
  { id: 'demo', label: openText.demo, icon: 'monitor' },
];

/** Live / demo as one capsule switch with a sliding white thumb; the count of plans rides on each side. */
function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const activeIndex = Math.max(
    modeOptions.findIndex((item) => item.id === mode),
    0,
  );

  return (
    <div role="radiogroup" aria-label={openText.title} className="relative grid w-full grid-cols-2 rounded-full bg-fg/[0.05] p-1.5 ring-1 ring-fg/10 sm:w-[440px]">
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/2)] rounded-full bg-fg shadow-[0_10px_24px_-12px_rgb(0_0_0/0.9)] transition-transform duration-500 ease-[cubic-bezier(.2,.9,.3,1.15)] motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
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
              'relative z-10 flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors duration-300',
              focusRing,
              isActive ? 'text-surface' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={16} className="shrink-0" />
            <span className="truncate">{item.label}</span>
            <span
              className={cx(
                'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors duration-300',
                isActive ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/10 text-fg-muted',
              )}
            >
              {String(accountTypes[item.id].length).padStart(2, '0')}
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

interface PlanColumnProps {
  type: AccountType;
  index: number;
  total: number;
  maxDeposit: number;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One plan as a tall pricing column. Plans sit side by side so min deposit, leverage and spread read across; the
 * picked column lifts, gets an ember ring and drifting ember waves across its cap.
 */
function PlanColumn({ type, index, total, maxDeposit, selected, onSelect }: PlanColumnProps) {
  const depositShare = maxDeposit > 0 ? Math.max((type.minDeposit / maxDeposit) * 100, 4) : 0;

  return (
    <li className="zenith-tile min-w-0" style={{ animationDelay: `${120 + index * CARD_STAGGER_MS}ms` }}>
      <label
        className={cx(
          'group relative isolate flex h-full cursor-pointer flex-col overflow-hidden rounded-[26px] p-4 transition-[translate,background-color,box-shadow] duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring motion-reduce:transition-none',
          selected ? '-translate-y-1 bg-fg/[0.07] ring-2 ring-(--hero-buy)' : 'bg-surface ring-1 ring-fg/[0.08] hover:-translate-y-1 hover:ring-fg/20',
        )}
      >
        <input type="radio" name="account-type" value={type.id} checked={selected} onChange={onSelect} className="sr-only" />
        <span
          aria-hidden="true"
          className={cx('pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 overflow-hidden transition-opacity duration-500', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')}
        >
          <WaveLines color="var(--hero-buy)" opacity={0.4} />
        </span>

        <span className="flex items-center justify-between gap-2">
          <span
            className={cx(
              'relative grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold transition-[background-color,color,transform] duration-300 motion-reduce:transition-none',
              selected ? 'scale-105 bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.07] text-fg-muted ring-1 ring-fg/10 group-hover:text-fg',
            )}
          >
            {selected && <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy)/40 motion-reduce:hidden" />}
            {selected ? <Icon name="check" size={18} className="relative" /> : type.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-mono text-[10px] tracking-[0.15em] text-fg-subtle">
            {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>
        </span>

        <span className="mt-4 truncate text-xl font-semibold tracking-[-0.01em] text-fg">{type.name}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] px-2.5 py-0.5 text-[11px] ring-1 ring-fg/10">
            <span className="text-fg-subtle">{openText.execution}</span>
            <span className="font-semibold text-fg">{type.execution}</span>
          </span>
          {type.swapFreeDays !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--hero-buy)/12 px-2.5 py-0.5 text-[11px] text-(--hero-buy) ring-1 ring-(--hero-buy)/35">
              <Icon name="clock" size={11} />
              {openText.swapFreeDays}
              <span className="font-bold tabular-nums">{type.swapFreeDays}</span>
            </span>
          )}
        </span>

        <span className="mt-auto flex flex-col gap-3.5 border-t border-dashed border-fg/12 pt-4">
          <span className="block min-w-0">
            <span className={labelClass}>{openText.minDeposit}</span>
            <span className="mt-0.5 flex items-baseline gap-1">
              <span className="truncate text-2xl font-light tracking-[-0.02em] text-fg tabular-nums">{money(type.minDeposit)}</span>
              <span className="text-[10px] font-semibold text-(--hero-buy)">{CURRENCY}</span>
            </span>
            <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-fg/[0.08]">
              <span className="block h-full origin-left animate-grow rounded-full bg-(--hero-buy) motion-reduce:animate-none" style={{ width: `${depositShare}%` }} />
            </span>
          </span>
          <span className="flex items-end justify-between gap-2">
            <span className="min-w-0">
              <span className={labelClass}>{openText.leverage}</span>
              <span className="block text-sm font-semibold text-fg tabular-nums">1:{type.leverage}</span>
            </span>
            <LeverageSegments leverage={type.leverage} />
          </span>
          <span className="flex items-end justify-between gap-2">
            <span className="min-w-0">
              <span className={labelClass}>{openText.spread}</span>
              <span className="block text-sm font-semibold text-fg tabular-nums">{type.spread}</span>
            </span>
            <SpreadBars spread={type.spread} />
          </span>
        </span>
      </label>
    </li>
  );
}

/**
 * The selected plan as one wide review strip: identity and amount on the left, the full spec as tiles in the middle,
 * submit on the right. Re-keyed per plan so the entrance replays when the pick changes.
 */
function ReviewStrip({ mode, type, fund }: { mode: Mode; type: AccountType; fund: number }) {
  const isLive = mode === 'live';
  const [instrumentCount, marketList = ''] = type.instruments.split('. ');
  const markets = marketList.split(', ');
  const tileClass = 'flex min-w-0 flex-col justify-between gap-2 rounded-2xl bg-fg/[0.04] px-3.5 py-3 ring-1 ring-fg/[0.07]';

  return (
    <section aria-labelledby="open-preview" className={cx(boardCard, 'relative isolate overflow-hidden p-5 sm:p-6')}>
      <div
        key={`${mode}-${type.id}`}
        className="grid animate-rise gap-6 motion-reduce:animate-none xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.7fr)_auto] xl:items-center"
      >
        <div className="flex min-w-0 flex-col gap-4">
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

          <div className="min-w-0">
            <p className="truncate text-3xl font-semibold tracking-[-0.02em] text-fg">{type.name}</p>
            <p className="mt-1 font-mono text-sm tracking-[0.25em] text-fg-muted">#••••••</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {type.name} · 1:{type.leverage}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">{isLive ? openText.minDeposit : openText.initialFund}</p>
              <p className="mt-0.5 truncate text-4xl font-light tracking-[-0.03em] text-fg tabular-nums">${money(isLive ? type.minDeposit : fund)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-fg/[0.06] px-2.5 py-1 text-[11px] text-fg ring-1 ring-fg/10">
              <span className="text-fg-muted">{openText.execution}</span> <span className="font-semibold">{type.execution}</span>
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {type.swapFreeDays !== undefined && (
            <div className={tileClass}>
              <dt className={labelClass}>{openText.swapFreeDays}</dt>
              <dd className="inline-flex w-fit items-center gap-1.5 rounded-full bg-(--hero-buy) px-2.5 py-1 text-xs font-bold text-[#160904] tabular-nums">
                <Icon name="clock" size={11} />
                {type.swapFreeDays}
              </dd>
            </div>
          )}
          <div className={tileClass}>
            <dt className={labelClass}>{openText.leverage}</dt>
            <dd className="flex flex-col gap-2">
              <LeverageSegments leverage={type.leverage} />
              <span className="text-sm font-semibold text-fg tabular-nums">upto 1:{type.leverage}</span>
            </dd>
          </div>
          <div className={tileClass}>
            <dt className={labelClass}>{openText.spread}</dt>
            <dd className="flex items-end justify-between gap-2">
              <span className="text-sm font-semibold text-fg tabular-nums">{type.spread}</span>
              <SpreadBars spread={type.spread} />
            </dd>
          </div>
          <div className={tileClass}>
            <dt className={labelClass}>
              {openText.minLot} / {openText.maxLot}
            </dt>
            <dd className="flex items-center gap-2 text-sm font-semibold text-fg tabular-nums">
              {money(type.minLot)}
              <span aria-hidden="true" className="relative h-px w-6 bg-linear-to-r from-fg/20 to-(--hero-buy)">
                <span className="absolute -top-[3px] -right-0.5 size-[7px] rotate-45 border-t-[1.5px] border-r-[1.5px] border-(--hero-buy)" />
              </span>
              {money(type.maxLot)}
            </dd>
          </div>
          <div className={tileClass}>
            <dt className={labelClass}>{openText.stopOut}</dt>
            <dd className="flex items-center gap-2">
              <span aria-hidden="true" className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.08]">
                <span className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-(--zenith-red) motion-reduce:animate-none" style={{ width: `${type.stopOut}%` }} />
              </span>
              <span className="text-sm font-semibold text-(--zenith-red) tabular-nums">{type.stopOut}%</span>
            </dd>
          </div>
          <div className={cx(tileClass, type.swapFreeDays === undefined ? 'col-span-2 sm:col-span-4' : 'col-span-2 sm:col-span-3')}>
            <dt className="flex items-center justify-between gap-2">
              <span className={labelClass}>{openText.instruments}</span>
              <span className="text-xs font-semibold text-fg">{instrumentCount}.</span>
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {markets.map((market, marketIndex) => (
                <span
                  key={market}
                  style={{ animationDelay: `${300 + marketIndex * 70}ms` }}
                  className="animate-pop-in rounded-full bg-fg/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-fg ring-1 ring-fg/10 motion-reduce:animate-none"
                >
                  {market}
                </span>
              ))}
            </dd>
          </div>
        </dl>

        {/* Below lg the pinned action bar above the bottom tab bar carries the submit instead. */}
        <SubmitButton className="h-14 max-lg:hidden xl:self-stretch xl:px-9" />
      </div>
    </section>
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

  // Zenith configurator: open title with the live/demo switch beside it, the plans as side-by-side pricing columns,
  // then the selected plan as a full-width review strip carrying the submit.
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
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        <header className="flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/accounts"
              className={cx('group/back inline-flex w-fit items-center gap-2 rounded-full text-xs font-semibold text-fg-muted transition-colors hover:text-fg', focusRing)}
            >
              <span className="grid size-7 place-items-center rounded-full ring-1 ring-fg/15 transition-transform duration-300 group-hover/back:-translate-x-0.5 motion-reduce:transition-none">
                <Icon name="arrowLeft" size={13} />
              </span>
              {openText.back}
            </Link>
            <h2 className="mt-3 text-4xl font-light tracking-[-0.04em] text-fg sm:text-5xl">{openText.title}</h2>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">{openText.subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <ModeSwitch mode={mode} onChange={setMode} />
            {!isDemo && <CurrencyChip />}
          </div>
        </header>

        <section aria-labelledby="open-type" className="animate-rise [animation-delay:80ms] motion-reduce:animate-none">
          <h2 id="open-type" className="flex items-center gap-3 text-base font-semibold text-fg">
            {openText.chooseType}
            <span className="rounded-full bg-(--hero-buy)/12 px-2 py-0.5 font-mono text-[11px] font-bold text-(--hero-buy)">{String(types.length).padStart(2, '0')}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-fg/15 to-transparent" />
          </h2>

          <div className={cx('mt-4 grid items-stretch gap-4', isDemo && 'lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]')}>
            <ul key={mode} role="radiogroup" aria-labelledby="open-type" className={cx('grid gap-3', !isDemo && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5')}>
              {types.map((item, index) => (
                <PlanColumn
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

            {isDemo && (
              <section aria-labelledby="open-fund" className={cx(boardCard, 'zenith-tile relative isolate flex flex-col justify-center overflow-hidden p-5 sm:p-6')}>
                <h2 id="open-fund" className="flex items-center gap-3 text-base font-semibold text-fg">
                  <span className="grid size-10 place-items-center rounded-full bg-(--hero-buy) text-[#160904]">
                    <Icon name="deposit" size={16} />
                  </span>
                  {openText.addFund}
                </h2>
                <Field label={openText.addFund} htmlFor="demo-fund" hint={openText.fundHint} error={fundInvalid ? openText.fundError : undefined} className="mt-5 max-w-md [&>label]:sr-only">
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
        </section>

        <ReviewStrip mode={mode} type={type} fund={isFundValid ? fund : 0} />

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
