'use client';

import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { FundsFlowPeriod } from '@/core/types';
import { cx } from '../lib/cx';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Tabs, type TabItem } from '../ui/Tabs';
import { smoothPath, useMeasuredWidth } from './chartGeometry';

type FlowKind = 'deposits' | 'withdrawals';
type FlowRange = 'monthly' | 'yearly';

const FLOW_HEIGHT = 250;
const FLOW_PAD_TOP = 24;
const FLOW_PAD_BOTTOM = 12;

const kindItems: TabItem<FlowKind>[] = [
  { value: 'deposits', label: translate('home.flowDeposits') },
  { value: 'withdrawals', label: translate('home.flowWithdrawals') },
];

const rangeItems: TabItem<FlowRange>[] = [
  { value: 'monthly', label: translate('home.periodMonthly') },
  { value: 'yearly', label: translate('home.periodYearly') },
];

// Periods are calendar dates, so they are formatted in UTC to read the same on server and client.
const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const longMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function periodLabel(period: FundsFlowPeriod, range: FlowRange, long = false): string {
  const date = new Date(period.start);
  if (range === 'yearly') return String(date.getUTCFullYear());
  return (long ? longMonth : shortMonth).format(date);
}

interface FundsFlowPanelProps {
  monthly?: FundsFlowPeriod[];
  yearly?: FundsFlowPeriod[];
  currency: string;
  /** Rendered inside another card (the dashboard's performance stage): no own glass chrome, visually hidden title. */
  bare?: boolean;
  className?: string;
}

