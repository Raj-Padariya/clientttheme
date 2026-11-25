'use client';

import Link from 'next/link';
import { useState, type ButtonHTMLAttributes } from 'react';
import { translate, type MessageKey } from '@/core/i18n';

import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Icon, type IconName } from '../ui/Icon';
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
const SENTIMENT_DOTS = 20;
const SPARK_STRIDE = 2;

const directionFilterKey: Record<DirectionFilter, MessageKey> = {
  all: 'tc.tv.filter.all',
  up: 'tc.tv.bullish',
  down: 'tc.tv.bearish',
};

const levelTone: Record<LevelKind, { line: string; label: string; text: string; chip: string; nameKey: MessageKey }> = {
  resistance: { line: 'stroke-success', label: 'fill-success', text: 'fill-white', chip: 'bg-success', nameKey: 'tc.tv.resistance' },
  pivot: { line: 'stroke-info', label: 'fill-info', text: 'fill-white', chip: 'bg-info', nameKey: 'tc.tv.pivot' },
  last: { line: 'stroke-fg-muted', label: 'fill-fg', text: 'fill-surface', chip: 'bg-fg', nameKey: 'tc.tv.last' },
  support: { line: 'stroke-danger', label: 'fill-danger', text: 'fill-white', chip: 'bg-danger', nameKey: 'tc.tv.support' },
};

const RED = 'var(--zenith-red)';

const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';
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
  return <Icon name={direction === 'up' ? 'trendUp' : 'trendDown'} size={size} className={direction === 'up' ? 'text-success' : 'text-danger'} />;
}

/** Solid capsule; children usually end with a red bead slot. */
function InkButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'group/ink relative inline-flex h-12 items-center gap-3 rounded-full bg-fg pr-2 pl-2 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      {children}
    </button>
  );
}

function SpinBead({ icon, size = 'size-12', inner = 'size-9', iconSize = 15 }: { icon: IconName; size?: string; inner?: string; iconSize?: number }) {
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center', size)}>
      <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/30 motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-rim-spin [animation-duration:3.5s] motion-reduce:animate-none">
        <span style={{ background: RED }} className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full" />
      </span>
      <span className={cx(beadClass, inner)}>
        <Icon name={icon} size={iconSize} />
      </span>
    </span>
  );
}

/** Empty state: a twinkling pixel matrix around a bead. */
function DotMatrixEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="relative grid place-items-center">
        <span aria-hidden="true" className="grid grid-cols-9 gap-1.5 [mask-image:radial-gradient(circle,#000_30%,transparent_75%)]">
          {Array.from({ length: 45 }, (_, dot) => (
            <span key={dot} style={{ animationDelay: `${((dot * 7) % 13) * 120}ms` }} className="zenith-twinkle size-2 rounded-[2px] bg-fg/30" />
          ))}
        </span>
        <span className="absolute">
          <SpinBead icon="pieChart" />
        </span>
      </span>
      <p className="text-sm font-medium text-fg">{message}</p>
    </div>
  );
}

