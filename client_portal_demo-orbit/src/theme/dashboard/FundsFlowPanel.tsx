'use client';

import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { FundsFlowPeriod } from '@/core/types';
import { cx } from '../lib/cx';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Tabs, type TabItem } from '../ui/Tabs';

type FlowKind = 'deposits' | 'withdrawals';
type FlowRange = 'monthly' | 'yearly';

const ROW_STAGGER_MS = 60;
const METER_SEGMENTS = 24;

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
        <FlowBars
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

interface FlowBarsProps {
  periods: FundsFlowPeriod[];
  kind: FlowKind;
  range: FlowRange;
  kindLabel: string;
  currency: string;
  selectedStart: string | null;
  onSelect: (start: string) => void;
}

// Each meter is a share of the busiest period in view, so the fullest one is always 100%.
function FlowBars({ periods, kind, range, kindLabel, currency, selectedStart, onSelect }: FlowBarsProps) {
  const values = periods.map((period) => period[kind]);
  const peak = Math.max(...values, 0);
  const selected = periods.find((period) => period.start === selectedStart) ?? periods[periods.length - 1];
  const percentOf = (value: number) => (peak === 0 ? 0 : Math.round((value / peak) * 100));

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
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/25 tabular-nums">
          {percentOf(selected ? selected[kind] : 0)}%
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {periods.map((period, index) => {
          const value = period[kind];
          const percent = percentOf(value);
          const lit = Math.round((percent / 100) * METER_SEGMENTS);
          const isSelected = period.start === selected?.start;
          const label = periodLabel(period, range);
          return (
            <li key={period.start}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${label}: ${formatMoney(value, currency)} (${percent}%)`}
                onClick={() => onSelect(period.start)}
                className={cx(
                  'grid w-full grid-cols-[44px_minmax(0,1fr)_48px] items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                  isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-hover',
                )}
              >
                <span aria-hidden="true" className={cx('text-xs', isSelected ? 'font-semibold text-fg' : 'text-fg-muted')}>
                  {label}
                </span>
                <span aria-hidden="true" className="flex h-5 gap-[3px]">
                  {Array.from({ length: METER_SEGMENTS }, (_, segment) => {
                    const isLit = segment < lit;
                    const isEdge = isSelected && segment === lit - 1;
                    const ramp = (segment + 1) / Math.max(lit, 1);
                    const strength = Math.round(isSelected ? 55 + 45 * ramp : 18 + 37 * ramp);
                    return (
                      <span
                        key={segment}
                        className={cx(
                          'min-w-0 flex-1 rounded-full',
                          isLit ? 'animate-dot-pop motion-reduce:animate-none' : 'bg-fg/[0.06]',
                          isEdge && 'shadow-[0_0_10px_var(--brand-primary)]',
                        )}
                        style={
                          isLit
                            ? {
                                backgroundColor: isEdge ? 'var(--brand-gleam)' : `color-mix(in oklab, var(--brand-primary) ${strength}%, transparent)`,
                                animationDelay: `${index * ROW_STAGGER_MS + segment * 14}ms`,
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </span>
                <span aria-hidden="true" className={cx('text-right text-xs font-semibold tabular-nums', isSelected ? 'text-primary' : 'text-fg-muted')}>
                  {percent}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