export function FundsFlowPanel({ monthly, yearly, currency, bare = false, className }: FundsFlowPanelProps) {
  const [kind, setKind] = useState<FlowKind>('deposits');
  const [range, setRange] = useState<FlowRange>('monthly');
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  const periods = range === 'monthly' ? monthly : yearly;
  const kindLabel = translate(kind === 'deposits' ? 'home.flowDeposits' : 'home.flowWithdrawals');

  return (
    <section
      aria-labelledby="funds-flow-title"
      className={cx('flex min-w-0 flex-col gap-5', !bare && 'orbit-card animate-rise p-5 motion-reduce:animate-none sm:p-6', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="funds-flow-title" className={cx('text-xl font-medium tracking-tight text-fg sm:text-2xl', bare && 'sr-only')}>
          {translate('home.fundsActivity')}
        </h2>
        <Tabs items={kindItems} value={kind} onChange={setKind} ariaLabel={translate('home.fundsActivity')} />
        {bare && <Tabs items={rangeItems} value={range} onChange={setRange} ariaLabel={translate('home.fundsActivity')} />}
      </div>

      {!bare && <Tabs items={rangeItems} value={range} onChange={setRange} ariaLabel={translate('home.fundsActivity')} className="self-center" />}

      {!periods && <Skeleton className="h-[290px] rounded-[20px]" />}
      {periods?.length === 0 && <EmptyState icon="inbox" title={translate('home.noDataInRange')} />}
      {periods && periods.length > 0 && (
        <FlowLines
          key={`${range}-${kind}`}
          periods={periods}
          kind={kind}
          range={range}
          kindLabel={kindLabel}
          currency={currency}
          selectedStart={selectedStart}
          onSelect={setSelectedStart}
        />
      )}
    </section>
  );
}

interface FlowLinesProps {
  periods: FundsFlowPeriod[];
  kind: FlowKind;
  range: FlowRange;
  kindLabel: string;
  currency: string;
  selectedStart: string | null;
  onSelect: (start: string) => void;
}

const flowLines: { kind: FlowKind; color: string; sign: string }[] = [
  { kind: 'deposits', color: 'var(--brand-primary)', sign: '+' },
  { kind: 'withdrawals', color: 'var(--brand-accent)', sign: '−' },
];

/** Change against the previous period, or undefined when there is nothing to compare with. */
function periodChange(periods: FundsFlowPeriod[], index: number, kind: FlowKind): number | undefined {
  const previous = periods[index - 1]?.[kind];
  if (!previous) return undefined;
  return ((periods[index][kind] - previous) / previous) * 100;
}

/**
 * Deposits and withdrawals as two smooth lines over the same periods. The chosen kind is drawn bold, the other
 * one softer. Hovering (or clicking) a period drops a hairline with a dot on each line and a card holding both
 * amounts and their change against the previous period.
 */
function FlowLines({ periods, kind, range, kindLabel, currency, selectedStart, onSelect }: FlowLinesProps) {
  const [frameRef, width] = useMeasuredWidth<HTMLDivElement>(640);
  const [hover, setHover] = useState<number | null>(null);

  const count = periods.length;
  const selectedIndex = Math.max(periods.findIndex((period) => period.start === selectedStart), 0);
  const settledIndex = selectedStart === null ? count - 1 : selectedIndex;
  const focus = hover ?? settledIndex;
  const selected = periods[settledIndex];
  const values = periods.map((period) => period[kind]);
  const busiest = Math.max(...values, 0);
  const percentOf = (value: number) => (busiest === 0 ? 0 : Math.round((value / busiest) * 100));

  const ceiling = Math.max(...periods.flatMap((period) => [period.deposits, period.withdrawals]), 0) * 1.15 || 1;
  const step = width / count;
  const xAt = (index: number) => (index + 0.5) * step;
  const yAt = (value: number) => FLOW_PAD_TOP + (1 - value / ceiling) * (FLOW_HEIGHT - FLOW_PAD_TOP - FLOW_PAD_BOTTOM);
  // Each line runs flat out to both card edges, like the reference, instead of stopping at the first/last period.
  const pathFor = (flow: FlowKind) => {
    const points = periods.map((period, index) => ({ x: xAt(index), y: yAt(period[flow]) }));
    return smoothPath([{ x: 0, y: points[0].y }, ...points, { x: width, y: points[count - 1].y }]);
  };
  const focusX = xAt(focus);
  const cardOnLeft = focusX > width * 0.6;
  const labelEvery = Math.ceil(count / 12);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-fg-muted uppercase">
            {translate('home.flowSummary', { kind: kindLabel, period: selected ? periodLabel(selected, range, true) : '' })}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-fg tabular-nums">
            {formatMoney(selected ? selected[kind] : 0, currency)}
            <span className="ml-1.5 text-sm font-medium tracking-normal text-fg-subtle">{currency}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ul className="flex items-center gap-3 text-xs text-fg-muted">
            {flowLines.map((flow) => (
              <li key={flow.kind} className={cx('flex items-center gap-1.5', flow.kind === kind && 'font-semibold text-fg')}>
                <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: flow.color }} />
                {translate(flow.kind === 'deposits' ? 'home.flowDeposits' : 'home.flowWithdrawals')}
              </li>
            ))}
          </ul>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/25 tabular-nums">
            {percentOf(selected ? selected[kind] : 0)}%
          </span>
        </div>
      </div>

      <div ref={frameRef} className="relative" style={{ height: FLOW_HEIGHT }} onPointerLeave={() => setHover(null)}>
        <svg aria-hidden="true" width={width} height={FLOW_HEIGHT} viewBox={`0 0 ${width} ${FLOW_HEIGHT}`} className="absolute inset-0 block overflow-visible">
          {periods.map((period, index) => (
            <line
              key={period.start}
              x1={xAt(index)}
              x2={xAt(index)}
              y1={FLOW_PAD_TOP}
              y2={FLOW_HEIGHT}
              strokeDasharray="2 6"
              style={{ stroke: 'var(--border-strong)', strokeOpacity: 0.5 }}
            />
          ))}

          <line
            x1="0"
            x2="0"
            y1={0}
            y2={FLOW_HEIGHT}
            strokeWidth="1.5"
            style={{ stroke: 'var(--text-muted)', strokeOpacity: 0.5, transform: `translateX(${focusX}px)`, transition: 'transform 240ms cubic-bezier(.2,.8,.2,1)' }}
          />

          {/* The chosen kind is drawn last so it sits on top where the lines cross. */}
          {[...flowLines.filter((flow) => flow.kind !== kind), ...flowLines.filter((flow) => flow.kind === kind)].map((flow) => {
            const isChosen = flow.kind === kind;
            return (
              <path
                key={flow.kind}
                d={pathFor(flow.kind)}
                fill="none"
                pathLength={1}
                strokeLinecap="round"
                strokeWidth={isChosen ? 3 : 2}
                className="nova-draw"
                style={{
                  stroke: flow.color,
                  strokeOpacity: isChosen ? 1 : 0.55,
                  filter: isChosen ? `drop-shadow(0 4px 8px ${flow.color})` : undefined,
                }}
              />
            );
          })}

          {flowLines.map((flow) => (
            <circle
              key={flow.kind}
              cx={focusX}
              cy={yAt(periods[focus][flow.kind])}
              r={flow.kind === kind ? 6 : 5}
              strokeWidth="3"
              style={{ fill: flow.color, stroke: 'var(--bg-surface)', transition: 'cx 240ms cubic-bezier(.2,.8,.2,1), cy 240ms cubic-bezier(.2,.8,.2,1)' }}
            />
          ))}
        </svg>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1 z-10 min-w-44 rounded-2xl bg-elevated/95 p-3 text-xs shadow-lg ring-1 ring-line-strong backdrop-blur-md transition-[left] duration-300 ease-out motion-reduce:transition-none"
          style={{ left: cardOnLeft ? focusX - 16 : focusX + 16, transform: cardOnLeft ? 'translateX(-100%)' : undefined }}
        >
          {flowLines.map((flow, index) => {
            const change = periodChange(periods, focus, flow.kind);
            return (
              <div key={flow.kind} className={cx('flex flex-col gap-1', index > 0 && 'mt-2 border-t border-line pt-2')}>
                <span className="flex items-center justify-between gap-4 text-fg-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: flow.color }} />
                    {translate(flow.kind === 'deposits' ? 'home.flowDeposits' : 'home.flowWithdrawals')}
                  </span>
                  {change !== undefined && (
                    <span className={cx('font-semibold tabular-nums', change >= 0 ? 'text-success' : 'text-danger')}>
                      {change >= 0 ? '+' : '−'}
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  )}
                </span>
                <span className="text-base font-semibold text-fg tabular-nums">
                  {flow.sign} {formatMoney(periods[focus][flow.kind], currency)}
                </span>
              </div>
            );
          })}
        </div>

        {/* One invisible column per period: hover previews it, click pins it as the selected period. */}
        <div className="absolute inset-0 flex">
          {periods.map((period, index) => {
            const label = periodLabel(period, range);
            const isSelected = index === settledIndex;
            return (
              <button
                key={period.start}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${label}: ${translate('home.flowDeposits')} ${formatMoney(period.deposits, currency)}, ${translate('home.flowWithdrawals')} ${formatMoney(period.withdrawals, currency)}`}
                onPointerEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(period.start)}
                className="h-full min-w-0 flex-1 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              />
            );
          })}
        </div>
      </div>

      <div aria-hidden="true" className="flex text-xs text-fg-muted">
        {periods.map((period, index) => (
          <span
            key={period.start}
            className={cx('min-w-0 flex-1 truncate text-center', index === focus && 'font-semibold text-fg', index % labelEvery !== 0 && index !== focus && 'invisible')}
          >
            {periodLabel(period, range)}
          </span>
        ))}
      </div>
    </div>
  );
}
