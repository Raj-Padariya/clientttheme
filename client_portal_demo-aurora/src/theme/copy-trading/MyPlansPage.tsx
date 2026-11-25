'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { EditPlanDialog } from './EditPlanDialog';
import { PausePlanDialog } from './PausePlanDialog';
import { myPlans, pausePlanCopy, type MasterPlanRow, type PlanStatus } from './myPlansData';
import '../promotion/market.css';
import '../pamm/desk.css';

type StatusFilter = 'all' | PlanStatus;
type SortKey = 'newest' | 'name' | 'aum';

const PAGE_SIZE = 10;
const EMPTY_VALUE = '–';
const STATUS_ORDER: PlanStatus[] = ['approved', 'pending', 'rejected', 'inactive'];
// Market map: the biggest plans get their own tile, the rest fold into one "+N" tile.
const MAP_TILES = 7;
const MAP_TOP_ROW = 2;
const SHARE_TICKS = 10;
const SEAT_TICKS = 10;

// Sage = live, solid clay = waiting on review, faded clay = rejected, grey = inactive.
const statusMeta: Record<PlanStatus, { labelKey: MessageKey; chip: string; cell: string; tile: string }> = {
  approved: { labelKey: 'copy.myPlans.approved', chip: 'bg-(--hero-buy)/15 text-(--hero-buy)', cell: 'bg-(--hero-buy)', tile: 'bg-(--hero-buy)/18 ring-(--hero-buy)/40' },
  pending: { labelKey: 'copy.myPlans.pendingReview', chip: 'bg-(--aurora-cta-from) text-[#062520]', cell: 'bg-(--aurora-cta-from)', tile: 'bg-(--aurora-cta-from)/15 ring-(--aurora-cta-from)/40' },
  rejected: { labelKey: 'copy.myPlans.rejected', chip: 'text-(--aurora-cta-from) ring-1 ring-(--aurora-cta-from)/50', cell: 'bg-(--aurora-cta-from)/40', tile: 'bg-(--aurora-cta-from)/[0.06] ring-(--aurora-cta-from)/25' },
  inactive: { labelKey: 'copy.myPlans.inactive', chip: 'text-fg-subtle ring-1 ring-line-strong', cell: 'bg-fg/25', tile: 'bg-fg/[0.05] ring-line' },
};

const legend: { status: PlanStatus; labelKey: MessageKey; captionKey?: MessageKey }[] = [
  { status: 'approved', labelKey: 'copy.myPlans.activePlans', captionKey: 'copy.myPlans.liveTrading' },
  { status: 'pending', labelKey: 'copy.myPlans.pendingReview', captionKey: 'copy.myPlans.awaitingApproval' },
  { status: 'rejected', labelKey: 'copy.myPlans.rejected' },
  { status: 'inactive', labelKey: 'copy.myPlans.inactive' },
];

const filters: { value: StatusFilter; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'copy.myPlans.filterAll' },
  { value: 'approved', labelKey: 'copy.myPlans.filterActive' },
  { value: 'pending', labelKey: 'copy.myPlans.pendingReview' },
  { value: 'rejected', labelKey: 'copy.myPlans.rejected' },
  { value: 'inactive', labelKey: 'copy.myPlans.inactive' },
];

const comparators: Record<SortKey, (a: MasterPlanRow, b: MasterPlanRow) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  aum: (a, b) => b.aum - a.aum,
};

const createdFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const formatUsd = (amount: number) => formatMoney(amount, 'USD');

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-xl bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const actionClass =
  'grid size-10 place-items-center rounded-lg ring-1 ring-line text-fg-muted transition-[color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0';

function countByStatus(plans: MasterPlanRow[]): Record<PlanStatus, number> {
  const counts: Record<PlanStatus, number> = { approved: 0, pending: 0, rejected: 0, inactive: 0 };
  for (const plan of plans) counts[plan.status] += 1;
  return counts;
}

function stepNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

function ClayDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from) motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-(--aurora-cta-from)" />
    </span>
  );
}

// Tick strip: blocks rise in one by one up to the share.
function TickStrip({ percent, ticks, cell, delayMs = 0, className }: { percent: number; ticks: number; cell: string; delayMs?: number; className?: string }) {
  const litTicks = Math.round((percent / 100) * ticks);
  return (
    <span aria-hidden="true" className={cx('flex gap-[2px]', className)}>
      {Array.from({ length: ticks }, (_, index) => {
        const isLit = index < litTicks;
        return (
          <span
            key={index}
            style={isLit ? ({ '--candle-delay': `${delayMs + index * 40}ms` } as CSSProperties) : undefined}
            className={cx('h-2 flex-1 rounded-[1px]', isLit ? cx('mkt-candle', cell) : 'bg-fg/10')}
          />
        );
      })}
    </span>
  );
}

