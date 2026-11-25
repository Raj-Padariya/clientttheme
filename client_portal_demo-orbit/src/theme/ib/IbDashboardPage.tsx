'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbActivity, IbCommissionPeriod, IbDashboard, IbNetworkEvent, IbStats, IbTradeCommission } from '@/core/mock/ib';
import { useIbDashboard } from '@/core/pages/useIbDashboard';
import { cx } from '../lib/cx';

import { DotNumber } from '../ui/DotMatrix';
import { Icon, type IconName } from '../ui/Icon';

const cardClass = 'orbit-card p-5 sm:p-6';
// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DAY_MS = 86_400_000;

// "2 months ago" style label; switches to days for anything under a month.
function formatAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days < 30) return relativeTime.format(-days, 'day');
  return relativeTime.format(-Math.round(days / 30), 'month');
}

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

/* ───────────── Hero: command deck with a client radar ───────────── */

const dockLinks: { href: string; labelKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/network', labelKey: 'nav.ibMyNetwork', icon: 'user' },
  { href: '/ib/structure', labelKey: 'nav.ibSubIbStructure', icon: 'pieChart' },
  { href: '/ib/transfer-commission', labelKey: 'nav.ibTransferCommission', icon: 'transfer' },
  { href: '/ib/commission-history', labelKey: 'nav.ibCommissionHistory', icon: 'history' },
];

// Segments drawn on the radar ring before the rest collapse into a "+N" count.
const MAX_SEGMENTS = 12;
const RADAR_RADIUS = 40;

type SegmentKind = 'healthy' | 'risk' | 'pending';

const segmentStyles: Record<SegmentKind, { arc: string; dot: string }> = {
  healthy: { arc: 'stroke-primary', dot: 'fill-(--brand-gleam)' },
  risk: { arc: 'stroke-danger', dot: 'fill-danger' },
  pending: { arc: 'stroke-(--orbit-violet) opacity-60', dot: 'fill-(--orbit-violet)' },
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/*
 * Client radar: one arc per client around the IB core. Commission dashes run down each spoke into the core;
 * clients whose margin level is below 100% are red arcs with a pulsing dot, pending requests are faded violet arcs.
 */
function ClientRadar({ stats }: { stats: IbStats }) {
  const total = stats.totalClients;
  const shownClients = Math.min(total, MAX_SEGMENTS);
  const shownRisk = Math.min(stats.marginLevelBelow100, shownClients);
  const shownPending = Math.min(stats.pendingRequests, MAX_SEGMENTS - shownClients);
  const hiddenCount = total - shownClients;
  const kinds: SegmentKind[] = [
    ...Array<SegmentKind>(shownRisk).fill('risk'),
    ...Array<SegmentKind>(shownClients - shownRisk).fill('healthy'),
    ...Array<SegmentKind>(shownPending).fill('pending'),
  ];
  const slice = kinds.length > 0 ? 100 / kinds.length : 0;
  const gap = kinds.length > 1 ? 1.8 : 0;
  const segments = kinds.map((kind, index) => {
    const angle = ((index + 0.5) / kinds.length) * 2 * Math.PI - Math.PI / 2;
    return { kind, x: round2(50 + RADAR_RADIUS * Math.cos(angle)), y: round2(50 + RADAR_RADIUS * Math.sin(angle)) };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <span
        aria-hidden="true"
        className="absolute inset-[8%] animate-orbit-spin-fast rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_290deg,color-mix(in_oklab,var(--brand-primary)_38%,transparent)_360deg)] [animation-duration:6s] motion-reduce:hidden"
      />
      <span aria-hidden="true" className="absolute inset-[22%] rounded-full border border-white/10" />
      <span aria-hidden="true" className="absolute inset-[8%] rounded-full border border-dashed border-white/[0.07]" />

      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
        <circle cx="50" cy="50" r="47" fill="none" strokeWidth="0.5" strokeDasharray="0.5 2.2" className="stroke-white/25" />
        {segments.map((segment, index) => (
          <g key={index}>
            <path d={`M${segment.x} ${segment.y} L50 50`} fill="none" strokeWidth="0.3" className="stroke-white/10" />
            {segment.kind !== 'pending' && (
              <path
                d={`M${segment.x} ${segment.y} L50 50`}
                fill="none"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeDasharray="2 10"
                className={cx('animate-ribbon-flow motion-reduce:hidden', segment.kind === 'risk' ? 'stroke-danger' : 'stroke-(--brand-gleam)')}
                style={{ animationDelay: `${index * 0.25}s` }}
              />
            )}
            <circle
              cx="50"
              cy="50"
              r={RADAR_RADIUS}
              fill="none"
              strokeWidth="3.5"
              pathLength={100}
              strokeDasharray={`${round2(slice - gap)} ${round2(100 - slice + gap)}`}
              strokeDashoffset={round2(-index * slice)}
              transform="rotate(-90 50 50)"
              className={segmentStyles[segment.kind].arc}
            />
            {segment.kind === 'risk' && (
              <circle cx={segment.x} cy={segment.y} r="3" className="origin-center animate-ping-soft fill-danger/50 [transform-box:fill-box] motion-reduce:hidden" />
            )}
            <circle cx={segment.x} cy={segment.y} r="2.2" strokeWidth="0.8" className={cx('stroke-black/50', segmentStyles[segment.kind].dot)} />
          </g>
        ))}
      </svg>

      {/* Core: the partner. */}
      <div className="absolute inset-[34%]">
        {[0, 1.5].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="absolute inset-0 animate-ring-ripple rounded-full border border-primary/70 motion-reduce:hidden"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute -inset-1 animate-orbit rounded-full bg-[conic-gradient(from_0deg,var(--brand-gleam),transparent_30%,transparent_55%,var(--brand-accent)_80%,var(--brand-gleam))] [animation-duration:5s] motion-reduce:animate-none"
        />
        <span className="absolute inset-0 grid place-items-center overflow-hidden rounded-full text-xl font-black tracking-tight text-(--brand-on-primary) shadow-[0_0_40px_-6px_var(--brand-primary)] ring-4 ring-(--hero-panel) [background:radial-gradient(circle_at_32%_28%,var(--brand-gleam),var(--brand-accent)_78%)]">
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
          <span className="relative">IB</span>
        </span>
      </div>

      {hiddenCount > 0 && (
        <span className="absolute right-0 bottom-2 rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-xs font-semibold text-white/70">+{hiddenCount}</span>
      )}
    </div>
  );
}

function ConstellationHero({ stats }: { stats: IbStats }) {
  return (
    <section className={cx('orbit-card relative overflow-hidden p-6 text-white sm:p-8 lg:col-span-8', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-size-[32px_32px] [mask-image:radial-gradient(ellipse_at_75%_50%,black,transparent_70%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 size-[28rem] -translate-y-1/2 translate-x-1/4 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--orbit-violet)_22%,transparent),transparent_65%)]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] md:items-center">
        <div className="flex min-w-0 flex-col">
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.18em] text-(--brand-gleam) uppercase">
            <span aria-hidden="true" className="size-1.5 animate-twinkle rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)] motion-reduce:animate-none" />
            {translate('ibDash.badge')}
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight sm:text-[40px]">{translate('ibDash.title')}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{translate('ibDash.subtitle')}</p>

          <nav aria-label={translate('ibDash.title')} className="mt-7 grid gap-2 sm:grid-cols-2">
            {dockLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                style={riseDelay(index + 2)}
                className="group flex animate-rise items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
              >
                <span className="font-mono text-[10px] text-white/35">{String(index + 1).padStart(2, '0')}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-(--brand-gleam) transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                  <Icon name={link.icon} size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/80 transition-colors group-hover:text-white">{translate(link.labelKey)}</span>
                <Icon name="arrowRight" size={14} className="shrink-0 text-white/30 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-(--brand-gleam) motion-reduce:transition-none" />
              </Link>
            ))}
            <button
              type="button"
              style={riseDelay(6)}
              className="group relative flex animate-rise items-center gap-3 overflow-hidden rounded-xl border border-primary/45 bg-primary/12 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none sm:col-span-2"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/4 animate-comet bg-linear-to-r from-transparent via-white/10 to-transparent [animation-duration:4s] motion-reduce:hidden" />
              <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-primary/25 text-(--brand-gleam) transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
                <Icon name="arrowUpRight" size={16} />
              </span>
              <span className="relative flex-1 text-sm font-semibold text-(--brand-gleam)">{translate('ibDash.managerPortal')}</span>
              <Icon name="arrowRight" size={14} className="relative text-(--brand-gleam) transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>
          </nav>
        </div>

        <ClientRadar stats={stats} />
      </div>
    </section>
  );
}

