'use client';

import Link from 'next/link';
import { useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';
import '../promotion/market.css';
import './views.css';
import { disclaimerParagraphs } from './economicEvents';
import {
  ASSET_CLASSES,
  LOCAL_TIMEZONE_LABEL,
  technicalViews,
  type AssetClass,
  type Direction,
  type LevelKind,
  type TechnicalView,
  analysisCopy,
  getStorytellerStory,
  getTechnicalAnalysis,
  type AnalysisHorizon,
  type TechnicalAnalysis,
} from './technicalViews';
import { StorytellerPanel } from './StorytellerPanel';

type DirectionFilter = 'all' | Direction;

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

interface ChartSeries {
  candles: Candle[];
  closes: number[];
  ma20: number[];
  ma50: number[];
  bandUpper: number[];
  bandLower: number[];
  min: number;
  max: number;
  endPrice: number;
}

const DIRECTION_FILTERS: DirectionFilter[] = ['all', 'up', 'down'];
const CANDLE_COUNT = 56;
const LABEL_HEIGHT = 16;
const CHART = { width: 680, height: 320, top: 14, bottom: 26, left: 8, labelWidth: 66, projection: 76 };
const ROW_STEP = 7;
const DEPTH_ROWS = 5;
const SPARK_STRIDE = 2;

const directionFilterKey: Record<DirectionFilter, MessageKey> = {
  all: 'tc.tv.filter.all',
  up: 'tc.tv.bullish',
  down: 'tc.tv.bearish',
};

// Aurora palette: sage carries "up / resistance", clay carries "down / support"; pivot keeps the info tone.
const levelTone: Record<LevelKind, { line: string; label: string; text: string; chip: string; nameKey: MessageKey }> = {
  resistance: { line: 'stroke-(--hero-buy)', label: 'fill-(--hero-buy)', text: 'fill-[#062520]', chip: 'bg-(--hero-buy)', nameKey: 'tc.tv.resistance' },
  pivot: { line: 'stroke-info', label: 'fill-info', text: 'fill-white', chip: 'bg-info', nameKey: 'tc.tv.pivot' },
  last: { line: 'stroke-fg-muted', label: 'fill-fg', text: 'fill-surface', chip: 'bg-fg', nameKey: 'tc.tv.last' },
  support: { line: 'stroke-(--aurora-cta-from)', label: 'fill-(--aurora-cta-from)', text: 'fill-[#062520]', chip: 'bg-(--aurora-cta-from)', nameKey: 'tc.tv.support' },
};

const RED = 'var(--aurora-cta-from)';
const UP_TEXT = 'text-(--hero-buy)';
const DOWN_TEXT = 'text-(--aurora-cta-from)';
const UP_SOFT = 'bg-(--hero-buy)/15';
const DOWN_SOFT = 'bg-(--aurora-cta-from)/15';

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'grid shrink-0 place-items-center rounded-lg bg-(--hero-buy)/12 text-(--hero-buy) ring-1 ring-(--hero-buy)/25';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const pad2 = (value: number) => String(value).padStart(2, '0');

function toNumber(value: string): number {
  return Number.parseFloat(value.replace(/,/g, ''));
}

// Deterministic PRNG so the server and client draw the same illustrative chart for a symbol.
function seededRandom(seed: string): () => number {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function movingAverage(values: number[], window: number): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

function movingDeviation(values: number[], averages: number[], window: number): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1);
    const variance = slice.reduce((sum, value) => sum + (value - averages[index]) ** 2, 0) / slice.length;
    return Math.sqrt(variance);
  });
}

// Trading Central publishes levels, not the price history, so the candles are an illustrative bridge between the published levels.
function buildSeries(view: TechnicalView): ChartSeries {
  const random = seededRandom(view.id);
  const levelValues = view.levels.map((level) => toNumber(level.value));
  const levelMax = Math.max(...levelValues);
  const levelMin = Math.min(...levelValues);
  const span = levelMax - levelMin;
  const pivot = toNumber(view.pivot);
  const nearestResistance = Math.min(...view.levels.filter((level) => level.kind === 'resistance').map((level) => toNumber(level.value)));
  const nearestSupport = Math.max(...view.levels.filter((level) => level.kind === 'support').map((level) => toNumber(level.value)));
  const lastLevel = view.levels.find((level) => level.kind === 'last');

  const endPrice = lastLevel
    ? toNumber(lastLevel.value)
    : view.direction === 'down'
      ? (pivot + nearestSupport) / 2
      : (pivot + nearestResistance) / 2;
  const startPrice = view.direction === 'down' ? nearestResistance + span * 0.08 : nearestSupport - span * 0.04;

  const walk = [0];
  for (let index = 1; index < CANDLE_COUNT; index += 1) walk.push(walk[index - 1] + (random() - 0.5));
  const finalWalk = walk[CANDLE_COUNT - 1];
  const noiseScale = (span * 0.22) / (Math.sqrt(CANDLE_COUNT) * 0.5);

  const closes = walk.map((step, index) => {
    const progress = index / (CANDLE_COUNT - 1);
    return startPrice + (endPrice - startPrice) * progress + (step - progress * finalWalk) * noiseScale;
  });

  const candles = closes.map((close, index) => {
    const open = index === 0 ? close + (random() - 0.5) * span * 0.04 : closes[index - 1];
    return {
      open,
      close,
      high: Math.max(open, close) + random() * span * 0.035,
      low: Math.min(open, close) - random() * span * 0.035,
    };
  });

  const ma20 = movingAverage(closes, 10);
  const deviation = movingDeviation(closes, ma20, 10);
  const bandUpper = ma20.map((average, index) => average + deviation[index] * 2);
  const bandLower = ma20.map((average, index) => average - deviation[index] * 2);
  const ma50 = movingAverage(closes, 24);

  const rawMin = Math.min(levelMin, ...candles.map((candle) => candle.low), ...bandLower);
  const rawMax = Math.max(levelMax, ...candles.map((candle) => candle.high), ...bandUpper);
  const padding = (rawMax - rawMin) * 0.06;

  return { candles, closes, ma20, ma50, bandUpper, bandLower, min: rawMin - padding, max: rawMax + padding, endPrice };
}

