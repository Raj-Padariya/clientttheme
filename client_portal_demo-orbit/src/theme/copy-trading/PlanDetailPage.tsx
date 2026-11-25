'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { DataTable, type Column } from '../ui/Table';
import { EditPlanDialog } from './EditPlanDialog';
import { myPlans, pausePlanCopy, planDetailCopy as copy, planDetails, type PlanCopier, type PlanDetail, type PlanTrade } from './myPlansData';
import { PausePlanDialog } from './PausePlanDialog';

const TRADE_PAGE_SIZE = 10;
const ALL = 'all';
const DAY_MS = 86_400_000;

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fullDayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Flips to true one frame after mount so CSS transitions (chart reveal, ring sweep) actually run. */
function useArrived(): boolean {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frameId);
  }, []);
  return arrived;
}

function Panel({
  title,
  icon,
  aside,
  index = 0,
  className,
  children,
}: {
  title: ReactNode;
  icon: IconName;
  aside?: ReactNode;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={staggerStyle(index, 120)}
      className={cx(
        'group/panel relative isolate animate-rise overflow-hidden rounded-[26px] border border-line bg-surface/70 p-5 backdrop-blur-xl transition-colors duration-300 hover:border-primary/30 motion-reduce:animate-none sm:p-6',
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 -z-10 size-56 rounded-full bg-primary/8 blur-3xl transition-opacity duration-500 group-hover/panel:opacity-150" />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-fg">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
            <Icon name={icon} size={15} />
          </span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Label + explanation on the left, value on the right — one row per setting. */
function InfoRows({ rows }: { rows: { label: string; hint: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((row, index) => (
        <div
          key={row.label}
          style={staggerStyle(index, 200)}
          className="group/row relative flex animate-rise items-center justify-between gap-4 border-b border-dashed border-line py-3 last:border-b-0 motion-reduce:animate-none"
        >
          <span aria-hidden="true" className="absolute top-3 bottom-3 -left-5 w-0.5 scale-y-0 rounded-full bg-primary transition-transform duration-300 group-hover/row:scale-y-100 sm:-left-6" />
          <dt className="min-w-0">
            <span className="block text-sm font-semibold text-fg">{row.label}</span>
            <span className="block text-xs text-fg-muted">{row.hint}</span>
          </dt>
          <dd className="shrink-0 text-right text-sm text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Kpi({ icon, label, caption, value, tone, index }: { icon: IconName; label: string; caption: string; value: number; tone?: string; index: number }) {
  const isMoney = icon !== 'user' && icon !== 'signalBars';
  return (
    <div
      style={staggerStyle(index, 160)}
      className="group/kpi relative animate-rise overflow-hidden rounded-2xl border border-line bg-fg/[0.03] p-4 transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover/kpi:opacity-100" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-primary/12 text-primary transition-transform duration-300 group-hover/kpi:rotate-12">
          <Icon name={icon} size={14} />
        </span>
      </div>
      <p className={cx('mt-2 font-mono text-xl font-semibold tabular-nums', tone ?? 'text-fg')}>
        <CountUp value={value} format={(current) => (isMoney ? formatUsd(current) : String(Math.round(current)))} />
      </p>
      <span className="mt-1 inline-block rounded-md bg-fg/[0.05] px-1.5 py-0.5 text-[11px] text-fg-subtle">{caption}</span>
    </div>
  );
}

function PlanHero({
  plan,
  detail,
  onEdit,
  onPauseToggle,
}: {
  plan: (typeof myPlans)[number];
  detail: PlanDetail;
  onEdit: () => void;
  onPauseToggle: () => void;
}) {
  const kpis: { icon: IconName; label: string; caption: string; value: number; tone?: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: detail.activeCopiers },
    { icon: 'wallet', label: copy.planAum, caption: copy.lockedCapital, value: detail.planAum },
    { icon: 'signalBars', label: copy.openPositions, caption: copy.currentlyOpen, value: detail.openPositions },
    { icon: 'clock', label: copy.floatingCommission, caption: copy.onOpenTrades, value: detail.floatingCommission },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settledCaption, value: detail.commissionEarned, tone: toneOf(detail.commissionEarned) },
    { icon: 'trendUp', label: copy.netPnl, caption: copy.afterAllFees, value: detail.netPnl, tone: toneOf(detail.netPnl) },
  ];
  const actions: { icon: IconName; label: string; danger?: boolean; onClick?: () => void }[] = [
    { icon: 'pencil', label: copy.edit, onClick: onEdit },
    detail.copyingActive ? { icon: 'pause', label: copy.pause, onClick: onPauseToggle } : { icon: 'play', label: pausePlanCopy.resume, onClick: onPauseToggle },
    { icon: 'xCircle', label: copy.inactivate, danger: true },
  ];

  return (
    <section className="relative isolate animate-rise overflow-hidden rounded-[28px] border border-primary/25 bg-surface/70 p-5 backdrop-blur-xl motion-reduce:animate-none sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-20 -z-10 size-80 rounded-full bg-primary/14 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-40 -z-10 size-96 rounded-full bg-(--orbit-violet)/10 blur-3xl" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-orbit-spin-fast rounded-full border border-dashed border-primary/50 motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-orbit-spin-fast motion-reduce:hidden">
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
            </span>
            <span className="grid size-12 place-items-center rounded-full bg-primary/20 text-lg font-bold text-primary uppercase ring-1 ring-primary/40">{plan.name.charAt(0)}</span>
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-fg">{plan.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-success/12 px-2 py-0.5 font-semibold text-success ring-1 ring-success/30">{copy.approved}</span>
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-primary ring-1 ring-primary/25">{detail.commissionLabel}</span>
              <span className="flex items-center gap-1.5 text-fg-muted">
                {detail.copyingActive ? <LiveDot /> : <Icon name="pause" size={11} className="text-warning" />}
                {detail.copyingActive ? copy.copyingOn : pausePlanCopy.paused}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              aria-haspopup={action.onClick ? 'dialog' : undefined}
              onClick={action.onClick}
              className={cx(
                'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                action.danger ? 'border-danger/40 text-danger hover:bg-danger/10' : 'border-line bg-fg/[0.03] text-fg hover:border-primary/45 hover:bg-primary/10',
              )}
            >
              <Icon name={action.icon} size={14} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <Kpi key={kpi.label} index={index} {...kpi} />
        ))}
      </div>
    </section>
  );
}

function WinRateRing({ winRate }: { winRate: number }) {
  const arrived = useArrived();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-40 shrink-0 place-items-center">
      <svg aria-hidden="true" viewBox="0 0 140 140" className="absolute inset-0 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="8" className="stroke-fg/[0.07]" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary drop-shadow-[0_0_8px_var(--brand-primary)] transition-[stroke-dashoffset] duration-[1600ms] ease-out motion-reduce:transition-none"
          strokeDasharray={circumference}
          strokeDashoffset={arrived ? circumference * (1 - winRate / 100) : circumference}
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-3 animate-orbit-spin-fast rounded-full border border-dashed border-primary/25 motion-reduce:animate-none" />
      <span className="text-center">
        <span className="block font-mono text-2xl font-semibold text-fg tabular-nums">
          <CountUp value={winRate} format={(current) => `${current.toFixed(2)}%`} />
        </span>
        <span className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{copy.winRate}</span>
      </span>
    </div>
  );
}

function PerformancePanel({ performance }: { performance: PlanDetail['performance'] }) {
  const stats: { label: string; value: string; tone?: string }[] = [
    { label: copy.closedTrades, value: String(performance.closedTrades) },
    { label: copy.avgWin, value: formatUsd(performance.avgWin), tone: 'text-success' },
    { label: copy.avgLoss, value: formatUsd(performance.avgLoss), tone: 'text-danger' },
    { label: copy.profitFactor, value: performance.profitFactor.toFixed(2) },
    { label: copy.expectancy, value: formatUsd(performance.expectancy), tone: 'text-success' },
    { label: copy.netPnl, value: formatUsd(performance.netPnl), tone: 'text-success' },
    { label: copy.maxDrawdown, value: formatUsd(performance.maxDrawdown), tone: 'text-danger' },
  ];
  return (
    <Panel title={copy.performance} icon="pieChart" index={0}>
      <div className="flex flex-col items-center gap-5 md:flex-row">
        <WinRateRing winRate={performance.winRate} />
        <dl className="grid w-full flex-1 grid-cols-2 gap-x-6 sm:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} style={staggerStyle(index, 240)} className="animate-rise border-b border-dashed border-line py-3 motion-reduce:animate-none">
              <dt className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{stat.label}</dt>
              <dd className={cx('mt-1 font-mono text-lg font-semibold tabular-nums', stat.tone ?? 'text-fg')}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}

function EquityChart({ equity, equityEnd }: { equity: number[]; equityEnd: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const arrived = useArrived();
  const [hovered, setHovered] = useState<number | null>(null);

  const endTime = new Date(`${equityEnd}T00:00:00Z`).getTime();
  const dateAt = (index: number) => new Date(endTime - (equity.length - 1 - index) * DAY_MS);
  const yMax = Math.ceil(Math.max(...equity) / 10) * 10;
  const yMin = Math.floor(Math.min(...equity) / 10) * 10 - 10;
  const yTicks = Array.from({ length: (yMax - yMin) / 10 + 1 }, (_, index) => yMax - index * 10);
  const xPct = (index: number) => (index / (equity.length - 1)) * 100;
  const yPct = (value: number) => ((yMax - value) / (yMax - yMin)) * 100;

  const line = equity.map((value, index) => `${index === 0 ? 'M' : 'L'}${xPct(index).toFixed(2)} ${yPct(value).toFixed(2)}`).join(' ');
  const area = `${line} L100 100 L0 100 Z`;
  const xLabels = Array.from({ length: 7 }, (_, step) => Math.round((step / 6) * (equity.length - 1)));
  const last = equity.length - 1;
  const active = hovered ?? last;

  return (
    <div className="flex gap-3">
      <div aria-hidden="true" className="relative w-10 shrink-0 font-mono text-[10.5px] text-fg-subtle">
        {yTicks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${yPct(tick)}%` }}>
            ${tick}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div
          role="img"
          aria-label={`${copy.equityCurve}: ${formatUsd(equity[last])}`}
          className="relative h-64 cursor-crosshair touch-none"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
            setHovered(Math.round(ratio * last));
          }}
          onPointerLeave={() => setHovered(null)}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id={`${uid}area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((tick) => (
              <line key={tick} x1="0" x2="100" y1={yPct(tick)} y2={yPct(tick)} vectorEffect="non-scaling-stroke" strokeDasharray="3 5" className="stroke-fg/[0.08]" />
            ))}
          </svg>
          {/* The curve sweeps in left-to-right by un-clipping its wrapper. */}
          <div
            className="absolute inset-0 transition-[clip-path] duration-[1800ms] ease-out motion-reduce:transition-none"
            style={{ clipPath: arrived ? 'inset(-10% 0 -10% 0)' : 'inset(-10% 100% -10% 0)' }}
          >
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <path d={area} fill={`url(#${uid}area)`} />
              <path d={line} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-primary drop-shadow-[0_0_6px_var(--brand-primary)]" />
            </svg>
          </div>

          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-primary/40 transition-[left] duration-150" style={{ left: `${xPct(active)}%` }} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center transition-[left,top] duration-150"
            style={{ left: `${xPct(active)}%`, top: `${yPct(equity[active])}%` }}
          >
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/50 motion-reduce:animate-none" />
            <span className="relative size-2.5 rounded-full bg-primary ring-2 ring-surface" />
          </span>
          <span
            className={cx(
              'pointer-events-none absolute top-1 rounded-xl border border-primary/30 bg-elevated/90 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur transition-opacity duration-150',
              xPct(active) > 70 ? '-translate-x-full' : 'translate-x-2',
            )}
            style={{ left: `${xPct(active)}%` }}
          >
            <span className="block text-fg-subtle">{fullDayFormat.format(dateAt(active))}</span>
            <span className={cx('font-mono font-semibold tabular-nums', toneOf(equity[active]))}>{formatUsd(equity[active])}</span>
          </span>
        </div>
        <div aria-hidden="true" className="relative mt-2 h-4 font-mono text-[10.5px] text-fg-subtle">
          {xLabels.map((index) => (
            <span
              key={index}
              className={cx('absolute', index === 0 ? '' : index === last ? '-translate-x-full' : '-translate-x-1/2')}
              style={{ left: `${xPct(index)}%` }}
            >
              {dayFormat.format(dateAt(index))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommissionSummary({ commission }: { commission: PlanDetail['commission'] }) {
  const arrived = useArrived();
  const settledShare = commission.lifetime === 0 ? 0 : (commission.settled / commission.lifetime) * 100;
  const cells: { label: string; value: number; tone: string; hint?: string }[] = [
    { label: copy.lifetime, value: commission.lifetime, tone: 'text-fg' },
    { label: copy.thisMonth, value: commission.thisMonth, tone: 'text-fg' },
    { label: copy.pending, value: commission.pending, tone: 'text-warning', hint: copy.pendingHint },
    { label: copy.settled, value: commission.settled, tone: 'text-success' },
  ];
  return (
    <Panel title={copy.commissionSummary} icon="wallet" index={2}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="border-l-2 border-primary/30 pl-3">
            <p className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{cell.label}</p>
            <p className={cx('mt-1 font-mono text-xl font-semibold tabular-nums', cell.tone)}>
              <CountUp value={cell.value} format={formatUsd} />
            </p>
            {cell.hint && <p className="text-[11px] text-fg-muted">{cell.hint}</p>}
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-[11px] text-fg-subtle">
          <span>{copy.settled}</span>
          <span className="font-mono tabular-nums">{settledShare.toFixed(0)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary/60 to-primary shadow-[0_0_10px_var(--brand-primary)] transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
            style={{ width: arrived ? `${settledShare}%` : '0%' }}
          />
        </div>
      </div>
    </Panel>
  );
}

const copierColumns: Column<PlanCopier>[] = [
  {
    key: 'copier',
    header: copy.copier,
    render: (copier) => (
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary uppercase ring-1 ring-primary/30">{copier.name.charAt(0)}</span>
        <span>
          <span className="block font-semibold">{copier.name}</span>
          <span className="block text-xs text-fg-muted">{copier.email}</span>
        </span>
      </span>
    ),
  },
  { key: 'account', header: copy.account, render: (copier) => <span className="font-mono text-xs">{copier.account}</span> },
  { key: 'capital', header: copy.capital, render: (copier) => <span className="font-mono tabular-nums">{formatUsd(copier.capital)}</span> },
  { key: 'open', header: copy.openTrades, render: (copier) => <span className="font-mono tabular-nums">{copier.openTrades}</span> },
  { key: 'pnl', header: copy.totalPnl, render: (copier) => <span className={cx('font-mono font-semibold tabular-nums', toneOf(copier.totalPnl))}>{formatUsd(copier.totalPnl)}</span> },
  { key: 'paid', header: copy.commissionPaid, render: (copier) => <span className="font-mono tabular-nums">{formatUsd(copier.commissionPaid)}</span> },
  { key: 'pending', header: copy.pendingFee, render: (copier) => <span className="font-mono tabular-nums">{formatUsd(copier.pendingFee)}</span> },
  {
    key: 'status',
    header: copy.status,
    render: (copier) => (
      <span
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
          copier.status === 'Active' ? 'bg-success/12 text-success ring-success/30' : 'bg-fg/[0.06] text-fg-muted ring-line',
        )}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
        {copier.status}
      </span>
    ),
  },
  { key: 'joined', header: copy.joined, render: (copier) => <span className="text-fg-muted">{copier.joined}</span> },
];

const tradeColumns: Column<PlanTrade>[] = [
  { key: 'date', header: copy.date, render: (trade) => <span className="text-fg-muted">{trade.date}</span> },
  { key: 'symbol', header: copy.symbol, render: (trade) => <span className="font-semibold">{trade.symbol}</span> },
  {
    key: 'direction',
    header: copy.direction,
    render: (trade) => (
      <span
        className={cx(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ring-1',
          trade.direction === 'BUY' ? 'bg-success/12 text-success ring-success/30' : 'bg-danger/12 text-danger ring-danger/30',
        )}
      >
        <Icon name={trade.direction === 'BUY' ? 'trendUp' : 'trendDown'} size={11} />
        {trade.direction}
      </span>
    ),
  },
  { key: 'account', header: copy.copierAccount, render: (trade) => <span className="font-mono text-xs">{trade.copierAccount}</span> },
  { key: 'name', header: copy.copierName, render: (trade) => trade.copierName },
  { key: 'pnl', header: copy.copierPnl, align: 'right', render: (trade) => <span className={cx('font-mono font-semibold tabular-nums', toneOf(trade.copierPnl))}>{formatUsd(trade.copierPnl)}</span> },
  { key: 'paid', header: copy.paidToYou, align: 'right', render: (trade) => <span className="font-mono tabular-nums">{formatUsd(trade.paidToMaster)}</span> },
  { key: 'running', header: copy.runningFee, align: 'right', render: (trade) => <span className="font-mono text-fg-muted tabular-nums">{formatUsd(trade.runningFeeEstimate)}</span> },
  { key: 'fee', header: copy.feeStatus, render: (trade) => <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/25">{trade.feeStatus}</span> },
  { key: 'status', header: copy.status, render: (trade) => <span className="text-[11px] font-semibold text-fg-muted">{trade.status}</span> },
];

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-primary/15 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {symbol}
    </button>
  );
}

function TradeHistory({ trades }: { trades: PlanTrade[] }) {
  const [symbol, setSymbol] = useState(ALL);
  const [direction, setDirection] = useState(ALL);
  const [copier, setCopier] = useState(ALL);
  const [page, setPage] = useState(1);

  const unique = (values: string[]) => [...new Set(values)];
  const filtered = trades.filter(
    (trade) => (symbol === ALL || trade.symbol === symbol) && (direction === ALL || trade.direction === direction) && (copier === ALL || trade.copierName === copier),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / TRADE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * TRADE_PAGE_SIZE;
  const pageItems = filtered.slice(firstIndex, firstIndex + TRADE_PAGE_SIZE);
  const choose = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <Panel
      title={copy.tradeHistory}
      icon="history"
      index={8}
      aside={
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
          <Dropdown
            label={copy.symbol}
            value={symbol}
            options={[{ value: ALL, label: copy.allSymbols }, ...unique(trades.map((trade) => trade.symbol)).map((value) => ({ value, label: value }))]}
            onChange={choose(setSymbol)}
            className="sm:w-40"
          />
          <Dropdown
            label={copy.direction}
            value={direction}
            options={[{ value: ALL, label: copy.allDirections }, ...unique(trades.map((trade) => trade.direction)).map((value) => ({ value, label: value }))]}
            onChange={choose(setDirection)}
            className="sm:w-40"
          />
          <Dropdown
            label={copy.copierName}
            value={copier}
            options={[{ value: ALL, label: copy.allCopiers }, ...unique(trades.map((trade) => trade.copierName)).map((value) => ({ value, label: value }))]}
            onChange={choose(setCopier)}
            className="sm:w-40"
          />
        </div>
      }
    >
      <p className="mb-4 flex gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-relaxed text-fg-muted">
        <Icon name="info" size={15} className="mt-px shrink-0 text-primary" />
        <span>
          <strong className="text-fg">{copy.paidToYou}</strong> {copy.paidToYouNote} <strong className="text-fg">{copy.runningFee}</strong> {copy.runningFeeNote}
        </span>
      </p>
      <DataTable caption={copy.tradeHistory} columns={tradeColumns} rows={pageItems} rowKey={(trade) => trade.id} emptyTitle={copy.noTrades} emptyDescription="" />
      <div className="mt-4 flex flex-col items-center gap-3 border-t border-line pt-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-fg-muted tabular-nums">
          {copy.showing} {filtered.length === 0 ? 0 : firstIndex + 1}–{firstIndex + pageItems.length} {copy.of} {filtered.length}
        </p>
        <div className="flex items-center gap-1 rounded-full border border-fg/10 bg-fg/[0.03] p-1">
          <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
          <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
          <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
            {copy.page}
            <span className="flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/25 font-semibold text-fg tabular-nums">{currentPage}</span>/ {pageCount}
          </span>
          <PagerButton label={copy.nextPage} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
          <PagerButton label={copy.lastPage} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
        </div>
      </div>
    </Panel>
  );
}

function BackLink() {
  return (
    <Link
      href="/copy-trading/my-plans"
      className="group/back inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-primary/45 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon name="arrowLeft" size={14} className="transition-transform duration-300 group-hover/back:-translate-x-1" />
      {copy.back}
    </Link>
  );
}

export default function PlanDetailPage({ planId }: { planId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const plan = myPlans.find((item) => String(item.id) === planId);
  const baseDetail = plan ? planDetails[plan.id] : undefined;
  const detail = baseDetail && { ...baseDetail, copyingActive: baseDetail.copyingActive && !isPaused };

  if (!plan || !detail) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink />
        <Panel title={copy.notFound} icon="alert">
          <p className="text-sm text-fg-muted">{copy.notFoundText}</p>
        </Panel>
      </div>
    );
  }

  const strategy: { label: string; text: string | null; missing: string }[] = [
    { label: copy.strategyDescription, text: detail.strategyDescription, missing: copy.strategyMissing },
    { label: copy.riskInformation, text: detail.riskInformation, missing: copy.riskMissing },
  ];

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <PlanHero plan={plan} detail={detail} onEdit={() => setIsEditing(true)} onPauseToggle={() => (isPaused ? setIsPaused(false) : setIsPauseOpen(true))} />
      <EditPlanDialog plan={isEditing ? plan : null} onClose={() => setIsEditing(false)} />
      <PausePlanDialog
        plan={isPauseOpen ? plan : null}
        onClose={() => setIsPauseOpen(false)}
        onPaused={() => {
          setIsPaused(true);
          setIsPauseOpen(false);
        }}
      />
      <PerformancePanel performance={detail.performance} />

      <Panel title={copy.equityCurve} icon="areaChart" index={1} aside={<span className="text-xs text-fg-subtle">{copy.hoverHint}</span>}>
        <EquityChart equity={detail.equity} equityEnd={detail.equityEnd} />
      </Panel>

      <CommissionSummary commission={detail.commission} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={copy.settlementCycle} icon="refresh" index={3}>
          <InfoRows
            rows={[
              { label: copy.cycle, hint: copy.cycleHint, value: detail.settlement.cycle },
              { label: copy.lastSettled, hint: copy.lastSettledHint, value: detail.settlement.lastSettled },
              {
                label: copy.nextPayout,
                hint: copy.nextPayoutHint,
                value: (
                  <span className="flex flex-col items-end gap-1">
                    {detail.settlement.nextPayout}
                    <span className="flex items-center gap-1.5 rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-warning/30">
                      <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
                      {detail.settlement.nextPayoutState}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        </Panel>
        <Panel title={copy.commissionAndFee} icon="sliders" index={4}>
          <InfoRows
            rows={[
              { label: copy.commission, hint: copy.commissionHint, value: detail.commissionLabel },
              { label: copy.commissionType, hint: copy.commissionTypeHint, value: detail.commissionType },
            ]}
          />
        </Panel>
        <Panel title={copy.copierRules} icon="lock" index={5}>
          <InfoRows
            rows={[
              { label: copy.minimumCapital, hint: copy.minimumCapitalHint, value: <span className="font-mono tabular-nums">{formatUsd(detail.minimumCapital)}</span> },
              { label: copy.activeCap, hint: copy.activeCapHint, value: <span className="font-mono tabular-nums">{plan.copiers} / {plan.maxCopiers ?? '∞'}</span> },
              { label: copy.planFull, hint: copy.planFullHint, value: detail.planFull ? copy.yes : copy.no },
            ]}
          />
        </Panel>
        <Panel title={copy.accountAndSystem} icon="monitor" index={6}>
          <InfoRows
            rows={[
              {
                label: copy.status,
                hint: copy.statusHint,
                value: <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/30">{copy.approved}</span>,
              },
              { label: copy.copying, hint: copy.copyingHint, value: detail.copyingActive ? copy.active : copy.inactive },
              { label: copy.server, hint: copy.serverHint, value: plan.serverName },
              { label: copy.tradingAccount, hint: copy.tradingAccountHint, value: <span className="font-mono">{detail.tradingAccountNumber}</span> },
              { label: copy.initialEquity, hint: copy.initialEquityHint, value: <span className="font-mono tabular-nums">{formatUsd(detail.initialEquity)}</span> },
              { label: copy.created, hint: copy.createdHint, value: fullDayFormat.format(new Date(`${plan.createdAt}T00:00:00Z`)) },
            ]}
          />
        </Panel>
      </div>

      <Panel title={`${copy.myCopiers} (${detail.copiers.length})`} icon="user" index={7}>
        <DataTable caption={copy.myCopiers} columns={copierColumns} rows={detail.copiers} rowKey={(copier) => copier.account} emptyTitle={copy.noCopiers} emptyDescription="" />
      </Panel>

      <Panel title={copy.strategyAndRisk} icon="fileText" index={7}>
        <div className="grid gap-4 md:grid-cols-2">
          {strategy.map((item) => (
            <div key={item.label} className="rounded-2xl border border-dashed border-line p-4">
              <p className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{item.label}</p>
              <p className={cx('mt-2 text-sm', item.text ? 'text-fg' : 'text-fg-muted')}>{item.text ?? `— ${item.missing}`}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={copy.recentActivity} icon="bolt" index={8}>
          <ol className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {detail.activity.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                style={staggerStyle(index, 200)}
                className="flex animate-rise items-center gap-3 rounded-2xl border border-line bg-fg/[0.03] px-3.5 py-3 transition-colors duration-300 hover:border-primary/35 hover:bg-primary/[0.05] motion-reduce:animate-none"
              >
                {item.kind === 'trade' ? (
                  <LiveDot className="shrink-0" />
                ) : (
                  <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Icon name="user" size={12} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{item.title}</span>
                  <span className={cx('block text-xs', item.kind === 'trade' ? 'text-success' : 'text-fg-muted')}>{item.detail}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-fg-subtle">{item.at}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title={copy.planTimeline} icon="clock" index={9}>
          <ol className="relative flex flex-col gap-6 pl-7">
            <span aria-hidden="true" className="absolute top-2 bottom-2 left-[9px] w-px origin-top animate-grow bg-linear-to-b from-primary via-primary/40 to-transparent motion-reduce:animate-none" />
            {detail.timeline.map((step, index) => {
              const isLatest = index === detail.timeline.length - 1;
              return (
                <li key={step.title} style={staggerStyle(index, 300)} className="relative animate-rise motion-reduce:animate-none">
                  <span aria-hidden="true" className="absolute top-1 -left-7 grid size-5 place-items-center">
                    {isLatest && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/40 motion-reduce:animate-none" />}
                    <span className="relative size-3 rounded-full bg-primary ring-4 ring-primary/15" />
                  </span>
                  <p className="text-sm font-semibold text-fg">{step.title}</p>
                  <p className="text-xs text-fg-muted">{step.detail}</p>
                  <p className="mt-1 font-mono text-[11px] text-fg-subtle">{step.at}</p>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <TradeHistory trades={detail.trades} />
    </div>
  );
}
