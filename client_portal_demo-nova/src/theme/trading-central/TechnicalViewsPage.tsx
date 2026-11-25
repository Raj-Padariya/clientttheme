'use client';

import Link from 'next/link';
import { useState, type ButtonHTMLAttributes } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
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

/** Dark ink pill with the Nova shine sweep. */
function InkButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'group/ink relative inline-flex h-12 items-center gap-3 overflow-hidden rounded-full bg-fg pr-2 pl-2 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
      {children}
    </button>
  );
}

function SpinBead({ icon, size = 'size-12', inner = 'size-9', iconSize = 15 }: { icon: IconName; size?: string; inner?: string; iconSize?: number }) {
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center', size)}>
      <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/35 motion-reduce:animate-none" />
      <span className={cx(beadClass, inner)}>
        <Icon name={icon} size={iconSize} />
      </span>
    </span>
  );
}

/** Empty state: a fading dot matrix around a bead. */
function DotMatrixEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="relative grid place-items-center">
        <span aria-hidden="true" className="grid grid-cols-9 gap-1.5 [mask-image:radial-gradient(circle,#000_30%,transparent_75%)]">
          {Array.from({ length: 45 }, (_, dot) => (
            <span key={dot} style={{ animationDelay: `${(dot % 9) * 60}ms` }} className="size-1.5 animate-dot-pop rounded-full bg-fg/30 motion-reduce:animate-none" />
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

/** Close prices as a string of dots, the newest one a bead. */
function DotSparkline({ view }: { view: TechnicalView }) {
  const { closes } = seriesFor(view);
  const sampled = closes.filter((_, index) => index % SPARK_STRIDE === 0 || index === closes.length - 1);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const isUp = view.direction === 'up';

  return (
    <svg viewBox="0 0 112 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      {sampled.map((value, index) => {
        const isLast = index === sampled.length - 1;
        return (
          <circle
            key={index}
            cx={3 + (index / (sampled.length - 1)) * 106}
            cy={26 - ((value - min) / (max - min || 1)) * 22}
            r={isLast ? 2.6 : 1.3}
            className={cx(isUp ? 'fill-success' : 'fill-danger', !isLast && 'opacity-70')}
          />
        );
      })}
    </svg>
  );
}