/* ───────────── Metrics bento: the ten partner figures grouped by what they measure ───────────── */

const bentoCellClass =
  'orbit-card group relative flex animate-rise flex-col overflow-hidden p-5 transition-shadow duration-300 hover:shadow-[0_22px_40px_-28px_var(--brand-primary)] motion-reduce:animate-none motion-reduce:transition-none sm:p-6';

// Soft gold light that blooms in the cell's corner on hover.
function CellGlow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_22%,transparent),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />
  );
}

function CellHeader({ icon, titleKey }: { icon: IconName; titleKey: MessageKey }) {
  return (
    <header className="relative flex items-center gap-2.5">
      <span
        className={cx(
          'grid size-9 place-items-center rounded-xl text-(--brand-gleam) ring-1 ring-primary/40 transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
          graphite,
        )}
      >
        <Icon name={icon} size={17} />
      </span>
      <h3 className="text-[11px] font-semibold tracking-[0.16em] text-fg-muted uppercase">{translate(titleKey)}</h3>
    </header>
  );
}

function SubStat({ labelKey, value, isAlert = false }: { labelKey: MessageKey; value: string; isAlert?: boolean }) {
  return (
    <div className={cx('rounded-2xl px-3 py-2.5 ring-1', isAlert ? 'bg-danger/5 ring-danger/35' : 'bg-surface-2 ring-line')}>
      <dt className="flex items-center gap-1.5 truncate text-[10px] font-medium text-fg-subtle">
        {isAlert && <span aria-hidden="true" className="size-1.5 shrink-0 animate-ping-soft rounded-full bg-danger text-danger motion-reduce:animate-none" />}
        {translate(labelKey)}
      </dt>
      <dd className={cx('mt-1 font-mono text-base font-semibold tabular-nums', isAlert ? 'text-danger' : 'text-fg')}>{value}</dd>
    </div>
  );
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

const NETWORK_DOTS = 12;

function MetricsBoard({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const deposited = stats.totalDeposited;
  const shareOfDeposits = (amount: number) => (deposited > 0 ? amount / deposited : 0);
  const columnMax = Math.max(deposited, stats.totalWithdrawal, stats.totalAvailableEquity, 1);
  const columns: { labelKey: MessageKey; amount: number; share: number | null; fillClass: string; capClass: string }[] = [
    { labelKey: 'ibDash.totalDeposited', amount: deposited, share: null, fillClass: 'from-success/5 to-success/45', capClass: 'bg-success' },
    { labelKey: 'ibDash.totalWithdrawal', amount: stats.totalWithdrawal, share: shareOfDeposits(stats.totalWithdrawal), fillClass: 'from-danger/5 to-danger/45', capClass: 'bg-danger' },
    { labelKey: 'ibDash.totalEquity', amount: stats.totalAvailableEquity, share: shareOfDeposits(stats.totalAvailableEquity), fillClass: 'from-primary/5 to-primary/45', capClass: 'bg-primary' },
  ];

  const clientDots = Math.min(stats.totalClients, NETWORK_DOTS);
  const riskDots = Math.min(stats.marginLevelBelow100, clientDots);
  const pendingDots = Math.min(stats.pendingRequests, NETWORK_DOTS - clientDots);

  const generated = stats.totalRebateGenerated;
  const withdrawnShare = generated > 0 ? Math.min(1, stats.totalWithdrawalRebate / generated) : 0;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-4">
      {/* Client funds: deposits as the headline, then the three figures as columns on one scale. */}
      <section className={cx(bentoCellClass, 'sm:col-span-2 lg:row-span-2')}>
        <CellGlow />
        <CellHeader icon="bank" titleKey="ibDash.groupMoney" />
        <div className="relative mt-6">
          <p className="text-xs text-fg-muted">{translate('ibDash.totalDeposited')}</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-fg tabular-nums sm:text-5xl">{money(deposited)}</p>
        </div>
        <div className="relative mt-auto grid h-60 grid-cols-3 gap-3 pt-10 sm:gap-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-10 bottom-7 bg-[repeating-linear-gradient(to_top,color-mix(in_srgb,var(--color-fg)_7%,transparent)_0_1px,transparent_1px_25%)]"
          />
          {columns.map((column, index) => {
            const height = Math.max(2, (column.amount / columnMax) * 100);
            return (
              <div key={column.labelKey} className="relative grid min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
                <div className="relative">
                  <div
                    className={cx('absolute inset-x-0 bottom-0 rounded-t-xl bg-linear-to-t', column.fillClass)}
                    style={{ height: isMounted ? `${height}%` : '0%', transition: `height 1100ms cubic-bezier(.2,.7,.2,1) ${200 + index * 140}ms` }}
                  >
                    <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-0.5 rounded-full', column.capClass)} />
                    <span className="absolute inset-x-0 -top-7 truncate text-center font-mono text-xs font-semibold text-fg tabular-nums">{money(column.amount)}</span>
                  </div>
                </div>
                <p className="truncate text-center text-[11px] text-fg-muted">
                  {translate(column.labelKey)}
                  {column.share !== null && <span className="ml-1 font-mono text-fg-subtle">{Math.round(column.share * 100)}%</span>}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Network: one tile per client (red = margin below 100%), dashed tiles for pending requests. */}
      <section style={riseDelay(1)} className={bentoCellClass}>
        <CellGlow />
        <CellHeader icon="user" titleKey="ibDash.groupNetwork" />
        <div className="relative mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-fg-muted">{translate('ibDash.totalClients')}</p>
            <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-fg tabular-nums">{stats.totalClients}</p>
          </div>
          <span aria-hidden="true" className="grid grid-cols-4 gap-1.5 pb-1">
            {Array.from({ length: clientDots + pendingDots }, (_, index) => {
              const isRisk = index < riskDots;
              const isPending = index >= clientDots;
              return (
                <span
                  key={index}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={cx(
                    'size-4 rounded-[5px] motion-reduce:animate-none',
                    isRisk && 'animate-ping-soft bg-danger text-danger',
                    isPending && 'border border-dashed border-(--orbit-violet)/60',
                    !isRisk && !isPending && 'animate-rise bg-primary/60',
                  )}
                />
              );
            })}
          </span>
        </div>
        <dl className="relative mt-auto grid grid-cols-2 gap-2 pt-5">
          <SubStat labelKey="ibDash.marginBelow" value={String(stats.marginLevelBelow100)} isAlert={stats.marginLevelBelow100 > 0} />
          <SubStat labelKey="ibDash.pendingRequests" value={String(stats.pendingRequests)} />
        </dl>
      </section>

      {/* Rebates: a ring showing how much of the generated rebate has been withdrawn. */}
      <section style={riseDelay(2)} className={bentoCellClass}>
        <CellGlow />
        <CellHeader icon="pieChart" titleKey="ibDash.groupRebates" />
        <div className="relative mt-5 flex items-center gap-4">
          <span className="relative size-20 shrink-0">
            <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10" className="stroke-fg/[0.06]" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${(isMounted ? withdrawnShare * 100 : 0).toFixed(2)} 100`}
                className="stroke-primary"
                style={{ transition: 'stroke-dasharray 1200ms cubic-bezier(.2,.7,.2,1) 400ms' }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-mono text-xs font-semibold text-primary">{Math.round(withdrawnShare * 100)}%</span>
          </span>
          <div className="min-w-0">
            <p className="text-xs text-fg-muted">{translate('ibDash.totalRebateGen')}</p>
            <p className="mt-1 truncate font-mono text-3xl font-semibold tracking-tight text-fg tabular-nums">{money(generated)}</p>
          </div>
        </div>
        <dl className="relative mt-auto grid grid-cols-2 gap-2 pt-5">
          <SubStat labelKey="ibDash.totalWithdrawalRebate" value={money(stats.totalWithdrawalRebate)} />
          <SubStat labelKey="ibDash.totalLot" value={stats.totalLot.toFixed(2)} />
        </dl>
      </section>

      {/* Available rebate: a translucent violet ticket with a perforated stub for the action. */}
      <section style={riseDelay(3)} className="orbit-card group relative flex animate-rise flex-wrap items-center gap-4 overflow-hidden p-5 motion-reduce:animate-none sm:col-span-2 sm:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] border border-primary/35 bg-primary/[0.07]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary/12 to-transparent [animation-duration:5s] motion-reduce:hidden" />
        <Icon name="wallet" size={140} className="pointer-events-none absolute -right-6 -bottom-10 text-primary/[0.06] transition-transform duration-500 group-hover:-rotate-12 motion-reduce:transition-none" />
        <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
          <Icon name="wallet" size={24} />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-fg-muted uppercase">{translate('ibDash.availableRebate')}</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-fg tabular-nums">{money(stats.availableRebate)}</p>
        </div>
        <span aria-hidden="true" className="relative hidden h-14 border-l border-dashed border-primary/40 sm:block" />
        <button
          type="button"
          className="group/btn relative flex h-12 shrink-0 items-center gap-2 rounded-xl border border-primary/50 bg-primary/15 px-6 text-sm font-semibold text-primary transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="withdrawal" size={16} className="transition-transform duration-300 group-hover/btn:-translate-y-0.5 motion-reduce:transition-none" />
          {translate('ibDash.withdraw')}
        </button>
      </section>
    </div>
  );
}

/* ───────────── Rebate reservoir: available rebate as liquid in a glass tank ───────────── */

const CHARGE_CELLS = 10;

function RebateReservoir({ stats }: { stats: IbStats }) {
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const fill = stats.totalRebateGenerated > 0 ? Math.min(1, stats.availableRebate / stats.totalRebateGenerated) : 0;
  const litCells = Math.round(fill * CHARGE_CELLS);
  const rows: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibDash.totalRebateGen', value: money(stats.totalRebateGenerated) },
    { labelKey: 'ibDash.totalWithdrawalRebate', value: money(stats.totalWithdrawalRebate) },
    { labelKey: 'ibDash.totalLot', value: stats.totalLot.toFixed(2) },
  ];

  return (
    <section className={cx(cardClass, 'flex flex-col lg:col-span-4')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-fg-muted uppercase">{translate('ibDash.availableRebate')}</p>
        <span className="rounded-md border border-primary/35 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">{Math.round(fill * 100)}%</span>
      </div>
      <p className="mt-2 font-mono text-[34px] leading-none font-semibold tracking-tight text-fg tabular-nums">{money(stats.availableRebate)}</p>

      {/* Charge meter: rising cells lit up to the share of generated rebate still available; the tip cell blinks. */}
      <div aria-hidden="true" className="mt-6 flex h-20 items-end gap-1.5">
        {Array.from({ length: CHARGE_CELLS }, (_, index) => {
          const isLit = index < litCells;
          const isTip = index === litCells - 1;
          return (
            <span
              key={index}
              style={{ height: `${30 + index * 7}%`, animationDelay: `${index * 70}ms` }}
              className={cx(
                'flex-1 rounded-md motion-reduce:animate-none',
                isTip ? 'animate-twinkle' : 'animate-rise',
                isLit ? 'bg-linear-to-t from-primary/30 to-primary shadow-[0_0_14px_-4px_var(--brand-primary)]' : 'bg-fg/[0.05] ring-1 ring-line',
              )}
            />
          );
        })}
      </div>

      <dl className="mt-5 flex flex-col divide-y divide-line">
        {rows.map((row) => (
          <div key={row.labelKey} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="truncate text-xs text-fg-muted">{translate(row.labelKey)}</dt>
            <dd className="shrink-0 font-mono text-sm font-semibold text-fg tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto pt-5">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="withdrawal" size={16} />
          {translate('ibDash.withdraw')}
        </button>
      </div>
    </section>
  );
}

/* ───────────── Client funds on one ruler: each figure is a pin along the same scale ───────────── */

function FundsRuler({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const scaleMax = Math.max(stats.totalDeposited, stats.totalWithdrawal, stats.totalAvailableEquity, 1);
  // Three concentric 270° arcs on one shared scale, largest radius for deposits.
  const rings: { labelKey: MessageKey; amount: number; radius: number; strokeClass: string; dotClass: string }[] = [
    { labelKey: 'ibDash.totalDeposited', amount: stats.totalDeposited, radius: 42, strokeClass: 'stroke-success', dotClass: 'bg-success' },
    { labelKey: 'ibDash.totalEquity', amount: stats.totalAvailableEquity, radius: 32, strokeClass: 'stroke-primary', dotClass: 'bg-primary' },
    { labelKey: 'ibDash.totalWithdrawal', amount: stats.totalWithdrawal, radius: 22, strokeClass: 'stroke-danger', dotClass: 'bg-danger' },
  ];

  return (
    <section className={cx(cardClass, 'lg:col-span-7')}>
      <header className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
          <Icon name="bank" size={17} />
        </span>
        <h3 className="text-base font-semibold text-fg">{translate('ibDash.groupMoney')}</h3>
      </header>

      <div className="mt-6 grid items-center gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="relative mx-auto size-52">
          <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
            <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
          </span>
          <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full rotate-[135deg]">
            {rings.map((ring, index) => {
              const arc = (ring.amount / scaleMax) * 75;
              return (
                <g key={ring.labelKey}>
                  <circle cx="50" cy="50" r={ring.radius} fill="none" strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray="75 100" className="stroke-fg/[0.06]" />
                  <circle
                    cx="50"
                    cy="50"
                    r={ring.radius}
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={`${(isMounted ? arc : 0).toFixed(2)} 100`}
                    className={ring.strokeClass}
                    style={{ transition: `stroke-dasharray 1200ms cubic-bezier(.2,.7,.2,1) ${200 + index * 150}ms` }}
                  />
                </g>
              );
            })}
          </svg>
          <span className="absolute inset-0 grid place-items-center text-primary/70">
            <Icon name="bank" size={20} />
          </span>
        </div>

        <dl className="flex flex-col divide-y divide-line">
          {rings.map((ring, index) => (
            <div key={ring.labelKey} style={riseDelay(index)} className="flex animate-rise items-center justify-between gap-4 py-3.5 motion-reduce:animate-none">
              <dt className="flex min-w-0 items-center gap-2.5 text-sm text-fg-muted">
                <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-full', ring.dotClass)} />
                <span className="truncate">{translate(ring.labelKey)}</span>
              </dt>
              <dd className="shrink-0 font-mono text-lg font-semibold text-fg tabular-nums">{formatMoney(ring.amount, stats.currency)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────── Commission face-off: mine vs sub-IB on one split bar ───────────── */

const periods: { id: IbCommissionPeriod; labelKey: MessageKey }[] = [
  { id: 'thisMonth', labelKey: 'ibDash.thisMonth' },
  { id: 'lastMonth', labelKey: 'ibDash.lastMonth' },
  { id: 'thisYear', labelKey: 'ibDash.thisYear' },
];

function CommissionDuel({ data }: { data: IbDashboard }) {
  const [period, setPeriod] = useState<IbCommissionPeriod>('thisMonth');
  const commission = data.commission[period];
  const total = commission.mine + commission.subIb;
  const myShare = total > 0 ? (commission.mine / total) * 100 : 50;
  const periodLabel = translate(periods.find((item) => item.id === period)?.labelKey ?? 'ibDash.thisMonth');
  // Leave a hairline between the two arcs only when both sides have something to show.
  const gap = commission.mine > 0 && commission.subIb > 0 ? 1.5 : 0;
  const sides = [
    { labelKey: 'ibDash.myCommission' as const, amount: commission.mine, share: myShare, offset: 0, strokeClass: 'stroke-primary', toneClass: 'bg-primary' },
    { labelKey: 'ibDash.subIbCommission' as const, amount: commission.subIb, share: 100 - myShare, offset: myShare, strokeClass: 'stroke-(--orbit-violet)/55', toneClass: 'bg-(--orbit-violet)/55' },
  ];

  return (
    <section className={cx(cardClass, 'flex flex-col lg:col-span-5')}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-fg">{translate('ibDash.commissionSummary')}</h3>
        <div role="radiogroup" aria-label={translate('ibDash.commissionSummary')} className="flex rounded-lg border border-line p-0.5">
          {periods.map((item) => {
            const isActive = item.id === period;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setPeriod(item.id)}
                className={cx(
                  'h-7 rounded-md px-3 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'bg-primary/15 text-primary' : 'text-fg-muted hover:text-fg',
                )}
              >
                {translate(item.labelKey)}
              </button>
            );
          })}
        </div>
      </header>

      <div className="my-auto grid items-center gap-6 pt-6 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="relative mx-auto size-40">
          <span aria-hidden="true" className="absolute -inset-1.5 animate-orbit-spin-fast rounded-full border border-dashed border-primary/25 motion-reduce:animate-none" />
          <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" strokeWidth="9" className="stroke-fg/[0.06]" />
            {total > 0 &&
              sides.map((side) => (
                <circle
                  key={side.labelKey}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  strokeWidth="9"
                  pathLength={100}
                  strokeDasharray={`${Math.max(0, side.share - gap).toFixed(2)} 100`}
                  strokeDashoffset={-Number(side.offset.toFixed(2))}
                  className={cx('transition-[stroke-dasharray,stroke-dashoffset] duration-700 motion-reduce:transition-none', side.strokeClass)}
                />
              ))}
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 animate-vs-pulse place-items-center rounded-full border border-primary/40 bg-primary/10 text-xs font-black tracking-wider text-primary motion-reduce:animate-none">
              VS
            </span>
          </span>
        </div>

        <ul className="flex flex-col gap-5">
          {sides.map((side) => (
            <li key={side.labelKey} className="flex flex-col gap-1.5">
              <p className="flex items-center gap-2 text-xs text-fg-muted">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', side.toneClass)} />
                <span className="truncate">
                  {translate(side.labelKey)} ({periodLabel})
                </span>
              </p>
              <p className="font-mono text-2xl leading-none font-semibold tracking-tight text-fg tabular-nums">{formatMoney(side.amount, data.stats.currency)}</p>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-fg/[0.06]">
                <span
                  className={cx('block h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none', side.toneClass)}
                  style={{ width: `${total > 0 ? side.share : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Recent activity: a spotlight stage fed by an auto-playing stream ───────────── */

const eventMeta: Record<IbNetworkEvent['kind'], { titleKey: MessageKey; icon: IconName; toneClass: string; glowClass: string }> = {
  appApproved: {
    titleKey: 'ibDash.appApproved',
    icon: 'checkCircle',
    toneClass: 'bg-success-soft text-success ring-success/40',
    glowClass: 'border-success/60',
  },
  subIbAdded: {
    titleKey: 'ibDash.subIbAdded',
    icon: 'pieChart',
    toneClass: 'bg-primary/15 text-primary ring-primary/40',
    glowClass: 'border-primary/70',
  },
  newClient: {
    titleKey: 'ibDash.newClient',
    icon: 'user',
    toneClass: 'wallet-card [background:var(--wallet-card-bg)] text-(--brand-gleam) ring-primary/50',
    glowClass: 'border-(--brand-gleam)/70',
  },
};

const tradeTone = 'bg-success-soft text-success ring-success/40';
const goldSheenText =
  'animate-gold-sheen bg-[linear-gradient(110deg,var(--brand-accent)_35%,#fff6dc_50%,var(--brand-accent)_65%)] bg-size-[250%_100%] bg-clip-text text-transparent motion-reduce:animate-none';

function isTrade(item: IbActivity): item is IbTradeCommission {
  return item.kind === 'commission';
}

function SideTag({ side }: { side: IbTradeCommission['side'] }) {
  return (
    <span
      className={cx(
        'rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
        side === 'buy' ? 'bg-success-soft text-success' : 'bg-danger/15 text-danger',
      )}
    >
      {translate(side === 'buy' ? 'ibDash.buy' : 'ibDash.sell')}
    </span>
  );
}

// Entry → exit drawn as a track that runs out in the direction price moved.
function PriceTrack({ trade }: { trade: IbTradeCommission }) {
  const delta = trade.exit - trade.entry;
  const isUp = delta >= 0;
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">{translate('ibDash.entry')}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-white tabular-nums">{trade.entry.toFixed(2)}</p>
        </div>
        <span
          className={cx(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
            isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
          )}
        >
          <Icon name={isUp ? 'trendUp' : 'trendDown'} size={12} />
          {isUp ? '+' : ''}
          {delta.toFixed(2)}
        </span>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">{translate('ibDash.exit')}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-white tabular-nums">{trade.exit.toFixed(2)}</p>
        </div>
      </div>
      <div className="relative mt-3 h-1.5 rounded-full bg-white/10">
        <span
          className={cx(
            'absolute inset-0 origin-left animate-story rounded-full [animation-duration:1.1s] [animation-timing-function:cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:animate-none',
            isUp ? 'bg-linear-to-r from-success/30 to-success' : 'bg-linear-to-r from-danger/30 to-danger',
          )}
        />
        <span aria-hidden="true" className="absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-(--hero-panel)" />
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-1/2 right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-(--hero-panel)',
            isUp ? 'bg-success shadow-[0_0_12px_var(--color-success)]' : 'bg-danger shadow-[0_0_12px_var(--color-danger)]',
          )}
        />
      </div>
    </div>
  );
}

function TradeSpotlight({ trade, currency }: { trade: IbTradeCommission; currency: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">
          {translate('ibDash.commissionEarned')}
          <SideTag side={trade.side} />
        </span>
        <span className="text-[11px] text-white/45">{formatAgo(trade.occurredAt)}</span>
      </div>
      <p className={cx('mt-4 font-mono text-5xl leading-none font-semibold tracking-tight tabular-nums sm:text-6xl', goldSheenText)}>
        +{formatMoney(trade.amount, currency)}
      </p>
      <p className="mt-3 text-sm text-white/60">
        {translate('ibDash.from')} <span className="font-semibold text-white">{trade.symbol}</span> ({translate('ibDash.account')}: {trade.account})
      </p>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <PriceTrack trade={trade} />
        <dl className="grid grid-cols-2 gap-3">
          {[
            { labelKey: 'ibDash.client' as const, value: trade.client, icon: 'user' as const },
            { labelKey: 'ibDash.lotSize' as const, value: String(trade.lotSize), icon: 'arrowsUpDown' as const },
          ].map((field) => (
            <div key={field.labelKey} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-3 ring-1 ring-white/10">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-(--brand-gleam)">
                <Icon name={field.icon} size={15} />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] tracking-[0.14em] text-white/45 uppercase">{translate(field.labelKey)}</dt>
                <dd className="truncate font-mono text-sm font-semibold text-white">{field.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}

function MilestoneSpotlight({ event }: { event: IbNetworkEvent }) {
  const meta = eventMeta[event.kind];
  return (
    <div className="my-auto flex flex-col items-center py-6 text-center">
      <span className="relative grid size-24 place-items-center">
        {[0, 1.2].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className={cx('absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden', meta.glowClass)}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className={cx('relative grid size-20 place-items-center rounded-full ring-1', meta.toneClass)}>
          <span aria-hidden="true" className="absolute -inset-2 animate-orbit rounded-full border border-dashed border-current opacity-40 [animation-duration:14s] motion-reduce:animate-none" />
          <Icon name={meta.icon} size={32} />
        </span>
      </span>
      <p className="mt-7 text-2xl font-semibold tracking-tight text-white">{translate(meta.titleKey)}</p>
      <p className="mt-2 text-sm text-white/60">{event.detail}</p>
      <p className="mt-4 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/50 ring-1 ring-white/10">{formatAgo(event.occurredAt)}</p>
    </div>
  );
}

interface StreamRowProps {
  item: IbActivity;
  currency: string;
  isActive: boolean;
  onSelect: () => void;
  onAdvance: () => void;
}

function StreamRow({ item, currency, isActive, onSelect, onAdvance }: StreamRowProps) {
  const trade = isTrade(item) ? item : null;
  const meta = trade ? null : eventMeta[(item as IbNetworkEvent).kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cx(
        'group/row relative flex w-full items-center gap-3 overflow-hidden rounded-xl py-2.5 pr-3 pl-12 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
        isActive ? 'bg-primary/[0.07]' : 'hover:bg-fg/[0.03]',
      )}
    >
      {/* Node on the timeline rail; the active one sends out a pulse. */}
      <span
        className={cx(
          'absolute top-1/2 left-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-full ring-1 transition-transform duration-300 group-hover/row:scale-110 motion-reduce:transition-none',
          trade ? tradeTone : meta?.toneClass,
        )}
      >
        {isActive && <span aria-hidden="true" className="absolute -inset-1 animate-pulse-ring rounded-full border border-primary/60 motion-reduce:hidden" />}
        <Icon name={trade ? 'trendUp' : (meta?.icon ?? 'user')} size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cx('truncate text-sm font-semibold', isActive ? 'text-fg' : 'text-fg/85')}>
            {translate(trade ? 'ibDash.commissionEarned' : (meta?.titleKey ?? 'ibDash.newClient'))}
          </span>
          {trade && <SideTag side={trade.side} />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {trade
            ? `${translate('ibDash.from')} ${trade.symbol} (${translate('ibDash.account')}: ${trade.account})`
            : (item as IbNetworkEvent).detail}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {trade && <span className="font-mono text-sm font-semibold text-success tabular-nums">+{formatMoney(trade.amount, currency)}</span>}
        <span className="text-[10px] text-fg-subtle">{formatAgo(item.occurredAt)}</span>
      </span>

      {/* Story-style progress: when it fills, the stream moves to the next entry. Paused while the user is in the card. */}
      {isActive && (
        <span
          aria-hidden="true"
          onAnimationEnd={onAdvance}
          className="absolute right-3 bottom-0 left-12 h-0.5 origin-left animate-story rounded-full bg-linear-to-r from-primary/40 to-primary group-hover/feed:[animation-play-state:paused] group-focus-within/feed:[animation-play-state:paused] motion-reduce:hidden"
        />
      )}
    </button>
  );
}

function ActivityTape({ data, isFetching, onRefresh }: { data: IbDashboard; isFetching: boolean; onRefresh: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = data.activity;
  const activeIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  const active = items[activeIndex];

  return (
    <section className={cx(cardClass, 'group/feed min-w-0 lg:col-span-8')}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold text-fg">{translate('ibDash.recentActivity')}</h3>
          {items.length > 0 && (
            <span className="font-mono text-xs text-fg-subtle tabular-nums">
              <span className="text-primary">{String(activeIndex + 1).padStart(2, '0')}</span> / {String(items.length).padStart(2, '0')}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={translate('ibDash.refresh')}
          title={translate('ibDash.refresh')}
          className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="refresh" size={15} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
        </button>
      </header>

      {active && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Timeline rail: every entry hangs a node on one vertical line. */}
          <ol className="relative flex flex-col gap-1">
            <span aria-hidden="true" className="pointer-events-none absolute top-4 bottom-4 left-6 w-px bg-linear-to-b from-primary/50 via-line to-transparent" />
            {items.map((item, index) => (
              <li key={item.id} style={riseDelay(index)} className="relative animate-rise motion-reduce:animate-none">
                <StreamRow
                  item={item}
                  currency={data.stats.currency}
                  isActive={index === activeIndex}
                  onSelect={() => setSelectedIndex(index)}
                  onAdvance={() => setSelectedIndex((index + 1) % items.length)}
                />
              </li>
            ))}
          </ol>

          <div className={cx('relative flex min-h-[380px] flex-col overflow-hidden rounded-3xl p-6 text-white ring-1 ring-primary/30', graphite)}>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(circle_at_70%_20%,black,transparent_75%)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-20 size-72 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_26%,transparent),transparent_68%)] motion-reduce:animate-none"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-white/[0.04] to-transparent [animation-duration:6s] motion-reduce:hidden" />
            <div key={active.id} className="relative flex flex-1 animate-rise flex-col motion-reduce:animate-none">
              {isTrade(active) ? <TradeSpotlight trade={active} currency={data.stats.currency} /> : <MilestoneSpotlight event={active} />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ───────────── Referral pass with a dot-matrix visit counter ───────────── */

function ReferralPass({ link, visits }: { link: string; visits: number }) {
  const [isCopied, setIsCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(link).then(
      () => {
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 1800);
      },
      () => setIsCopied(false),
    );
  }

  return (
    <section className={cx(cardClass, 'relative overflow-hidden')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative flex items-start gap-3">
        {/* Beacon: the link broadcasting outward. */}
        <span className="relative grid size-11 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          {[0, 1.2].map((delay) => (
            <span key={delay} aria-hidden="true" style={{ animationDelay: `${delay}s` }} className="absolute inset-0 animate-pulse-ring rounded-full border border-primary/50 motion-reduce:hidden" />
          ))}
          <Icon name="globe" size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-fg">{translate('ibDash.refTitle')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('ibDash.refText')}</p>
        </div>
      </div>

      <div className={cx('relative mt-5 flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-white ring-1 ring-primary/30', graphite)}>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/55 uppercase">{translate('ibDash.visitsOnLink')}</p>
          <span aria-hidden="true" className="mt-2 flex h-4 items-end gap-[3px]">
            {[0, 0.2, 0.4, 0.6, 0.8].map((delay) => (
              <span key={delay} style={{ animationDelay: `${delay}s` }} className="h-full w-1 origin-bottom animate-eq-bar rounded-full bg-primary/70 motion-reduce:animate-none" />
            ))}
          </span>
        </div>
        <DotNumber value={String(visits)} small />
      </div>

      <div className="relative mt-3 flex h-11 items-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/[0.04] pr-1 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg" title={link}>
          {link}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cx(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
            isCopied ? 'border-success/45 bg-success/10 text-success' : 'border-primary/45 bg-primary/10 text-primary hover:bg-primary/20',
          )}
        >
          <Icon name={isCopied ? 'checkCircle' : 'copy'} size={14} />
          {translate(isCopied ? 'ibDash.copied' : 'ibDash.copy')}
        </button>
      </div>
    </section>
  );
}

/* ───────────── Quick actions as launch rails ───────────── */

const quickActions: { href: string; titleKey: MessageKey; textKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/structure', titleKey: 'ibDash.myStructure', textKey: 'ibDash.myStructureText', icon: 'pieChart' },
  { href: '/ib/network', titleKey: 'nav.ibMyNetwork', textKey: 'ibDash.myNetworkText', icon: 'user' },
  { href: '/ib/sub-ib-approval', titleKey: 'nav.ibSubIbApproval', textKey: 'ibDash.subIbApprovalText', icon: 'clock' },
];

function QuickKeys() {
  return (
    <section className={cardClass}>
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-fg">{translate('ibDash.quickActions')}</h3>
        <span aria-hidden="true" className="flex gap-1">
          {quickActions.map((action) => (
            <span key={action.href} className="size-1.5 rounded-full bg-primary/60" />
          ))}
        </span>
      </header>

      <ul className="mt-4 flex flex-col gap-2">
        {quickActions.map((action, index) => (
          <li key={action.href} style={riseDelay(index)} className="animate-rise motion-reduce:animate-none">
            <Link
              href={action.href}
              className="group relative flex items-center gap-3.5 rounded-2xl border border-line p-3 transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              {/* Keycap: a raised key that presses down on hover. */}
              <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-b-4 border-primary/35 border-b-primary/55 bg-primary/10 text-primary transition-[transform,border-bottom-width] duration-200 group-hover:translate-y-0.5 group-hover:border-b-2 motion-reduce:transition-none">
                <Icon name={action.icon} size={19} />
                <span className="absolute top-0.5 left-1 font-mono text-[8px] text-primary/60">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{translate(action.titleKey)}</span>
                <span className="mt-0.5 block truncate text-xs text-fg-muted">{translate(action.textKey)}</span>
              </span>
              <Icon name="arrowRight" size={16} className="shrink-0 text-fg-subtle transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-busy="true">
      <div className="h-96 animate-pulse rounded-3xl bg-surface-2 lg:col-span-8" />
      <div className="h-96 animate-pulse rounded-3xl bg-surface-2 lg:col-span-4" />
      <div className="h-80 animate-pulse rounded-3xl bg-surface-2 lg:col-span-12" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-2 lg:col-span-5" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-2 lg:col-span-7" />
    </div>
  );
}

export default function IbDashboardPage() {
  const { data, isFetching, refetch } = useIbDashboard();

  if (!data) return <PageSkeleton />;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <ConstellationHero stats={data.stats} />
      <RebateReservoir stats={data.stats} />
      <MetricsBoard stats={data.stats} />
      <CommissionDuel data={data} />
      <FundsRuler stats={data.stats} />
      <div className="flex flex-col gap-5 lg:col-span-4">
        <ReferralPass link={data.referralLink} visits={data.referralVisits} />
        <QuickKeys />
      </div>
      <ActivityTape data={data} isFetching={isFetching} onRefresh={refetch} />
    </div>
  );
}
