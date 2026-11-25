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

const BAR_STAGGER_MS = 70;
// Below this height the percentage no longer fits inside the fill, so it sits just above it.
const LABEL_INSIDE_MIN_PERCENT = 26;

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
      className={cx('flex min-w-0 flex-col gap-5', !bare && 'glass glass-strong animate-rise rounded-[28px] p-5 motion-reduce:animate-none sm:p-6', className)}
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

// Each bar is a share of the busiest period in view, so the tallest one is always 100%.
function FlowBars({ periods, kind, range, kindLabel, currency, selectedStart, onSelect }: FlowBarsProps) {
  const values = periods.map((period) => period[kind]);
  const peak = Math.max(...values, 0);
  const selected = periods.find((period) => period.start === selectedStart) ?? periods[periods.length - 1];

  return (
    <div className="flex flex-1 flex-col gap-5 rounded-[20px] border border-line bg-surface-2/40 p-5">
      <div className="border-l-2 border-primary pl-3">
        <p className="text-2xl font-light tracking-[-0.02em] text-fg tabular-nums sm:text-3xl">
          {formatMoney(selected ? selected[kind] : 0, currency)}
          <span className="ml-1.5 text-sm font-normal tracking-normal text-fg-subtle">{currency}</span>
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {translate('home.flowSummary', { kind: kindLabel, period: selected ? periodLabel(selected, range, true) : '' })}
        </p>
      </div>

      <ul className="grid min-h-[180px] flex-1 auto-cols-fr grid-flow-col gap-2 sm:gap-2.5">
        {periods.map((period, index) => {
          const value = period[kind];
          const percent = peak === 0 ? 0 : Math.round((value / peak) * 100);
          const isSelected = period.start === selected?.start;
          const isLabelInside = percent >= LABEL_INSIDE_MIN_PERCENT;
          const label = periodLabel(period, range);
          return (
            <li key={period.start} className="flex min-w-0 flex-col items-center gap-2">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${label}: ${formatMoney(value, currency)} (${percent}%)`}
                onClick={() => onSelect(period.start)}
                className={cx(
                  'progress-track relative w-full flex-1 overflow-hidden rounded-[16px] transition-shadow focus-visible:outline-2 focus-visible:outline-ring',
                  isSelected && 'ring-1 ring-primary/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute inset-x-0 bottom-0 origin-bottom animate-bar-rise rounded-[16px] transition-[background-color,opacity] motion-reduce:animate-none',
                    isSelected
                      ? '[background-image:var(--brand-gradient)] shadow-[0_0_18px_-4px_color-mix(in_srgb,var(--brand-primary)_60%,transparent)]'
                      : 'bg-primary/35',
                  )}
                  style={{ height: `${percent}%`, animationDelay: `${index * BAR_STAGGER_MS}ms` }}
                />
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute inset-x-0 text-center text-xs font-semibold tabular-nums sm:text-sm',
                    isLabelInside && isSelected ? 'text-on-primary' : 'text-fg',
                  )}
                  style={{ bottom: isLabelInside ? `calc(${percent}% - 28px)` : `calc(${percent}% + 6px)` }}
                >
                  {percent}%
                </span>
              </button>
              <span aria-hidden="true" className={cx('text-[11px]', isSelected ? 'font-semibold text-fg' : 'text-fg-muted')}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
