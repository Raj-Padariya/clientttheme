'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbActivity, IbCommissionPeriod, IbDashboard, IbNetworkEvent, IbStats, IbTradeCommission } from '@/core/mock/ib';
import { useIbDashboard } from '@/core/pages/useIbDashboard';
import { cx } from '../lib/cx';
import { DotNumber } from '../ui/DotMatrix';
import { Icon, type IconName } from '../ui/Icon';
import { ibOverviewCopy, ibReferral } from './ibOverviewData';
import { IbClientFunnel, IbCommissionSummary, IbNetworkFeed, IbOverviewControls, IbSnapshotLedger, IbSubIbPerformance } from './IbOverviewSections';

const cardClass = 'rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6';
const graphite = 'bg-[#18181b]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const hexClip = '[clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]';
const goldSheenText =
  'animate-gold-sheen bg-[linear-gradient(110deg,var(--brand-accent)_35%,#fff6dc_50%,var(--brand-accent)_65%)] bg-size-[250%_100%] bg-clip-text text-transparent motion-reduce:animate-none';

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

// Flips to true one frame after mount so rings and lanes can sweep from empty to their real value.
function useMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

function SectionTitle({ icon, titleKey, children }: { icon: IconName; titleKey: MessageKey; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={cx('grid size-9 place-items-center rounded-xl text-(--brand-gleam) ring-1 ring-primary/40', graphite)}>
          <Icon name={icon} size={17} />
        </span>
        <h3 className="text-base font-semibold text-fg">{translate(titleKey)}</h3>
      </div>
      {children}
    </header>
  );
}

/* ───────────── Partner vault: identity + dock, client hive and the rebate dial in one graphite band ───────────── */

const dockLinks: { href: string; labelKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/network', labelKey: 'nav.ibMyNetwork', icon: 'user' },
  { href: '/ib/structure', labelKey: 'nav.ibSubIbStructure', icon: 'pieChart' },
  { href: '/ib/transfer-commission', labelKey: 'nav.ibTransferCommission', icon: 'transfer' },
  { href: '/ib/commission-history', labelKey: 'nav.ibCommissionHistory', icon: 'history' },
];

// Cells drawn in the hive before the rest collapse into a "+N" cell.
const MAX_CELLS = 8;

type CellKind = 'healthy' | 'risk' | 'pending';

const cellStyles: Record<CellKind, { cell: string; icon: IconName }> = {
  healthy: { cell: cx(goldFill, 'text-[#18181b]'), icon: 'user' },
  risk: { cell: 'bg-danger text-white', icon: 'alert' },
  pending: { cell: 'bg-white/[0.07] text-white/45', icon: 'clock' },
};

/*
 * Client hive: one hexagon per client in a zig-zag comb. Clients below 100% margin level burn red and pulse,
 * pending requests sit as dim ghost cells, and anything past MAX_CELLS folds into a "+N" cell.
 */