const seriesById = new Map(technicalViews.map((view) => [view.id, buildSeries(view)]));

// Pushes overlapping price tags down so each stays readable, then shifts the stack up if it runs past the plot.
function stackLabels<T extends { lineY: number }>(items: T[], maxY: number): (T & { labelY: number })[] {
  const stacked = items.reduce<(T & { labelY: number })[]>((result, item) => {
    const previousY = result.at(-1)?.labelY ?? Number.NEGATIVE_INFINITY;
    return [...result, { ...item, labelY: Math.max(item.lineY, previousY + LABEL_HEIGHT + 1) }];
  }, []);
  const overflow = (stacked.at(-1)?.labelY ?? 0) - maxY;
  return overflow > 0 ? stacked.map((item) => ({ ...item, labelY: item.labelY - overflow })) : stacked;
}

function seriesFor(view: TechnicalView): ChartSeries {
  const series = seriesById.get(view.id);
  if (!series) throw new Error(`Missing chart series for ${view.id}`);
  return series;
}

function DirectionIcon({ direction, size = 16 }: { direction: Direction; size?: number }) {
  return <Icon name={direction === 'up' ? 'trendUp' : 'trendDown'} size={size} className={direction === 'up' ? UP_TEXT : DOWN_TEXT} />;
}

/** Solid sage order key with a light sweep; children usually end with a key slot. */
function InkButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'group/ink relative inline-flex h-12 items-center gap-3 overflow-hidden rounded-lg bg-(--hero-buy) pr-2 pl-2 text-sm font-semibold text-[#062520] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/30" />
      {children}
    </button>
  );
}

/** Square sage key with a ripple — the workstation's section marker. */
function SignalKey({ icon, size = 'size-11', iconSize = 15 }: { icon: IconName; size?: string; iconSize?: number }) {
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center', size)}>
      <span className="absolute inset-0 animate-ring-ripple rounded-lg border-2 border-(--hero-buy)/50 motion-reduce:hidden" />
      <span className={cx(beadClass, 'size-full')}>
        <Icon name={icon} size={iconSize} />
      </span>
    </span>
  );
}

/** Empty state: a flat "no signal" line with a clay blip sliding along it. */
function NoSignalEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <span aria-hidden="true" className="relative h-10 w-full max-w-xs">
        <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-fg/20" />
        <span className="tv-blip absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-(--aurora-cta-from) ring-4 ring-app" />
      </span>
      <SignalKey icon="pieChart" />
      <p className="text-sm font-medium text-fg">{message}</p>
    </div>
  );
}

/** Close prices as thin columns rising from the baseline; the newest column is clay. */
function DotSparkline({ view }: { view: TechnicalView }) {
  const { closes } = seriesFor(view);
  const sampled = closes.filter((_, index) => index % SPARK_STRIDE === 0 || index === closes.length - 1);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const isUp = view.direction === 'up';
  const barWidth = 112 / sampled.length;

  return (
    <svg viewBox="0 0 112 30" preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
      {sampled.map((value, index) => {
        const isLast = index === sampled.length - 1;
        const height = 4 + ((value - min) / (max - min || 1)) * 24;
        return (
          <rect
            key={index}
            x={index * barWidth + 0.4}
            y={30 - height}
            width={Math.max(barWidth - 0.8, 0.6)}
            height={height}
            rx="0.6"
            style={isLast ? { fill: RED } : undefined}
            className={cx(!isLast && (isUp ? 'fill-(--hero-buy)/55' : 'fill-(--aurora-cta-from)/45'))}
          />
        );
      })}
    </svg>
  );
}

function SentimentSide({ direction, count }: { direction: Direction; count: number }) {
  const isUp = direction === 'up';
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', !isUp && 'items-end text-right')}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
        <span aria-hidden="true" className={cx('grid size-6 place-items-center rounded-md', isUp ? UP_SOFT : DOWN_SOFT)}>
          <DirectionIcon direction={direction} size={12} />
        </span>
        {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
      </span>
      <span className={cx('font-mono text-5xl leading-none font-black tracking-tighter tabular-nums', isUp ? UP_TEXT : DOWN_TEXT)}>
        <CountUp value={count} format={(current) => String(Math.round(current))} />
      </span>
    </div>
  );
}