function SentimentSide({ direction, count }: { direction: Direction; count: number }) {
  const isUp = direction === 'up';
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="relative grid size-16 place-items-center">
        <span aria-hidden="true" className={cx('absolute inset-0 animate-rim-spin rounded-full border border-dashed motion-reduce:animate-none', isUp ? 'border-success/50' : 'border-danger/50 [animation-direction:reverse]')} />
        <span className={cx('grid size-12 place-items-center rounded-full font-mono text-xl font-black tabular-nums', isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
          <CountUp value={count} format={(current) => String(Math.round(current))} />
        </span>
      </span>
      <span className="flex items-center gap-1 text-xs text-fg-muted">
        <DirectionIcon direction={direction} size={13} />
        {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
      </span>
    </div>
  );
}

/** Bulls vs bears as a tug-of-war string of beads with a marker at the split. */
function SentimentPanel({ bullish, bearish }: { bullish: number; bearish: number }) {
  const total = bullish + bearish;
  const ratio = total > 0 ? bullish / total : 0.5;
  const bullDots = Math.round(ratio * SENTIMENT_DOTS);

  return (
    <section style={staggerStyle(1, 140)} className={cx(panelClass, 'flex animate-rise flex-col justify-between gap-6 p-5 motion-reduce:animate-none')}>
      <div className="flex items-center justify-between gap-3">
        <p className={captionClass}>{translate('tc.tv.sentiment')}</p>
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="signalBars" size={14} />
        </span>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-5">
        <SentimentSide direction="up" count={bullish} />
        <div aria-hidden="true" className="relative flex items-center justify-between py-6">
          <span className="absolute inset-x-0 top-1/2 border-t border-dotted border-line-strong" />
          {Array.from({ length: SENTIMENT_DOTS }, (_, dot) => (
            <span
              key={dot}
              style={{ animationDelay: `${dot * 30}ms` }}
              className={cx('relative size-2 animate-dot-pop rounded-full motion-reduce:animate-none sm:size-2.5', dot < bullDots ? 'bg-success' : 'border border-danger/80 bg-surface')}
            />
          ))}
          <span style={{ left: `${ratio * 100}%` }} className="absolute inset-y-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-700 ease-out motion-reduce:transition-none">
            <span className="size-3 rounded-full bg-fg ring-4 ring-surface" />
            <span className="flex-1 border-l border-dotted border-fg/60" />
            <span className="size-1.5 rounded-full bg-fg" />
          </span>
        </div>
        <SentimentSide direction="down" count={bearish} />
      </div>
    </section>
  );
}

function IntroCard({ assetClass, onAssetChange }: { assetClass: AssetClass; onAssetChange: (value: AssetClass) => void }) {
  return (
    <FrostCard className="h-full">
      <div className="flex h-full flex-col gap-4 text-[#0a1220] sm:p-2">
        <p className={cx('inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', frostChipClass)}>
          <LiveDot />
          {translate('tc.tv.eyebrow')}
        </p>
        <h2 className="text-4xl leading-[1.05] font-black tracking-[-0.03em] sm:text-5xl">{translate('nav.tcTechnicalViews')}</h2>
        <p className="max-w-xl text-sm leading-relaxed font-medium text-[#3b4658]">{translate('tc.tv.subtitle')}</p>

        <div role="tablist" className="mt-auto flex flex-wrap gap-2 border-t border-dotted border-[#0a1220]/25 pt-4">
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
                  'inline-flex items-center gap-2 rounded-full py-1 pr-1 pl-4 text-sm font-bold transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none',
                  isActive ? 'bg-[#0a1220] text-white' : frostChipClass,
                )}
              >
                {translate(`tc.tv.asset.${item}`)}
                <span className={cx('grid size-7 place-items-center rounded-full font-mono text-[11px] tabular-nums', isActive ? 'bg-white text-[#0a1220]' : 'bg-[#0a1220]/10')}>{pad2(count)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </FrostCard>
  );
}

function FilterSwitch({ value, onChange }: { value: DirectionFilter; onChange: (value: DirectionFilter) => void }) {
  const activeIndex = DIRECTION_FILTERS.indexOf(value);
  return (
    <div className="relative grid grid-cols-3 rounded-full p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-fg transition-transform duration-500 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none"
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
              'relative flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option !== 'all' && <Icon name={option === 'up' ? 'trendUp' : 'trendDown'} size={13} className={isActive ? undefined : option === 'up' ? 'text-success' : 'text-danger'} />}
            {translate(directionFilterKey[option])}
          </button>
        );
      })}
    </div>
  );
}