/* ───────────── Title + ticker tape ───────────── */

function PageTitle() {
  return (
    <header className="zenith-tile flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <ClayDot className="size-1.5" />
          {translate('nav.copyTrading')}
        </p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMyPlans')}</h2>
        <p className="mt-2 text-sm text-fg-muted">{translate('copy.myPlans.subtitle')}</p>
      </div>
      <Button type="button" className="group/create relative shrink-0 self-start overflow-hidden rounded-full! pl-1.5! sm:self-auto">
        <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
        <span aria-hidden="true" className="relative grid size-7 place-items-center rounded-full bg-(--aurora-cta-from) text-[#062520]">
          <Icon name="plus" size={14} className="transition-transform duration-300 group-hover/create:rotate-90 motion-reduce:transition-none" />
        </span>
        <span className="relative">{translate('copy.myPlans.createPlan')}</span>
      </Button>
    </header>
  );
}

// Ticker tape of every plan: status dot, name and AUM, scrolling in a loop (rendered twice so it wraps seamlessly).
function PlanTicker({ plans }: { plans: MasterPlanRow[] }) {
  if (plans.length === 0) return null;
  const tape = (copy: number) =>
    plans.map((plan) => (
      <span key={`${copy}-${plan.id}`} className="inline-flex items-center gap-2 px-5 font-mono text-xs whitespace-nowrap">
        <span className={cx('size-1.5 rounded-full', statusMeta[plan.status].cell)} />
        <span className="font-bold text-fg">{plan.name}</span>
        <span className="text-fg-muted tabular-nums">{formatUsd(plan.aum)}</span>
        <Icon name={plan.status === 'approved' ? 'trendUp' : 'trendDown'} size={11} className={plan.status === 'approved' ? 'text-(--hero-buy)' : 'text-(--aurora-cta-from)'} />
      </span>
    ));

  return (
    <div aria-hidden="true" className="zenith-tile relative flex h-10 items-center overflow-hidden rounded-lg bg-fg/[0.03] ring-1 ring-line [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div style={{ '--tape-duration': `${Math.max(18, plans.length * 4)}s` } as CSSProperties} className="mkt-tape flex w-max motion-reduce:animate-none">
        {tape(0)}
        {tape(1)}
      </div>
    </div>
  );
}

/* ───────────── Market map: AUM treemap + copiers ───────────── */

interface MapTile {
  key: string;
  label: string;
  aum: number;
  status: PlanStatus | null;
}

function buildMarketMap(plans: MasterPlanRow[]): MapTile[][] {
  const ranked = plans.toSorted((a, b) => b.aum - a.aum);
  const tiles: MapTile[] = ranked.slice(0, MAP_TILES).map((plan) => ({ key: String(plan.id), label: plan.name, aum: plan.aum, status: plan.status }));
  const rest = ranked.slice(MAP_TILES);
  if (rest.length > 0) tiles.push({ key: 'rest', label: `+${rest.length}`, aum: rest.reduce((sum, plan) => sum + plan.aum, 0), status: null });
  return [tiles.slice(0, MAP_TOP_ROW), tiles.slice(MAP_TOP_ROW)].filter((row) => row.length > 0);
}

