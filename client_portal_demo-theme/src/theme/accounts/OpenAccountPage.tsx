'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Badge } from '../ui/Feedback';
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
const GAUGE_RADIUS = 40;
const GAUGE_TICKS = [0, 0.25, 0.5, 0.75, 1];
const SIGNAL_BARS = 5;
const TILT_DEG = 7;

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

function StepHeading({ step, title, id }: { step: number; title: string; id: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-base font-semibold text-fg">
      <span className="grid size-8 place-items-center rounded-full bg-primary-soft font-mono text-[11px] font-bold text-primary ring-1 ring-primary/30">
        {String(step).padStart(2, '0')}
      </span>
      {title}
      <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-line-strong to-transparent" />
    </h2>
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
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] overflow-hidden rounded-full bg-primary shadow-[0_8px_24px_-8px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)] motion-reduce:transition-none',
          mode === 'demo' && 'translate-x-full',
        )}
      >
        <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
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

function arcPoint(fraction: number, radius: number) {
  const angle = Math.PI * fraction;
  return { x: (50 - radius * Math.cos(angle)).toFixed(2), y: (50 - radius * Math.sin(angle)).toFixed(2) };
}

// Half-dial from 1:0 on the left to MAX_LEVERAGE on the right; the gold arc draws in and the needle points at the value.
function LeverageGauge({ leverage }: { leverage: number }) {
  const fraction = Math.min(leverage / MAX_LEVERAGE, 1);
  const arcEnd = arcPoint(fraction, GAUGE_RADIUS);
  const needle = arcPoint(fraction, GAUGE_RADIUS - 12);

  return (
    <svg viewBox="0 0 100 56" aria-hidden="true" className="w-full max-w-[132px] overflow-visible">
      <path d="M10 50 A40 40 0 0 1 90 50" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-line" />
      {GAUGE_TICKS.map((tick) => {
        const outer = arcPoint(tick, GAUGE_RADIUS + 8);
        const inner = arcPoint(tick, GAUGE_RADIUS + 5);
        return <line key={tick} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} strokeWidth="1.2" strokeLinecap="round" className="stroke-fg-subtle" />;
      })}
      <path
        d={`M10 50 A40 40 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        className="animate-[draw_1.2s_cubic-bezier(0.2,0.7,0.2,1)_0.3s_both] stroke-primary drop-shadow-[0_0_6px_var(--brand-primary)] motion-reduce:animate-none"
      />
      <line x1="50" y1="50" x2={needle.x} y2={needle.y} strokeWidth="2" strokeLinecap="round" className="stroke-fg" />
      <circle cx="50" cy="50" r="4" className="fill-primary" />
    </svg>
  );
}

// Signal-strength bars: the tighter the spread, the more bars light up.
function SpreadSignal({ spread }: { spread: number }) {
  const lit = Math.max(1, Math.round((1 - spread / MAX_SPREAD) * SIGNAL_BARS));
  return (
    <span aria-hidden="true" className="flex h-[38px] items-end gap-1">
      {Array.from({ length: SIGNAL_BARS }, (_, bar) => (
        <span
          key={bar}
          style={{ height: `${((bar + 1) / SIGNAL_BARS) * 100}%`, animationDelay: `${300 + bar * 80}ms` }}
          className={cx(
            'w-1.5 origin-bottom animate-bar-rise rounded-full motion-reduce:animate-none',
            bar < lit ? 'bg-primary shadow-[0_0_8px_-1px_var(--brand-primary)]' : 'bg-line',
          )}
        />
      ))}
    </span>
  );
}

const statLabelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

function TypeCard({
  type,
  index,
  total,
  selected,
  onSelect,
}: {
  type: AccountType;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const cardRef = useRef<HTMLLabelElement>(null);
  const [instrumentCount, marketList = ''] = type.instruments.split('. ');
  const markets = marketList.split(', ');

  // Written straight to CSS variables so following the cursor never re-renders the card.
  function tilt(event: PointerEvent<HTMLLabelElement>) {
    const node = cardRef.current;
    if (!node || event.pointerType !== 'mouse') return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    node.style.setProperty('--mx', `${x * 100}%`);
    node.style.setProperty('--my', `${y * 100}%`);
    node.style.setProperty('--rx', `${(0.5 - y) * TILT_DEG}deg`);
    node.style.setProperty('--ry', `${(x - 0.5) * TILT_DEG}deg`);
  }

  function untilt() {
    cardRef.current?.style.setProperty('--rx', '0deg');
    cardRef.current?.style.setProperty('--ry', '0deg');
  }

  return (
    <li
      className="w-[85%] shrink-0 animate-rise snap-center [perspective:1100px] motion-reduce:animate-none sm:w-auto"
      style={{ animationDelay: `${120 + index * CARD_STAGGER_MS}ms` }}
    >
      <label
        ref={cardRef}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className={cx(
          'group relative isolate block h-full cursor-pointer overflow-hidden rounded-[24px] p-px transition-[transform,box-shadow,background-color] duration-300 ease-out [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring motion-reduce:[transform:none] motion-reduce:transition-none',
          selected ? 'bg-primary/35 shadow-[0_28px_56px_-28px_var(--brand-primary)]' : 'bg-line hover:bg-primary/30',
        )}
      >
        <input type="radio" name="account-type" value={type.id} checked={selected} onChange={onSelect} className="sr-only" />
        {selected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -mt-[110%] -ml-[110%] aspect-square w-[220%] animate-orbit bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,var(--brand-primary)_320deg,transparent_360deg)] motion-reduce:animate-none"
          />
        )}

        <span className="relative flex h-full flex-col overflow-hidden rounded-[23px] bg-surface-2 p-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--brand-primary) 20%, transparent), transparent 70%)' }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-1 text-[150px] leading-none font-black text-transparent opacity-[0.13] transition-transform duration-700 select-none [-webkit-text-stroke:1.5px_var(--brand-primary)] group-hover:-translate-x-2 group-hover:scale-105 motion-reduce:transition-none"
          >
            {type.name.charAt(0).toUpperCase()}
          </span>
          {selected && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}

          <span className="relative flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-mono text-[10px] tracking-[0.2em] text-fg-subtle">
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <span className="mt-1 block truncate text-2xl font-semibold tracking-[-0.02em] text-fg">{type.name}</span>
            </span>
            <span
              className={cx(
                'relative grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300',
                selected ? 'scale-100 border-primary bg-primary text-on-primary' : 'scale-90 border-line-strong text-transparent group-hover:border-primary/50',
              )}
            >
              {selected && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-primary/50 motion-reduce:hidden" />}
              <Icon name="check" size={15} />
            </span>
          </span>

          <span className="relative mt-4 block">
            <span className={statLabelClass}>{openText.minDeposit}</span>
            <span className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-light tracking-[-0.03em] text-fg tabular-nums">{money(type.minDeposit)}</span>
              <span className="text-xs font-semibold text-primary">{CURRENCY}</span>
            </span>
          </span>

          <span className="relative mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1 text-[11px]">
              <span className="text-fg-subtle">{openText.execution}</span>
              <span className="font-semibold text-fg">{type.execution}</span>
            </span>
            {type.swapFreeDays !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-[11px] text-primary">
                <Icon name="clock" size={11} />
                {openText.swapFreeDays}
                <span className="font-bold tabular-nums">{type.swapFreeDays}</span>
              </span>
            )}
          </span>

          <span className="relative mt-4 grid grid-cols-2 rounded-2xl bg-surface/60 py-3 ring-1 ring-line">
            <span className="flex flex-col items-center px-3 text-center">
              <LeverageGauge leverage={type.leverage} />
              <span className="mt-1 text-sm font-semibold text-fg tabular-nums">upto 1:{type.leverage}</span>
              <span className={statLabelClass}>{openText.leverage}</span>
            </span>
            <span className="flex flex-col items-center justify-end border-l border-line px-3 text-center">
              <SpreadSignal spread={type.spread} />
              <span className="mt-2 text-sm font-semibold text-fg tabular-nums">{type.spread}</span>
              <span className={statLabelClass}>{openText.spread}</span>
            </span>
          </span>

          <span className="relative mt-4 block">
            <span className="flex justify-between gap-2">
              <span className={statLabelClass}>{openText.minLot}</span>
              <span className={statLabelClass}>{openText.maxLot}</span>
            </span>
            <span className="relative mt-2 block h-1.5 rounded-full bg-line">
              <span className="absolute inset-0 origin-left animate-grow rounded-full bg-linear-to-r from-primary/30 via-primary to-primary/30 motion-reduce:animate-none" />
              <span className="absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/20" />
              <span className="absolute top-1/2 right-0 size-3 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/20" />
            </span>
            <span className="mt-1.5 flex justify-between text-sm font-semibold text-fg tabular-nums">
              <span>{money(type.minLot)}</span>
              <span>{money(type.maxLot)}</span>
            </span>
          </span>

          <span className="relative mt-4 flex items-center gap-3">
            <span className={cx(statLabelClass, 'whitespace-nowrap')}>{openText.stopOut}</span>
            <span className="relative h-1.5 flex-1 rounded-full bg-line">
              <span className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-danger/70 motion-reduce:animate-none" style={{ width: `${type.stopOut}%` }} />
            </span>
            <span className="text-sm font-semibold text-danger tabular-nums">{type.stopOut}%</span>
          </span>

          <span className="relative mt-auto block pt-5">
            <span className="block border-t border-dashed border-line-strong pt-4">
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-fg">{openText.instruments}</span>
                <span className="text-xs font-semibold text-primary">{instrumentCount}.</span>
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {markets.map((market, marketIndex) => (
                  <span
                    key={market}
                    style={{ animationDelay: `${500 + marketIndex * 70}ms` }}
                    className="animate-pop-in rounded-md bg-surface px-2 py-0.5 text-[11px] text-fg-muted ring-1 ring-line transition-colors group-hover:text-fg motion-reduce:animate-none"
                  >
                    {market}
                  </span>
                ))}
              </span>
            </span>
          </span>
        </span>
      </label>
    </li>
  );
}

function AccountPreview({ mode, type, fund }: { mode: Mode; type: AccountType; fund: number }) {
  const isLive = mode === 'live';
  return (
    <div
      key={`${mode}-${type.id}`}
      className="wallet-card relative isolate animate-rise overflow-hidden rounded-[22px] border border-primary/30 bg-linear-to-br from-primary/20 via-surface-2 to-surface-2 p-5 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-14 -bottom-16 -z-10 size-48 animate-drift rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-fg light:border-hero-line-hi light:bg-hero-tile light:text-hero-txt">MT5</span>
          <Badge tone={isLive ? 'primary' : 'neutral'} dot>
            {isLive ? 'Live' : 'Demo'}
          </Badge>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-fg light:text-hero-txt">
          <UsFlag />
          {CURRENCY}
        </span>
      </div>
      <p className="mt-5 font-mono text-xl font-semibold tracking-[0.2em] text-fg-subtle light:text-hero-mute">#••••••</p>
      <p className="mt-0.5 text-xs text-fg-muted light:text-hero-mute">
        {type.name} · 1:{type.leverage}
      </p>
      <div className="mt-5 border-t border-line pt-4 light:border-hero-line-hi">
        <p className="text-xs text-fg-muted light:text-hero-mute">{isLive ? openText.minDeposit : openText.initialFund}</p>
        <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums light:text-hero-txt">
          ${money(isLive ? type.minDeposit : fund)}
        </p>
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 sm:gap-6">
      <section className="glass glass-strong relative isolate flex animate-rise flex-col gap-5 overflow-hidden rounded-[28px] p-5 motion-reduce:animate-none sm:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 -z-10 size-80 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-28 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">{openText.title}</h1>
            <p className="mt-1 max-w-md text-sm text-fg-muted">{openText.subtitle}</p>
          </div>
          <LinkButton href="/accounts" size="sm" variant="outline" leftIcon="arrowLeft">
            {openText.back}
          </LinkButton>
        </div>
        <ModeSwitch mode={mode} onChange={setMode} />
      </section>

      {/*
        minmax(0,1fr) + min-w-0: without them the swipeable card row's full width (all cards side by side) becomes
        the column's minimum, the page grows wider than the phone and the browser zooms the whole page out.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:col-span-2">
          {!isDemo && (
            <section aria-labelledby="open-currency" className="glass flex animate-rise flex-col gap-4 rounded-[24px] p-5 [animation-delay:80ms] motion-reduce:animate-none">
              <StepHeading step={1} title={openText.currency} id="open-currency" />
              <div role="radiogroup" aria-labelledby="open-currency" className="flex flex-wrap gap-2">
                <span
                  role="radio"
                  aria-checked="true"
                  className="relative inline-flex items-center gap-3 overflow-hidden rounded-2xl border border-primary bg-primary-soft/40 px-4 py-3 text-sm font-semibold text-fg"
                >
                  <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                  <UsFlag />
                  {CURRENCY}
                  <Icon name="checkCircle" size={15} className="text-primary" />
                </span>
              </div>
            </section>
          )}

          <section aria-labelledby="open-type" className="flex min-w-0 flex-col gap-4">
            <StepHeading step={isDemo ? 1 : 2} title={openText.chooseType} id="open-type" />
            {/* Phones: a swipeable row (next card peeks in) instead of a tall stack of cards to scroll past. */}
            <ul
              key={mode}
              role="radiogroup"
              aria-labelledby="open-type"
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-1 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pt-0 sm:pb-0 xl:grid-cols-3 [&::-webkit-scrollbar]:hidden"
            >
              {types.map((item, index) => (
                <TypeCard
                  key={item.id}
                  type={item}
                  index={index}
                  total={types.length}
                  selected={item.id === type.id}
                  onSelect={() => setTypeIds((current) => ({ ...current, [mode]: item.id }))}
                />
              ))}
            </ul>
          </section>

          {isDemo && (
            <section aria-labelledby="open-fund" className="glass flex animate-rise flex-col gap-4 rounded-[24px] p-5 [animation-delay:200ms] motion-reduce:animate-none">
              <StepHeading step={2} title={openText.addFund} id="open-fund" />
              <Field label={openText.addFund} htmlFor="demo-fund" hint={openText.fundHint} error={fundInvalid ? openText.fundError : undefined} className="[&>label]:sr-only">
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

        <aside className="flex animate-rise flex-col gap-4 [animation-delay:160ms] motion-reduce:animate-none lg:sticky lg:top-6">
          <p className="text-[10.5px] font-medium tracking-[0.12em] text-fg-subtle uppercase">{openText.preview}</p>
          <AccountPreview mode={mode} type={type} fund={isFundValid ? fund : 0} />
          {/* Below lg the sticky action bar at the bottom of the form carries the submit instead. */}
          <Button type="submit" size="lg" fullWidth leftIcon="plus" className="relative overflow-hidden max-lg:hidden">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <span className="relative">{openText.submit}</span>
          </Button>
        </aside>
      </div>
      {/* Mobile / tablet: the chosen account and its Create button stay pinned to the bottom of the screen. */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 flex items-center gap-3 border-t border-line bg-surface/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-16px_32px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
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