/** Vertical rail of setups; each one carries a dot sparkline of its closes. */
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
    <aside style={staggerStyle(2, 160)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-4 p-4 xl:sticky xl:top-24 motion-reduce:animate-none')}>
      <div className="flex items-center gap-3">
        <SpinBead icon="pieChart" size="size-11" inner="size-8" iconSize={14} />
        <h2 className="min-w-0 flex-1 truncate text-base font-bold text-fg">{translate('tc.tv.signals')}</h2>
        <span className="rounded-full px-2.5 py-1 font-mono text-[11px] text-fg-muted tabular-nums ring-1 ring-line">
          {views.length} {translate('tc.tv.setups')}
        </span>
      </div>

      <FilterSwitch value={filter} onChange={onFilterChange} />

      {views.length === 0 ? (
        <DotMatrixEmpty message={translate('tc.tv.emptyFilter')} />
      ) : (
        <ol className="-mx-1 flex flex-col gap-1.5 px-1 py-1 xl:max-h-[42rem] xl:overflow-y-auto xl:[scrollbar-width:thin]">
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
                    'flex w-full flex-col gap-2 rounded-[22px] p-3 text-left ring-1 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                    isSelected ? 'bg-fg/[0.06] ring-line-strong' : 'ring-transparent hover:ring-line',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="relative grid size-10 shrink-0 place-items-center">
                      {isSelected && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
                      <span className={cx('grid size-10 place-items-center rounded-full', isSelected ? 'bg-fg text-app' : cx('nova-gloss', isUp ? 'text-success' : 'text-danger'))}>
                        <Icon name={isUp ? 'trendUp' : 'trendDown'} size={15} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-sm font-bold text-fg">{view.symbol}</span>
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-fg-subtle ring-1 ring-line">{view.timeframe}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-fg-subtle">
                        <Icon name="clock" size={11} />
                        {view.localTime} ({LOCAL_TIMEZONE_LABEL})
                      </span>
                    </span>
                    <span className={cx('shrink-0 rounded-full px-2 py-1 font-mono text-xs font-bold tabular-nums', isUp ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger')}>{view.move}</span>
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

/** Candles drawn as a dot matrix: filled dots for rising bodies, hollow for falling, small dots for wicks. */
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
  const rowY = (row: number) => CHART.top + ROW_STEP * (row + 0.5);
  const halfRow = ROW_STEP / 2;
  const bodyRadius = Math.min(step * 0.32, 2.8);
  const candleDots = series.candles.map((candle, index) => {
    const bodyTop = priceToY(Math.max(candle.open, candle.close));
    const bodyBottom = priceToY(Math.min(candle.open, candle.close));
    const wickTop = priceToY(candle.high);
    const wickBottom = priceToY(candle.low);
    const dots: { y: number; isBody: boolean }[] = [];
    for (let row = 0; row < rowCount; row += 1) {
      const y = rowY(row);
      if (y >= bodyTop - halfRow && y <= bodyBottom + halfRow) dots.push({ y, isBody: true });
      else if (y >= wickTop - halfRow && y <= wickBottom + halfRow) dots.push({ y, isBody: false });
    }
    return { index, rising: candle.close >= candle.open, dots };
  });

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
        <pattern id={patternId} x={CHART.left} y={CHART.top} width={step} height={ROW_STEP} patternUnits="userSpaceOnUse">
          <circle cx={step / 2} cy={ROW_STEP / 2} r="0.7" className="fill-fg/15" />
        </pattern>
      </defs>

      <rect x={CHART.left} y={CHART.top} width={plotRight - CHART.left} height={rowCount * ROW_STEP} fill={`url(#${patternId})`} />
      <line x1={CHART.left} x2={plotRight} y1={plotBottom} y2={plotBottom} strokeDasharray="1 4" strokeLinecap="round" strokeWidth="1.5" className="stroke-line-strong" />
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
          strokeWidth={level.kind === 'pivot' || level.kind === 'last' ? 1.8 : 1.4}
          strokeDasharray="0.5 5"
          strokeLinecap="round"
          className={cx(levelTone[level.kind].line, 'opacity-80')}
        />
      ))}

      <g className="animate-reveal motion-reduce:animate-none">
        <path d={bandPath} className="fill-fg/[0.04]" />
        <path d={linePath(series.bandUpper)} fill="none" strokeWidth="1" strokeDasharray="2 4" className="stroke-line-strong" />
        <path d={linePath(series.bandLower)} fill="none" strokeWidth="1" strokeDasharray="2 4" className="stroke-line-strong" />
        {candleDots.map(({ index, rising, dots }) => (
          <g key={index}>
            {dots.map(({ y, isBody }) =>
              isBody ? (
                rising ? (
                  <circle key={y} cx={indexToX(index)} cy={y} r={bodyRadius} className="fill-success" />
                ) : (
                  <circle key={y} cx={indexToX(index)} cy={y} r={bodyRadius - 0.5} fill="none" strokeWidth="1.1" className="stroke-danger" />
                )
              ) : (
                <circle key={y} cx={indexToX(index)} cy={y} r="1.1" className={rising ? 'fill-success/60' : 'fill-danger/60'} />
              ),
            )}
          </g>
        ))}
        <path d={linePath(series.ma20)} fill="none" strokeWidth="2.4" strokeDasharray="0 5" strokeLinecap="round" className="stroke-fg" />
        <path d={linePath(series.ma50)} fill="none" strokeWidth="2.4" strokeDasharray="0 5" strokeLinecap="round" className="stroke-info" />
      </g>

      <g className="animate-fade motion-reduce:animate-none">
        <path
          d={`M${endX.toFixed(1)},${endY.toFixed(1)} L${(endX + CHART.projection * 0.35).toFixed(1)},${endY.toFixed(1)} L${targetX.toFixed(1)},${targetY.toFixed(1)}`}
          fill="none"
          strokeWidth="4"
          strokeDasharray="0 8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isUp ? 'stroke-success' : 'stroke-danger'}
        />
        <circle cx={targetX} cy={targetY} r="8" fill="none" strokeWidth="1.2" strokeDasharray="2 3" className={isUp ? 'stroke-success' : 'stroke-danger'} />
        <circle cx={targetX} cy={targetY} r="3.5" className={isUp ? 'fill-success' : 'fill-danger'} />

        <circle cx={endX} cy={endY} r="9" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} className="animate-ping-soft fill-fg/25 motion-reduce:animate-none" />
        <circle cx={endX} cy={endY} r="4.5" className="fill-fg stroke-surface" strokeWidth="2" />

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

/** The three horizons as stops on one dotted track. */
function HorizonTrack({ horizons, value, onChange }: { horizons: TechnicalAnalysis['horizons']; value: AnalysisHorizon; onChange: (horizon: AnalysisHorizon) => void }) {
  return (
    <div role="tablist" aria-label="Analysis horizon" className="relative grid grid-cols-3">
      <span aria-hidden="true" className="absolute inset-x-[16.6%] top-6 border-t border-dotted border-line-strong" />
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
            className="group relative flex animate-feed-in flex-col items-center gap-2 px-2 text-center focus-visible:outline-2 focus-visible:outline-ring motion-reduce:animate-none"
          >
            <span className="relative grid size-12 place-items-center rounded-full bg-surface">
              {isActive && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />}
              <span
                className={cx(
                  'grid size-11 place-items-center rounded-full transition-[background-color,color,translate] duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none',
                  isActive ? 'bg-fg text-app' : cx('nova-gloss', isUp ? 'text-success' : 'text-danger'),
                )}
              >
                <Icon name={isUp ? 'trendUp' : 'trendDown'} size={17} />
              </span>
            </span>
            <span className={cx(captionClass, isActive && 'text-fg')}>{horizon.label}</span>
            <span className={cx('font-mono text-lg leading-none font-black tabular-nums', isUp ? 'text-success' : 'text-danger')}>{horizon.move}</span>
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
    <div className="grid animate-rise gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] motion-reduce:animate-none">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex gap-4">
          <span aria-hidden="true" className="font-serif text-6xl leading-[0.7] font-black text-fg/20">“</span>
          <h3 className="text-xl leading-snug font-bold tracking-tight text-fg">{analysis.headline}</h3>
        </div>

        <ol className="flex flex-col">
          {narrative.map((item, index) => {
            const isLast = index === narrative.length - 1;
            return (
              <li key={item.title} style={staggerStyle(index + 2, 120)} className="relative grid animate-feed-in grid-cols-[2.5rem_minmax(0,1fr)] gap-4 pb-5 motion-reduce:animate-none">
                {!isLast && <span aria-hidden="true" className="absolute top-11 bottom-1 left-5 border-l border-dotted border-line-strong" />}
                <span className={cx(beadClass, 'size-10')}>
                  <Icon name={item.icon} size={15} />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] font-bold text-fg-subtle">{pad2(index + 1)}</span>
                    <span className="text-sm font-bold text-fg">{item.title}</span>
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3 rounded-[24px] p-4 ring-1 ring-line">
          {keyLevels.map((level, index) => (
            <div key={level.label} style={staggerStyle(index + 2, 90)} className={cx('flex animate-feed-in items-end gap-2 motion-reduce:animate-none', index === 0 && 'rounded-[16px] bg-fg/[0.05] p-2.5')}>
              <dt className="shrink-0 text-xs text-fg-muted">{level.label}</dt>
              <span aria-hidden="true" className="mb-1 flex-1 border-b border-dotted border-line-strong" />
              <dd className={cx('flex shrink-0 items-center gap-1 font-mono font-black tabular-nums', index === 0 ? 'text-xl' : 'text-base', level.className)}>
                {level.showArrow && <DirectionIcon direction={view.direction} size={16} />}
                {level.value}
              </dd>
            </div>
          ))}
        </dl>

        <InkButton aria-expanded={isStoryOpen} onClick={() => setIsStoryOpen(true)} className="w-full">
          <span className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:rotate-12 motion-reduce:transition-none">
            <Icon name="bolt" size={14} />
          </span>
          <span className="relative flex-1 text-left">{analysisCopy.storyteller}</span>
          <span className="relative grid size-8 place-items-center rounded-full ring-1 ring-app/30 transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="arrowRight" size={14} />
          </span>
        </InkButton>
      </div>

      {isStoryOpen && <StorytellerPanel story={story} onClose={() => setIsStoryOpen(false)} />}
    </div>
  );
}

/** Published levels as a receipt, highest on top; the last-price row pulses. */
function LevelLadder({ view }: { view: TechnicalView }) {
  const pivot = toNumber(view.pivot);
  const rungs = [...view.levels].sort((a, b) => toNumber(b.value) - toNumber(a.value));

  return (
    <div className="flex h-full flex-col gap-3 rounded-[24px] p-4 ring-1 ring-line">
      <h3 className={cx(captionClass, 'flex items-center gap-2')}>
        <Icon name="signalBars" size={13} />
        {translate('tc.tv.levels')}
      </h3>
      <ol className="relative flex flex-1 flex-col justify-between gap-1">
        <span aria-hidden="true" className="absolute top-4 bottom-4 left-[11px] border-l border-dotted border-line-strong" />
        {rungs.map((level, index) => {
          const tone = levelTone[level.kind];
          const distance = ((toNumber(level.value) - pivot) / pivot) * 100;
          const isLast = level.kind === 'last';
          const isPivot = level.kind === 'pivot';
          return (
            <li
              key={`${level.kind}-${level.value}`}
              style={staggerStyle(index + 3, 60)}
              className={cx('relative flex animate-feed-in items-center gap-2.5 rounded-full py-1.5 pr-3 motion-reduce:animate-none', (isLast || isPivot) && 'bg-fg/[0.05]')}
            >
              <span aria-hidden="true" className="relative grid size-6 shrink-0 place-items-center">
                {isLast && <span className="absolute inset-0 animate-ping-soft rounded-full bg-fg/30 motion-reduce:animate-none" />}
                <span className={cx('relative size-3 rounded-full ring-4 ring-surface', tone.chip)} />
              </span>
              <span className="shrink-0 text-[11px] text-fg-muted">{translate(tone.nameKey)}</span>
              <span aria-hidden="true" className="flex-1 border-b border-dotted border-line" />
              <span className="shrink-0 font-mono text-sm font-bold text-fg tabular-nums">{level.value}</span>
              <span className="w-14 shrink-0 text-right font-mono text-[10px] text-fg-subtle tabular-nums">{isPivot ? '—' : `${distance > 0 ? '+' : ''}${distance.toFixed(2)}%`}</span>
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
    <section key={view.id} aria-label={view.symbol} style={staggerStyle(3, 160)} className={cx(panelClass, 'flex min-w-0 animate-rise flex-col gap-6 p-5 sm:p-6 motion-reduce:animate-none')}>
      <header className="flex flex-wrap items-center gap-4">
        <span className="relative grid size-16 shrink-0 place-items-center">
          <span aria-hidden="true" className={cx('absolute inset-0 animate-rim-spin rounded-full border border-dashed motion-reduce:animate-none', isUp ? 'border-success/50' : 'border-danger/50')} />
          <span className={cx('grid size-12 place-items-center rounded-full', isUp ? 'bg-success/15' : 'bg-danger/15')}>
            <DirectionIcon direction={view.direction} size={22} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-3xl font-black tracking-tight text-fg">{view.symbol}</h2>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted ring-1 ring-line">{view.timeframe}</span>
            <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', isUp ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger')}>
              {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-muted">{analysis.publishedAt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 font-mono text-xs text-fg ring-1 ring-line">
            <span className={cx(beadClass, 'size-7')}>
              <Icon name="clock" size={12} />
            </span>
            {analysis.localTime} ({LOCAL_TIMEZONE_LABEL})
          </p>
          <Link
            href="/trading-central/education"
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold text-fg-muted ring-1 ring-line transition-[color,box-shadow] duration-300 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="fileText" size={13} />
            {analysisCopy.learningCenter}
          </Link>
        </div>
      </header>

      <HorizonTrack horizons={analysis.horizons} value={horizon} onChange={setHorizon} />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-3 rounded-[24px] p-3 ring-1 ring-line sm:p-4">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="size-1.5 rounded-full bg-fg" />
                ))}
              </span>
              {translate('tc.tv.legendMaBb')}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="size-1.5 rounded-full bg-info" />
                ))}
              </span>
              {translate('tc.tv.legendMa50')}
            </span>
            <span className="ml-auto text-fg-subtle">{translate('tc.tv.research')}</span>
          </div>
          <TechnicalChart view={view} />
        </div>
        <LevelLadder view={view} />
      </div>

      <div className="border-t border-dotted border-line-strong pt-6">
        {horizon === primaryHorizon && <AnalysisPanel view={view} analysis={analysis} />}

        {activeHorizon && horizon !== primaryHorizon && (
          <div key={horizon} className="flex animate-rise items-center gap-4 rounded-[24px] border border-dashed border-line-strong p-5 motion-reduce:animate-none">
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
      <header className="flex animate-rise items-center gap-4 motion-reduce:animate-none">
        <SpinBead icon="pieChart" />
        <h1 className="min-w-0 truncate text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.tcTechnicalViews')}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <IntroCard assetClass={assetClass} onAssetChange={changeAssetClass} />
        <SentimentPanel bullish={bullish} bearish={bearish} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <SetupRail key={assetClass} views={visibleViews} selectedId={selectedView?.id} onSelect={setSelectedId} filter={filter} onFilterChange={setFilter} />

        {selectedView ? (
          <ViewDetail key={selectedView.id} view={selectedView} />
        ) : (
          <section className={cx(panelClass, 'p-5')}>
            <DotMatrixEmpty message={translate('tc.tv.emptyFilter')} />
          </section>
        )}
      </div>

      <footer className={cx(panelClass, 'flex gap-4 border border-dashed border-line-strong p-5 text-[11px] leading-relaxed text-fg-subtle')}>
        <span aria-hidden="true" className={cx(beadClass, 'size-9')}>
          <Icon name="info" size={15} />
        </span>
        <ol className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph, index) => (
            <li key={paragraph} className="flex gap-2.5">
              <span aria-hidden="true" className="font-mono text-[10px] font-bold text-fg-muted">
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