function MarketMap({ plans, totalAum, totalCopiers }: { plans: MasterPlanRow[]; totalAum: number; totalCopiers: number }) {
  const rows = buildMarketMap(plans);
  // A floor keeps zero-AUM plans visible as slim tiles.
  const floor = Math.max(totalAum * 0.04, 1);
  const weight = (aum: number) => Math.max(aum, floor);
  let tileIndex = 0;

  return (
    <section style={staggerStyle(0, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 sm:p-6')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cx(captionClass, 'flex items-center gap-2')}>
              <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
                <Icon name="wallet" size={14} />
              </span>
              {translate('copy.myPlans.totalAum')}
            </p>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-fg-muted ring-1 ring-line">{translate('copy.myPlans.acrossAllPlans')}</span>
          </div>
          <p className="mt-3 truncate font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">
            <CountUp value={totalAum} format={formatUsd} />
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-fg/[0.03] py-2 pr-4 pl-2 ring-1 ring-line">
          <span className="relative grid size-10 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-lg bg-(--hero-buy)/30 motion-reduce:hidden" />
            <span className={cx(beadClass, 'relative size-10')}>
              <Icon name="user" size={16} />
            </span>
          </span>
          <div className="min-w-0">
            <p className={captionClass}>{translate('copy.myPlans.totalCopiers')}</p>
            <p className="truncate text-[11px] text-fg-muted">{translate('copy.myPlans.subscribers')}</p>
          </div>
          <p className="ml-2 shrink-0 font-mono text-3xl font-black tracking-tight text-fg tabular-nums">
            <CountUp value={totalCopiers} format={(value) => String(Math.round(value))} />
          </p>
        </div>
      </div>

      {/* Treemap: each tile sized by its plan's AUM and tinted by status; tiles rise in one after another. */}
      {rows.length > 0 && (
        <div aria-hidden="true" className="flex h-56 flex-col gap-1.5">
          {rows.map((row) => (
            <div key={row[0].key} style={{ flexGrow: row.reduce((sum, tile) => sum + weight(tile.aum), 0) }} className="flex min-h-14 basis-0 gap-1.5">
              {row.map((tile) => {
                const order = tileIndex++;
                const share = totalAum === 0 ? 0 : (tile.aum / totalAum) * 100;
                return (
                  <div key={tile.key} style={{ flexGrow: weight(tile.aum) }} className="min-w-12 basis-0 overflow-hidden rounded-lg">
                    <div
                      style={{ '--rise-delay': `${200 + order * 90}ms` } as CSSProperties}
                      className={cx(
                        'mkt-rise relative flex size-full flex-col justify-between overflow-hidden rounded-lg p-2.5 ring-1 transition-[filter] duration-300 hover:brightness-125',
                        tile.status ? statusMeta[tile.status].tile : 'bg-fg/[0.05] ring-line',
                      )}
                    >
                      {tile.status === 'pending' && <span className="desk-stripes absolute inset-0 opacity-25" />}
                      {order === 0 && <span className="mkt-sweep absolute inset-y-0 w-12 -skew-x-12 bg-white/15" />}
                      <span className="relative truncate text-xs font-bold text-fg">{tile.label}</span>
                      <span className="relative flex items-end justify-between gap-2 font-mono text-[10px] tabular-nums">
                        <span className="truncate text-fg-muted">{formatUsd(tile.aum)}</span>
                        <span className="shrink-0 font-bold text-fg">{share.toFixed(0)}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────── Market breadth: stacked status bar + quote cells ───────────── */

function StatusBreakdown({ counts, total }: { counts: Record<PlanStatus, number>; total: number }) {
  return (
    <section style={staggerStyle(1, 120)} className={cx(panelClass, 'zenith-tile flex min-w-0 flex-col gap-5 p-5 sm:p-6')}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <LiveDot />
            {translate('copy.myPlans.totalPlans')}
          </p>
          <p className="mt-2 font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums">
            <CountUp value={total} format={(value) => String(Math.round(value))} />
          </p>
        </div>
        <span className="rounded-md px-3 py-1 text-xs font-semibold text-fg ring-1 ring-line">{translate('copy.myPlans.allPlans')}</span>
      </div>

      {/* Breadth bar: one segment per status, growing in from the left; idle stripes march while there are no plans. */}
      <div aria-hidden="true" className="relative flex h-5 gap-0.5 overflow-hidden rounded-md bg-fg/[0.06] p-0.5 ring-1 ring-line">
        {total === 0 ? (
          <span className="desk-stripes absolute inset-0 opacity-30" />
        ) : (
          STATUS_ORDER.filter((status) => counts[status] > 0).map((status, index) => (
            <span
              key={status}
              style={{ width: `${(counts[status] / total) * 100}%`, animationDelay: `${200 + index * 140}ms` }}
              className={cx('zenith-capsule relative h-full origin-left overflow-hidden rounded-[3px]', statusMeta[status].cell)}
            >
              {status === 'pending' && <span className="desk-stripes absolute inset-0" />}
            </span>
          ))
        )}
        <span className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/20" />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {legend.map((row, index) => {
          const share = total === 0 ? 0 : (counts[row.status] / total) * 100;
          return (
            <li key={row.status} style={staggerStyle(index, 300)} className="flex animate-feed-in flex-col gap-2 rounded-lg bg-fg/[0.03] p-3 ring-1 ring-line motion-reduce:animate-none">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className={cx('mt-1 h-6 w-1 shrink-0 rounded-full', statusMeta[row.status].cell)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                      {stepNumber(index)}
                    </span>
                    <span className="truncate text-sm font-semibold text-fg">{translate(row.labelKey)}</span>
                  </span>
                  {row.captionKey && <span className="block truncate text-[11px] text-fg-subtle">{translate(row.captionKey)}</span>}
                </span>
                <span className="font-mono text-xl font-black text-fg tabular-nums">{counts[row.status]}</span>
              </div>
              <TickStrip percent={share} ticks={SHARE_TICKS} cell={statusMeta[row.status].cell} delayMs={300 + index * 120} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────── Plan quote rows ───────────── */

function TicketField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={cx(captionClass, 'leading-tight')}>{label}</dt>
      <dd className="mt-1.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

function PairLabel({ topKey, bottomKey }: { topKey: MessageKey; bottomKey: MessageKey }) {
  return (
    <>
      {translate(topKey)}
      <span className="block tracking-[0.1em] text-fg-subtle/70">{translate(bottomKey)}</span>
    </>
  );
}

interface PlanHandlers {
  isPaused: boolean;
  onEdit: () => void;
  onPause: () => void;
  onResume: () => void;
}

function PlanTicket({ plan, index, handlers }: { plan: MasterPlanRow; index: number; handlers: PlanHandlers }) {
  const status = statusMeta[plan.status];
  const seatShare = plan.maxCopiers ? Math.min(100, (plan.copiers / plan.maxCopiers) * 100) : null;
  const isLive = !handlers.isPaused && plan.status === 'approved';

  return (
    <li
      style={staggerStyle(index, 200)}
      className="group/plan relative grid animate-feed-in gap-5 overflow-hidden rounded-xl bg-fg/[0.03] p-4 pl-5 ring-1 ring-line transition-[box-shadow,background-color] duration-300 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none sm:p-5 sm:pl-6 xl:grid-cols-[16rem_minmax(0,1fr)_auto] xl:items-center"
    >
      {/* Status rail on the left edge: striped while pending or paused. */}
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1.5', handlers.isPaused ? 'desk-stripes bg-(--aurora-cta-from)' : cx(status.cell, plan.status === 'pending' && 'desk-stripes'))} />

      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          {isLive && <span className="absolute -inset-1 animate-ring-ripple rounded-xl border-2 border-(--hero-buy)/60 motion-reduce:hidden" />}
          <span
            className={cx(
              'grid size-12 place-items-center rounded-xl font-mono text-lg font-black uppercase ring-1 transition-transform duration-300 group-hover/plan:-rotate-6 motion-reduce:transition-none',
              status.tile,
              'text-fg',
            )}
          >
            {plan.name.charAt(0)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-bold text-fg">{plan.name}</span>
            <span className="rounded px-1 font-mono text-[10px] text-fg-subtle ring-1 ring-line">
              <span className="sr-only">{translate('copy.myPlans.id')} </span>#{plan.id}
            </span>
          </p>
          {handlers.isPaused ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-(--aurora-cta-from)">
              <Icon name="pause" size={11} />
              {pausePlanCopy.paused}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span aria-hidden="true" className="mkt-blink size-1.5 rounded-full bg-success" />
              {translate('copy.myPlans.copyingOn')}
            </p>
          )}
          <p className="mt-1.5">
            <span className="sr-only">{translate('copy.myPlans.status')}: </span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold', status.chip)}>{translate(status.labelKey)}</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-dashed border-line pt-4 sm:grid-cols-3 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5 2xl:grid-cols-6">
        <TicketField label={translate('copy.myPlans.copiers')}>
          <span className="inline-flex items-center gap-1.5 font-mono font-bold tabular-nums">
            <Icon name="user" size={12} className="text-fg-subtle" />
            {plan.copiers} <span className="text-fg-subtle">/</span> {plan.maxCopiers ?? '∞'}
          </span>
          {seatShare !== null && <TickStrip percent={seatShare} ticks={SEAT_TICKS} cell="bg-(--hero-buy)" delayMs={200 + index * 80} className="mt-1.5 max-w-28" />}
        </TicketField>
        <TicketField label={translate('copy.myPlans.aum')}>
          <span className="font-mono text-base font-black tabular-nums">{formatUsd(plan.aum)}</span>
        </TicketField>
        <TicketField label={translate('copy.myPlans.commission')}>
          <span className="block">{translate('copy.myPlans.commissionOnProfit', { percent: String(plan.commissionPercent) })}</span>
          <span className="mt-1 inline-block rounded-md px-2 py-px font-mono text-[10px] text-fg-muted ring-1 ring-line-strong">{plan.commissionBasis}</span>
        </TicketField>
        <TicketField label={<PairLabel topKey="copy.myPlans.subscriptionFee" bottomKey="copy.myPlans.billingPeriod" />}>
          <span className="block font-mono tabular-nums">{plan.subscriptionFee === null ? EMPTY_VALUE : formatUsd(plan.subscriptionFee)}</span>
          <span className="block text-xs text-fg-muted">{plan.billingPeriod ?? EMPTY_VALUE}</span>
        </TicketField>
        <TicketField label={<PairLabel topKey="copy.myPlans.tradingAccount" bottomKey="copy.myPlans.tradingServer" />}>
          <span className="block font-mono">{plan.tradingAccount}</span>
          <span className="block text-xs">
            <span className="font-semibold">{plan.serverName}</span> <span className="font-mono text-fg-muted">{plan.serverType}</span>
          </span>
        </TicketField>
        <TicketField label={translate('copy.myPlans.created')}>
          <span className="font-mono text-xs text-fg-muted tabular-nums">{createdFormat.format(new Date(`${plan.createdAt}T00:00:00Z`))}</span>
        </TicketField>
      </dl>

      <div role="group" aria-label={translate('copy.myPlans.actions')} className="flex items-center gap-2 xl:justify-end">
        <Link
          href={`/copy-trading/my-plans/${plan.id}`}
          aria-label={translate('copy.myPlans.view')}
          title={translate('copy.myPlans.view')}
          className="group/view relative grid size-10 place-items-center overflow-hidden rounded-lg bg-(--hero-buy) text-[#062520] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Icon name="eye" size={15} className="relative" />
        </Link>
        <button type="button" aria-haspopup="dialog" onClick={handlers.onEdit} aria-label={translate('copy.myPlans.edit')} title={translate('copy.myPlans.edit')} className={actionClass}>
          <Icon name="pencil" size={15} />
        </button>
        {handlers.isPaused ? (
          <button
            type="button"
            onClick={handlers.onResume}
            aria-label={pausePlanCopy.resume}
            title={pausePlanCopy.resume}
            className={cx(actionClass, 'bg-(--aurora-cta-from) text-[#062520] ring-0 hover:text-[#062520]')}
          >
            <Icon name="play" size={14} />
          </button>
        ) : (
          <button type="button" aria-haspopup="dialog" onClick={handlers.onPause} aria-label={translate('copy.myPlans.pause')} title={translate('copy.myPlans.pause')} className={actionClass}>
            <Icon name="pause" size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

// Empty board: a flat dashed price line with a blinking cursor at its end, the search icon above it.
function EmptyPlans() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong py-14 text-center">
      <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
        <Icon name="search" size={17} />
      </span>
      <svg aria-hidden="true" viewBox="0 0 160 12" className="h-3 w-40 overflow-visible">
        <line x1={0} x2={150} y1={6} y2={6} strokeWidth={2} strokeDasharray="4 5" className="mkt-march stroke-fg/30" />
        <rect x={152} y={0} width={4} height={12} rx={1} className="mkt-blink fill-(--aurora-cta-from)" />
      </svg>
      <p className="text-sm font-semibold text-fg">{translate('copy.myPlans.noMatch')}</p>
      <p className="text-sm text-fg-muted">{translate('copy.myPlans.subtitle')}</p>
    </div>
  );
}

function PagerButton({ label, icon, disabled, onClick }: { label: string; icon: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md font-mono text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {icon}
    </button>
  );
}

/* ───────────── Page ───────────── */

export default function MyPlansPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('aum');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MasterPlanRow | null>(null);
  const [pausing, setPausing] = useState<MasterPlanRow | null>(null);
  const [pausedIds, setPausedIds] = useState<ReadonlySet<number>>(new Set());

  const setPaused = (planId: number, isPaused: boolean) =>
    setPausedIds((current) => {
      const next = new Set(current);
      if (isPaused) next.add(planId);
      else next.delete(planId);
      return next;
    });

  const counts = countByStatus(myPlans);
  const totalAum = myPlans.reduce((sum, plan) => sum + plan.aum, 0);
  const totalCopiers = myPlans.reduce((sum, plan) => sum + plan.copiers, 0);

  const filtered = (filter === 'all' ? myPlans : myPlans.filter((plan) => plan.status === filter)).toSorted(comparators[sortKey]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  function chooseFilter(next: StatusFilter) {
    setFilter(next);
    setPage(1);
  }

  function chooseSort(next: SortKey) {
    setSortKey(next);
    setPage(1);
  }

  // Skeleton: header, plan ticker tape, market map beside the breadth panel, exchange tabs, quote rows, pager.
  return (
    <div className="flex flex-col gap-6">
      <PageTitle />
      <PlanTicker plans={myPlans} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <MarketMap plans={myPlans} totalAum={totalAum} totalCopiers={totalCopiers} />
        <StatusBreakdown counts={counts} total={myPlans.length} />
      </div>

      <section aria-label={translate('nav.copyMyPlans')} style={staggerStyle(2, 120)} className="zenith-tile mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Exchange tabs: each status with its count tag, the active one tinted sage with an underline. */}
          <div role="group" aria-label={translate('copy.myPlans.statusFilter')} className="flex flex-wrap gap-0.5 rounded-lg bg-fg/[0.04] p-1 ring-1 ring-line">
            {filters.map((option) => {
              const isActive = filter === option.value;
              const count = option.value === 'all' ? myPlans.length : counts[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseFilter(option.value)}
                  className={cx(
                    'relative flex h-9 items-center gap-2 rounded-md pr-1.5 pl-3 text-sm font-semibold transition-[color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-(--hero-buy)/12 text-(--hero-buy)' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                  )}
                >
                  {translate(option.labelKey)}
                  <span
                    className={cx(
                      'grid h-6 min-w-6 place-items-center rounded px-1.5 font-mono text-[10px] tabular-nums',
                      isActive ? 'bg-(--hero-buy) text-[#062520]' : 'bg-fg/10 text-fg-subtle',
                    )}
                  >
                    {count}
                  </span>
                  {isActive && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-(--hero-buy)" />}
                </button>
              );
            })}
          </div>
          <Dropdown
            label={translate('copy.myPlans.sortLabel')}
            value={sortKey}
            options={[
              { value: 'newest', label: translate('copy.myPlans.sortNewest') },
              { value: 'name', label: translate('copy.myPlans.sortName') },
              { value: 'aum', label: translate('copy.myPlans.sortAum') },
            ]}
            onChange={chooseSort}
            icon="arrowsUpDown"
            className="lg:w-56"
          />
        </div>

        {pageItems.length === 0 ? (
          <EmptyPlans />
        ) : (
          <ol key={`${filter}-${sortKey}-${currentPage}`} className="flex flex-col gap-3">
            {pageItems.map((plan, index) => (
              <PlanTicket
                key={plan.id}
                plan={plan}
                index={index}
                handlers={{
                  isPaused: pausedIds.has(plan.id),
                  onEdit: () => setEditing(plan),
                  onPause: () => setPausing(plan),
                  onResume: () => setPaused(plan.id, false),
                }}
              />
            ))}
          </ol>
        )}

        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-fg-muted tabular-nums">
            {translate('copy.myPlans.showing', {
              from: String(filtered.length === 0 ? 0 : firstIndex + 1),
              to: String(firstIndex + pageItems.length),
              total: String(filtered.length),
            })}
          </p>
          <div className="flex items-center gap-1 rounded-lg p-1 ring-1 ring-line">
            <PagerButton label={translate('pamm.explore.firstPage')} icon="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton label={translate('pamm.explore.prevPage')} icon="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('copy.myPlans.page')}
              <span className="grid size-7 place-items-center rounded-md bg-(--hero-buy) font-mono font-bold text-[#062520] tabular-nums">{currentPage}</span>/ {pageCount}
            </span>
            <PagerButton label={translate('pamm.explore.nextPage')} icon="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton label={translate('pamm.explore.lastPage')} icon="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </section>

      <EditPlanDialog plan={editing} onClose={() => setEditing(null)} />
      <PausePlanDialog
        plan={pausing}
        onClose={() => setPausing(null)}
        onPaused={(plan) => {
          setPaused(plan.id, true);
          setPausing(null);
        }}
      />
    </div>
  );
}
