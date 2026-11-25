'use client';

import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { FundsFlowPeriod } from '@/core/types';
import { cx } from '../lib/cx';
import { DateRangePicker, addDays, fromKey, toKey, type DateRange } from '../ui/DateRangePicker';
import { Icon, type IconName } from '../ui/Icon';
import { smoothPath, useMeasuredWidth } from './chartGeometry';
import { FundsFlowPanel } from './FundsFlowPanel';
import { CountUpMoney, currencySymbol, ffText } from './finflowParts';

const balanceStage = { icon: 'areaChart', label: translate('home.balanceActivity') } as const satisfies { icon: IconName; label: string };
const flowStage = { icon: 'transfer', label: translate('home.fundsActivity') } as const satisfies { icon: IconName; label: string };

type RangePreset = '7d' | '30d' | '3m' | '1y' | 'all';

const rangePresets: { id: RangePreset; label: string; days?: number; months?: number }[] = [
  { id: '7d', label: translate('home.range7d'), days: 7 },
  { id: '30d', label: translate('home.range30d'), days: 30 },
  { id: '3m', label: translate('home.range3m'), months: 3 },
  { id: '1y', label: translate('home.range1y'), months: 12 },
  { id: 'all', label: translate('home.rangeAll') },
];

const ALL_TIME: DateRange = { from: '', to: '' };

const AREA_HEIGHT = 260;
const AREA_PAD_TOP = 34;
const AREA_SPOT_WIDTH = 110;
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

function dayOf(index: number, length: number, endDaysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - endDaysAgo - (length - 1 - index));
  return date;
}

/**
 * Equity as a smooth glowing ridge: striped teal area under a monotone curve. The focused day (the peak until
 * the pointer moves) gets a spotlight inside the area, a dotted drop line, a ringed marker and a tooltip that
 * compares it with the window's start value.
 */