/** Bulls vs bears as an order-book depth: bull bids grow left from the mid line, bear offers grow right; each row breathes. */
function SentimentPanel({ bullish, bearish }: { bullish: number; bearish: number }) {
  const total = bullish + bearish;
  const ratio = total > 0 ? bullish / total : 0.5;

  return (
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col justify-between gap-5 p-5 sm:p-6 motion-reduce:animate-none')}>
      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" className="mkt-blink size-1.5 rounded-[2px] bg-(--aurora-cta-from)" />
          {translate('tc.tv.sentiment')}
        </p>
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="signalBars" size={14} />
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <SentimentSide direction="up" count={bullish} />
        <span className="rounded-md bg-fg/[0.05] px-2 py-1 font-mono text-xs font-bold text-fg tabular-nums ring-1 ring-line">{Math.round(ratio * 100)}%</span>
        <SentimentSide direction="down" count={bearish} />
      </div>

      <div aria-hidden="true" className="relative flex flex-col gap-1">
        {Array.from({ length: DEPTH_ROWS }, (_, row) => {
          const taper = 1 - row * 0.16;
          const rowStyle = (share: number): CSSProperties =>
            ({ width: `${Math.max(4, share * 100 * taper)}%`, opacity: 1 - row * 0.13, '--tv-delay': `${row * 0.18}s` }) as CSSProperties;
          return (
            <div key={row} className="grid grid-cols-2 gap-1.5">
              <span className="flex h-3.5 justify-end">
                <span style={rowStyle(ratio)} className="tv-depth tv-depth-bull rounded-l-[2px] bg-(--hero-buy) transition-[width] duration-700 motion-reduce:transition-none" />
              </span>
              <span className="flex h-3.5">
                <span style={rowStyle(1 - ratio)} className="tv-depth tv-depth-bear rounded-r-[2px] bg-(--aurora-cta-from) transition-[width] duration-700 motion-reduce:transition-none" />
              </span>
            </div>
          );
        })}
        <span className="absolute -top-2 -bottom-2 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-fg/60" />
      </div>
    </section>
  );
}

