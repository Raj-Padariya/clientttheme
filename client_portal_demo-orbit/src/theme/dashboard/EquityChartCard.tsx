'use client';

import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { FundsFlowPeriod, Transaction } from '@/core/types';
import { cx } from '../lib/cx';
import { DateRangePicker, addDays, fromKey, toKey, type DateRange } from '../ui/DateRangePicker';
import { Icon, type IconName } from '../ui/Icon';
import { FundsFlowPanel } from './FundsFlowPanel';
import { CardOrbits, CountUpMoney, KebabLink, currencySymbol, ffText } from './finflowParts';

type StageView = 'balance' | 'flow';

const stageViews: { id: StageView; icon: IconName; label: string }[] = [
  { id: 'balance', icon: 'areaChart', label: translate('home.balanceActivity') },
  { id: 'flow', icon: 'transfer', label: translate('home.fundsActivity') },
];

type RangePreset = '7d' | '30d' | '3m' | '1y' | 'all';

const rangePresets: { id: RangePreset; label: string; days?: number; months?: number }[] = [
  { id: '7d', label: translate('home.range7d'), days: 7 },
  { id: '30d', label: translate('home.range30d'), days: 30 },
  { id: '3m', label: translate('home.range3m'), months: 3 },
  { id: '1y', label: translate('home.range1y'), months: 12 },
  { id: 'all', label: translate('home.rangeAll') },
];

const ALL_TIME: DateRange = { from: '', to: '' };

const MATRIX_ROWS = 14;
const MAX_COLUMNS = 30;
const TICK_COUNT = 6;

const rangeDayFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

function presetRange(preset: (typeof rangePresets)[number]): DateRange {
  if (!preset.days && !preset.months) return ALL_TIME;
  const today = new Date();
  const from = new Date(today);
  if (preset.days) from.setDate(from.getDate() - (preset.days - 1));
  else from.setMonth(from.getMonth() - (preset.months ?? 0));
  return { from: toKey(from), to: toKey(today) };
}

function isAllTime(range: DateRange) {
  return !range.from && !range.to;
}

function inRange(key: string, range: DateRange) {
  return (!range.from || key >= range.from) && (!range.to || key <= range.to);
}

// A month or year bucket stays in view when any of its days falls inside the range.
function overlapsRange(period: FundsFlowPeriod, span: 'month' | 'year', range: DateRange) {
  const start = fromKey(period.start);
  const end = span === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 0) : new Date(start.getFullYear(), 11, 31);
  return (!range.to || period.start <= range.to) && (!range.from || toKey(end) >= range.from);
}

// The balance series is one point per day ending today. Only reached after the user picks a range,
// so reading the clock here never affects the prerendered markup.
function sliceBalance(series: number[], range: DateRange): { series: number[]; endDaysAgo: number } {
  if (isAllTime(range)) return { series, endDaysAgo: 0 };
  const todayKey = toKey(new Date());
  const lastIndex = series.length - 1;
  const kept = series.map((value, index) => ({ value, index })).filter((point) => inRange(addDays(todayKey, point.index - lastIndex), range));
  const lastKept = kept[kept.length - 1];
  return { series: kept.map((point) => point.value), endDaysAgo: lastKept ? lastIndex - lastKept.index : 0 };
}

function rangeCaption(range: DateRange): string {
  if (isAllTime(range)) return translate('home.trendLabel');
  const from = range.from ? rangeDayFormat.format(fromKey(range.from)) : '…';
  const to = range.to ? rangeDayFormat.format(fromKey(range.to)) : '…';
  return `${from} – ${to}`;
}

/** Labels a few evenly spaced days of the window; the format follows how many days the window spans. */
function axisLabels(length: number, endDaysAgo: number): string[] {
  const today = new Date();
  const count = Math.min(TICK_COUNT, length);
  const spanDays = length - 1;
  const format = spanDays <= 7 ? weekdayFormat : spanDays <= 95 ? dayFormat : monthFormat;
  return Array.from({ length: count }, (_, tick) => {
    const index = Math.round((tick / Math.max(count - 1, 1)) * (length - 1));
    const date = new Date(today);
    date.setDate(today.getDate() - endDaysAgo - (length - 1 - index));
    return format.format(date);
  });
}