function AreaChart({ series, endDaysAgo, currency }: ChartProps) {
  const [frameRef, width] = useMeasuredWidth<HTMLDivElement>(640);
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');

  const count = series.length;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const pad = max === min ? Math.max(Math.abs(max) * 0.05, 1) : (max - min) * 0.1;
  const low = min - pad;
  const high = max + pad;
  const plotHeight = AREA_HEIGHT - AREA_PAD_TOP;
  const xAt = (index: number) => (count === 1 ? width / 2 : (index / (count - 1)) * width);
  const yAt = (value: number) => AREA_PAD_TOP + (1 - (value - low) / (high - low)) * plotHeight;

  const points = series.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const line = smoothPath(points);
  const area = `${line} L${width},${AREA_HEIGHT} L0,${AREA_HEIGHT} Z`;
  const peak = series.lastIndexOf(max);
  const focus = hover ?? peak;
  const focusPoint = points[focus];
  const startValue = series[0];
  const labels = axisLabels(count, endDaysAgo);
  const summary = `${formatMoney(series[0], currency)} → ${formatMoney(series[count - 1], currency)}`;
  const tooltipOnLeft = focusPoint.x > width * 0.62;
  const gridRows = [0.25, 0.5, 0.75].map((share) => AREA_PAD_TOP + share * plotHeight);
  const axisValues = [max, (max + min) / 2, min];

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const share = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
    setHover(Math.round(share * (count - 1)));
  }

  return (
    <div>
      <div className="flex gap-3">
        <div
          ref={frameRef}
          role="img"
          aria-label={summary}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
          className="relative min-w-0 flex-1 cursor-crosshair touch-pan-y"
          style={{ height: AREA_HEIGHT }}
        >
          <svg aria-hidden="true" width={width} height={AREA_HEIGHT} viewBox={`0 0 ${width} ${AREA_HEIGHT}`} className="absolute inset-0 block overflow-visible">
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--brand-primary)', stopOpacity: 0.34 }} />
                <stop offset="100%" style={{ stopColor: 'var(--brand-primary)', stopOpacity: 0.02 }} />
              </linearGradient>
              <pattern id={`${uid}-stripes`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
                <line x1="0" y1="0" x2="0" y2="12" strokeWidth="4" style={{ stroke: 'var(--brand-primary)', strokeOpacity: 0.1 }} />
              </pattern>
              <linearGradient id={`${uid}-spot`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--brand-gleam)', stopOpacity: 0.55 }} />
                <stop offset="70%" style={{ stopColor: 'var(--brand-primary)', stopOpacity: 0.08 }} />
                <stop offset="100%" style={{ stopColor: 'var(--brand-primary)', stopOpacity: 0 }} />
              </linearGradient>
              <radialGradient id={`${uid}-spot-edge`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" style={{ stopColor: '#fff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#fff', stopOpacity: 0 }} />
              </radialGradient>
              <mask id={`${uid}-spot-mask`}>
                <rect x={-AREA_SPOT_WIDTH / 2} y="0" width={AREA_SPOT_WIDTH} height={AREA_HEIGHT} fill={`url(#${uid}-spot-edge)`} />
              </mask>
              <clipPath id={`${uid}-clip`}>
                <path d={area} />
              </clipPath>
            </defs>

            {gridRows.map((y) => (
              <line key={y} x1="0" x2={width} y1={y} y2={y} strokeDasharray="3 6" style={{ stroke: 'var(--border-strong)', strokeOpacity: 0.7 }} />
            ))}
            {labels.map((label, tick) => {
              const x = labels.length === 1 ? width / 2 : (tick / (labels.length - 1)) * width;
              return <line key={`${label}-${tick}`} x1={x} x2={x} y1={AREA_PAD_TOP} y2={AREA_HEIGHT} strokeDasharray="3 6" style={{ stroke: 'var(--border-strong)', strokeOpacity: 0.45 }} />;
            })}

            <g className="nova-fade">
              <path d={area} fill={`url(#${uid}-fill)`} />
              <path d={area} fill={`url(#${uid}-stripes)`} />
            </g>

            {/* Spotlight lives inside the area only, so it reads as light pooling under the curve. */}
            <g clipPath={`url(#${uid}-clip)`}>
              <g style={{ transform: `translateX(${focusPoint.x}px)`, transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)' }}>
                <rect x={-AREA_SPOT_WIDTH / 2} y="0" width={AREA_SPOT_WIDTH} height={AREA_HEIGHT} fill={`url(#${uid}-spot)`} mask={`url(#${uid}-spot-mask)`} />
              </g>
            </g>

            <path
              d={line}
              fill="none"
              pathLength={1}
              strokeWidth="2.5"
              strokeLinecap="round"
              className="nova-draw"
              style={{ stroke: 'var(--brand-primary)', filter: 'drop-shadow(0 0 6px var(--brand-primary))' }}
            />

            <g style={{ transform: `translate(${focusPoint.x}px, 0)`, transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)' }}>
              <line x1="0" x2="0" y1={0} y2={AREA_HEIGHT} strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 6" style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.75 }} />
            </g>
            <circle
              cx={focusPoint.x}
              cy={focusPoint.y}
              r="6"
              strokeWidth="2.5"
              style={{ fill: 'var(--bg-surface)', stroke: 'var(--brand-gleam)', transition: 'cx 260ms cubic-bezier(.2,.8,.2,1), cy 260ms cubic-bezier(.2,.8,.2,1)' }}
            />
          </svg>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 flex items-stretch gap-3 rounded-xl bg-elevated/95 px-3 py-2 text-[11px] whitespace-nowrap shadow-lg ring-1 ring-line-strong backdrop-blur-md transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
            style={{
              left: tooltipOnLeft ? focusPoint.x - 14 : focusPoint.x + 14,
              top: Math.min(Math.max(focusPoint.y - 24, 0), AREA_HEIGHT - 64),
              transform: tooltipOnLeft ? 'translateX(-100%)' : undefined,
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-fg-muted" suppressHydrationWarning>
                <span className="size-1.5 rounded-full bg-primary" />
                {dayFormat.format(dayOf(focus, count, endDaysAgo))}
              </span>
              <span className="text-sm font-semibold text-fg tabular-nums">{formatMoney(series[focus], currency)}</span>
            </div>
            <span className="w-px bg-line-strong" />
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="size-1.5 rounded-full bg-(--brand-accent)" />
                {translate('home.chartStart')}
              </span>
              <span className="text-sm font-semibold text-fg tabular-nums">{formatMoney(startValue, currency)}</span>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="relative w-[68px] shrink-0 border-l border-dashed border-line-strong text-[10px] text-fg-subtle tabular-nums" style={{ height: AREA_HEIGHT }}>
          {axisValues.map((value, index) => (
            <span key={index} className="absolute left-2 -translate-y-1/2" style={{ top: yAt(value) }}>
              {formatMoney(value, currency)}
            </span>
          ))}
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

interface RangeFilterProps {
  caption: string;
  preset: RangePreset | 'custom';
  range: DateRange;
  onPreset: (item: (typeof rangePresets)[number]) => void;
  onCustom: (range: DateRange) => void;
}

/** The "Showing …" chip doubles as the range filter: it opens a small panel with the 7D–All presets and the custom from–to range. */
function RangeFilter({ caption, preset, range, onPreset, onCustom }: RangeFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: Event) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} data-filter-open={open || undefined} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        title={translate('home.dateFilter')}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'inline-flex h-8 items-center gap-2 rounded-full bg-primary-soft px-3 text-[11px] font-medium text-primary ring-1 ring-primary/25 transition-[background-color,box-shadow] hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          (open || preset === 'custom') && 'ring-primary/60',
        )}
      >
        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
        {caption}
        <Icon name="filter" size={12} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={translate('home.dateFilter')}
          className="absolute top-full right-0 z-30 mt-2 flex w-[min(340px,calc(100vw-3rem))] animate-rise flex-col gap-3 rounded-2xl bg-elevated p-3 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.7)] ring-1 ring-line-strong motion-reduce:animate-none"
        >
          <div className="grid grid-cols-5 gap-1.5">
            {rangePresets.map((item) => {
              const isActive = preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    onPreset(item);
                    setOpen(false);
                  }}
                  className={cx(
                    'h-8 rounded-full text-[11px] font-semibold whitespace-nowrap tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg-muted ring-1 ring-line hover:text-fg',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <DateRangePicker
            value={range}
            onChange={onCustom}
            fromLabel={translate('home.rangeFrom')}
            toLabel={translate('home.rangeTo')}
            align="end"
            className={cx('w-full', preset === 'custom' && 'rounded-full ring-1 ring-primary/50')}
          />
        </div>
      )}
    </div>
  );
}

interface StageHeaderProps {
  id: string;
  icon: IconName;
  title: string;
  filter: ReactNode;
}

function StageHeader({ id, icon, title, filter }: StageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-fg">
        <span aria-hidden="true" className="nova-gloss grid size-9 shrink-0 place-items-center rounded-full">
          <Icon name={icon} size={16} />
        </span>
        <span className="truncate">{title}</span>
      </h2>
      {filter}
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
 * The dashboard's chart stage: Balance Activity and Funds Activity as two separate cards (side by side once the
 * stage is wide enough). Both share one date range, set from the filter chip in either card's header.
 */
export function EquityChartCard({ series, equity, monthly, yearly, currency, className }: EquityChartCardProps) {
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [preset, setPreset] = useState<RangePreset | 'custom'>('all');

  const balanceWindow = series ? sliceBalance(series, range) : undefined;
  const windowed = balanceWindow?.series;
  const monthlyInRange = monthly?.filter((period) => overlapsRange(period, 'month', range));
  const yearlyInRange = yearly?.filter((period) => overlapsRange(period, 'year', range));
  const caption = translate('home.rangeShowing', { range: rangeCaption(range) });

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
  if (windowed === undefined) chart = <div className="h-[288px] animate-pulse rounded-2xl bg-surface-2/60" />;
  else if (windowed.length < 2) chart = <p className="grid h-[288px] place-items-center text-sm text-fg-muted">{translate('home.noDataInRange')}</p>;
  else chart = <AreaChart key={`${windowed.length}-${balanceWindow?.endDaysAgo}`} series={windowed} endDaysAgo={balanceWindow?.endDaysAgo ?? 0} currency={currency} />;

  // An open filter lifts its card (and the stage) above later cards, so the panel and calendar are never covered.
  const cardClass =
    'orbit-card nova-edge-light relative isolate flex min-w-0 animate-rise flex-col gap-5 p-5 has-[[data-filter-open]]:z-30 motion-reduce:animate-none sm:p-6';
  const filter = <RangeFilter caption={caption} preset={preset} range={range} onPreset={pickPreset} onCustom={pickCustom} />;

  return (
    <div className={cx('@container relative min-w-0 has-[[data-filter-open]]:z-30', className)}>
      <div className="grid h-full grid-cols-1 gap-4 @4xl:grid-cols-2">
        <section aria-labelledby="stage-balance-title" className={cx(cardClass, '[animation-delay:120ms]')}>
          {/* Only the glow is clipped, so nothing inside is cut at the card's edge. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <span className="absolute -top-24 left-1/3 size-72 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
          </span>

          <StageHeader id="stage-balance-title" icon={balanceStage.icon} title={balanceStage.label} filter={filter} />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[image:var(--brand-gradient)] text-base font-extrabold text-on-primary ring-4 ring-primary/15"
              >
                {currencySymbol(currency)}
              </span>
              <p className="min-w-0 text-2xl font-bold tracking-tight text-fg">
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
        </section>

        <section aria-labelledby="stage-flow-title" className={cx(cardClass, '[animation-delay:180ms]')}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <span className="absolute -right-16 -bottom-24 size-72 animate-drift rounded-full bg-(--brand-accent)/10 blur-3xl [animation-direction:alternate-reverse] motion-reduce:animate-none" />
          </span>

          <StageHeader id="stage-flow-title" icon={flowStage.icon} title={flowStage.label} filter={filter} />
          <FundsFlowPanel monthly={monthlyInRange} yearly={yearlyInRange} currency={currency} bare />
        </section>
      </div>
    </div>
  );
}