'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { EditPlanDialog } from './EditPlanDialog';
import { myPlans, pausePlanCopy, planDetailCopy as copy, planDetails, type PlanCopier, type PlanDetail, type PlanTrade } from './myPlansData';
import { PausePlanDialog } from './PausePlanDialog';

const TRADE_PAGE_SIZE = 10;
const ALL = 'all';
const DAY_MS = 86_400_000;
const WIN_BEADS = 60;
const SETTLED_BEADS = 40;
const AUM_PIXELS = 48;
const LED = { cell: 10, left: 46, right: 10, top: 10, bottom: 24, targetRows: 12 };

const RED = 'var(--zenith-red)';
const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fullDayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const panelClass = 'orbit-card relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
const pillClass =
  'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-[box-shadow,transform,color] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0';

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Flips to true one frame after mount so CSS transitions (chart reveal, pixel fill) actually run. */
function useArrived(): boolean {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frameId);
  }, []);
  return arrived;
}

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

// Open section: no card, just a hairline on top, a white bead and the title.
function Panel({ title, icon, aside, index = 0, className, children }: { title: ReactNode; icon: IconName; aside?: ReactNode; index?: number; className?: string; children: ReactNode }) {
  return (
    <section style={staggerStyle(index, 120)} className={cx('zenith-tile min-w-0 border-t border-line pt-5', className)}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-black tracking-tight text-fg">
          <span aria-hidden="true" className="relative">
            <span className={cx(beadClass, 'size-9')}>
              <Icon name={icon} size={15} />
            </span>
            <RedDot className="absolute -top-0.5 -right-0.5" />
          </span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** One capsule per setting: red number, label + explanation, then the value on the right. */
function InfoRows({ rows }: { rows: { label: string; hint: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div
          key={row.label}
          style={staggerStyle(index, 200)}
          className="group/row flex animate-feed-in items-center gap-3 rounded-[22px] bg-fg/[0.03] px-4 py-3 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none"
        >
          <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[10px] font-bold text-[var(--zenith-red)]">
            {stepNumber(index)}
          </span>
          <dt className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-fg">{row.label}</span>
            <span className="block text-xs text-fg-muted">{row.hint}</span>
          </dt>
          <dd className="shrink-0 text-right text-sm font-bold text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span aria-hidden="true" className="relative grid size-14 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
        <span className={cx(beadClass, 'size-9 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
          <Icon name={icon} size={15} />
        </span>
      </span>
      <p className="text-sm text-fg-muted">{children}</p>
    </div>
  );
}

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {symbol}
    </button>
  );
}

/* ───────────── Title ───────────── */

function BackLink() {
  return (
    <Link
      href="/copy-trading/my-plans"
      className="group/back inline-flex w-fit items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/back:-translate-x-1 motion-reduce:transition-none')}>
        <Icon name="arrowLeft" size={14} />
      </span>
      {copy.back}
    </Link>
  );
}

function PlanTitle({ plan, detail, onEdit, onPauseToggle }: { plan: (typeof myPlans)[number]; detail: PlanDetail; onEdit: () => void; onPauseToggle: () => void }) {
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-center gap-5">
        <span aria-hidden="true" className="relative grid size-20 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:5s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
          </span>
          <span className={cx(beadClass, 'size-14 text-2xl font-black uppercase')}>{plan.name.charAt(0)}</span>
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-0.5 font-semibold text-app">
              <Icon name="check" size={11} />
              {copy.approved}
            </span>
            <span className="rounded-full px-2.5 py-0.5 font-semibold text-fg ring-1 ring-line-strong">{detail.commissionLabel}</span>
            <span className="flex items-center gap-1.5 font-semibold text-fg-muted">
              {detail.copyingActive ? <LiveDot /> : <Icon name="pause" size={11} className="text-[var(--zenith-red)]" />}
              {detail.copyingActive ? copy.copyingOn : pausePlanCopy.paused}
            </span>
          </p>
          <h1 className="mt-2 truncate text-4xl font-black tracking-tight text-fg sm:text-5xl">{plan.name}</h1>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" aria-haspopup="dialog" onClick={onEdit} className={cx(pillClass, 'bg-fg pl-1.5 text-app ring-transparent')}>
          <span aria-hidden="true" style={{ background: RED }} className="grid size-7 place-items-center rounded-full text-white">
            <Icon name="pencil" size={13} />
          </span>
          {copy.edit}
        </button>
        <button type="button" aria-haspopup={detail.copyingActive ? 'dialog' : undefined} onClick={onPauseToggle} className={cx(pillClass, 'text-fg ring-line-strong hover:ring-fg/50')}>
          <Icon name={detail.copyingActive ? 'pause' : 'play'} size={14} />
          {detail.copyingActive ? copy.pause : pausePlanCopy.resume}
        </button>
        <button type="button" className={cx(pillClass, 'text-[var(--zenith-red)] ring-[var(--zenith-red)]/45 hover:ring-[var(--zenith-red)]')}>
          <Icon name="xCircle" size={14} />
          {copy.inactivate}
        </button>
      </div>
    </header>
  );
}

/* ───────────── Open AUM figure + KPI capsules ───────────── */

function KpiTicket({ detail }: { detail: PlanDetail }) {
  const rows: { icon: IconName; label: string; caption: string; value: number; isMoney: boolean; tone?: string }[] = [
    { icon: 'user', label: copy.activeCopiers, caption: copy.currentlyLive, value: detail.activeCopiers, isMoney: false },
    { icon: 'signalBars', label: copy.openPositions, caption: copy.currentlyOpen, value: detail.openPositions, isMoney: false },
    { icon: 'clock', label: copy.floatingCommission, caption: copy.onOpenTrades, value: detail.floatingCommission, isMoney: true },
    { icon: 'checkCircle', label: copy.commissionEarned, caption: copy.settledCaption, value: detail.commissionEarned, isMoney: true, tone: toneOf(detail.commissionEarned) },
    { icon: 'trendUp', label: copy.netPnl, caption: copy.afterAllFees, value: detail.netPnl, isMoney: true, tone: toneOf(detail.netPnl) },
  ];

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="relative">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {copy.planAum}
        </p>
        <p className="mt-4 truncate text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">
          <CountUp value={detail.planAum} format={formatUsd} />
        </p>
        <p className="mt-2 text-xs text-fg-muted">{copy.lockedCapital}</p>
        {/* Pixel field under the figure: cells twinkle in a scattered order, one red cell blinking. */}
        <div aria-hidden="true" className="mt-4 grid grid-cols-16 gap-1">
          {Array.from({ length: AUM_PIXELS }, (_, index) => (
            <span
              key={index}
              style={{ animationDelay: `${(index * 173) % 2400}ms`, ...(index === 29 ? { background: RED } : {}) }}
              className={cx('h-2.5 rounded-[2px]', index === 29 ? 'animate-pulse' : 'zenith-twinkle bg-fg/15')}
            />
          ))}
        </div>
      </div>

      <dl className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div
            key={row.label}
            style={staggerStyle(index, 300)}
            className="group/kpi flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-line-strong motion-reduce:animate-none"
          >
            <span aria-hidden="true" className={cx(beadClass, 'size-9 transition-transform duration-300 group-hover/kpi:-rotate-12 motion-reduce:transition-none')}>
              <Icon name={row.icon} size={13} />
            </span>
            <dt className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-fg">{row.label}</span>
              <span className="block truncate text-[11px] text-fg-muted">{row.caption}</span>
            </dt>
            <dd className={cx('shrink-0 font-mono text-base font-black tabular-nums', row.tone ?? 'text-fg')}>
              <CountUp value={row.value} format={(current) => (row.isMoney ? formatUsd(current) : String(Math.round(current)))} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ───────────── Performance: pixel dial + stat tiles ───────────── */

function WinRateDial({ winRate }: { winRate: number }) {
  const lit = Math.round((Math.max(0, Math.min(100, winRate)) / 100) * WIN_BEADS);
  return (
    <div className="relative grid size-48 shrink-0 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:7s] motion-reduce:animate-none">
        <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
      </span>
      <svg aria-hidden="true" viewBox="0 0 160 160" className="absolute inset-0 size-full">
        {Array.from({ length: WIN_BEADS }, (_, index) => {
          const angle = (index / WIN_BEADS) * Math.PI * 2 - Math.PI / 2;
          const isLit = index < lit;
          const isEdge = index === lit - 1;
          return (
            <rect
              key={index}
              x={round2(80 + Math.cos(angle) * 68 - 2.6)}
              y={round2(80 + Math.sin(angle) * 68 - 2.6)}
              width="5.2"
              height="5.2"
              rx="1.2"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${index * 18}ms`, ...(isEdge ? { fill: RED } : {}) }}
              className={cx('animate-dot-pop motion-reduce:animate-none', isLit ? 'fill-fg' : 'fill-line-strong')}
            />
          );
        })}
      </svg>
      <span aria-hidden="true" className="absolute inset-8 rounded-full border border-dashed border-line-strong" />
      <span className="flex flex-col items-center text-center">
        <span className="font-mono text-3xl font-black text-fg tabular-nums">
          <CountUp value={winRate} format={(current) => `${current.toFixed(2)}%`} />
        </span>
        <span className="text-[9.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{copy.winRate}</span>
      </span>
    </div>
  );
}

function PerformancePanel({ performance }: { performance: PlanDetail['performance'] }) {
  const stats: { icon: IconName; label: string; value: string; tone?: string }[] = [
    { icon: 'history', label: copy.closedTrades, value: String(performance.closedTrades) },
    { icon: 'trendUp', label: copy.avgWin, value: formatUsd(performance.avgWin), tone: 'text-success' },
    { icon: 'trendDown', label: copy.avgLoss, value: formatUsd(performance.avgLoss), tone: 'text-danger' },
    { icon: 'sliders', label: copy.profitFactor, value: performance.profitFactor.toFixed(2) },
    { icon: 'bolt', label: copy.expectancy, value: formatUsd(performance.expectancy), tone: 'text-success' },
    { icon: 'pieChart', label: copy.netPnl, value: formatUsd(performance.netPnl), tone: 'text-success' },
    { icon: 'alert', label: copy.maxDrawdown, value: formatUsd(performance.maxDrawdown), tone: 'text-danger' },
  ];
  return (
    <Panel title={copy.performance} icon="pieChart" index={1} className="h-full xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
        <WinRateDial winRate={performance.winRate} />
        <dl className="grid w-full flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={staggerStyle(index, 240)}
              className="group/stat flex min-w-0 animate-feed-in flex-col gap-2 rounded-[22px] bg-fg/[0.03] p-3 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cx(beadClass, 'size-7 transition-transform duration-300 group-hover/stat:-rotate-12 motion-reduce:transition-none')}>
                  <Icon name={stat.icon} size={12} />
                </span>
                <dt className={cx(captionClass, 'min-w-0 truncate')}>{stat.label}</dt>
              </span>
              <dd className={cx('truncate font-mono text-base font-black tabular-nums', stat.tone ?? 'text-fg')}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}

/* ───────────── Equity: LED dot-matrix display ───────────── */

function niceRowValue(rawRange: number) {
  const perRow = Math.max(1, rawRange / LED.targetRows);
  return perRow <= 5 ? Math.ceil(perRow) : Math.ceil(perRow / 5) * 5;
}

/**
 * Each day is a column of square pixels lit from the zero line up to the day's equity (or down, faded red, below zero),
 * like a dot-matrix display. Columns switch on left to right; the hovered day lights up red.
 */
function EquityMatrix({ equity, equityEnd }: { equity: number[]; equityEnd: string }) {
  const arrived = useArrived();
  const [hovered, setHovered] = useState<number | null>(null);

  const endTime = new Date(`${equityEnd}T00:00:00Z`).getTime();
  const dateAt = (index: number) => new Date(endTime - (equity.length - 1 - index) * DAY_MS);
  const rawMax = Math.max(0, ...equity);
  const rawMin = Math.min(0, ...equity);
  const rowValue = niceRowValue(rawMax - rawMin);
  const yMin = Math.floor(rawMin / rowValue) * rowValue;
  const yMax = Math.max(Math.ceil(rawMax / rowValue) * rowValue, yMin + rowValue);
  const rows = Math.round((yMax - yMin) / rowValue);
  const zeroRow = Math.round(yMax / rowValue);
  const width = LED.left + equity.length * LED.cell + LED.right;
  const height = LED.top + rows * LED.cell + LED.bottom;
  const colX = (index: number) => LED.left + index * LED.cell + LED.cell / 2;
  const rowY = (row: number) => LED.top + row * LED.cell + LED.cell / 2;
  const boundaryY = (row: number) => LED.top + row * LED.cell;
  const last = equity.length - 1;
  const active = hovered ?? last;
  const xLabels = Array.from({ length: 7 }, (_, step) => Math.round((step / 6) * last));
  const labelEvery = rows > 8 ? 2 : 1;

  function isLit(value: number, row: number) {
    if (value > 0) return row < zeroRow && row >= Math.floor((yMax - value) / rowValue);
    if (value < 0) return row >= zeroRow && row <= Math.min(rows - 1, Math.ceil((yMax - value) / rowValue) - 1);
    return false;
  }

  const tooltipLeft = Math.min(86, Math.max(14, (colX(active) / width) * 100));

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[620px]"
          role="img"
          aria-label={`${copy.equityCurve}: ${formatUsd(equity[last])}`}
          onPointerLeave={() => setHovered(null)}
        >
          {Array.from({ length: rows + 1 }, (_, row) =>
            row % labelEvery === 0 || row === zeroRow ? (
              <text key={row} x={LED.left - 8} y={boundaryY(row)} textAnchor="end" dominantBaseline="middle" className={cx('font-mono text-[9.5px] tabular-nums', row === zeroRow ? 'fill-fg' : 'fill-fg-subtle')}>
                ${yMax - row * rowValue}
              </text>
            ) : null,
          )}
          <line x1={LED.left} x2={width - LED.right} y1={boundaryY(zeroRow)} y2={boundaryY(zeroRow)} strokeDasharray="2 4" className="stroke-fg/40" />

          {equity.map((value, index) => {
            const isActive = index === active;
            return (
              <g key={index} style={{ opacity: arrived ? 1 : 0, transition: `opacity 260ms ease ${200 + index * 14}ms` }}>
                {Array.from({ length: rows }, (_, row) => {
                  const lit = isLit(value, row);
                  const size = lit ? 6.4 : 2.4;
                  return (
                    <rect
                      key={row}
                      x={colX(index) - size / 2}
                      y={rowY(row) - size / 2}
                      width={size}
                      height={size}
                      rx={lit ? 1.4 : 0.6}
                      className={cx(
                        'transition-[fill] duration-150',
                        !lit && 'fill-line-strong',
                        lit && (isActive ? 'fill-[var(--zenith-red)]' : value < 0 ? 'fill-[color-mix(in_srgb,var(--zenith-red)_45%,transparent)]' : 'fill-fg'),
                        lit && hovered !== null && !isActive && 'opacity-40',
                      )}
                    />
                  );
                })}
                <rect x={LED.left + index * LED.cell} y={LED.top} width={LED.cell} height={rows * LED.cell} fill="transparent" onPointerEnter={() => setHovered(index)} />
              </g>
            );
          })}

          {/* Pulse on the newest reading. */}
          {hovered === null && equity[last] !== 0 && (
            <circle
              cx={colX(last)}
              cy={rowY(equity[last] > 0 ? Math.floor((yMax - equity[last]) / rowValue) : Math.min(rows - 1, Math.ceil((yMax - equity[last]) / rowValue) - 1))}
              r={6}
              fill="none"
              strokeWidth="1.5"
              style={{ stroke: RED }}
              className="motion-reduce:hidden"
              pointerEvents="none"
            >
              <animate attributeName="r" values="4;10;4" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
            </circle>
          )}

          {xLabels.map((index) => (
            <text
              key={index}
              x={colX(index)}
              y={height - 8}
              textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
              className={cx('font-mono text-[9.5px]', index === active ? 'fill-fg font-bold' : 'fill-fg-subtle')}
            >
              {dayFormat.format(dateAt(index))}
            </text>
          ))}
        </svg>
      </div>

      <div style={{ left: `${tooltipLeft}%` }} className="pointer-events-none absolute top-0 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-fg py-1 pr-3.5 pl-1 text-xs text-app shadow-[0_10px_24px_-12px_rgb(0_0_0/0.8)]">
        <span style={{ background: RED }} className="grid size-6 place-items-center rounded-full text-white">
          <Icon name="areaChart" size={11} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] opacity-70">{fullDayFormat.format(dateAt(active))}</span>
          <span className="font-mono font-black tabular-nums">{formatUsd(equity[active])}</span>
        </span>
      </div>
    </div>
  );
}

/* ───────────── Commission summary: open figures + capsule tracks + pixel meter ───────────── */

function CommissionSummary({ commission }: { commission: PlanDetail['commission'] }) {
  const arrived = useArrived();
  const settledShare = commission.lifetime === 0 ? 0 : (commission.settled / commission.lifetime) * 100;
  const litBeads = Math.round((settledShare / 100) * SETTLED_BEADS);
  const cells: { label: string; value: number; tone: string; fill: string; hint?: string }[] = [
    { label: copy.lifetime, value: commission.lifetime, tone: 'text-fg', fill: 'bg-fg' },
    { label: copy.thisMonth, value: commission.thisMonth, tone: 'text-fg', fill: 'bg-fg/60' },
    { label: copy.pending, value: commission.pending, tone: 'text-[var(--zenith-red)]', fill: 'bg-[var(--zenith-red)]', hint: copy.pendingHint },
    { label: copy.settled, value: commission.settled, tone: 'text-success', fill: 'bg-success' },
  ];
  return (
    <Panel title={copy.commissionSummary} icon="wallet" index={3}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        {cells.map((cell, index) => {
          const share = commission.lifetime === 0 ? 0 : Math.min(100, (cell.value / commission.lifetime) * 100);
          return (
            <div key={cell.label} style={staggerStyle(index, 200)} className="flex min-w-0 animate-rise flex-col gap-2 motion-reduce:animate-none">
              <p className={cx(captionClass, 'flex items-center gap-1.5')}>
                <span aria-hidden="true" className="font-mono text-[var(--zenith-red)]">
                  {stepNumber(index)}
                </span>
                {cell.label}
              </p>
              <p className={cx('truncate font-mono text-3xl font-black tracking-tight tabular-nums', cell.tone)}>
                <CountUp value={cell.value} format={formatUsd} />
              </p>
              <span aria-hidden="true" className="relative block h-2.5 overflow-hidden rounded-full bg-fg/10">
                <span style={{ width: `${share}%`, animationDelay: `${300 + index * 120}ms` }} className={cx('zenith-capsule absolute inset-y-0 left-0 origin-left rounded-full', cell.fill)} />
              </span>
              {cell.hint && <p className="text-[11px] text-fg-muted">{cell.hint}</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-[24px] bg-fg/[0.03] p-4 ring-1 ring-line">
        <div className="flex items-center justify-between text-[11px] text-fg-subtle">
          <span className="flex items-center gap-2">
            <RedDot className="size-1.5" />
            {copy.settled}
          </span>
          <span className="font-mono text-sm font-black text-fg tabular-nums">{settledShare.toFixed(0)}%</span>
        </div>
        <div aria-hidden="true" className="mt-3 grid grid-cols-20 gap-1 sm:grid-cols-40">
          {Array.from({ length: SETTLED_BEADS }, (_, index) => {
            const isLit = arrived && index < litBeads;
            const isEdge = arrived && index === litBeads - 1;
            return (
              <span
                key={index}
                style={{ transitionDelay: `${300 + index * 25}ms`, ...(isEdge ? { background: RED } : {}) }}
                className={cx('h-4 rounded-[3px] transition-[background-color,transform] duration-300 motion-reduce:transition-none', isLit ? 'scale-100 bg-fg' : 'scale-90 bg-fg/10')}
              />
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ───────────── Copiers ───────────── */

function CopierTickets({ copiers }: { copiers: PlanCopier[] }) {
  if (copiers.length === 0) return <EmptyLine icon="user">{copy.noCopiers}</EmptyLine>;

  return (
    <ol className="flex flex-col gap-3">
      {copiers.map((copier, index) => {
        const fields: { label: string; value: ReactNode }[] = [
          { label: copy.account, value: <span className="font-mono">{copier.account}</span> },
          { label: copy.capital, value: <span className="font-mono font-bold tabular-nums">{formatUsd(copier.capital)}</span> },
          { label: copy.openTrades, value: <span className="font-mono tabular-nums">{copier.openTrades}</span> },
          { label: copy.totalPnl, value: <span className={cx('font-mono font-bold tabular-nums', toneOf(copier.totalPnl))}>{formatUsd(copier.totalPnl)}</span> },
          { label: copy.commissionPaid, value: <span className="font-mono tabular-nums">{formatUsd(copier.commissionPaid)}</span> },
          { label: copy.pendingFee, value: <span className="font-mono tabular-nums">{formatUsd(copier.pendingFee)}</span> },
          { label: copy.joined, value: <span className="text-fg-muted">{copier.joined}</span> },
        ];
        const isActive = copier.status === 'Active';
        return (
          <li
            key={copier.account}
            style={staggerStyle(index, 200)}
            className="grid animate-feed-in gap-4 rounded-[28px] bg-fg/[0.03] p-4 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none sm:p-5 xl:grid-cols-[15rem_minmax(0,1fr)] xl:items-center"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="relative">
                <span className={cx(beadClass, 'size-11 text-sm font-black uppercase')}>{copier.name.charAt(0)}</span>
                {isActive && <RedDot className="absolute top-0 right-0" />}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-fg">{copier.name}</p>
                <p className="truncate text-xs text-fg-muted">{copier.email}</p>
                <p className="mt-1">
                  <span className="sr-only">{copy.status}: </span>
                  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line-strong')}>
                    <span aria-hidden="true" className={cx('size-1.5 rounded-full', isActive ? 'animate-ping-soft bg-success' : 'bg-fg-subtle')} />
                    {copier.status}
                  </span>
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-dashed border-line pt-4 sm:grid-cols-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5 2xl:grid-cols-7">
              {fields.map((field) => (
                <div key={field.label} className="min-w-0">
                  <dt className={captionClass}>{field.label}</dt>
                  <dd className="mt-1 truncate text-sm text-fg">{field.value}</dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Trade & commission history ───────────── */

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
  const headers: { label: string; isRight?: boolean }[] = [
    { label: copy.date },
    { label: copy.symbol },
    { label: copy.direction },
    { label: copy.copierAccount },
    { label: copy.copierName },
    { label: copy.copierPnl, isRight: true },
    { label: copy.paidToYou, isRight: true },
    { label: copy.runningFee, isRight: true },
    { label: copy.feeStatus },
    { label: copy.status },
  ];

  return (
    <Panel
      title={copy.tradeHistory}
      icon="history"
      index={9}
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
      <p className="mb-4 flex gap-3 rounded-2xl border border-dashed border-line-strong p-3 text-xs leading-relaxed text-fg-muted">
        <span aria-hidden="true" className={cx(beadClass, 'size-7')}>
          <Icon name="info" size={13} />
        </span>
        <span>
          <strong className="text-fg">{copy.paidToYou}</strong> {copy.paidToYouNote} <strong className="text-fg">{copy.runningFee}</strong> {copy.runningFeeNote}
        </span>
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <caption className="sr-only">{copy.tradeHistory}</caption>
          <thead>
            <tr className="border-b border-dashed border-line-strong">
              {headers.map((header) => (
                <th key={header.label} scope="col" className={cx(captionClass, 'px-3 py-3 font-semibold whitespace-nowrap', header.isRight ? 'text-right' : 'text-left')}>
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody key={`${symbol}-${direction}-${copier}-${currentPage}`}>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={headers.length}>
                  <EmptyLine icon="history">{copy.noTrades}</EmptyLine>
                </td>
              </tr>
            ) : (
              pageItems.map((trade, index) => {
                const isBuy = trade.direction === 'BUY';
                return (
                  <tr
                    key={trade.id}
                    style={staggerStyle(index, 0)}
                    className="animate-feed-in border-b border-dotted border-line-strong transition-colors last:border-b-0 hover:bg-fg/[0.04] motion-reduce:animate-none"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-fg-muted tabular-nums">{trade.date}</td>
                    <td className="px-3 py-3 font-bold text-fg">{trade.symbol}</td>
                    <td className="px-3 py-3">
                      <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-bold ring-1', isBuy ? 'text-success ring-success/40' : 'text-danger ring-danger/40')}>
                        <Icon name={isBuy ? 'trendUp' : 'trendDown'} size={11} />
                        {trade.direction}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-fg">{trade.copierAccount}</td>
                    <td className="px-3 py-3 text-fg">{trade.copierName}</td>
                    <td className={cx('px-3 py-3 text-right font-mono font-bold tabular-nums', toneOf(trade.copierPnl))}>{formatUsd(trade.copierPnl)}</td>
                    <td className="px-3 py-3 text-right font-mono text-fg tabular-nums">{formatUsd(trade.paidToMaster)}</td>
                    <td className="px-3 py-3 text-right font-mono text-fg-muted tabular-nums">{formatUsd(trade.runningFeeEstimate)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-fg ring-1 ring-line-strong">{trade.feeStatus}</span>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-semibold text-fg-muted">{trade.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 border-t border-dotted border-line-strong pt-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-fg-muted tabular-nums">
          {copy.showing} {filtered.length === 0 ? 0 : firstIndex + 1}–{firstIndex + pageItems.length} {copy.of} {filtered.length}
        </p>
        <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-line">
          <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
          <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
          <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
            {copy.page}
            <span className="grid size-7 place-items-center rounded-full bg-fg font-bold text-app tabular-nums">{currentPage}</span>/ {pageCount}
          </span>
          <PagerButton label={copy.nextPage} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
          <PagerButton label={copy.lastPage} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
        </div>
      </div>
    </Panel>
  );
}

/* ───────────── Page ───────────── */

export default function PlanDetailPage({ planId }: { planId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const plan = myPlans.find((item) => String(item.id) === planId);
  const baseDetail = plan ? planDetails[plan.id] : undefined;
  const detail = baseDetail && { ...baseDetail, copyingActive: baseDetail.copyingActive && !isPaused };

  if (!plan || !detail) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <section className={cx(panelClass, 'flex flex-col items-center gap-3 px-6 py-16 text-center')}>
          <span aria-hidden="true" className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:animate-none" />
            <span className={cx(beadClass, 'size-12 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
              <Icon name="alert" size={22} />
            </span>
          </span>
          <h2 className="text-base font-semibold text-fg">{copy.notFound}</h2>
          <p className="text-sm text-fg-muted">{copy.notFoundText}</p>
        </section>
      </div>
    );
  }

  const strategy: { label: string; text: string | null; missing: string }[] = [
    { label: copy.strategyDescription, text: detail.strategyDescription, missing: copy.strategyMissing },
    { label: copy.riskInformation, text: detail.riskInformation, missing: copy.riskMissing },
  ];

  // Skeleton: open title, AUM + performance band, full-width equity matrix, commission strip,
  // then settings grid on the left with a sticky timeline/activity column, copiers, strategy and trades.
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5">
        <BackLink />
        <PlanTitle plan={plan} detail={detail} onEdit={() => setIsEditing(true)} onPauseToggle={() => (isPaused ? setIsPaused(false) : setIsPauseOpen(true))} />
      </div>
      <EditPlanDialog plan={isEditing ? plan : null} onClose={() => setIsEditing(false)} />
      <PausePlanDialog
        plan={isPauseOpen ? plan : null}
        onClose={() => setIsPauseOpen(false)}
        onPaused={() => {
          setIsPaused(true);
          setIsPauseOpen(false);
        }}
      />

      <div className="grid gap-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div style={staggerStyle(0, 120)} className="zenith-tile">
          <KpiTicket detail={detail} />
        </div>
        <PerformancePanel performance={detail.performance} />
      </div>

      <Panel
        title={copy.equityCurve}
        icon="areaChart"
        index={2}
        aside={
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-fg-subtle ring-1 ring-line">
            <RedDot className="size-1.5" />
            {copy.hoverHint}
          </span>
        }
      >
        <div className="pt-14">
          <EquityMatrix equity={detail.equity} equityEnd={detail.equityEnd} />
        </div>
      </Panel>

      <CommissionSummary commission={detail.commission} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          <Panel title={copy.settlementCycle} icon="refresh" index={4}>
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
                      <span style={{ background: RED }} className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
                        <span aria-hidden="true" className="size-1.5 animate-ping-soft rounded-full bg-white motion-reduce:animate-none" />
                        {detail.settlement.nextPayoutState}
                      </span>
                    </span>
                  ),
                },
              ]}
            />
          </Panel>
          <Panel title={copy.commissionAndFee} icon="sliders" index={5}>
            <InfoRows
              rows={[
                { label: copy.commission, hint: copy.commissionHint, value: detail.commissionLabel },
                { label: copy.commissionType, hint: copy.commissionTypeHint, value: detail.commissionType },
              ]}
            />
          </Panel>
          <Panel title={copy.copierRules} icon="lock" index={6}>
            <InfoRows
              rows={[
                { label: copy.minimumCapital, hint: copy.minimumCapitalHint, value: <span className="font-mono tabular-nums">{formatUsd(detail.minimumCapital)}</span> },
                { label: copy.activeCap, hint: copy.activeCapHint, value: <span className="font-mono tabular-nums">{plan.copiers} / {plan.maxCopiers ?? '∞'}</span> },
                { label: copy.planFull, hint: copy.planFullHint, value: detail.planFull ? copy.yes : copy.no },
              ]}
            />
          </Panel>
          <Panel title={copy.accountAndSystem} icon="monitor" index={7}>
            <InfoRows
              rows={[
                {
                  label: copy.status,
                  hint: copy.statusHint,
                  value: <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-app">{copy.approved}</span>,
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

        <aside className="flex flex-col gap-10 lg:sticky lg:top-24">
          <Panel title={copy.planTimeline} icon="clock" index={10}>
            <ol className="relative flex flex-col gap-6 pl-10">
              <span aria-hidden="true" className="absolute top-2 bottom-2 left-[15px] origin-top animate-grow border-l-2 border-dashed border-line-strong motion-reduce:animate-none" />
              {detail.timeline.map((step, index) => {
                const isLatest = index === detail.timeline.length - 1;
                return (
                  <li key={step.title} style={staggerStyle(index, 300)} className="relative animate-rise motion-reduce:animate-none">
                    <span aria-hidden="true" className="absolute top-0 -left-10 grid size-8 place-items-center">
                      {isLatest && <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                      <span
                        style={isLatest ? { background: RED } : undefined}
                        className={cx('relative grid size-8 place-items-center rounded-full font-mono text-[9px] font-bold', isLatest ? 'text-white' : 'bg-fg text-app')}
                      >
                        {stepNumber(index)}
                      </span>
                    </span>
                    <p className="text-sm font-semibold text-fg">{step.title}</p>
                    <p className="text-xs text-fg-muted">{step.detail}</p>
                    <p className="mt-1 font-mono text-[11px] text-fg-subtle">{step.at}</p>
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel title={copy.recentActivity} icon="bolt" index={9}>
            <ol className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
              {detail.activity.map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  style={staggerStyle(index, 200)}
                  className="group/activity flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line motion-reduce:animate-none"
                >
                  {item.kind === 'trade' ? (
                    <span className="relative grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-success/40">
                      <LiveDot />
                    </span>
                  ) : (
                    <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
                      <Icon name="user" size={13} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{item.title}</span>
                    <span className={cx('block truncate text-xs', item.kind === 'trade' ? 'text-success' : 'text-fg-muted')}>{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-fg-subtle tabular-nums">{item.at}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>

      <Panel
        title={copy.myCopiers}
        icon="user"
        index={8}
        aside={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg py-1 pr-3 pl-1 text-xs font-bold text-app tabular-nums">
            <span style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-white">
              <Icon name="user" size={10} />
            </span>
            {detail.copiers.length}
          </span>
        }
      >
        <CopierTickets copiers={detail.copiers} />
      </Panel>

      <Panel title={copy.strategyAndRisk} icon="fileText" index={8}>
        <div className="grid gap-4 md:grid-cols-2">
          {strategy.map((item, index) => (
            <div key={item.label} className={cx('flex gap-3 rounded-[24px] p-5', item.text ? 'bg-fg/[0.03] ring-1 ring-line' : 'border border-dashed border-line-strong')}>
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-[var(--zenith-red)]">
                {stepNumber(index)}
              </span>
              <div className="min-w-0">
                <p className={captionClass}>{item.label}</p>
                <p className={cx('mt-2 text-sm leading-relaxed', item.text ? 'text-fg' : 'text-fg-muted italic')}>{item.text ?? `— ${item.missing}`}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <TradeHistory trades={detail.trades} />
    </div>
  );
}