/** Close prices as a run of thin pixel columns rising from the baseline; the newest column is red. */
function DotSparkline({ view }: { view: TechnicalView }) {
  const { closes } = seriesFor(view);
  const sampled = closes.filter((_, index) => index % SPARK_STRIDE === 0 || index === closes.length - 1);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const isUp = view.direction === 'up';
  const barWidth = 112 / sampled.length;

  return (
    <svg viewBox="0 0 112 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
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
            className={cx(!isLast && (isUp ? 'fill-success/55' : 'fill-danger/55'))}
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
        <span aria-hidden="true" className={cx('grid size-6 place-items-center rounded-full', isUp ? 'bg-success/15' : 'bg-danger/15')}>
          <DirectionIcon direction={direction} size={12} />
        </span>
        {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
      </span>
      <span className={cx('font-mono text-5xl leading-none font-black tracking-tighter tabular-nums', isUp ? 'text-success' : 'text-danger')}>
        <CountUp value={count} format={(current) => String(Math.round(current))} />
      </span>
    </div>
  );
}

/** Bulls vs bears as a two-row pixel waffle: bull pixels fill from the left, bear pixels from the right; the split column is marked red. */
function SentimentPanel({ bullish, bearish }: { bullish: number; bearish: number }) {
  const total = bullish + bearish;
  const ratio = total > 0 ? bullish / total : 0.5;
  const columns = SENTIMENT_DOTS / 2;
  const bullColumns = Math.round(ratio * columns);

  return (
    <section style={staggerStyle(1, 140)} className="flex min-w-0 animate-rise flex-col justify-between gap-6 motion-reduce:animate-none">
      <div className="flex items-center justify-between gap-3">
        <p className={cx(captionClass, 'flex items-center gap-2')}>
          <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />
          {translate('tc.tv.sentiment')}
        </p>
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="signalBars" size={14} />
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <SentimentSide direction="up" count={bullish} />
        <span className="pb-1 font-mono text-xs font-bold text-fg-subtle tabular-nums">{Math.round(ratio * 100)}%</span>
        <SentimentSide direction="down" count={bearish} />
      </div>

      <div aria-hidden="true" className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: SENTIMENT_DOTS }, (_, cell) => {
          const column = cell % columns;
          const isBull = column < bullColumns;
          return (
            <span
              key={cell}
              style={{ animationDelay: `${column * 50 + Math.floor(cell / columns) * 120}ms` }}
              className={cx('h-5 animate-dot-pop rounded-[4px] motion-reduce:animate-none', isBull ? 'bg-success' : 'bg-danger/80')}
            />
          );
        })}
        <span
          style={{ left: `${(bullColumns / columns) * 100}%`, background: RED }}
          className="absolute -top-2 -bottom-2 w-1 -translate-x-1/2 rounded-full ring-4 ring-app transition-[left] duration-700 ease-out motion-reduce:transition-none"
        >
          <span style={{ background: RED }} className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 animate-ping-soft rounded-full motion-reduce:hidden" />
        </span>
      </div>
    </section>
  );
}

