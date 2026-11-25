'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Card, CardHeader } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { DataTable, type Column } from '../ui/Table';
import { EditPlanDialog } from './EditPlanDialog';
import { myPlans, pausePlanCopy, planDetailCopy as copy, planDetails, type MasterPlanRow, type PlanCopier, type PlanDetail, type PlanTrade } from './myPlansData';
import { PausePlanDialog } from './PausePlanDialog';

const TRADE_PAGE_SIZE = 10;
const ALL = 'all';
const DAY_MS = 86_400_000;

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const toneOf = (amount: number) => (amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-fg');
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fullDayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function SectionTitle({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Icon name={icon} size={16} className="text-primary" />
      {children}
    </span>
  );
}

/** Settings sheet: label + hint on the left, value on the right. */
function SettingRows({ rows }: { rows: { label: string; hint: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="min-w-0">
            <span className="block text-sm font-medium text-fg">{row.label}</span>
            <span className="block text-xs text-fg-subtle">{row.hint}</span>
          </dt>
          <dd className="shrink-0 text-right text-sm text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ApprovedBadge() {
  return <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/25">{copy.approved}</span>;
}

function PlanHeader({ plan, detail, onEdit, onPauseToggle }: { plan: MasterPlanRow; detail: PlanDetail; onEdit: () => void; onPauseToggle: () => void }) {
  const figures: { label: string; caption: string; value: string; tone?: string }[] = [
    { label: copy.activeCopiers, caption: copy.currentlyLive, value: String(detail.activeCopiers) },
    { label: copy.planAum, caption: copy.lockedCapital, value: formatUsd(detail.planAum) },
    { label: copy.openPositions, caption: copy.currentlyOpen, value: String(detail.openPositions) },
    { label: copy.floatingCommission, caption: copy.onOpenTrades, value: formatUsd(detail.floatingCommission) },
    { label: copy.commissionEarned, caption: copy.settledCaption, value: formatUsd(detail.commissionEarned), tone: toneOf(detail.commissionEarned) },
    { label: copy.netPnl, caption: copy.afterAllFees, value: formatUsd(detail.netPnl), tone: toneOf(detail.netPnl) },
  ];
  const actions: { icon: IconName; label: string; danger?: boolean; onClick?: () => void }[] = [
    { icon: 'edit', label: copy.edit, onClick: onEdit },
    detail.copyingActive ? { icon: 'pause', label: copy.pause, onClick: onPauseToggle } : { icon: 'refresh', label: pausePlanCopy.resume, onClick: onPauseToggle },
    { icon: 'xCircle', label: copy.inactivate, danger: true },
  ];

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/10 font-mono text-xl font-bold text-primary uppercase">
            {plan.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-fg">{plan.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <ApprovedBadge />
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{detail.commissionLabel}</span>
              <span className="flex items-center gap-1.5 text-fg-muted">
                {detail.copyingActive ? <span aria-hidden="true" className="size-1.5 rounded-full bg-success" /> : <Icon name="pause" size={11} className="text-warning" />}
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
                'flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                action.danger ? 'border-danger/40 text-danger hover:bg-danger/10' : 'border-line-strong text-fg hover:border-primary/50 hover:bg-primary/10',
              )}
            >
              <Icon name={action.icon} size={14} />
              {action.label}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-line md:grid-cols-3 xl:grid-cols-6">
        {figures.map((figure) => (
          <div key={figure.label} className="border-b border-line p-4 not-last:border-r md:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r">
            <dt className="text-xs font-medium text-fg-muted">{figure.label}</dt>
            <dd className={cx('mt-1 font-mono text-lg font-semibold tabular-nums', figure.tone ?? 'text-fg')}>{figure.value}</dd>
            <dd className="text-[11px] text-fg-subtle">{figure.caption}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Win rate as a horizontal gauge: filled share of 100%, with the remaining stats as a ledger. */
function PerformanceCard({ performance }: { performance: PlanDetail['performance'] }) {
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
    <Card>
      <CardHeader title={<SectionTitle icon="pieChart">{copy.performance}</SectionTitle>} />
      <div className="rounded-md border border-line bg-surface-2/50 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-fg-muted">{copy.winRate}</span>
          <span className="font-mono text-2xl font-semibold text-primary tabular-nums">{performance.winRate.toFixed(2)}%</span>
        </div>
        <div aria-hidden="true" className="relative mt-3 h-2 overflow-hidden rounded-full bg-fg/[0.06]">
          <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${performance.winRate}%` }} />
        </div>
        <div aria-hidden="true" className="mt-1 flex justify-between font-mono text-[10px] text-fg-subtle">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border-b border-line py-2.5">
            <dt className="text-xs text-fg-muted">{stat.label}</dt>
            <dd className={cx('font-mono text-base font-semibold tabular-nums', stat.tone ?? 'text-fg')}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function EquityChart({ equity, equityEnd }: { equity: number[]; equityEnd: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
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
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className={cx('font-mono text-xl font-semibold tabular-nums', toneOf(equity[active]))}>{formatUsd(equity[active])}</span>
        <span className="text-xs text-fg-subtle">{fullDayFormat.format(dateAt(active))}</span>
      </div>
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
            className="relative h-56 cursor-crosshair touch-none"
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
              setHovered(Math.round(ratio * last));
            }}
            onPointerLeave={() => setHovered(null)}
          >
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <defs>
                <linearGradient id={`${uid}area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {yTicks.map((tick) => (
                <line key={tick} x1="0" x2="100" y1={yPct(tick)} y2={yPct(tick)} vectorEffect="non-scaling-stroke" className="stroke-line" />
              ))}
              <path d={area} fill={`url(#${uid}area)`} />
              <path d={line} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-primary" />
            </svg>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-primary/50" style={{ left: `${xPct(active)}%` }} />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-surface"
              style={{ left: `${xPct(active)}%`, top: `${yPct(equity[active])}%` }}
            />
          </div>
          <div aria-hidden="true" className="relative mt-2 h-4 font-mono text-[10.5px] text-fg-subtle">
            {xLabels.map((index) => (
              <span key={index} className={cx('absolute', index === 0 ? '' : index === last ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: `${xPct(index)}%` }}>
                {dayFormat.format(dateAt(index))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommissionCard({ commission }: { commission: PlanDetail['commission'] }) {
  const settledShare = commission.lifetime === 0 ? 0 : (commission.settled / commission.lifetime) * 100;
  const cells: { label: string; value: number; tone: string; hint?: string }[] = [
    { label: copy.lifetime, value: commission.lifetime, tone: 'text-fg' },
    { label: copy.thisMonth, value: commission.thisMonth, tone: 'text-fg' },
    { label: copy.pending, value: commission.pending, tone: 'text-warning', hint: copy.pendingHint },
    { label: copy.settled, value: commission.settled, tone: 'text-success' },
  ];
  return (
    <Card>
      <CardHeader
        title={<SectionTitle icon="wallet">{copy.commissionSummary}</SectionTitle>}
        action={
          <span className="font-mono text-xs text-fg-muted tabular-nums">
            {copy.settled} {settledShare.toFixed(0)}%
          </span>
        }
      />
      <div aria-hidden="true" className="mb-4 h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${settledShare}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-md border border-line p-3">
            <dt className="text-xs text-fg-muted">{cell.label}</dt>
            <dd className={cx('mt-0.5 font-mono text-lg font-semibold tabular-nums', cell.tone)}>{formatUsd(cell.value)}</dd>
            {cell.hint && <dd className="text-[11px] text-fg-subtle">{cell.hint}</dd>}
          </div>
        ))}
      </dl>
    </Card>
  );
}

const copierColumns: Column<PlanCopier>[] = [
  {
    key: 'copier',
    header: copy.copier,
    render: (copier) => (
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary uppercase">{copier.name.charAt(0)}</span>
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
          copier.status === 'Active' ? 'bg-success/10 text-success ring-success/25' : 'bg-fg/[0.05] text-fg-muted ring-line',
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
      <span className={cx('inline-flex items-center gap-1 font-mono text-[11px] font-bold', trade.direction === 'BUY' ? 'text-success' : 'text-danger')}>
        <Icon name={trade.direction === 'BUY' ? 'trendUp' : 'trendDown'} size={12} />
        {trade.direction}
      </span>
    ),
  },
  { key: 'account', header: copy.copierAccount, render: (trade) => <span className="font-mono text-xs">{trade.copierAccount}</span> },
  { key: 'name', header: copy.copierName, render: (trade) => trade.copierName },
  { key: 'pnl', header: copy.copierPnl, align: 'right', render: (trade) => <span className={cx('font-mono font-semibold tabular-nums', toneOf(trade.copierPnl))}>{formatUsd(trade.copierPnl)}</span> },
  { key: 'paid', header: copy.paidToYou, align: 'right', render: (trade) => <span className="font-mono tabular-nums">{formatUsd(trade.paidToMaster)}</span> },
  { key: 'running', header: copy.runningFee, align: 'right', render: (trade) => <span className="font-mono text-fg-muted tabular-nums">{formatUsd(trade.runningFeeEstimate)}</span> },
  { key: 'fee', header: copy.feeStatus, render: (trade) => <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">{trade.feeStatus}</span> },
  { key: 'status', header: copy.status, render: (trade) => <span className="text-[11px] font-semibold text-fg-muted">{trade.status}</span> },
];

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
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
    <Card>
      <CardHeader title={<SectionTitle icon="history">{copy.tradeHistory}</SectionTitle>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Dropdown
          label={copy.symbol}
          value={symbol}
          options={[{ value: ALL, label: copy.allSymbols }, ...unique(trades.map((trade) => trade.symbol)).map((value) => ({ value, label: value }))]}
          onChange={choose(setSymbol)}
        />
        <Dropdown
          label={copy.direction}
          value={direction}
          options={[{ value: ALL, label: copy.allDirections }, ...unique(trades.map((trade) => trade.direction)).map((value) => ({ value, label: value }))]}
          onChange={choose(setDirection)}
        />
        <Dropdown
          label={copy.copierName}
          value={copier}
          options={[{ value: ALL, label: copy.allCopiers }, ...unique(trades.map((trade) => trade.copierName)).map((value) => ({ value, label: value }))]}
          onChange={choose(setCopier)}
        />
      </div>
      <p className="mb-4 flex gap-2 border-l-2 border-primary bg-primary/[0.05] p-3 text-xs leading-relaxed text-fg-muted">
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
        <div className="flex items-center gap-1.5">
          <PagerButton label={copy.firstPage} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
          <PagerButton label={copy.prevPage} symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
          <span className="px-2 text-sm text-fg-muted tabular-nums">
            {copy.page} <span className="font-semibold text-primary">{currentPage}</span> / {pageCount}
          </span>
          <PagerButton label={copy.nextPage} symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
          <PagerButton label={copy.lastPage} symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
        </div>
      </div>
    </Card>
  );
}

function BackLink() {
  return (
    <Link
      href="/copy-trading/my-plans"
      className="inline-flex w-fit items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon name="arrowLeft" size={15} />
      {copy.back}
    </Link>
  );
}

export default function PlanDetailPage({ planId }: { planId: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const plan = myPlans.find((item) => item.id === planId);
  const baseDetail = plan ? planDetails[plan.id] : undefined;
  const detail = baseDetail && { ...baseDetail, copyingActive: baseDetail.copyingActive && !isPaused };

  if (!plan || !detail) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink />
        <Card>
          <CardHeader title={<SectionTitle icon="alert">{copy.notFound}</SectionTitle>} description={copy.notFoundText} className="mb-0" />
        </Card>
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
      <PlanHeader plan={plan} detail={detail} onEdit={() => setIsEditing(true)} onPauseToggle={() => (isPaused ? setIsPaused(false) : setIsPauseOpen(true))} />
      <EditPlanDialog plan={isEditing ? plan : null} onClose={() => setIsEditing(false)} />
      <PausePlanDialog
        plan={isPauseOpen ? plan : null}
        onClose={() => setIsPauseOpen(false)}
        onPaused={() => {
          setIsPaused(true);
          setIsPauseOpen(false);
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={<SectionTitle icon="areaChart">{copy.equityCurve}</SectionTitle>} action={<span className="text-xs text-fg-subtle">{copy.hoverHint}</span>} />
          <EquityChart equity={detail.equity} equityEnd={detail.equityEnd} />
        </Card>
        <PerformanceCard performance={detail.performance} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CommissionCard commission={detail.commission} />
        <Card>
          <CardHeader title={<SectionTitle icon="refresh">{copy.settlementCycle}</SectionTitle>} />
          <SettingRows
            rows={[
              { label: copy.cycle, hint: copy.cycleHint, value: detail.settlement.cycle },
              { label: copy.lastSettled, hint: copy.lastSettledHint, value: detail.settlement.lastSettled },
              {
                label: copy.nextPayout,
                hint: copy.nextPayoutHint,
                value: (
                  <span className="flex flex-col items-end gap-1">
                    {detail.settlement.nextPayout}
                    <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-warning/25">
                      <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
                      {detail.settlement.nextPayoutState}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title={<SectionTitle icon="sliders">{copy.commissionAndFee}</SectionTitle>} />
          <SettingRows
            rows={[
              { label: copy.commission, hint: copy.commissionHint, value: detail.commissionLabel },
              { label: copy.commissionType, hint: copy.commissionTypeHint, value: detail.commissionType },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title={<SectionTitle icon="lock">{copy.copierRules}</SectionTitle>} />
          <SettingRows
            rows={[
              { label: copy.minimumCapital, hint: copy.minimumCapitalHint, value: <span className="font-mono tabular-nums">{formatUsd(detail.minimumCapital)}</span> },
              { label: copy.activeCap, hint: copy.activeCapHint, value: <span className="font-mono tabular-nums">{plan.copiers} / {plan.maxCopiers ?? '∞'}</span> },
              { label: copy.planFull, hint: copy.planFullHint, value: detail.planFull ? copy.yes : copy.no },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title={<SectionTitle icon="monitor">{copy.accountAndSystem}</SectionTitle>} />
          <SettingRows
            rows={[
              { label: copy.status, hint: copy.statusHint, value: <ApprovedBadge /> },
              { label: copy.copying, hint: copy.copyingHint, value: detail.copyingActive ? copy.active : copy.inactive },
              { label: copy.server, hint: copy.serverHint, value: plan.serverName },
              { label: copy.tradingAccount, hint: copy.tradingAccountHint, value: <span className="font-mono">{detail.tradingAccountNumber}</span> },
              { label: copy.initialEquity, hint: copy.initialEquityHint, value: <span className="font-mono tabular-nums">{formatUsd(detail.initialEquity)}</span> },
              { label: copy.created, hint: copy.createdHint, value: fullDayFormat.format(new Date(`${plan.createdAt}T00:00:00Z`)) },
            ]}
          />
        </Card>
      </div>

      <Card>
        <CardHeader title={<SectionTitle icon="user">{`${copy.myCopiers} (${detail.copiers.length})`}</SectionTitle>} />
        <DataTable caption={copy.myCopiers} columns={copierColumns} rows={detail.copiers} rowKey={(copier) => copier.account} emptyTitle={copy.noCopiers} emptyDescription="" />
      </Card>

      <Card>
        <CardHeader title={<SectionTitle icon="fileText">{copy.strategyAndRisk}</SectionTitle>} />
        <div className="grid gap-4 md:grid-cols-2">
          {strategy.map((item) => (
            <div key={item.label} className="rounded-md border border-dashed border-line-strong p-4">
              <p className="text-xs font-semibold text-fg-muted">{item.label}</p>
              <p className={cx('mt-2 text-sm', item.text ? 'text-fg' : 'text-fg-subtle')}>{item.text ?? `— ${item.missing}`}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={<SectionTitle icon="bolt">{copy.recentActivity}</SectionTitle>} />
          <ol className="flex max-h-[420px] flex-col divide-y divide-line overflow-y-auto pr-1">
            {detail.activity.map((item, index) => (
              <li key={`${item.title}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                  <Icon name={item.kind === 'trade' ? 'tradeWin' : 'user'} size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{item.title}</span>
                  <span className={cx('block text-xs', item.kind === 'trade' ? 'text-success' : 'text-fg-muted')}>{item.detail}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-fg-subtle">{item.at}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHeader title={<SectionTitle icon="clock">{copy.planTimeline}</SectionTitle>} />
          <ol className="flex flex-col">
            {detail.timeline.map((step, index) => {
              const isLast = index === detail.timeline.length - 1;
              return (
                <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast && <span aria-hidden="true" className="absolute top-6 bottom-0 left-[11px] w-px bg-line-strong" />}
                  <span
                    aria-hidden="true"
                    className={cx('relative grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] font-bold', isLast ? 'border-primary bg-primary text-on-primary' : 'border-primary/40 text-primary')}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{step.title}</p>
                    <p className="text-xs text-fg-muted">{step.detail}</p>
                    <p className="mt-1 font-mono text-[11px] text-fg-subtle">{step.at}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <TradeHistory trades={detail.trades} />
    </div>
  );
}