function ClientHive({ stats }: { stats: IbStats }) {
  const total = stats.totalClients;
  const shownClients = Math.min(total, MAX_CELLS);
  const shownRisk = Math.min(stats.marginLevelBelow100, shownClients);
  const shownPending = Math.min(stats.pendingRequests, MAX_CELLS - shownClients);
  const hiddenCount = total - shownClients;
  const kinds: CellKind[] = [
    ...Array<CellKind>(shownRisk).fill('risk'),
    ...Array<CellKind>(shownClients - shownRisk).fill('healthy'),
    ...Array<CellKind>(shownPending).fill('pending'),
  ];
  const legend: { labelKey: MessageKey; value: number; dotClass: string }[] = [
    { labelKey: 'ibDash.totalClients', value: total, dotClass: 'bg-(--brand-gleam)' },
    { labelKey: 'ibDash.marginBelow', value: stats.marginLevelBelow100, dotClass: 'bg-danger' },
    { labelKey: 'ibDash.pendingRequests', value: stats.pendingRequests, dotClass: 'bg-white/40' },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex min-h-[124px] flex-wrap items-start justify-center gap-x-1.5 pb-4">
        {kinds.map((kind, index) => {
          const style = cellStyles[kind];
          return (
            <span key={index} style={riseDelay(index + 2)} className={cx('animate-rise motion-reduce:animate-none', index % 2 === 1 && 'translate-y-7')}>
              <span
                className={cx(
                  'relative grid h-12 w-14 place-items-center transition-transform duration-300 hover:scale-110 motion-reduce:transition-none',
                  hexClip,
                  style.cell,
                  kind === 'risk' && 'animate-vs-pulse motion-reduce:animate-none',
                )}
              >
                <Icon name={style.icon} size={18} />
              </span>
            </span>
          );
        })}
        {hiddenCount > 0 && (
          <span className={cx('grid h-12 w-14 place-items-center font-mono text-xs font-semibold text-(--brand-gleam) ring-0', hexClip, 'bg-primary/20', kinds.length % 2 === 1 && 'translate-y-7')}>
            +{hiddenCount}
          </span>
        )}
      </div>

      <ul className="flex w-full flex-wrap justify-center gap-x-4 gap-y-2">
        {legend.map((item) => (
          <li key={item.labelKey} className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span aria-hidden="true" className={cx('size-2 rounded-full', item.dotClass)} />
            {translate(item.labelKey)}
            <span className="font-mono font-semibold text-white tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DIAL_RADIUS = 52;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

// Available rebate as a gold dial: the arc is how much of everything generated is still yours to withdraw.
function RebateDial({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const fill = stats.totalRebateGenerated > 0 ? Math.min(1, stats.availableRebate / stats.totalRebateGenerated) : 0;
  const rows: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibDash.totalRebateGen', value: money(stats.totalRebateGenerated) },
    { labelKey: 'ibDash.totalWithdrawalRebate', value: money(stats.totalWithdrawalRebate) },
    { labelKey: 'ibDash.totalLot', value: stats.totalLot.toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="ib-dial-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand-gleam)" />
                <stop offset="100%" stopColor="var(--brand-accent)" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={DIAL_RADIUS} fill="none" strokeWidth="10" className="stroke-white/10" />
            <circle
              cx="60"
              cy="60"
              r={DIAL_RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="url(#ib-dial-gold)"
              strokeDasharray={DIAL_CIRCUMFERENCE}
              strokeDashoffset={DIAL_CIRCUMFERENCE * (1 - (isMounted ? fill : 0))}
              className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <span className="text-center">
              <span className="block font-mono text-2xl font-semibold text-(--brand-gleam) tabular-nums">{Math.round(fill * 100)}%</span>
              <span aria-hidden="true" className="mx-auto mt-1 block size-1.5 animate-ping-soft rounded-full bg-(--brand-gleam) text-(--brand-gleam) motion-reduce:animate-none" />
            </span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">{translate('ibDash.availableRebate')}</p>
          <p className={cx('mt-1.5 font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums', goldSheenText)}>{money(stats.availableRebate)}</p>
          <button
            type="button"
            className={cx(
              'mt-4 flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-[#18181b] shadow-[0_12px_24px_-12px_var(--brand-primary)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              goldFill,
            )}
          >
            <Icon name="withdrawal" size={15} />
            {translate('ibDash.withdraw')}
          </button>
        </div>
      </div>

      <dl className="divide-y divide-white/10 rounded-2xl bg-white/[0.04] px-4 ring-1 ring-white/10">
        {rows.map((row) => (
          <div key={row.labelKey} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="truncate text-xs text-white/55">{translate(row.labelKey)}</dt>
            <dd className="font-mono text-sm font-semibold text-white tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PartnerVault({ stats }: { stats: IbStats }) {
  return (
    <section className={cx('relative overflow-hidden rounded-[2rem] text-white shadow-card ring-1 ring-primary/30 lg:col-span-12', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/3 size-[34rem] animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_18%,transparent),transparent_65%)] motion-reduce:animate-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]"
      />

      <div className="relative grid divide-y divide-white/10 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        <div className="flex min-w-0 flex-col p-6 sm:p-8 lg:col-span-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.2em] text-(--brand-gleam) uppercase ring-1 ring-white/10">
            <span aria-hidden="true" className="size-1.5 animate-ping-soft rounded-full bg-(--brand-gleam) text-(--brand-gleam) motion-reduce:animate-none" />
            {translate('ibDash.badge')}
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{translate('ibDash.title')}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{translate('ibDash.subtitle')}</p>

          <nav aria-label={translate('ibDash.title')} className="mt-7 grid grid-cols-2 gap-2">
            {dockLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                style={riseDelay(index)}
                className="group flex animate-rise items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10 transition-[background-color,box-shadow] duration-300 hover:bg-white/[0.08] hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
              >
                <Icon name={link.icon} size={16} className="shrink-0 text-(--brand-gleam)" />
                <span className="min-w-0 flex-1 truncate text-xs text-white/75 group-hover:text-white">{translate(link.labelKey)}</span>
                <Icon
                  name="arrowUpRight"
                  size={13}
                  className="shrink-0 text-white/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--brand-gleam) motion-reduce:transition-none"
                />
              </Link>
            ))}
            <button
              type="button"
              className={cx(
                'group col-span-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#18181b] transition-[box-shadow] duration-300 hover:shadow-[0_14px_26px_-14px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                goldFill,
              )}
            >
              {translate('ibDash.managerPortal')}
              <Icon name="arrowUpRight" size={14} className="transition-transform duration-300 group-hover:rotate-45 motion-reduce:transition-none" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 p-6 sm:p-8 lg:col-span-3">
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">{translate('ibDash.groupNetwork')}</p>
            <div className="mt-2 flex justify-center">
              <DotNumber value={String(stats.totalClients)} small />
            </div>
          </div>
          <ClientHive stats={stats} />
        </div>

        <div className="p-6 sm:p-8 lg:col-span-4">
          <RebateDial stats={stats} />
        </div>
      </div>
    </section>
  );
}

/* ───────────── Metrics ledger: the ten partner figures as one columned statement ───────────── */

// Thin track whose fill sweeps to full on first paint, then settles at its real share.
function ShareBar({ share, fillClass, delay }: { share: number; fillClass: string; delay: number }) {
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
      <div
        className={cx('h-full animate-progress-fill rounded-full motion-reduce:animate-none', fillClass)}
        style={{ width: `${Math.min(100, share * 100)}%`, animationDelay: `${0.3 + delay * 0.15}s` }}
      />
    </div>
  );
}

function LedgerLine({ labelKey, value, hint, isAlert = false }: { labelKey: MessageKey; value: string; hint?: string; isAlert?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-3">
      <dt className={cx('flex min-w-0 items-center gap-1.5 truncate text-sm', isAlert ? 'text-danger' : 'text-fg-muted')}>
        {isAlert && <span aria-hidden="true" className="size-1.5 shrink-0 animate-ping-soft rounded-full bg-danger text-danger motion-reduce:animate-none" />}
        {translate(labelKey)}
      </dt>
      <dd className="flex shrink-0 items-baseline gap-2">
        {hint && <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{hint}</span>}
        <span className={cx('font-mono text-base font-semibold tabular-nums', isAlert ? 'text-danger' : 'text-fg')}>{value}</span>
      </dd>
    </div>
  );
}

function LedgerColumn({ icon, titleKey, headlineKey, headline, index, children }: {
  icon: IconName;
  titleKey: MessageKey;
  headlineKey: MessageKey;
  headline: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <section style={riseDelay(index)} className="group flex animate-rise flex-col gap-4 p-5 motion-reduce:animate-none sm:p-6">
      <header className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">
        <Icon name={icon} size={14} className="text-primary transition-transform duration-300 group-hover:-rotate-12 motion-reduce:transition-none" />
        {translate(titleKey)}
      </header>
      <div>
        <p className="text-xs text-fg-muted">{translate(headlineKey)}</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-fg tabular-nums">{headline}</p>
      </div>
      <dl className="mt-auto flex flex-col gap-3">{children}</dl>
    </section>
  );
}

function MetricsLedger({ stats }: { stats: IbStats }) {
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const deposited = stats.totalDeposited;
  const percentOfDeposits = (amount: number) => `${deposited > 0 ? Math.round((amount / deposited) * 100) : 0}%`;
  const generated = stats.totalRebateGenerated;
  const withdrawnShare = generated > 0 ? stats.totalWithdrawalRebate / generated : 0;
  const clientTokens = Math.min(stats.totalClients, 5);
  const riskTokens = Math.min(stats.marginLevelBelow100, clientTokens);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:col-span-12">
      <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0 xl:grid-cols-[1fr_1fr_1fr_17rem]">
        <LedgerColumn icon="bank" titleKey="ibDash.groupMoney" headlineKey="ibDash.totalDeposited" headline={money(deposited)} index={0}>
          <ShareBar share={deposited > 0 ? 1 : 0} fillClass="bg-success" delay={0} />
          <LedgerLine labelKey="ibDash.totalWithdrawal" value={money(stats.totalWithdrawal)} hint={percentOfDeposits(stats.totalWithdrawal)} />
          <LedgerLine labelKey="ibDash.totalEquity" value={money(stats.totalAvailableEquity)} hint={percentOfDeposits(stats.totalAvailableEquity)} />
        </LedgerColumn>

        <LedgerColumn icon="user" titleKey="ibDash.groupNetwork" headlineKey="ibDash.totalClients" headline={String(stats.totalClients)} index={1}>
          <span aria-hidden="true" className="flex gap-1.5">
            {Array.from({ length: clientTokens }, (_, index) => (
              <span
                key={index}
                className={cx('h-1 flex-1 rounded-full transition-transform duration-300 group-hover:scale-y-150 motion-reduce:transition-none', index < riskTokens ? 'bg-danger' : 'bg-primary')}
                style={{ transitionDelay: `${index * 60}ms` }}
              />
            ))}
          </span>
          <LedgerLine labelKey="ibDash.marginBelow" value={String(stats.marginLevelBelow100)} isAlert={stats.marginLevelBelow100 > 0} />
          <LedgerLine labelKey="ibDash.pendingRequests" value={String(stats.pendingRequests)} />
        </LedgerColumn>

        <LedgerColumn icon="pieChart" titleKey="ibDash.groupRebates" headlineKey="ibDash.totalRebateGen" headline={money(generated)} index={2}>
          <ShareBar share={withdrawnShare} fillClass={graphite} delay={3} />
          <LedgerLine labelKey="ibDash.totalWithdrawalRebate" value={money(stats.totalWithdrawalRebate)} />
          <LedgerLine labelKey="ibDash.totalLot" value={stats.totalLot.toFixed(2)} />
        </LedgerColumn>

        {/* Available rebate stub: the one figure you can act on, torn off the statement in gold. */}
        <section
          style={riseDelay(3)}
          className={cx(
            'relative flex animate-rise flex-col justify-between gap-5 overflow-hidden p-5 text-[#18181b] motion-reduce:animate-none sm:p-6 md:col-span-3 md:flex-row md:items-center xl:col-span-1 xl:flex-col xl:items-stretch',
            goldFill,
          )}
        >
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />
          <span aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-0 border-l-2 border-dashed border-[#18181b]/25 xl:block" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-[#18181b]/65 uppercase">
              <Icon name="wallet" size={14} />
              {translate('ibDash.availableRebate')}
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums">{money(stats.availableRebate)}</p>
          </div>
          <button
            type="button"
            className={cx(
              'group/btn relative flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-(--brand-gleam) transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-12px_#18181b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b] motion-reduce:transition-none',
              graphite,
            )}
          >
            <Icon name="withdrawal" size={16} className="transition-transform duration-300 group-hover/btn:-translate-y-0.5 motion-reduce:transition-none" />
            {translate('ibDash.withdraw')}
          </button>
        </section>
      </div>
    </div>
  );
}

/* ───────────── Client funds as three lanes on a shared scale ───────────── */

function FundsLanes({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const scaleMax = Math.max(stats.totalDeposited, stats.totalWithdrawal, stats.totalAvailableEquity, 1);
  const lanes: { labelKey: MessageKey; amount: number; trackClass: string; coinClass: string; icon: IconName }[] = [
    { labelKey: 'ibDash.totalDeposited', amount: stats.totalDeposited, trackClass: 'bg-linear-to-r from-success/10 to-success/60', coinClass: 'bg-success text-white', icon: 'bank' },
    { labelKey: 'ibDash.totalWithdrawal', amount: stats.totalWithdrawal, trackClass: 'bg-linear-to-r from-danger/10 to-danger/60', coinClass: 'bg-danger text-white', icon: 'withdrawal' },
    { labelKey: 'ibDash.totalEquity', amount: stats.totalAvailableEquity, trackClass: 'bg-linear-to-r from-(--brand-accent)/15 to-(--brand-gleam)', coinClass: cx(goldFill, 'text-[#18181b]'), icon: 'wallet' },
  ];
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className={cx(cardClass, 'flex flex-col lg:col-span-7')}>
      <SectionTitle icon="bank" titleKey="ibDash.groupMoney" />

      <ul className="mt-7 flex flex-col gap-6">
        {lanes.map((lane, index) => {
          const share = (lane.amount / scaleMax) * 100;
          return (
            <li key={lane.labelKey}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg-muted">{translate(lane.labelKey)}</span>
                <span className="font-mono text-base font-semibold text-fg tabular-nums">{formatMoney(lane.amount, stats.currency)}</span>
              </div>
              <div className="relative mt-2.5 h-7 rounded-full bg-surface-2 ring-1 ring-line">
                <div
                  className={cx('absolute inset-y-1 left-1 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none', lane.trackClass)}
                  style={{ width: `calc(${isMounted ? share : 0}% - 0.5rem)`, transitionDelay: `${index * 150}ms` }}
                />
                <span
                  className={cx(
                    'absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-card ring-4 ring-surface transition-[left] duration-1000 ease-out motion-reduce:transition-none',
                    lane.coinClass,
                  )}
                  style={{ left: `clamp(0.875rem, ${isMounted ? share : 0}%, calc(100% - 0.875rem))`, transitionDelay: `${index * 150}ms` }}
                >
                  <Icon name={lane.icon} size={13} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div aria-hidden="true" className="mt-auto flex justify-between pt-6 font-mono text-[10px] text-fg-subtle tabular-nums">
        {ticks.map((tick) => (
          <span key={tick} className="flex flex-col items-center gap-1">
            <span className="h-2 w-px bg-line" />
            {formatMoney(scaleMax * tick, stats.currency)}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Commission ring: mine vs sub-IB as two arcs of one ring ───────────── */

const periods: { id: IbCommissionPeriod; labelKey: MessageKey }[] = [
  { id: 'thisMonth', labelKey: 'ibDash.thisMonth' },
  { id: 'lastMonth', labelKey: 'ibDash.lastMonth' },
  { id: 'thisYear', labelKey: 'ibDash.thisYear' },
];

const RING_RADIUS = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CommissionRing({ data }: { data: IbDashboard }) {
  const isMounted = useMounted();
  const [period, setPeriod] = useState<IbCommissionPeriod>('thisMonth');
  const commission = data.commission[period];
  const total = commission.mine + commission.subIb;
  const myShare = total > 0 ? commission.mine / total : 0.5;
  const periodLabel = translate(periods.find((item) => item.id === period)?.labelKey ?? 'ibDash.thisMonth');
  const mineLength = RING_CIRCUMFERENCE * (isMounted ? myShare : 0);
  const sides = [
    { labelKey: 'ibDash.myCommission' as const, amount: commission.mine, swatch: goldFill },
    { labelKey: 'ibDash.subIbCommission' as const, amount: commission.subIb, swatch: 'bg-fg/70' },
  ];

  return (
    <section className={cx(cardClass, 'flex flex-col lg:col-span-5')}>
      <SectionTitle icon="pieChart" titleKey="ibDash.commissionSummary" />
      <div role="radiogroup" aria-label={translate('ibDash.commissionSummary')} className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-line">
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
                'h-8 rounded-lg text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? cx(graphite, 'text-(--brand-gleam)') : 'text-fg-muted hover:text-fg',
              )}
            >
              {translate(item.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="my-auto flex flex-wrap items-center justify-center gap-6 pt-6 sm:flex-nowrap">
        <div className="relative size-36 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="ib-ring-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand-gleam)" />
                <stop offset="100%" stopColor="var(--brand-accent)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="9" className={total > 0 ? 'stroke-fg/70' : 'stroke-surface-2'} />
            {total > 0 && (
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="9"
                stroke="url(#ib-ring-gold)"
                strokeDasharray={`${mineLength} ${RING_CIRCUMFERENCE}`}
                className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
              />
            )}
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 animate-vs-pulse place-items-center rounded-full bg-[#18181b] text-xs font-black tracking-wider text-(--brand-gleam) ring-1 ring-primary/50 motion-reduce:animate-none">
              VS
            </span>
          </span>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-3">
          {sides.map((side) => (
            <li key={side.labelKey} className="rounded-2xl bg-surface-2 px-4 py-3 ring-1 ring-line">
              <p className="flex items-center gap-2 text-xs leading-snug text-fg-muted">
                <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-sm', side.swatch)} />
                <span>
                  {translate(side.labelKey)} ({periodLabel})
                </span>
              </p>
              <p className="mt-1.5 font-mono text-2xl leading-none font-semibold tracking-tight text-fg tabular-nums">
                {formatMoney(side.amount, data.stats.currency)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Recent activity: a timeline rail that auto-plays into a detail stage ───────────── */

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
    toneClass: 'bg-[#18181b] text-(--brand-gleam) ring-primary/50',
    glowClass: 'border-(--brand-gleam)/70',
  },
};

const tradeTone = 'bg-success-soft text-success ring-success/40';

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

// Entry and exit as two price plates joined by a connector that points the way price moved.
function PriceBridge({ trade }: { trade: IbTradeCommission }) {
  const delta = trade.exit - trade.entry;
  const isUp = delta >= 0;
  const plates = [
    { labelKey: 'ibDash.entry' as const, value: trade.entry },
    { labelKey: 'ibDash.exit' as const, value: trade.exit },
  ];

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {plates.map((plate, index) => (
        <div
          key={plate.labelKey}
          className={cx('rounded-xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/10', index === 1 && 'col-start-3 row-start-1 text-right')}
        >
          <p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">{translate(plate.labelKey)}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-white tabular-nums">{plate.value.toFixed(2)}</p>
        </div>
      ))}
      <span className="col-start-2 row-start-1 flex flex-col items-center gap-1">
        <span className="relative h-px w-10 overflow-hidden bg-white/15">
          <span className={cx('absolute inset-0 origin-left animate-story [animation-duration:1.1s] motion-reduce:animate-none', isUp ? 'bg-success' : 'bg-danger')} />
        </span>
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
      </span>
    </div>
  );
}

function TradeStage({ trade, currency }: { trade: IbTradeCommission; currency: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">
          {translate('ibDash.commissionEarned')}
          <SideTag side={trade.side} />
        </span>
        <span className="text-[11px] text-white/45">{formatAgo(trade.occurredAt)}</span>
      </div>
      <p className={cx('mt-5 font-mono text-5xl leading-none font-semibold tracking-tight tabular-nums', goldSheenText)}>+{formatMoney(trade.amount, currency)}</p>
      <p className="mt-3 text-sm text-white/60">
        {translate('ibDash.from')} <span className="font-semibold text-white">{trade.symbol}</span> ({translate('ibDash.account')}: {trade.account})
      </p>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <PriceBridge trade={trade} />
        <dl className="grid grid-cols-2 divide-x divide-white/10 rounded-xl bg-white/[0.04] ring-1 ring-white/10">
          {[
            { labelKey: 'ibDash.client' as const, value: trade.client, icon: 'user' as const },
            { labelKey: 'ibDash.lotSize' as const, value: String(trade.lotSize), icon: 'arrowsUpDown' as const },
          ].map((field) => (
            <div key={field.labelKey} className="flex items-center gap-2.5 px-3.5 py-3">
              <Icon name={field.icon} size={15} className="shrink-0 text-(--brand-gleam)" />
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

function MilestoneStage({ event }: { event: IbNetworkEvent }) {
  const meta = eventMeta[event.kind];
  return (
    <div className="my-auto flex flex-col items-center py-6 text-center">
      <span className="relative grid size-24 place-items-center">
        {[0, 1.2].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className={cx('absolute inset-0 animate-ring-ripple rounded-2xl border motion-reduce:hidden', meta.glowClass)}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className={cx('relative grid size-20 rotate-45 place-items-center rounded-2xl ring-1', meta.toneClass)}>
          <Icon name={meta.icon} size={30} className="-rotate-45" />
        </span>
      </span>
      <p className="mt-7 text-2xl font-semibold tracking-tight text-white">{translate(meta.titleKey)}</p>
      <p className="mt-2 text-sm text-white/60">{event.detail}</p>
      <p className="mt-4 rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] text-white/50 ring-1 ring-white/10">{formatAgo(event.occurredAt)}</p>
    </div>
  );
}

interface TimelineRowProps {
  item: IbActivity;
  currency: string;
  isActive: boolean;
  isLast: boolean;
  onSelect: () => void;
  onAdvance: () => void;
}

function TimelineRow({ item, currency, isActive, isLast, onSelect, onAdvance }: TimelineRowProps) {
  const trade = isTrade(item) ? item : null;
  const meta = trade ? null : eventMeta[(item as IbNetworkEvent).kind];

  return (
    <div className="relative flex gap-3">
      <span className="relative flex w-9 shrink-0 flex-col items-center">
        <span
          className={cx(
            'z-10 grid size-9 place-items-center rounded-full ring-1 transition-transform duration-300 motion-reduce:transition-none',
            trade ? tradeTone : meta?.toneClass,
            isActive && 'scale-110 shadow-[0_0_0_4px_var(--color-surface),0_0_18px_-4px_var(--brand-primary)]',
          )}
        >
          <Icon name={trade ? 'trendUp' : (meta?.icon ?? 'user')} size={15} />
        </span>
        {!isLast && <span aria-hidden="true" className="w-px flex-1 bg-line" />}
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
        className={cx(
          'relative mb-2 flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
          isActive ? 'bg-surface-2 ring-1 ring-primary/40' : 'hover:bg-surface-2/70',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cx('truncate text-sm font-semibold', isActive ? 'text-fg' : 'text-fg/85')}>
              {translate(trade ? 'ibDash.commissionEarned' : (meta?.titleKey ?? 'ibDash.newClient'))}
            </span>
            {trade && <SideTag side={trade.side} />}
          </span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">
            {trade ? `${translate('ibDash.from')} ${trade.symbol} (${translate('ibDash.account')}: ${trade.account})` : (item as IbNetworkEvent).detail}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {trade && <span className="font-mono text-sm font-semibold text-success tabular-nums">+{formatMoney(trade.amount, currency)}</span>}
          <span className="text-[10px] text-fg-subtle">{formatAgo(item.occurredAt)}</span>
        </span>

        {/* Story-style progress: when it fills, the rail moves to the next entry. Paused while the user is in the card. */}
        {isActive && (
          <span
            aria-hidden="true"
            onAnimationEnd={onAdvance}
            className="absolute inset-x-3 bottom-0 h-0.5 origin-left animate-story rounded-full bg-linear-to-r from-(--brand-accent) to-(--brand-gleam) group-hover/feed:[animation-play-state:paused] group-focus-within/feed:[animation-play-state:paused] motion-reduce:hidden"
          />
        )}
      </button>
    </div>
  );
}

function ActivityTimeline({ data, isFetching, onRefresh }: { data: IbDashboard; isFetching: boolean; onRefresh: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = data.activity;
  const activeIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  const active = items[activeIndex];

  return (
    <section className={cx(cardClass, 'group/feed min-w-0 lg:col-span-8')}>
      <SectionTitle icon="history" titleKey="ibDash.recentActivity">
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="font-mono text-xs text-fg-subtle tabular-nums">
              <span className="text-primary">{String(activeIndex + 1).padStart(2, '0')}</span> / {String(items.length).padStart(2, '0')}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            aria-label={translate('ibDash.refresh')}
            title={translate('ibDash.refresh')}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="refresh" size={15} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
          </button>
        </div>
      </SectionTitle>

      {active && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <ol className="flex flex-col">
            {items.map((item, index) => (
              <li key={item.id} style={riseDelay(index)} className="animate-rise motion-reduce:animate-none">
                <TimelineRow
                  item={item}
                  currency={data.stats.currency}
                  isActive={index === activeIndex}
                  isLast={index === items.length - 1}
                  onSelect={() => setSelectedIndex(index)}
                  onAdvance={() => setSelectedIndex((index + 1) % items.length)}
                />
              </li>
            ))}
          </ol>

          <div className={cx('relative flex min-h-[360px] flex-col overflow-hidden rounded-3xl p-6 text-white ring-1 ring-primary/30', graphite)}>
            <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-1', goldFill)} />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-20 size-72 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
            />
            <div key={active.id} className="relative flex flex-1 animate-rise flex-col motion-reduce:animate-none">
              {isTrade(active) ? <TradeStage trade={active} currency={data.stats.currency} /> : <MilestoneStage event={active} />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ───────────── Referral ticket: gold visit stub on the left, link on the right ───────────── */

function ReferralTicket({ link, visits }: { link: string; visits: number }) {
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
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div className={cx('relative flex items-center justify-between gap-4 px-5 py-4 text-white', graphite)}>
        <div>
          <span className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">{translate('ibDash.visitsOnLink')}</span>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
            <Icon name="user" size={13} className="text-(--brand-gleam)" />
            <span className="font-mono tabular-nums">{ibReferral.used}</span> {ibOverviewCopy.used}
          </p>
        </div>
        <DotNumber value={String(visits)} small />
      </div>

      {/* Tear line with punched notches either side. */}
      <div aria-hidden="true" className="relative h-0 border-t-2 border-dashed border-line">
        <span className="absolute -top-3 -left-3 size-6 rounded-full border border-line bg-app" />
        <span className="absolute -top-3 -right-3 size-6 rounded-full border border-line bg-app" />
      </div>

      <div className="p-5">
        <h3 className="text-base font-semibold text-fg">{translate('ibDash.refTitle')}</h3>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('ibDash.refText')}</p>
        <p className="mt-1 text-[11px] text-fg-subtle">{ibOverviewCopy.shareHint}</p>
        <div className="mt-4 flex flex-col gap-2">
          <span className="flex h-10 items-center gap-2 rounded-xl bg-surface-2 px-3 ring-1 ring-line">
            <Icon name="globe" size={15} className="shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg" title={link}>
              {link}
            </span>
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={cx(
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-[#18181b] transition-[box-shadow] hover:shadow-[0_12px_22px_-12px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              goldFill,
            )}
          >
            <Icon name={isCopied ? 'checkCircle' : 'copy'} size={14} />
            {translate(isCopied ? 'ibDash.copied' : 'ibDash.copy')}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Quick actions as a keypad of square keys ───────────── */

const quickActions: { href: string; titleKey: MessageKey; textKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/structure', titleKey: 'ibDash.myStructure', textKey: 'ibDash.myStructureText', icon: 'pieChart' },
  { href: '/ib/network', titleKey: 'nav.ibMyNetwork', textKey: 'ibDash.myNetworkText', icon: 'user' },
  { href: '/ib/sub-ib-approval', titleKey: 'nav.ibSubIbApproval', textKey: 'ibDash.subIbApprovalText', icon: 'clock' },
];

function QuickKeypad() {
  return (
    <section className={cardClass}>
      <SectionTitle icon="arrowUpRight" titleKey="ibDash.quickActions" />
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {quickActions.map((action, index) => (
          <li key={action.href} style={riseDelay(index)} className="animate-rise motion-reduce:animate-none">
            <Link
              href={action.href}
              className="group flex items-center gap-3.5 rounded-xl py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-primary ring-1 ring-line transition-colors duration-300 group-hover:text-[#18181b] group-hover:ring-transparent">
                <span aria-hidden="true" className={cx('absolute inset-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0 motion-reduce:transition-none', goldFill)} />
                <Icon name={action.icon} size={18} className="relative" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{translate(action.titleKey)}</span>
                <span className="mt-0.5 block truncate text-xs text-fg-muted">{translate(action.textKey)}</span>
              </span>
              <Icon
                name="arrowUpRight"
                size={15}
                className="shrink-0 text-fg-subtle transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary motion-reduce:transition-none"
              />
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
      <div className="h-96 animate-pulse rounded-[2rem] bg-surface-2 lg:col-span-12" />
      <div className="h-56 animate-pulse rounded-3xl bg-surface-2 lg:col-span-12" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-2 lg:col-span-7" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-2 lg:col-span-5" />
    </div>
  );
}

export default function IbDashboardPage() {
  const { data, isFetching, refetch } = useIbDashboard();

  if (!data) return <PageSkeleton />;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <IbOverviewControls />
      <PartnerVault stats={data.stats} />
      <MetricsLedger stats={data.stats} />
      <FundsLanes stats={data.stats} />
      <CommissionRing data={data} />
      <IbSnapshotLedger />
      <IbCommissionSummary />
      <IbClientFunnel />
      <IbSubIbPerformance />
      <IbNetworkFeed />
      <ActivityTimeline data={data} isFetching={isFetching} onRefresh={refetch} />
      <div className="flex flex-col gap-5 lg:col-span-4">
        <ReferralTicket link={ibReferral.link} visits={data.referralVisits} />
        <QuickKeypad />
      </div>
    </div>
  );
}