function IntroCard({ assetClass, onAssetChange }: { assetClass: AssetClass; onAssetChange: (value: AssetClass) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-2 text-xs font-semibold text-app">
        <LiveDot />
        {translate('tc.tv.eyebrow')}
      </p>
      <h2 className="text-5xl leading-[0.95] font-black tracking-tighter text-fg sm:text-6xl">{translate('nav.tcTechnicalViews')}</h2>
      <p className="max-w-xl border-l-2 border-[var(--zenith-red)] pl-4 text-sm leading-relaxed text-fg-muted">{translate('tc.tv.subtitle')}</p>

      <div role="tablist" className="flex flex-wrap gap-2 pt-2">
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
                'group/asset inline-flex items-center gap-2 rounded-full py-1 pr-1 pl-4 text-sm font-bold transition-[background-color,color,translate,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none',
                isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
              )}
            >
              {translate(`tc.tv.asset.${item}`)}
              <span
                style={isActive ? { background: RED } : undefined}
                className={cx('grid size-8 place-items-center rounded-full font-mono text-[11px] tabular-nums transition-transform duration-300 group-hover/asset:rotate-12', isActive ? 'text-white' : 'bg-fg/10')}
              >
                {pad2(count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Three capsules; the active one fills solid and grows a red pixel. */
function FilterSwitch({ value, onChange }: { value: DirectionFilter; onChange: (value: DirectionFilter) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {DIRECTION_FILTERS.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={cx(
              'relative flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-95',
              isActive ? 'bg-fg text-app' : 'bg-fg/[0.03] text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            {option !== 'all' && <Icon name={option === 'up' ? 'trendUp' : 'trendDown'} size={13} className={isActive ? undefined : option === 'up' ? 'text-success' : 'text-danger'} />}
            {translate(directionFilterKey[option])}
            {isActive && <span aria-hidden="true" style={{ background: RED }} className="absolute -top-0.5 right-2 size-2 animate-dot-pop rounded-[2px] motion-reduce:animate-none" />}
          </button>
        );
      })}
    </div>
  );
}

/** Vertical rail of setup capsules; each one carries a pixel-column sparkline of its closes. */
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
    <aside style={staggerStyle(2, 160)} className="flex min-w-0 animate-rise flex-col gap-4 rounded-[30px] border border-dashed border-line-strong p-4 xl:sticky xl:top-24 motion-reduce:animate-none">
      <div className="flex items-center gap-3">
        <SpinBead icon="pieChart" size="size-11" inner="size-8" iconSize={14} />
        <h2 className="min-w-0 flex-1 truncate text-lg font-black text-fg">{translate('tc.tv.signals')}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] py-1 pr-2.5 pl-1 font-mono text-[11px] text-fg-muted tabular-nums">
          <span style={{ background: RED }} className="grid size-5 place-items-center rounded-full text-[10px] font-black text-white">
            {views.length}
          </span>
          {translate('tc.tv.setups')}
        </span>
      </div>

      <FilterSwitch value={filter} onChange={onFilterChange} />

      {views.length === 0 ? (
        <DotMatrixEmpty message={translate('tc.tv.emptyFilter')} />
      ) : (
        <ol className="-mx-1 flex flex-col gap-2 px-1 py-1 xl:max-h-[42rem] xl:overflow-y-auto xl:[scrollbar-width:thin]">
          {views.map((view, index) => {
            const isSelected = view.id === selectedId;
            const isUp = view.direction === 'up';
            return (
              <li key={view.id} style={staggerStyle(index, 50)} className="animate-feed-in motion-reduce:animate-none">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(view.id)}
                  className={cx(
                    'group flex w-full flex-col gap-2.5 rounded-[24px] p-2.5 text-left transition-[background-color,box-shadow,translate,color] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.99] motion-reduce:transition-none',
                    isSelected ? 'bg-fg text-app' : 'bg-fg/[0.03] ring-1 ring-line hover:ring-line-strong',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      style={isSelected ? { background: RED } : undefined}
                      className={cx(
                        'relative grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:-rotate-12',
                        isSelected ? 'text-white' : isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                      )}
                    >
                      {isSelected && <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />}
                      <Icon name={isUp ? 'trendUp' : 'trendDown'} size={15} className="relative" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cx('truncate font-mono text-sm font-black', !isSelected && 'text-fg')}>{view.symbol}</span>
                        <span className={cx('rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide', isSelected ? 'bg-app/15 text-app/80' : 'text-fg-subtle ring-1 ring-line')}>{view.timeframe}</span>
                      </span>
                      <span className={cx('mt-0.5 flex items-center gap-1 text-[11px]', isSelected ? 'text-app/60' : 'text-fg-subtle')}>
                        <Icon name="clock" size={11} />
                        {view.localTime} ({LOCAL_TIMEZONE_LABEL})
                      </span>
                    </span>
                    <span className={cx('shrink-0 rounded-full px-2 py-1 font-mono text-xs font-bold tabular-nums', isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>{view.move}</span>
                  </span>
                  <span className={cx('rounded-[14px] px-1.5 pt-1.5', isSelected ? 'bg-app/10' : 'bg-fg/[0.03]')}>
                    <DotSparkline view={view} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

/** Each candle is a thin range capsule (low→high) with a square body plug and a close tick; MAs are solid strokes over a pixel-row field. */
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
  const trackWidth = Math.max(Math.min(step * 0.7, 6), 2);
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
      <rect x={candleRight} y={CHART.top} width={plotRight - candleRight} height={plotBottom - CHART.top} rx="10" className="fill-fg/[0.03]" />
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

      <g className="zenith-reveal">
        <path d={bandPath} className="fill-fg/[0.05]" />
        {series.candles.map((candle, index) => {
          const rising = candle.close >= candle.open;
          const x = indexToX(index);
          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);
          const bodyTop = priceToY(Math.max(candle.open, candle.close));
          const bodyHeight = Math.max(priceToY(Math.min(candle.open, candle.close)) - bodyTop, 2);
          return (
            <g key={index}>
              <rect x={x - trackWidth / 2} y={highY} width={trackWidth} height={Math.max(lowY - highY, trackWidth)} rx={trackWidth / 2} className={rising ? 'fill-success/20' : 'fill-danger/20'} />
              <rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} rx="1" className={rising ? 'fill-success' : 'fill-danger'} />
            </g>
          );
        })}
        <path d={linePath(series.ma20)} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-fg" />
        <path d={linePath(series.ma50)} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" className="stroke-info" />
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
        <rect x={targetX - 8} y={targetY - 8} width="16" height="16" rx="5" fill="none" strokeWidth="1.5" className={isUp ? 'stroke-success' : 'stroke-danger'} />
        <rect x={targetX - 4} y={targetY - 4} width="8" height="8" rx="2" className={isUp ? 'fill-success' : 'fill-danger'} />

        <circle cx={endX} cy={endY} r="6" style={{ fill: RED }} />
        <circle cx={endX} cy={endY} r="6" fill="none" strokeWidth="2" style={{ stroke: RED }} className="motion-reduce:hidden">
          <animate attributeName="r" values="6;18" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx={endX} cy={endY} r="2.5" className="fill-white" />

        {labels.map(({ level, lineY, labelY }) => (
          <g key={`label-${level.kind}-${level.value}`}>
            {Math.abs(labelY - lineY) > 1 && <line x1={plotRight} x2={plotRight + 4} y1={lineY} y2={labelY} strokeDasharray="1 2" className={levelTone[level.kind].line} />}
            <rect x={plotRight + 4} y={labelY - LABEL_HEIGHT / 2} width={CHART.labelWidth - 4} height={LABEL_HEIGHT} rx={LABEL_HEIGHT / 2} className={levelTone[level.kind].label} />
            <text x={plotRight + 4 + (CHART.labelWidth - 4) / 2} y={labelY + 3.5} textAnchor="middle" className={cx('font-mono text-[10px] font-semibold', levelTone[level.kind].text)}>
              {level.value}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** The three horizons as segments of one capsule; the active one fills solid with a red bead. */
function HorizonTrack({ horizons, value, onChange }: { horizons: TechnicalAnalysis['horizons']; value: AnalysisHorizon; onChange: (horizon: AnalysisHorizon) => void }) {
  return (
    <div role="tablist" aria-label="Analysis horizon" className="grid grid-cols-3 gap-1 rounded-[26px] bg-fg/[0.03] p-1 ring-1 ring-line">
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
              'group flex min-w-0 animate-feed-in flex-col items-start gap-2 rounded-[22px] p-3 text-left transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:animate-none',
              isActive ? 'bg-fg text-app' : 'hover:bg-fg/[0.04]',
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className={cx('truncate text-[10.5px] font-semibold tracking-[0.14em] uppercase', isActive ? 'text-app/70' : 'text-fg-subtle')}>{horizon.label}</span>
              <span
                style={isActive ? { background: RED } : undefined}
                className={cx(
                  'grid size-8 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:-translate-y-0.5',
                  isActive ? 'text-white' : isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                )}
              >
                <Icon name={isUp ? 'trendUp' : 'trendDown'} size={14} />
              </span>
            </span>
            <span className={cx('font-mono text-2xl leading-none font-black tracking-tight tabular-nums', isUp ? 'text-success' : 'text-danger')}>{horizon.move}</span>
          </button>
        );
      })}
    </div>
  );
}

function AnalysisPanel({ view, analysis }: { view: TechnicalView; analysis: TechnicalAnalysis }) {
  const story = getStorytellerStory(view);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const isUp = view.direction === 'up';
  const keyLevels = [
    { label: analysisCopy.targetLabel, value: view.target, className: isUp ? 'text-success' : 'text-danger', showArrow: true },
    { label: analysisCopy.pivotLabel, value: view.pivot, className: 'text-info', showArrow: false },
    {
      label: analysis.keyLevel.kind === 'resistance' ? analysisCopy.resistanceLabel : analysisCopy.supportLabel,
      value: analysis.keyLevel.value,
      className: analysis.keyLevel.kind === 'resistance' ? 'text-success' : 'text-danger',
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <h3 className="border-l-4 border-[var(--zenith-red)] pl-4 text-2xl leading-snug font-black tracking-tight text-fg">{analysis.headline}</h3>

        <div className="flex flex-col gap-3">
          {/* Key levels as three numeral tiles; the target tile is solid. */}
          <dl className="grid grid-cols-3 gap-1.5">
            {keyLevels.map((level, index) => (
              <div
                key={level.label}
                style={staggerStyle(index + 2, 90)}
                className={cx('flex min-w-0 animate-feed-in flex-col gap-1.5 rounded-[20px] p-2.5 motion-reduce:animate-none', index === 0 ? 'bg-fg' : 'bg-fg/[0.03] ring-1 ring-line')}
              >
                <dt className={cx('truncate text-[10px] font-semibold tracking-wide uppercase', index === 0 ? 'text-app/60' : 'text-fg-subtle')}>{level.label}</dt>
                <dd className={cx('flex items-center gap-1 truncate font-mono text-sm font-black tabular-nums', level.className)}>
                  {level.showArrow && <DirectionIcon direction={view.direction} size={13} />}
                  {level.value}
                </dd>
              </div>
            ))}
          </dl>

          <InkButton aria-expanded={isStoryOpen} onClick={() => setIsStoryOpen(true)} className="w-full">
            <span style={{ background: RED }} className="relative grid size-8 place-items-center rounded-full text-white transition-transform duration-300 group-hover/ink:rotate-12 motion-reduce:transition-none">
              <span aria-hidden="true" style={{ borderColor: RED }} className="absolute -inset-1 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
              <Icon name="bolt" size={14} className="relative" />
            </span>
            <span className="relative flex-1 text-left">{analysisCopy.storyteller}</span>
            <span className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
              <Icon name="arrowRight" size={14} />
            </span>
          </InkButton>
        </div>
      </div>

      <ol className="grid gap-2 md:grid-cols-3">
        {narrative.map((item, index) => (
          <li key={item.title} style={staggerStyle(index + 2, 120)} className="flex min-w-0 animate-feed-in flex-col gap-3 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-line motion-reduce:animate-none">
            <div className="flex items-center justify-between gap-2">
              <span className={cx(beadClass, 'size-10')}>
                <Icon name={item.icon} size={15} />
              </span>
              <span className="font-mono text-3xl leading-none font-black tracking-tighter text-fg/15 tabular-nums">{pad2(index + 1)}</span>
            </div>
            <p className="flex items-center gap-2 text-sm font-black text-fg">
              <span aria-hidden="true" style={{ background: RED }} className="size-1.5 shrink-0 rounded-[2px]" />
              {item.title}
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">{item.body}</p>
          </li>
        ))}
      </ol>

      {isStoryOpen && <StorytellerPanel story={story} onClose={() => setIsStoryOpen(false)} />}
    </div>
  );
}

/** Published levels, highest on top; each row carries a diverging track that grows left/right of the pivot by its distance. */
function LevelLadder({ view }: { view: TechnicalView }) {
  const pivot = toNumber(view.pivot);
  const rungs = [...view.levels].sort((a, b) => toNumber(b.value) - toNumber(a.value));
  const maxDistance = Math.max(...rungs.map((level) => Math.abs(((toNumber(level.value) - pivot) / pivot) * 100)), 0.0001);

  return (
    <div className="flex h-full flex-col gap-3 rounded-[28px] border border-dashed border-line-strong p-4">
      <h3 className={cx(captionClass, 'flex items-center gap-2')}>
        <span aria-hidden="true" className={cx(beadClass, 'size-6')}>
          <Icon name="signalBars" size={11} />
        </span>
        {translate('tc.tv.levels')}
      </h3>
      <ol className="flex flex-1 flex-col justify-between gap-1.5">
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
              className={cx('flex animate-feed-in flex-col gap-1.5 rounded-[18px] px-2.5 py-2 motion-reduce:animate-none', isLast ? 'bg-fg text-app' : isPivot ? 'bg-fg/[0.05]' : '')}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="relative grid size-3 shrink-0 place-items-center">
                  {isLast && <span style={{ background: RED }} className="absolute -inset-1 animate-ping-soft rounded-[4px] motion-reduce:animate-none" />}
                  <span style={isLast ? { background: RED } : undefined} className={cx('relative size-3 rounded-[3px]', !isLast && tone.chip)} />
                </span>
                <span className={cx('min-w-0 flex-1 truncate text-[11px]', isLast ? 'text-app/70' : 'text-fg-muted')}>{translate(tone.nameKey)}</span>
                <span className={cx('shrink-0 font-mono text-sm font-bold tabular-nums', !isLast && 'text-fg')}>{level.value}</span>
                <span className={cx('w-14 shrink-0 text-right font-mono text-[10px] tabular-nums', isLast ? 'text-app/60' : 'text-fg-subtle')}>
                  {isPivot ? '—' : `${distance > 0 ? '+' : ''}${distance.toFixed(2)}%`}
                </span>
              </span>
              <span aria-hidden="true" className={cx('relative h-1.5 rounded-full', isLast ? 'bg-app/15' : 'bg-fg/10')}>
                <span className={cx('absolute -top-0.5 left-1/2 h-2.5 w-0.5 -translate-x-1/2 rounded-full', isLast ? 'bg-app/50' : 'bg-fg/40')} />
                {!isPivot && (
                  <span
                    style={{ width: `${share}%`, ...(distance > 0 ? { left: '50%' } : { right: '50%' }), ...(isLast ? { background: RED } : {}) }}
                    className={cx('zenith-capsule absolute inset-y-0 rounded-full', !isLast && tone.chip)}
                  />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ViewDetail({ view }: { view: TechnicalView }) {
  const isUp = view.direction === 'up';
  const analysis = getTechnicalAnalysis(view);
  const primaryHorizon = analysis.horizons[0].id;
  const [horizon, setHorizon] = useState<AnalysisHorizon>(primaryHorizon);
  const activeHorizon = analysis.horizons.find((item) => item.id === horizon);

  return (
    <section key={view.id} aria-label={view.symbol} style={staggerStyle(3, 160)} className="flex min-w-0 animate-rise flex-col gap-6 motion-reduce:animate-none">
      <header className="flex flex-wrap items-end gap-4 border-b border-line pb-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx('grid size-9 place-items-center rounded-full', isUp ? 'bg-success/15' : 'bg-danger/15')}>
              <DirectionIcon direction={view.direction} size={17} />
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted ring-1 ring-line">{view.timeframe}</span>
            <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', isUp ? 'bg-success text-white' : 'bg-danger text-white')}>
              {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
            </span>
          </div>
          <h2 className="mt-2 font-mono text-5xl leading-none font-black tracking-tighter text-fg sm:text-6xl">{view.symbol}</h2>
          <p className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
            <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />
            {analysis.publishedAt}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 rounded-full bg-fg/[0.04] py-1 pr-3 pl-1 font-mono text-xs text-fg ring-1 ring-line">
            <span className={cx(beadClass, 'size-7')}>
              <Icon name="clock" size={12} />
            </span>
            {analysis.localTime} ({LOCAL_TIMEZONE_LABEL})
          </p>
          <Link
            href="/trading-central/education"
            className="group/learn inline-flex h-9 items-center gap-2 rounded-full bg-fg py-1 pr-1 pl-4 text-xs font-bold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {analysisCopy.learningCenter}
            <span style={{ background: RED }} className="grid size-7 place-items-center rounded-full text-white transition-transform duration-300 group-hover/learn:rotate-12">
              <Icon name="fileText" size={12} />
            </span>
          </Link>
        </div>
      </header>

      <HorizonTrack horizons={analysis.horizons} value={horizon} onChange={setHorizon} />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-3 rounded-[30px] bg-fg/[0.025] p-3 ring-1 ring-line sm:p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
            <span className="flex items-center gap-1.5 rounded-full bg-app py-1 pr-2.5 pl-2 ring-1 ring-line">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-fg" />
              {translate('tc.tv.legendMaBb')}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-app py-1 pr-2.5 pl-2 ring-1 ring-line">
              <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-info" />
              {translate('tc.tv.legendMa50')}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-fg-subtle">
              <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-full" />
              {translate('tc.tv.research')}
            </span>
          </div>
          <TechnicalChart view={view} />
        </div>
        <LevelLadder view={view} />
      </div>

      <div className="border-t border-line pt-6">
        {horizon === primaryHorizon && <AnalysisPanel view={view} analysis={analysis} />}

        {activeHorizon && horizon !== primaryHorizon && (
          <div key={horizon} className="flex animate-rise items-center gap-4 rounded-[28px] border border-dashed border-line-strong p-5 motion-reduce:animate-none">
            <SpinBead icon="clock" />
            <div>
              <p className="text-sm font-bold text-fg">
                {activeHorizon.label}: <span className={activeHorizon.direction === 'up' ? 'text-success' : 'text-danger'}>{activeHorizon.move}</span>
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

// Skeleton: open title → intro (left) | pixel-waffle sentiment (right) → setup capsule rail beside the open detail → disclaimer.
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
    <div className="flex flex-col gap-10">
      <header className="zenith-tile flex items-center gap-4">
        <SpinBead icon="pieChart" />
        <h1 className="min-w-0 truncate text-2xl font-black tracking-tight text-fg-muted">{translate('nav.tcTechnicalViews')}</h1>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <IntroCard assetClass={assetClass} onAssetChange={changeAssetClass} />
        <SentimentPanel bullish={bullish} bearish={bearish} />
      </div>

      <div className="grid items-start gap-8 border-t border-line pt-8 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <SetupRail key={assetClass} views={visibleViews} selectedId={selectedView?.id} onSelect={setSelectedId} filter={filter} onFilterChange={setFilter} />

        {selectedView ? (
          <ViewDetail key={selectedView.id} view={selectedView} />
        ) : (
          <section className="min-w-0">
            <DotMatrixEmpty message={translate('tc.tv.emptyFilter')} />
          </section>
        )}
      </div>

      <footer className="flex gap-4 rounded-[30px] border border-dashed border-line-strong p-5 text-[11px] leading-relaxed text-fg-subtle">
        <span aria-hidden="true" style={{ background: RED }} className="grid size-9 shrink-0 place-items-center rounded-full text-white">
          <Icon name="info" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-[var(--zenith-red)]">
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