interface ChartProps {
  series: number[];
  endDaysAgo: number;
  currency: string;
}

interface MatrixColumn {
  value: number;
  /** Position of the column's closing day in the series. */
  index: number;
}

// Long windows are bucketed from today backwards so every column stays readable; a column shows its bucket's closing value.
function toColumns(series: number[]): MatrixColumn[] {
  const size = Math.ceil(series.length / MAX_COLUMNS);
  const columns: MatrixColumn[] = [];
  for (let end = series.length - 1; end >= 0; end -= size) columns.unshift({ value: series[end], index: end });
  return columns;
}

function dayOf(index: number, length: number, endDaysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - endDaysAgo - (length - 1 - index));
  return date;
}

/** Equity as an LED dot matrix: one column per day (or bucket), lit from the floor up to its level. */
function MatrixChart({ series, endDaysAgo, currency }: ChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const columns = toColumns(series);
  const values = columns.map((column) => column.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const levelOf = (value: number) => (span === 0 ? Math.ceil(MATRIX_ROWS / 2) : 1 + Math.round(((value - min) / span) * (MATRIX_ROWS - 1)));
  const lastColumn = columns.length - 1;
  const peakColumn = values.lastIndexOf(max);
  const focus = hover ?? peakColumn;
  const focusLevel = levelOf(columns[focus].value);
  const labels = axisLabels(series.length, endDaysAgo);
  const summary = `${formatMoney(series[0], currency)} → ${formatMoney(series[series.length - 1], currency)}`;

  return (
    <div>
      <div className="flex gap-3">
        <div role="img" aria-label={summary} className="min-w-0 flex-1 pt-9" onPointerLeave={() => setHover(null)}>
          <div className="relative flex h-[224px] gap-[3px] sm:gap-1">
            {columns.map((column, col) => {
              const level = levelOf(column.value);
              const isHovered = col === hover;
              return (
                <div
                  key={column.index}
                  aria-hidden="true"
                  onPointerEnter={() => setHover(col)}
                  className={cx(
                    'flex min-w-0 flex-1 cursor-crosshair flex-col-reverse gap-[3px] rounded-full p-px transition-colors duration-200',
                    isHovered && 'bg-primary/12',
                  )}
                >
                  {Array.from({ length: MATRIX_ROWS }, (_, row) => {
                    const isLit = row < level;
                    const isTop = row === level - 1;
                    // Brightness climbs towards the top of the column; dot-pop pins opacity, so intensity goes through the colour.
                    const strength = isHovered || isTop ? 100 : Math.round(28 + 62 * ((row + 1) / level));
                    return (
                      <span
                        key={row}
                        className={cx(
                          'relative w-full flex-1 rounded-full',
                          isLit ? 'animate-dot-pop motion-reduce:animate-none' : 'bg-fg/[0.05]',
                          isTop && 'shadow-[0_0_10px_var(--brand-primary)]',
                        )}
                        style={
                          isLit
                            ? {
                                backgroundColor: isTop ? 'var(--brand-gleam)' : `color-mix(in oklab, var(--brand-primary) ${strength}%, transparent)`,
                                animationDelay: `${col * 24 + row * 16}ms`,
                              }
                            : undefined
                        }
                      >
                        {isTop && col === lastColumn && (
                          <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--brand-gleam) motion-reduce:hidden" />
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}

            <span
              className={cx(
                'pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] text-xs font-semibold whitespace-nowrap tabular-nums',
                hover === null ? 'text-primary' : 'rounded-full bg-elevated px-3 py-1 text-fg shadow-lg ring-1 ring-line-strong',
              )}
              style={{
                left: `clamp(56px, ${((focus + 0.5) / columns.length) * 100}%, calc(100% - 56px))`,
                top: `${(1 - focusLevel / MATRIX_ROWS) * 100}%`,
              }}
            >
              {hover === null ? (
                <>
                  <span aria-hidden="true">▴ </span>
                  {formatMoney(max, currency)}
                </>
              ) : (
                <>
                  <span className="text-fg-muted">{dayFormat.format(dayOf(columns[hover].index, series.length, endDaysAgo))} · </span>
                  {formatMoney(columns[hover].value, currency)}
                </>
              )}
            </span>
          </div>
        </div>

        <div aria-hidden="true" className="mt-9 flex h-[224px] w-[68px] shrink-0 flex-col justify-between border-l border-dashed border-line-strong pl-2 text-[10px] text-fg-subtle tabular-nums">
          <span>{formatMoney(max, currency)}</span>
          <span>{formatMoney((max + min) / 2, currency)}</span>
          <span>{formatMoney(min, currency)}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-between pr-[80px] text-xs text-fg-muted" suppressHydrationWarning>
        {labels.map((label, index) => (
          <span key={`${label}-${index}`} className={cx(index === labels.length - 1 && 'font-semibold text-fg')} suppressHydrationWarning>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: StageView; onChange: (view: StageView) => void }) {
  return (
    <div role="tablist" aria-label={translate('home.balanceActivity')} className="relative grid w-full grid-cols-2 rounded-full border border-line bg-surface/70 p-1 sm:w-[340px]">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] overflow-hidden rounded-full bg-primary shadow-[0_8px_24px_-8px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)] motion-reduce:transition-none',
          view === 'flow' && 'translate-x-full',
        )}
      >
        <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
      </span>
      {stageViews.map((item) => {
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cx(
              'relative z-10 flex h-9 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm',
              isActive ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={15} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface EquityChartCardProps {
  series?: number[];
  equity?: number;
  monthly?: FundsFlowPeriod[];
  yearly?: FundsFlowPeriod[];
  currency: string;
  className?: string;
}

/**
 * The dashboard's chart stage with the original chart options: balance / funds-flow switch, 7D–All presets,
 * a custom from–to range and the "showing" caption — drawn as the FinFlow-style equity card.
 */
export function EquityChartCard({ series, equity, monthly, yearly, currency, className }: EquityChartCardProps) {
  const [view, setView] = useState<StageView>('balance');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [preset, setPreset] = useState<RangePreset | 'custom'>('all');

  const balanceWindow = series ? sliceBalance(series, range) : undefined;
  const windowed = balanceWindow?.series;
  const monthlyInRange = monthly?.filter((period) => overlapsRange(period, 'month', range));
  const yearlyInRange = yearly?.filter((period) => overlapsRange(period, 'year', range));
  const caption = rangeCaption(range);

  const first = windowed?.[0];
  const last = windowed?.[windowed.length - 1];
  const change = first !== undefined && last !== undefined ? last - first : undefined;
  const changePct = change !== undefined && first ? (change / first) * 100 : undefined;
  const isUp = (change ?? 0) >= 0;

  function pickPreset(item: (typeof rangePresets)[number]) {
    setPreset(item.id);
    setRange(presetRange(item));
  }

  function pickCustom(next: DateRange) {
    setRange(next);
    setPreset(isAllTime(next) ? 'all' : 'custom');
  }

  let chart: ReactNode;
  if (windowed === undefined) chart = <div className="h-[268px] animate-pulse rounded-2xl bg-surface-2/60" />;
  else if (windowed.length < 2) chart = <p className="grid h-[268px] place-items-center text-sm text-fg-muted">{translate('home.noDataInRange')}</p>;
  else chart = <MatrixChart key={`${windowed.length}-${balanceWindow?.endDaysAgo}`} series={windowed} endDaysAgo={balanceWindow?.endDaysAgo ?? 0} currency={currency} />;

  return (
    <div className={cx('flex min-w-0 flex-col gap-4', className)}>
      <section
        aria-label={translate('home.balanceActivity')}
        className="orbit-card relative isolate flex animate-rise flex-col gap-5 p-5 [animation-delay:120ms] motion-reduce:animate-none sm:p-6"
      >
        {/* Only the glow is clipped, so the date picker's calendar can open past the card's edge. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
          <span className="absolute -top-24 left-1/3 size-72 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
        </span>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ViewSwitch view={view} onChange={setView} />
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/25">
            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            {translate('home.rangeShowing', { range: caption })}
          </p>
        </div>

        <div key={view} role="tabpanel" className="flex min-w-0 animate-rise flex-col gap-4 motion-reduce:animate-none">
          {view === 'balance' ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-full bg-[image:var(--brand-gradient)] text-base font-extrabold text-on-primary ring-4 ring-primary/15"
                  >
                    {currencySymbol(currency)}
                  </span>
                  <p className="text-2xl font-bold tracking-tight text-fg sm:text-[28px]">
                    <span className="text-fg-muted">
                      {currency} {ffText.equity} ={' '}
                    </span>
                    <CountUpMoney value={equity} currency={currency} />
                  </p>
                </div>
                {change !== undefined && (
                  <p className="text-sm font-semibold tabular-nums">
                    <span className="text-fg">
                      {isUp ? '+' : '−'}
                      {formatMoney(Math.abs(change), currency)}
                    </span>{' '}
                    <span className={isUp ? 'text-success' : 'text-danger'}>
                      ({changePct === undefined ? '—' : `${isUp ? '' : '−'}${Math.abs(changePct).toFixed(1)}%`})
                    </span>
                  </p>
                )}
              </div>
              {chart}
            </>
          ) : (
            <FundsFlowPanel monthly={monthlyInRange} yearly={yearlyInRange} currency={currency} bare />
          )}
        </div>
      </section>

      <div role="group" aria-label={translate('home.dateFilter')} className="flex animate-rise flex-wrap items-center gap-2 [animation-delay:200ms] motion-reduce:animate-none">
        <div className="grid min-w-0 flex-1 basis-[320px] grid-cols-5 gap-2">
          {rangePresets.map((item) => {
            const isActive = preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => pickPreset(item)}
                className={cx(
                  'h-10 rounded-full text-xs font-semibold whitespace-nowrap tabular-nums transition-[background-color,color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                  isActive
                    ? 'bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)]'
                    : 'bg-surface-2 text-fg-muted ring-1 ring-line hover:-translate-y-0.5 hover:text-fg',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <DateRangePicker
          value={range}
          onChange={pickCustom}
          fromLabel={translate('home.rangeFrom')}
          toLabel={translate('home.rangeTo')}
          align="end"
          className={cx('min-w-0 flex-1 sm:flex-none', preset === 'custom' && 'rounded-full ring-1 ring-primary/50')}
        />
      </div>
    </div>
  );
}

// Period starts are calendar dates, so they are formatted in UTC to read the same on server and client.
const overviewMonthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const flowTones = {
  in: {
    chip: 'bg-primary-soft text-primary ring-primary/25',
    ping: 'ring-primary/40',
    glow: 'bg-primary/25',
    bar: 'bg-linear-to-r from-primary/60 to-primary shadow-[0_0_10px_var(--brand-primary)]',
  },
  out: {
    chip: 'bg-(--brand-accent)/15 text-(--brand-accent) ring-(--brand-accent)/25',
    ping: 'ring-(--brand-accent)/40',
    glow: 'bg-(--brand-accent)/25',
    bar: 'bg-linear-to-r from-(--brand-accent)/60 to-(--brand-accent) shadow-[0_0_10px_var(--brand-accent)]',
  },
} as const;

interface FlowTileProps {
  icon: IconName;
  label: string;
  value: number;
  previous?: number;
  currency: string;
  tone: keyof typeof flowTones;
  delay: number;
}

/** One side of the month's flow, measured against the same side of last month. */
function FlowTile({ icon, label, value, previous, currency, tone, delay }: FlowTileProps) {
  const palette = flowTones[tone];
  const change = previous ? ((value - previous) / previous) * 100 : undefined;
  // More money in is good; more money out is not.
  const isGood = change === undefined ? undefined : tone === 'in' ? change >= 0 : change <= 0;
  const peak = Math.max(value, previous ?? 0, 1);
  const bars = [
    { label: ffText.thisMonth, amount: value, active: true },
    { label: ffText.lastMonth, amount: previous ?? 0, active: false },
  ];

  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className="group relative isolate flex min-w-0 animate-rise flex-col gap-4 overflow-hidden rounded-[22px] border border-line bg-surface-2/70 p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_40px_-30px_var(--brand-primary)] motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className={cx('pointer-events-none absolute -top-12 -right-12 -z-10 size-32 rounded-full opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-100', palette.glow)}
      />

      <span className="flex items-center justify-between gap-2">
        <span className={cx('relative grid size-10 place-items-center rounded-2xl ring-1', palette.chip)}>
          <span aria-hidden="true" className={cx('absolute inset-0 animate-ping-soft rounded-2xl ring-1 motion-reduce:hidden', palette.ping)} />
          <Icon
            name={icon}
            size={18}
            className={cx('transition-transform duration-300 motion-reduce:transition-none', tone === 'in' ? 'group-hover:translate-y-0.5' : 'group-hover:-translate-y-0.5')}
          />
        </span>
        {change !== undefined && (
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1',
              isGood ? 'bg-success/12 text-success ring-success/25' : 'bg-danger/12 text-danger ring-danger/25',
            )}
          >
            <Icon name={change >= 0 ? 'trendUp' : 'trendDown'} size={12} />
            {change >= 0 ? '+' : '−'}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-xs font-medium text-fg-muted">{label}</span>
        <CountUpMoney value={value} currency={currency} className="mt-0.5 block truncate text-2xl font-bold tracking-tight text-fg" centsClassName="text-fg-subtle" />
      </span>

      <span className="flex flex-col gap-2">
        {bars.map((bar, index) => (
          <span key={bar.label} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2 text-[10px] text-fg-muted">
            <span className={cx(bar.active && 'font-semibold text-fg')}>{bar.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-fg/[0.07]" title={formatMoney(bar.amount, currency)}>
              <span
                className={cx('block h-full origin-left animate-grow rounded-full motion-reduce:animate-none', bar.active ? palette.bar : 'bg-fg/25')}
                style={{ width: `${(bar.amount / peak) * 100}%`, animationDelay: `${delay + 200 + index * 120}ms` }}
              />
            </span>
          </span>
        ))}
      </span>
    </li>
  );
}

interface OverviewTilesProps {
  monthlyFlows?: FundsFlowPeriod[];
  transactions?: Transaction[];
  currency: string;
  className?: string;
}

export function OverviewTiles({ monthlyFlows, transactions, currency, className }: OverviewTilesProps) {
  const current = monthlyFlows?.[monthlyFlows.length - 1];
  const previous = monthlyFlows?.[monthlyFlows.length - 2];
  const net = current ? current.deposits - current.withdrawals : undefined;
  const moved = current ? current.deposits + current.withdrawals : 0;
  const inShare = moved > 0 && current ? Math.round((current.deposits / moved) * 100) : 0;
  const outShare = moved > 0 ? 100 - inShare : 0;
  const topWithdrawal = transactions
    ?.filter((transaction) => transaction.type === 'withdrawal')
    .reduce<Transaction | undefined>((top, transaction) => (!top || transaction.amount > top.amount ? transaction : top), undefined);
  const topDate = topWithdrawal ? new Date(topWithdrawal.createdAt) : undefined;

  return (
    <section aria-labelledby="ff-overview-title" className={cx('flex min-w-0 flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 id="ff-overview-title" className="flex items-center gap-3 text-base font-bold text-fg">
          <span aria-hidden="true" className="h-5 w-[3px] rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
          {ffText.overview}
        </h3>
        <KebabLink href="/history" />
      </div>

      {current === undefined ? (
        <div className="flex flex-col gap-3">
          <div className="h-40 animate-pulse rounded-[24px] bg-surface-2/70" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-44 animate-pulse rounded-[22px] bg-surface-2/70" />
            <div className="h-44 animate-pulse rounded-[22px] bg-surface-2/70" />
          </div>
        </div>
      ) : (
        <>
          <div className="relative isolate animate-rise overflow-hidden rounded-[24px] border border-primary/25 bg-linear-to-br from-primary/18 via-surface-2/80 to-surface p-5 [animation-delay:200ms] motion-reduce:animate-none">
            <CardOrbits className="text-primary/15" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 -z-10 size-48 animate-glow rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />

            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-fg-muted uppercase">
                <Icon name="bank" size={14} className="text-primary" />
                {ffText.savings}
              </span>
              <span className="rounded-full bg-surface/70 px-3 py-1 text-[11px] font-medium text-fg-muted ring-1 ring-line backdrop-blur-sm">
                {overviewMonthFormat.format(new Date(current.start))}
              </span>
            </div>

            <CountUpMoney
              value={net ?? 0}
              currency={currency}
              signed
              className={cx('relative mt-3 block text-[34px] leading-none font-extrabold tracking-[-0.03em]', (net ?? 0) >= 0 ? 'text-success' : 'text-danger')}
              centsClassName="opacity-50"
            />

            <div
              role="img"
              aria-label={`${ffText.moneyIn} ${inShare}% · ${ffText.moneyOut} ${outShare}%`}
              className="relative mt-5 flex h-3 gap-1 overflow-hidden rounded-full bg-fg/[0.07]"
            >
              <span className="h-full origin-left animate-grow rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)] motion-reduce:animate-none" style={{ width: `${inShare}%` }} />
              <span
                className="h-full origin-left animate-grow rounded-full bg-(--brand-accent) [animation-delay:250ms] motion-reduce:animate-none"
                style={{ width: `${outShare}%` }}
              />
              <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            </div>
            <div className="relative mt-2.5 flex items-center justify-between text-[11px] text-fg-muted tabular-nums">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
                {ffText.moneyIn} <b className="font-semibold text-fg">{inShare}%</b>
              </span>
              <span className="flex items-center gap-1.5">
                {ffText.moneyOut} <b className="font-semibold text-fg">{outShare}%</b>
                <span aria-hidden="true" className="size-2 rounded-full bg-(--brand-accent)" />
              </span>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FlowTile icon="deposit" label={ffText.income} tone="in" value={current.deposits} previous={previous?.deposits} currency={currency} delay={300} />
            <FlowTile icon="withdrawal" label={ffText.expenses} tone="out" value={current.withdrawals} previous={previous?.withdrawals} currency={currency} delay={380} />
          </ul>

          <div className="group flex animate-rise items-center gap-4 rounded-[22px] border border-dashed border-line-strong p-3.5 transition-colors duration-300 [animation-delay:460ms] hover:border-danger/40 motion-reduce:animate-none">
            <span aria-hidden="true" className="flex w-14 shrink-0 flex-col overflow-hidden rounded-2xl bg-surface-2 text-center ring-1 ring-line transition-transform duration-300 group-hover:-rotate-3">
              <span className="bg-danger/85 py-0.5 text-[9px] font-bold tracking-widest text-white uppercase">{topDate ? weekdayFormat.format(topDate) : '—'}</span>
              <span className="py-1.5 text-xl font-extrabold text-fg tabular-nums">{topDate ? topDate.getDate() : '—'}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-fg-muted">{ffText.topSpend}</span>
              {topWithdrawal ? (
                <span className="mt-0.5 block truncate text-lg font-bold text-danger tabular-nums">{formatMoney(topWithdrawal.amount, topWithdrawal.currency)}</span>
              ) : (
                <span className="mt-0.5 block text-sm font-medium text-fg-subtle">{ffText.noSpend}</span>
              )}
            </span>
            <Icon name="calendar" size={18} className="shrink-0 text-fg-subtle transition-colors group-hover:text-danger" />
          </div>
        </>
      )}
    </section>
  );
}