/** Market selector desk: eyebrow, title, subtitle and the asset-class keys with their setup counts. */
function IntroCard({ assetClass, onAssetChange }: { assetClass: AssetClass; onAssetChange: (value: AssetClass) => void }) {
  return (
    <section className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-5 p-5 sm:p-6 motion-reduce:animate-none')}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="mkt-sweep absolute inset-y-0 w-32 -skew-x-12 bg-white/[0.04]" />
      </span>
      <p className="inline-flex w-fit items-center gap-2 rounded-md bg-(--hero-buy)/12 py-1 pr-2.5 pl-1.5 text-xs font-semibold text-(--hero-buy) ring-1 ring-(--hero-buy)/30">
        <LiveDot />
        {translate('tc.tv.eyebrow')}
      </p>
      <h2 className="text-4xl leading-[0.95] font-black tracking-tighter text-fg sm:text-5xl">{translate('nav.tcTechnicalViews')}</h2>
      <p className="max-w-xl border-l-2 border-(--hero-buy) pl-4 text-sm leading-relaxed text-fg-muted">{translate('tc.tv.subtitle')}</p>

      <div role="tablist" className="mt-auto flex flex-wrap gap-2">
        {ASSET_CLASSES.map((item) => {
          const isActive = item === assetClass;
          const count = technicalViews.filter((view) => view.assetClass === item).length;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onAssetChange(item)}
              className={cx(
                'group/asset inline-flex items-center gap-2.5 rounded-lg py-1 pr-1 pl-3.5 text-sm font-bold ring-1 transition-[background-color,color,translate,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none',
                isActive ? 'bg-(--hero-buy) text-[#062520] ring-(--hero-buy)' : 'bg-fg/[0.03] text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              {translate(`tc.tv.asset.${item}`)}
              <span
                className={cx(
                  'grid h-8 min-w-8 place-items-center rounded-md px-1.5 font-mono text-[11px] tabular-nums transition-transform duration-300 group-hover/asset:-translate-y-0.5',
                  isActive ? 'bg-[#062520]/15' : 'bg-fg/[0.06]',
                )}
              >
                {pad2(count)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** All / bullish / bearish as a tab strip with a clay underline that slides to the active filter. */
function FilterSwitch({ value, onChange }: { value: DirectionFilter; onChange: (value: DirectionFilter) => void }) {
  const activeIndex = Math.max(0, DIRECTION_FILTERS.indexOf(value));
  return (
    <div className="relative grid grid-cols-3 border-b border-line">
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute -bottom-px left-0 h-0.5 w-1/3 bg-(--aurora-cta-from) transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
      />
      {DIRECTION_FILTERS.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={cx(
              'flex items-center justify-center gap-1.5 rounded-t-md py-2 text-xs font-bold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:scale-95',
              isActive ? 'bg-fg/[0.05] text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option !== 'all' && <Icon name={option === 'up' ? 'trendUp' : 'trendDown'} size={13} className={option === 'up' ? UP_TEXT : DOWN_TEXT} />}
            {translate(directionFilterKey[option])}
          </button>
        );
      })}
    </div>
  );
}

/** Watchlist: ruled quote rows, a direction edge on each, sparkline below; the open row gets a blinking clay cursor. */
function SetupRail({
  views,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: {
  views: TechnicalView[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  filter: DirectionFilter;
  onFilterChange: (filter: DirectionFilter) => void;
}) {
  return (
    <aside style={staggerStyle(2, 160)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col xl:sticky xl:top-24 motion-reduce:animate-none')}>
      <div className="flex items-center gap-3 p-4 pb-3">
        <SignalKey icon="pieChart" size="size-10" iconSize={14} />
        <h2 className="min-w-0 flex-1 truncate text-lg font-black text-fg">{translate('tc.tv.signals')}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-fg/[0.05] py-1 pr-2.5 pl-1 font-mono text-[11px] text-fg-muted tabular-nums">
          <span className="grid size-5 place-items-center rounded bg-(--aurora-cta-from) text-[10px] font-black text-[#062520]">{views.length}</span>
          {translate('tc.tv.setups')}
        </span>
      </div>

      <div className="px-4">
        <FilterSwitch value={filter} onChange={onFilterChange} />
      </div>

      {views.length === 0 ? (
        <div className="p-4">
          <NoSignalEmpty message={translate('tc.tv.emptyFilter')} />
        </div>
      ) : (
        <ol className="flex flex-col py-1 xl:max-h-[42rem] xl:overflow-y-auto xl:[scrollbar-width:thin]">
          {views.map((view, index) => {
            const isSelected = view.id === selectedId;
            const isUp = view.direction === 'up';
            return (
              <li key={view.id} style={staggerStyle(index, 50)} className="animate-feed-in border-b border-dashed border-line last:border-b-0 motion-reduce:animate-none">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(view.id)}
                  className={cx(
                    'group relative flex w-full flex-col gap-2 py-3 pr-4 pl-5 text-left transition-[background-color] duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:scale-[0.995] motion-reduce:transition-none',
                    isSelected ? 'bg-(--hero-buy)/10' : 'hover:bg-fg/[0.03]',
                  )}
                >
                  <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', isUp ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)', !isSelected && 'opacity-40')} />
                  {isSelected && <span aria-hidden="true" className="mkt-blink absolute top-3 left-2 h-4 w-1 rounded-[1px] bg-(--aurora-cta-from)" />}
                  <span className="flex items-center gap-3">
                    <span
                      className={cx(
                        'grid size-9 shrink-0 place-items-center rounded-md transition-transform duration-300 group-hover:-rotate-6',
                        isSelected ? (isUp ? 'bg-(--hero-buy) text-[#062520]' : 'bg-(--aurora-cta-from) text-[#062520]') : isUp ? cx(UP_SOFT, UP_TEXT) : cx(DOWN_SOFT, DOWN_TEXT),
                      )}
                    >
                      <Icon name={isUp ? 'trendUp' : 'trendDown'} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-sm font-black text-fg">{view.symbol}</span>
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-fg-subtle ring-1 ring-line">{view.timeframe}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-fg-subtle">
                        <Icon name="clock" size={11} />
                        {view.localTime} ({LOCAL_TIMEZONE_LABEL})
                      </span>
                    </span>
                    <span className={cx('shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums', isUp ? cx(UP_SOFT, UP_TEXT) : cx(DOWN_SOFT, DOWN_TEXT))}>{view.move}</span>
                  </span>
                  <DotSparkline view={view} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

/** Candles print in one after another, MAs fade over a dot field, a scan line keeps crossing the plot; levels tag the right axis. */
function TechnicalChart({ view }: { view: TechnicalView }) {
  const series = seriesFor(view);
  const plotRight = CHART.width - CHART.labelWidth - 6;
  const candleRight = plotRight - CHART.projection;
  const plotBottom = CHART.height - CHART.bottom;
  const priceToY = (price: number) => CHART.top + ((series.max - price) / (series.max - series.min)) * (plotBottom - CHART.top);
  const step = (candleRight - CHART.left) / series.candles.length;
  const indexToX = (index: number) => CHART.left + step * (index + 0.5);
  const linePath = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'}${indexToX(index).toFixed(1)},${priceToY(value).toFixed(1)}`).join(' ');
  const bandPath = `${linePath(series.bandUpper)} ${series.bandLower
    .map((value, index) => ({ value, index }))
    .reverse()
    .map(({ value, index }) => `L${indexToX(index).toFixed(1)},${priceToY(value).toFixed(1)}`)
    .join(' ')} Z`;

  const rowCount = Math.floor((plotBottom - CHART.top) / ROW_STEP);
  const wickWidth = Math.max(Math.min(step * 0.18, 1.6), 1);
  const bodyWidth = Math.max(Math.min(step * 0.7, 6), 2);

  const endX = indexToX(series.candles.length - 1);
  const endY = priceToY(series.endPrice);
  const targetX = plotRight - 10;
  const targetY = priceToY(toNumber(view.target));
  const isUp = view.direction === 'up';
  const patternId = `tv-dots-${view.id}`;

  const labels = stackLabels(
    view.levels.map((level) => ({ level, lineY: priceToY(toNumber(level.value)) })),
    plotBottom - LABEL_HEIGHT / 2,
  );

  const axisPositions =
    view.axisLabels.length === 1
      ? [candleRight - 36]
      : view.axisLabels.map((_, index) => CHART.left + ((candleRight - CHART.left) * (index + 0.6)) / view.axisLabels.length);

  return (
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="h-auto w-full" role="img" aria-label={`${view.symbol} ${translate('tc.tv.chart')}`}>
      <defs>
        <pattern id={patternId} x={CHART.left} y={CHART.top} width={step * 2} height={ROW_STEP * 2} patternUnits="userSpaceOnUse">
          <rect x={step - 0.9} y={ROW_STEP - 0.9} width="1.8" height="1.8" rx="0.4" className="fill-fg/15" />
        </pattern>
      </defs>

      <rect x={CHART.left} y={CHART.top} width={plotRight - CHART.left} height={rowCount * ROW_STEP} fill={`url(#${patternId})`} />
      <rect x={candleRight} y={CHART.top} width={plotRight - candleRight} height={plotBottom - CHART.top} rx="6" className="fill-(--hero-buy)/[0.05]" />
      <line x1={CHART.left} x2={plotRight} y1={plotBottom} y2={plotBottom} strokeWidth="1" className="stroke-line-strong" />
      {view.axisLabels.map((label, index) => (
        <text key={label} x={axisPositions[index]} y={CHART.height - 8} textAnchor="middle" className="fill-fg-subtle font-mono text-[10px]">
          {label}
        </text>
      ))}

      {labels.map(({ level, lineY }) => (
        <line
          key={`line-${level.kind}-${level.value}`}
          x1={CHART.left}
          x2={plotRight}
          y1={lineY}
          y2={lineY}
          strokeWidth={level.kind === 'pivot' || level.kind === 'last' ? 1.4 : 1}
          strokeDasharray="6 4"
          className={cx(levelTone[level.kind].line, 'opacity-70')}
        />
      ))}

      <path d={bandPath} className="animate-fade fill-fg/[0.05] motion-reduce:animate-none" />
      {series.candles.map((candle, index) => {
        const rising = candle.close >= candle.open;
        const x = indexToX(index);
        const highY = priceToY(candle.high);
        const lowY = priceToY(candle.low);
        const bodyTop = priceToY(Math.max(candle.open, candle.close));
        const bodyHeight = Math.max(priceToY(Math.min(candle.open, candle.close)) - bodyTop, 2);
        return (
          <g key={index} style={{ '--tv-delay': `${index * 22}ms` } as CSSProperties} className="tv-candle">
            <rect x={x - wickWidth / 2} y={highY} width={wickWidth} height={Math.max(lowY - highY, wickWidth)} className={rising ? 'fill-(--hero-buy)/70' : 'fill-(--aurora-cta-from)/70'} />
            <rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} rx="1" className={rising ? 'fill-(--hero-buy)' : 'fill-(--aurora-cta-from)'} />
          </g>
        );
      })}
      <g className="animate-fade motion-reduce:animate-none">
        <path d={linePath(series.ma20)} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-fg" />
        <path d={linePath(series.ma50)} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" className="stroke-info" />
      </g>

      <g style={{ '--tv-scan-distance': `${(candleRight - CHART.left).toFixed(1)}px` } as CSSProperties} className="tv-scan">
        <rect x={CHART.left - 4} y={CHART.top} width="8" height={plotBottom - CHART.top} className="fill-(--hero-buy)/10" />
        <line x1={CHART.left} x2={CHART.left} y1={CHART.top} y2={plotBottom} strokeWidth="1.2" strokeDasharray="3 3" className="stroke-(--hero-buy)" />
      </g>

      <g className="animate-fade motion-reduce:animate-none">
        <path
          d={`M${endX.toFixed(1)},${endY.toFixed(1)} H${(endX + CHART.projection * 0.35).toFixed(1)} V${targetY.toFixed(1)} H${targetX.toFixed(1)}`}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray="4 5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: RED }}
          className="zenith-flow"
        />
        <rect x={targetX - 8} y={targetY - 8} width="16" height="16" rx="3" fill="none" strokeWidth="1.5" className={isUp ? 'stroke-(--hero-buy)' : 'stroke-(--aurora-cta-from)'} />
        <rect x={targetX - 4} y={targetY - 4} width="8" height="8" rx="1.5" className={isUp ? 'fill-(--hero-buy)' : 'fill-(--aurora-cta-from)'} />

        <rect x={endX - 6} y={endY - 6} width="12" height="12" rx="3" style={{ fill: RED }} />
        <rect x={endX - 6} y={endY - 6} width="12" height="12" rx="3" fill="none" strokeWidth="2" style={{ stroke: RED }} className="motion-reduce:hidden">
          <animate attributeName="x" values={`${endX - 6};${endX - 16}`} dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="y" values={`${endY - 6};${endY - 16}`} dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="width" values="12;32" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="height" values="12;32" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />
        </rect>
        <rect x={endX - 2} y={endY - 2} width="4" height="4" rx="1" className="fill-white" />

        {labels.map(({ level, lineY, labelY }) => (
          <g key={`label-${level.kind}-${level.value}`}>
            {Math.abs(labelY - lineY) > 1 && <line x1={plotRight} x2={plotRight + 4} y1={lineY} y2={labelY} strokeDasharray="1 2" className={levelTone[level.kind].line} />}
            <path
              d={`M${plotRight + 4},${labelY} l6,${-LABEL_HEIGHT / 2} h${CHART.labelWidth - 10} v${LABEL_HEIGHT} h${-(CHART.labelWidth - 10)} Z`}
              className={levelTone[level.kind].label}
            />
            <text x={plotRight + 7 + (CHART.labelWidth - 4) / 2} y={labelY + 3.5} textAnchor="middle" className={cx('font-mono text-[10px] font-semibold', levelTone[level.kind].text)}>
              {level.value}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** The three horizons as a chart toolbar: each key shows its call; the active one carries a sage underline. */
function HorizonTrack({ horizons, value, onChange }: { horizons: TechnicalAnalysis['horizons']; value: AnalysisHorizon; onChange: (horizon: AnalysisHorizon) => void }) {
  return (
    <div role="tablist" aria-label="Analysis horizon" className="grid grid-cols-3 border-b border-dashed border-line">
      {horizons.map((horizon, index) => {
        const isActive = horizon.id === value;
        const isUp = horizon.direction === 'up';
        return (
          <button
            key={horizon.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(horizon.id)}
            style={staggerStyle(index, 80)}
            className={cx(
              'group relative flex min-w-0 animate-feed-in items-center justify-between gap-2 border-r border-dashed border-line px-4 py-3 text-left transition-[background-color] duration-300 last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:animate-none sm:px-5',
              isActive ? 'bg-(--hero-buy)/[0.08]' : 'hover:bg-fg/[0.03]',
            )}
          >
            <span aria-hidden="true" className={cx('absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-colors duration-300', isActive ? 'bg-(--hero-buy)' : 'bg-transparent')}>
              {isActive && <span className="mkt-sweep absolute inset-y-0 w-10 bg-white/60" />}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className={cx('truncate text-[10.5px] font-semibold tracking-[0.14em] uppercase', isActive ? 'text-fg' : 'text-fg-subtle')}>{horizon.label}</span>
              <span className={cx('font-mono text-xl leading-none font-black tracking-tight tabular-nums', isUp ? UP_TEXT : DOWN_TEXT)}>{horizon.move}</span>
            </span>
            <span
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-md transition-transform duration-300 group-hover:-translate-y-0.5',
                isActive ? (isUp ? 'bg-(--hero-buy) text-[#062520]' : 'bg-(--aurora-cta-from) text-[#062520]') : isUp ? cx(UP_SOFT, UP_TEXT) : cx(DOWN_SOFT, DOWN_TEXT),
              )}
            >
              <Icon name={isUp ? 'trendUp' : 'trendDown'} size={14} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Analyst note: headline, three key-level quote cells, the storyteller key, and a trade-plan rail (preference → alternative → comment). */
function AnalysisPanel({ view, analysis }: { view: TechnicalView; analysis: TechnicalAnalysis }) {
  const story = getStorytellerStory(view);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const isUp = view.direction === 'up';
  const keyLevels = [
    { label: analysisCopy.targetLabel, value: view.target, className: isUp ? UP_TEXT : DOWN_TEXT, showArrow: true },
    { label: analysisCopy.pivotLabel, value: view.pivot, className: 'text-info', showArrow: false },
    {
      label: analysis.keyLevel.kind === 'resistance' ? analysisCopy.resistanceLabel : analysisCopy.supportLabel,
      value: analysis.keyLevel.value,
      className: analysis.keyLevel.kind === 'resistance' ? UP_TEXT : DOWN_TEXT,
      showArrow: false,
    },
  ];
  const narrative: { title: string; body: string; icon: IconName }[] = [
    { title: analysisCopy.preference, body: analysis.preference, icon: isUp ? 'trendUp' : 'trendDown' },
    { title: analysisCopy.alternative, body: analysis.alternative, icon: 'refresh' },
    { title: analysisCopy.comment, body: analysis.comment, icon: 'fileText' },
  ];

  return (
    <div className="flex animate-rise flex-col gap-6 motion-reduce:animate-none">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <h3 className="border-l-4 border-(--hero-buy) pl-4 text-2xl leading-snug font-black tracking-tight text-fg">{analysis.headline}</h3>

        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-3 overflow-hidden rounded-lg ring-1 ring-line">
            {keyLevels.map((level, index) => (
              <div
                key={level.label}
                style={staggerStyle(index + 2, 90)}
                className={cx('flex min-w-0 animate-feed-in flex-col gap-1.5 border-r border-dashed border-line p-2.5 last:border-r-0 motion-reduce:animate-none', index === 0 ? 'bg-(--hero-buy)/12' : 'bg-fg/[0.02]')}
              >
                <dt className="truncate text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">{level.label}</dt>
                <dd className={cx('flex items-center gap-1 truncate font-mono text-sm font-black tabular-nums', level.className)}>
                  {level.showArrow && <DirectionIcon direction={view.direction} size={13} />}
                  {level.value}
                </dd>
              </div>
            ))}
          </dl>

          <InkButton aria-expanded={isStoryOpen} onClick={() => setIsStoryOpen(true)} className="w-full">
            <span style={{ background: RED }} className="relative grid size-8 place-items-center rounded-md text-[#062520] transition-transform duration-300 group-hover/ink:rotate-12 motion-reduce:transition-none">
              <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-[8px] border-2 motion-reduce:hidden" />
              <Icon name="bolt" size={14} className="relative" />
            </span>
            <span className="relative flex-1 text-left">{analysisCopy.storyteller}</span>
            <span className="relative grid size-8 place-items-center rounded-md bg-[#062520]/15 transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
              <Icon name="arrowRight" size={14} />
            </span>
          </InkButton>
        </div>
      </div>

      <ol className="relative grid gap-4 md:grid-cols-3">
        <span aria-hidden="true" className="absolute top-5 right-[16%] left-[16%] hidden border-t-2 border-dashed border-line-strong md:block" />
        {narrative.map((item, index) => (
          <li key={item.title} style={staggerStyle(index + 2, 120)} className="relative flex min-w-0 animate-feed-in flex-col gap-3 motion-reduce:animate-none">
            <div className="flex items-center gap-3 md:flex-col md:items-center">
              <span className={cx(beadClass, 'relative size-10 bg-surface')}>
                <Icon name={item.icon} size={15} />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded bg-(--aurora-cta-from) font-mono text-[9px] font-black text-[#062520]">{pad2(index + 1)}</span>
              </span>
              <p className="text-sm font-black text-fg md:text-center">{item.title}</p>
            </div>
            <p className="rounded-lg bg-fg/[0.03] p-3.5 text-sm leading-relaxed text-fg-muted ring-1 ring-line">{item.body}</p>
          </li>
        ))}
      </ol>

      {isStoryOpen && <StorytellerPanel story={story} onClose={() => setIsStoryOpen(false)} />}
    </div>
  );
}

/** Published levels as a DOM price ladder, highest on top: each row has a depth bar breathing out from the pivot line by its distance. */
function LevelLadder({ view }: { view: TechnicalView }) {
  const pivot = toNumber(view.pivot);
  const rungs = [...view.levels].sort((a, b) => toNumber(b.value) - toNumber(a.value));
  const maxDistance = Math.max(...rungs.map((level) => Math.abs(((toNumber(level.value) - pivot) / pivot) * 100)), 0.0001);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg ring-1 ring-line">
      <h3 className={cx(captionClass, 'flex items-center gap-2 border-b border-dashed border-line px-3 py-2.5')}>
        <span aria-hidden="true" className={cx(beadClass, 'size-6')}>
          <Icon name="signalBars" size={11} />
        </span>
        {translate('tc.tv.levels')}
      </h3>
      <ol className="relative flex flex-1 flex-col">
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 border-l border-dashed border-fg/25" />
        {rungs.map((level, index) => {
          const tone = levelTone[level.kind];
          const distance = ((toNumber(level.value) - pivot) / pivot) * 100;
          const isLast = level.kind === 'last';
          const isPivot = level.kind === 'pivot';
          const share = (Math.abs(distance) / maxDistance) * 50;
          return (
            <li
              key={`${level.kind}-${level.value}`}
              style={staggerStyle(index + 3, 60)}
              className={cx(
                'relative flex flex-1 animate-feed-in items-center gap-2 border-b border-line/60 px-3 py-2 last:border-b-0 motion-reduce:animate-none',
                isLast && 'ring-1 ring-(--aurora-cta-from) ring-inset',
                isPivot && 'bg-fg/[0.04]',
              )}
            >
              {!isPivot && (
                <span
                  aria-hidden="true"
                  style={{ width: `${share}%`, left: distance > 0 ? '50%' : undefined, right: distance > 0 ? undefined : '50%', '--tv-delay': `${index * 0.2}s` } as CSSProperties}
                  className={cx('tv-depth absolute inset-y-1 opacity-20', distance > 0 ? 'tv-depth-bear' : 'tv-depth-bull', tone.chip)}
                />
              )}
              <span aria-hidden="true" className="relative grid size-3 shrink-0 place-items-center">
                {isLast && <span className="mkt-blink absolute -inset-1 rounded-[4px] bg-(--aurora-cta-from)/40" />}
                <span style={isLast ? { background: RED } : undefined} className={cx('relative size-3 rounded-[3px]', !isLast && tone.chip)} />
              </span>
              <span className="relative min-w-0 flex-1 truncate text-[11px] text-fg-muted">{translate(tone.nameKey)}</span>
              <span className="relative shrink-0 font-mono text-sm font-bold text-fg tabular-nums">{level.value}</span>
              <span className="relative w-14 shrink-0 text-right font-mono text-[10px] text-fg-subtle tabular-nums">{isPivot ? '—' : `${distance > 0 ? '+' : ''}${distance.toFixed(2)}%`}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The open setup as a chart workstation: quote bar, horizon toolbar, chart beside the DOM ladder, then the analyst note. */
function ViewDetail({ view }: { view: TechnicalView }) {
  const isUp = view.direction === 'up';
  const analysis = getTechnicalAnalysis(view);
  const primaryHorizon = analysis.horizons[0].id;
  const [horizon, setHorizon] = useState<AnalysisHorizon>(primaryHorizon);
  const activeHorizon = analysis.horizons.find((item) => item.id === horizon);

  return (
    <section key={view.id} aria-label={view.symbol} style={staggerStyle(3, 160)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col motion-reduce:animate-none')}>
      <header className="flex flex-wrap items-end gap-4 border-b border-dashed border-line p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx('grid size-9 place-items-center rounded-md', isUp ? UP_SOFT : DOWN_SOFT)}>
              <DirectionIcon direction={view.direction} size={17} />
            </span>
            <span className="rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted ring-1 ring-line">{view.timeframe}</span>
            <span className={cx('rounded px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#062520] uppercase', isUp ? 'bg-(--hero-buy)' : 'bg-(--aurora-cta-from)')}>
              {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
            </span>
          </div>
          <h2 className="mt-2 font-mono text-5xl leading-none font-black tracking-tighter text-fg sm:text-6xl">{view.symbol}</h2>
          <p className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
            <span aria-hidden="true" className="mkt-blink size-1.5 rounded-[2px] bg-(--aurora-cta-from)" />
            {analysis.publishedAt}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 rounded-md bg-fg/[0.04] py-1 pr-3 pl-1 font-mono text-xs text-fg ring-1 ring-line">
            <span className={cx(beadClass, 'size-7')}>
              <Icon name="clock" size={12} />
            </span>
            {analysis.localTime} ({LOCAL_TIMEZONE_LABEL})
          </p>
          <Link
            href="/trading-central/education"
            className="group/learn relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-md bg-(--hero-buy) py-1 pr-1 pl-3.5 text-xs font-bold text-[#062520] transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/30" />
            <span className="relative">{analysisCopy.learningCenter}</span>
            <span style={{ background: RED }} className="relative grid size-7 place-items-center rounded text-[#062520] transition-transform duration-300 group-hover/learn:rotate-12">
              <Icon name="fileText" size={12} />
            </span>
          </Link>
        </div>
      </header>

      <HorizonTrack horizons={analysis.horizons} value={horizon} onChange={setHorizon} />

      <div className="grid gap-4 border-b border-dashed border-line p-4 sm:p-5 2xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-fg/[0.025] p-3 ring-1 ring-line sm:p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
            <span className="flex items-center gap-1.5 rounded-md bg-app py-1 pr-2.5 pl-2 ring-1 ring-line">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-fg" />
              {translate('tc.tv.legendMaBb')}
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-app py-1 pr-2.5 pl-2 ring-1 ring-line">
              <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-info" />
              {translate('tc.tv.legendMa50')}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-fg-subtle">
              <span aria-hidden="true" className="mkt-blink size-1.5 rounded-[2px] bg-(--aurora-cta-from)" />
              {translate('tc.tv.research')}
            </span>
          </div>
          <TechnicalChart view={view} />
        </div>
        <LevelLadder view={view} />
      </div>

      <div className="p-5 sm:p-6">
        {horizon === primaryHorizon && <AnalysisPanel view={view} analysis={analysis} />}

        {activeHorizon && horizon !== primaryHorizon && (
          <div key={horizon} className="flex animate-rise items-center gap-4 rounded-lg border border-dashed border-line-strong p-5 motion-reduce:animate-none">
            <SignalKey icon="clock" />
            <div>
              <p className="text-sm font-bold text-fg">
                {activeHorizon.label}: <span className={activeHorizon.direction === 'up' ? UP_TEXT : DOWN_TEXT}>{activeHorizon.move}</span>
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">
                The {activeHorizon.label.toLowerCase()} write-up for {view.symbol} is on the way.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Skeleton: workstation title bar → market selector | depth-book sentiment → open chart workstation on the left beside the watchlist on the right → disclaimer.
export default function TechnicalViewsPage() {
  const [assetClass, setAssetClass] = useState<AssetClass>('forex');
  const [filter, setFilter] = useState<DirectionFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(technicalViews[0].id);

  const classViews = technicalViews.filter((view) => view.assetClass === assetClass);
  const visibleViews = classViews.filter((view) => filter === 'all' || view.direction === filter);
  const selectedView = visibleViews.find((view) => view.id === selectedId) ?? visibleViews[0];
  const bullish = classViews.filter((view) => view.direction === 'up').length;
  const bearish = classViews.length - bullish;

  const changeAssetClass = (next: AssetClass) => {
    setAssetClass(next);
    setFilter('all');
    const first = technicalViews.find((view) => view.assetClass === next);
    if (first) setSelectedId(first.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className={cx(panelClass, 'flex animate-rise items-center gap-4 p-4 sm:p-5 motion-reduce:animate-none')}>
        <SignalKey icon="pieChart" />
        <h1 className="min-w-0 truncate text-2xl font-black tracking-tight text-fg">{translate('nav.tcTechnicalViews')}</h1>
        <span aria-hidden="true" className="ml-auto hidden h-8 items-end gap-0.5 sm:flex">
          {[30, 55, 40, 75, 50, 90, 65, 100, 80].map((height, bar) => (
            <span
              key={bar}
              style={{ height: `${height}%`, '--vol-delay': `${(bar % 5) * 0.15}s` } as CSSProperties}
              className={cx('mkt-vol w-1.5 rounded-t-[1px]', bar % 3 === 2 ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)')}
            />
          ))}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <IntroCard assetClass={assetClass} onAssetChange={changeAssetClass} />
        <SentimentPanel bullish={bullish} bearish={bearish} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 xl:order-2">
          <SetupRail key={assetClass} views={visibleViews} selectedId={selectedView?.id} onSelect={setSelectedId} filter={filter} onFilterChange={setFilter} />
        </div>

        <div className="min-w-0 xl:order-1">
          {selectedView ? (
            <ViewDetail key={selectedView.id} view={selectedView} />
          ) : (
            <section className={cx(panelClass, 'min-w-0 p-5')}>
              <NoSignalEmpty message={translate('tc.tv.emptyFilter')} />
            </section>
          )}
        </div>
      </div>

      <footer className={cx(panelClass, 'flex gap-4 p-5 text-[11px] leading-relaxed text-fg-subtle')}>
        <span aria-hidden="true" style={{ background: RED }} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#062520]">
          <Icon name="info" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-(--aurora-cta-from)">
                {pad2(index + 1)}
              </span>
              <p>{paragraph}</p>
            </li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
