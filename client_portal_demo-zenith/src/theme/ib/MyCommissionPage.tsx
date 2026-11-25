'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import {
  filterMovements,
  mockCommissionWallet,
  mockWalletMovements,
  myCommissionCopy as copy,
  type CommissionTab,
  type CommissionWallet,
  type MovementFilter,
  type WalletMovement,
} from './ibMyCommissionData';

/*
 * Zenith My Commission (Vaulto language): an open balance with lifetime earnings as one capsule track, a row of
 * textured balance tiles ending in a dashed payout tile, a capsule tab dock, and a ledger led by a balance step chart.
 */
const RED = 'var(--zenith-red)';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] ring-1 ring-line';
const openClass = 'relative rounded-[32px] border border-dashed border-line-strong';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const tabOrder: CommissionTab[] = ['earnings', 'payouts', 'distribute', 'plan'];
const tabIcons: Record<CommissionTab, IconName> = { earnings: 'trendUp', payouts: 'wallet', distribute: 'accounts', plan: 'fileText' };
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const priceFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

/* ───────────── Open balance: available now + lifetime earnings as one capsule track ───────────── */

function OpenBalance({ wallet }: { wallet: CommissionWallet }) {
  const available = useAnimatedNumber(wallet.available, 1200);
  const [grown, setGrown] = useState(false);
  const hasReady = wallet.available > 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const whole = Math.max(wallet.earnedAllTime, wallet.paidOut + wallet.pending + wallet.available);
  const share = (value: number) => (whole > 0 ? (value / whole) * 100 : 0);
  const pendingFill = 'bg-[repeating-linear-gradient(135deg,currentColor_0_4px,transparent_4px_8px)] text-fg/55';
  const segments: { key: string; label: string; value: number; className?: string; style?: CSSProperties }[] = [
    { key: 'paid', label: copy.paidOut, value: wallet.paidOut, className: 'bg-fg' },
    { key: 'pending', label: copy.pending, value: wallet.pending, className: pendingFill },
    { key: 'available', label: copy.available, value: wallet.available, style: { background: RED } },
  ];

  return (
    <section className="zenith-tile flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className={cx('flex items-center gap-2 text-fg-muted', captionClass)}>
            <span className="grid size-7 place-items-center rounded-[10px] bg-fg text-app">
              <Icon name="wallet" size={13} />
            </span>
            {copy.available}
          </p>
          <p className="mt-3 font-mono text-6xl leading-none font-black tracking-tighter break-all text-fg tabular-nums sm:text-7xl">
            {formatMoney(available, wallet.currency)}
          </p>
          <p className="mt-2 text-sm text-fg-muted">{copy.availableHint}</p>
        </div>

        <span aria-hidden="true" className="relative grid size-20 shrink-0 place-items-center">
          {hasReady && <span style={{ background: RED }} className="absolute inset-2 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden" />}
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:2.5s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-[3px]" />
          </span>
          <span className="relative grid size-12 place-items-center rounded-full bg-fg text-app">
            <Icon name="trendUp" size={18} />
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <div className="flex h-4 overflow-hidden rounded-full bg-fg/[0.06] ring-1 ring-line">
            {segments.map((segment) => (
              <span
                key={segment.key}
                style={{ ...segment.style, width: grown ? `${share(segment.value)}%` : '0%' }}
                className={cx('h-full transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none', segment.className)}
              />
            ))}
          </div>
          {/* A light keeps travelling the track so the split reads as live. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 h-0">
            <span className="zenith-route absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-white shadow-[0_0_10px_3px_rgb(255_255_255/0.75)] ring-1 ring-black/20 motion-reduce:hidden" />
          </span>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-fg-muted">
          {segments.map((segment) => (
            <li key={segment.key} className="inline-flex items-center gap-2">
              <span aria-hidden="true" style={segment.style} className={cx('size-3 rounded-[3px] ring-1 ring-line', segment.className)} />
              {segment.label}
              <span className="font-mono font-bold text-fg tabular-nums">{formatMoney(segment.value, wallet.currency)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Balance tiles + dashed payout tile ───────────── */

function BalanceTile({ label, hint, value, icon, currency, index }: { label: string; hint: string; value: number; icon: IconName; currency: string; index: number }) {
  const shown = useAnimatedNumber(value, 1100);
  return (
    <section
      style={stagger(index, 90, 150)}
      className="group/tile zenith-tile relative flex min-h-48 flex-col overflow-hidden rounded-[28px] bg-fg/[0.02] p-5 ring-1 ring-line transition-[background-color,box-shadow] duration-300 hover:bg-fg/[0.04] hover:ring-line-strong motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:10px_10px] text-fg/[0.16] [mask-image:linear-gradient(160deg,#000,transparent_70%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <p className={cx(captionClass, 'pt-1 text-fg-muted')}>{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-fg text-app transition-transform duration-300 group-hover/tile:-rotate-12 motion-reduce:transition-none">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="relative mt-auto pt-6 font-mono text-3xl font-black tracking-tight text-fg tabular-nums">{formatMoney(shown, currency)}</p>
      <p className="relative mt-1 mb-3 text-xs text-fg-subtle">{hint}</p>
      <RedRule />
    </section>
  );
}

function PayoutTile({ wallet, onRequest }: { wallet: CommissionWallet; onRequest: () => void }) {
  const hasReady = wallet.available > 0;
  const hasOpenRequest = wallet.pending > 0;
  const title = hasReady
    ? copy.ready(formatMoney(wallet.available, wallet.currency))
    : hasOpenRequest
      ? copy.requested(formatMoney(wallet.pending, wallet.currency))
      : copy.nothingReady;
  const hint = hasReady || !hasOpenRequest ? copy.readyHint : copy.requestedHint;

  return (
    <section style={stagger(3, 90, 150)} className={cx(openClass, 'zenith-tile flex min-h-48 flex-col gap-4 rounded-[28px] p-5')}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="relative mt-1.5 grid size-3 shrink-0 place-items-center">
          {hasReady && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[3px] motion-reduce:hidden" />}
          <span style={hasReady ? { background: RED } : undefined} className={cx('relative size-3 rounded-[3px]', !hasReady && 'bg-fg/25')} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-black text-fg">{title}</p>
          <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
        </div>
      </div>
      <button
        type="button"
        disabled={!hasReady}
        onClick={onRequest}
        className="group/pay relative mt-auto inline-flex h-12 w-full items-center justify-between gap-2 overflow-hidden rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-bold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/pay:translate-x-full motion-reduce:hidden" />
        <span className="relative">{copy.requestPayout}</span>
        <span className="relative grid size-10 place-items-center">
          {hasReady && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full opacity-60 motion-reduce:hidden" />}
          <span style={{ background: RED }} className="relative grid size-10 place-items-center rounded-full text-white transition-transform duration-300 group-hover/pay:translate-x-0.5">
            <Icon name="arrowRight" size={15} />
          </span>
        </span>
      </button>
    </section>
  );
}

/* ───────────── Tabs: capsule dock ───────────── */

function CommissionTabs({ tab, onTab }: { tab: CommissionTab; onTab: (tab: CommissionTab) => void }) {
  return (
    <div role="tablist" aria-label={copy.title} className="flex gap-1 overflow-x-auto rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
      {tabOrder.map((id) => {
        const isActive = id === tab;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTab(id)}
            className={cx(
              'group/tab inline-flex h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-bold whitespace-nowrap transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            <span
              style={isActive ? { background: RED } : undefined}
              className={cx('grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/tab:-rotate-12', isActive ? 'text-white' : 'bg-fg/[0.06] text-fg')}
            >
              <Icon name={tabIcons[id]} size={14} />
            </span>
            {copy.tabs[id]}
            {isActive && <span aria-hidden="true" className="zenith-blink size-1.5 rounded-[2px] bg-current" />}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Balance step chart: the wallet climbing one movement at a time ───────────── */

function BalanceSteps({ movements, maxBalance, currency }: { movements: WalletMovement[]; maxBalance: number; currency: string }) {
  // The ledger lists newest first; the chart reads left (oldest) to right (newest).
  const timeline = [...movements].reverse();
  const last = timeline.length - 1;
  const yOf = (value: number) => 88 - (maxBalance > 0 ? (Math.max(0, value) / maxBalance) * 74 : 0);
  const xOf = (index: number) => (timeline.length > 1 ? 6 + (index * 88) / last : 50);
  const startY = yOf(timeline[0].balanceAfter - timeline[0].amount);
  const stepPath = `${timeline.reduce((path, movement, index) => `${path} H ${xOf(index)} V ${yOf(movement.balanceAfter)}`, `M 0 ${startY}`)} H 100`;

  return (
    <div aria-hidden="true" className="relative rounded-[24px] bg-fg/[0.03] px-4 pt-4 pb-3 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-fg-subtle">
        <span>{formatMoney(maxBalance, currency)}</span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ background: RED }} className="size-2 rounded-[2px]" />
          {copy.columns.balanceAfter}
        </span>
      </div>

      <div className="relative mt-2 h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible text-fg">
          <defs>
            <clipPath id="zenith-commission-reveal" clipPathUnits="userSpaceOnUse">
              <rect x="-2" y="-10" width="0" height="120">
                <animate attributeName="width" from="0" to="104" dur="1.4s" fill="freeze" />
              </rect>
            </clipPath>
          </defs>
          <line x1="0" x2="100" y1="88" y2="88" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          {timeline.map((movement, index) => (
            <line
              key={movement.id}
              x1={xOf(index)}
              x2={xOf(index)}
              y1={yOf(movement.balanceAfter)}
              y2="88"
              stroke="currentColor"
              strokeOpacity="0.14"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={stepPath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" clipPath="url(#zenith-commission-reveal)" />
        </svg>

        {/* A red scan line keeps sweeping the chart. */}
        <span className="pointer-events-none absolute inset-x-0 top-0 bottom-[12%]">
          <span className="zenith-route absolute top-0 h-full w-0.5 bg-linear-to-b from-transparent via-[var(--zenith-red)] to-transparent opacity-70 motion-reduce:hidden" />
        </span>

        {timeline.map((movement, index) => {
          const isLatest = index === last;
          const isCredit = movement.amount >= 0;
          return (
            <span
              key={movement.id}
              style={{ left: `${xOf(index)}%`, top: `${yOf(movement.balanceAfter)}%` }}
              className="group/pt absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center p-1.5"
            >
              {isLatest && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[5px] opacity-50 motion-reduce:hidden" />}
              <span
                style={{ ...stagger(index, 120, 500), background: isCredit ? RED : undefined }}
                className={cx(
                  'zenith-pixel relative block rounded-[3px] ring-2 ring-app',
                  isLatest ? 'size-4 shadow-[0_0_14px_4px_var(--zenith-red)]' : 'size-3',
                  !isCredit && 'bg-fg',
                )}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-full bg-fg px-2.5 py-1 font-mono text-[10px] font-bold whitespace-nowrap text-app opacity-0 shadow-lg transition-opacity duration-200 group-hover/pt:opacity-100">
                {isCredit ? '+ ' : '− '}
                {formatMoney(Math.abs(movement.amount), currency)} → {formatMoney(movement.balanceAfter, currency)}
              </span>
            </span>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[10.5px] text-fg-subtle">
        <span>{timeline[0].when}</span>
        {last > 0 && <span>{timeline[last].when}</span>}
      </div>
    </div>
  );
}

/* ───────────── Ledger rows ───────────── */

function MovementRow({ movement, currency, maxBalance, index }: { movement: WalletMovement; currency: string; maxBalance: number; index: number }) {
  const isCredit = movement.amount >= 0;
  const fill = maxBalance > 0 ? Math.max(4, (movement.balanceAfter / maxBalance) * 100) : 0;

  return (
    <li
      style={stagger(index, 60)}
      className="group zenith-tile grid gap-x-5 gap-y-3 rounded-[24px] bg-fg/[0.02] p-3 ring-1 ring-line transition-[background-color,box-shadow] duration-300 hover:bg-fg/[0.04] hover:ring-line-strong motion-reduce:transition-none md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:pl-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
          <span
            style={isCredit ? undefined : { background: RED }}
            className={cx(
              'grid size-11 place-items-center rounded-[14px] transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
              isCredit ? 'bg-fg text-app' : 'text-white',
            )}
          >
            <Icon name="trendUp" size={15} className={cx(!isCredit && 'rotate-90')} />
          </span>
          {index === 0 && <span style={{ background: RED }} className="absolute -top-1 -right-1 size-2.5 rounded-[3px] ring-2 ring-app" />}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-fg">{movement.symbol}</span>
            <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10px] font-black tracking-[0.12em] text-fg-muted uppercase ring-1 ring-line">{movement.side}</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-fg-subtle">
              <Icon name="clock" size={11} />
              {movement.when}
            </span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-fg-subtle">
            TA#{movement.account} · {lotsFormat.format(movement.lots)} {copy.lotsSuffix} · {priceFormat.format(movement.openPrice)} → {priceFormat.format(movement.closePrice)}
          </p>
        </div>
      </div>

      <span className={cx('font-mono text-base font-black tabular-nums md:text-right', isCredit ? 'text-success' : 'text-danger')}>
        {isCredit ? '+ ' : '− '}
        {formatMoney(Math.abs(movement.amount), currency)}
      </span>

      <span className="flex items-center gap-3 border-t border-dashed border-line-strong pt-2 md:min-w-44 md:justify-end md:border-t-0 md:pt-0">
        <span aria-hidden="true" className="h-2 w-20 overflow-hidden rounded-full bg-fg/[0.08]">
          <span style={{ width: `${fill}%` }} className="block h-full rounded-full bg-fg/70" />
        </span>
        <span className="font-mono text-sm font-bold text-fg-muted tabular-nums md:text-right">{formatMoney(movement.balanceAfter, currency)}</span>
      </span>
    </li>
  );
}

function PixelEmpty({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className={cx(openClass, 'flex flex-col items-center gap-4 px-4 py-14 text-center')}>
      <span aria-hidden="true" className="relative grid place-items-center">
        <span className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, pixel) => (
            <span
              key={pixel}
              style={{ animationDelay: `${(pixel % 7) * 0.15}s`, background: pixel === 24 ? RED : undefined }}
              className={cx('zenith-blink size-2 rounded-[2px]', pixel !== 24 && 'bg-fg/20')}
            />
          ))}
        </span>
        <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
          <Icon name={icon} size={20} />
        </span>
      </span>
      <p className="text-base font-black text-fg">{title}</p>
      <p className="max-w-md text-sm text-fg-muted">{body}</p>
    </div>
  );
}

function EarningsLedger({ movements, currency }: { movements: WalletMovement[]; currency: string }) {
  const [filter, setFilter] = useState<MovementFilter>('everything');
  const [query, setQuery] = useState('');
  const rows = filterMovements(movements, filter, query);
  const maxBalance = Math.max(0, ...movements.map((movement) => movement.balanceAfter));
  const columns = copy.columns;

  return (
    <section className={cx(panelClass, 'flex flex-col gap-4 p-4 sm:p-5')}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Dropdown label={copy.filterLabel} value={filter} options={copy.filters} onChange={setFilter} icon="filter" className="sm:w-52" />
          <label className="group flex h-12 min-w-0 items-center gap-3 rounded-full py-1 pr-4 pl-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg sm:w-72">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg">
              <Icon name="search" size={15} />
            </span>
            <span className="sr-only">{copy.search}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
        </div>
        <Link
          href="/ib/commission-history"
          className="group/link inline-flex h-11 w-fit items-center gap-2 rounded-full bg-fg py-1 pr-4 pl-1 text-sm font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span style={{ background: RED }} className="grid size-9 place-items-center rounded-full text-white">
            <Icon name="history" size={15} className="transition-transform duration-500 group-hover/link:-rotate-[360deg] motion-reduce:transition-none" />
          </span>
          {copy.commissionHistory}
        </Link>
      </div>

      <p className="flex items-center gap-2 text-xs text-fg-subtle">
        <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
        {copy.ledgerHint}
      </p>

      {rows.length === 0 ? (
        <PixelEmpty icon="inbox" title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <div key={`${filter}-${query}`} className="flex flex-col gap-3">
          <BalanceSteps movements={rows} maxBalance={maxBalance} currency={currency} />

          <div aria-hidden="true" className="hidden items-center gap-3 border-b border-dashed border-line-strong px-4 pb-2 md:flex">
            <span className={cx(captionClass, 'text-fg-subtle')}>{columns.when}</span>
            <span style={{ background: RED }} className="size-1 rounded-[1px]" />
            <span className={cx(captionClass, 'flex-1 text-fg-subtle')}>{columns.what}</span>
            <span className={cx(captionClass, 'text-fg-subtle')}>{columns.amount}</span>
            <span className={cx(captionClass, 'min-w-44 text-right text-fg-subtle')}>{columns.balanceAfter}</span>
          </div>

          <ul aria-label={copy.tabs.earnings} className="flex flex-col gap-2">
            {rows.map((movement, index) => (
              <MovementRow key={movement.id} movement={movement} currency={currency} maxBalance={maxBalance} index={index} />
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && <p className="text-xs text-fg-subtle">{copy.showing(1, rows.length, rows.length)}</p>}
    </section>
  );
}

export default function MyCommissionPage() {
  const [tab, setTab] = useState<CommissionTab>('earnings');
  const [wallet, setWallet] = useState<CommissionWallet>(mockCommissionWallet);

  function requestPayout() {
    setWallet((current) => ({ ...current, pending: current.pending + current.available, available: 0 }));
  }

  const balanceTiles: { label: string; hint: string; value: number; icon: IconName }[] = [
    { label: copy.pending, hint: copy.pendingHint, value: wallet.pending, icon: 'clock' },
    { label: copy.earnedAllTime, hint: copy.earnedAllTimeHint, value: wallet.earnedAllTime, icon: 'trendUp' },
    { label: copy.paidOut, hint: copy.paidOutHint, value: wallet.paidOut, icon: 'checkCircle' },
  ];

  return (
    <div className="space-y-8">
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
            </span>
            <span className="grid size-11 place-items-center rounded-full bg-fg text-app">
              <Icon name="wallet" size={17} />
            </span>
          </span>
          <div className="min-w-0">
            <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
          </div>
        </div>
        <RedRule />
      </header>

      <OpenBalance wallet={wallet} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {balanceTiles.map((tile, index) => (
          <BalanceTile key={tile.label} {...tile} currency={wallet.currency} index={index} />
        ))}
        <PayoutTile wallet={wallet} onRequest={requestPayout} />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <CommissionTabs tab={tab} onTab={setTab} />
        <div role="tabpanel" aria-label={copy.tabs[tab]} key={tab} className="zenith-tile min-w-0">
          {tab === 'earnings' ? (
            <EarningsLedger movements={mockWalletMovements} currency={wallet.currency} />
          ) : (
            <PixelEmpty icon="fileText" title={translate('common.comingSoonTitle')} body={translate('common.comingSoonText')} />
          )}
        </div>
      </div>
    </div>
  );
}
