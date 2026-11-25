'use client';

import { useState } from 'react';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { LinkButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
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

const eyebrow = 'text-[10px] font-semibold tracking-[0.16em] uppercase';
const pad2 = (value: number) => String(value).padStart(2, '0');
const SENTIMENT_SEGMENTS = 24;

function Sparkline({ view }: { view: TechnicalView }) {
  const { closes } = seriesFor(view);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const points = closes
    .map((value, index) => `${((index / (closes.length - 1)) * 96).toFixed(1)},${(30 - ((value - min) / (max - min || 1)) * 28).toFixed(1)}`)
    .join(' ');
  const isUp = view.direction === 'up';

  return (
    <svg viewBox="0 0 96 32" preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
      <polygon points={`0,32 ${points} 96,32`} className={isUp ? 'fill-success/10' : 'fill-danger/10'} />
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.6"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={isUp ? 'stroke-success' : 'stroke-danger'}
      />
    </svg>
  );
}

/** Bulls vs bears as a segmented tug-of-war bar with a caret at the split. */
function SentimentMeter({ bullish, bearish }: { bullish: number; bearish: number }) {
  const total = bullish + bearish;
  const ratio = total > 0 ? bullish / total : 0.5;
  const bullSegments = Math.round(ratio * SENTIMENT_SEGMENTS);
  const formatCount = (current: number) => String(Math.round(current));

  return (
    <div style={staggerStyle(1, 200)} className="flex animate-rise flex-col gap-4 rounded-2xl border border-line bg-fg/[0.02] p-4 motion-reduce:animate-none">
      <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('tc.tv.sentiment')}</p>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            <DirectionIcon direction="up" size={14} />
            {translate('tc.tv.bullish')}
          </span>
          <span className="font-mono text-3xl leading-none font-semibold text-success tabular-nums">
            <CountUp value={bullish} format={formatCount} />
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            {translate('tc.tv.bearish')}
            <DirectionIcon direction="down" size={14} />
          </span>
          <span className="font-mono text-3xl leading-none font-semibold text-danger tabular-nums">
            <CountUp value={bearish} format={formatCount} />
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="relative pt-3">
        <span
          style={{ left: `${ratio * 100}%` }}
          className="absolute top-0 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-fg shadow-[0_0_8px_var(--brand-primary)] transition-[left] duration-700 ease-out motion-reduce:transition-none"
        />
        <div className="flex h-8 items-end gap-1">
          {Array.from({ length: SENTIMENT_SEGMENTS }, (_, index) => {
            const isBull = index < bullSegments;
            const distanceFromSplit = Math.abs(index + 0.5 - ratio * SENTIMENT_SEGMENTS);
            return (
              <span
                key={index}
                style={{ height: `${Math.max(35, 100 - distanceFromSplit * 6)}%`, animationDelay: `${index * 25}ms` }}
                className={cx(
                  'flex-1 origin-bottom animate-[grow-y_0.6s_ease-out_both] rounded-sm transition-colors duration-500 motion-reduce:animate-none',
                  isBull ? 'bg-success/70' : 'bg-danger/60',
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AssetTabs({ value, onChange }: { value: AssetClass; onChange: (value: AssetClass) => void }) {
  return (
    <div role="tablist" className="grid grid-cols-3 divide-x divide-line border-t border-line">
      {ASSET_CLASSES.map((assetClass) => {
        const isActive = assetClass === value;
        const count = technicalViews.filter((view) => view.assetClass === assetClass).length;
        return (
          <button
            key={assetClass}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(assetClass)}
            className={cx(
              'relative flex items-center justify-between gap-2 px-4 py-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6',
              isActive ? 'bg-primary/[0.08] text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-x-0 top-0 h-0.5 origin-center bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-transform duration-300 motion-reduce:transition-none',
                isActive ? 'scale-x-100' : 'scale-x-0',
              )}
            />
            <span className="truncate">{translate(`tc.tv.asset.${assetClass}`)}</span>
            <span
              className={cx(
                'rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
                isActive ? 'border-primary/40 bg-primary/15 text-primary' : 'border-line text-fg-subtle',
              )}
            >
              {pad2(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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

  const endX = indexToX(series.candles.length - 1);
  const endY = priceToY(series.endPrice);
  const targetY = priceToY(toNumber(view.target));
  const projectionColor = view.direction === 'up' ? 'stroke-success' : 'stroke-danger';
  const arrowId = `tv-arrow-${view.id}`;

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
        <marker id={arrowId} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" className={view.direction === 'up' ? 'fill-success' : 'fill-danger'} />
        </marker>
      </defs>

      {[0.25, 0.5, 0.75].map((fraction) => {
        const gridY = CHART.top + (plotBottom - CHART.top) * fraction;
        return <line key={fraction} x1={CHART.left} x2={plotRight} y1={gridY} y2={gridY} strokeDasharray="2 6" className="stroke-line" />;
      })}
      <line x1={CHART.left} x2={plotRight} y1={plotBottom} y2={plotBottom} className="stroke-line-strong" />
      {view.axisLabels.map((label, index) => (
        <text key={label} x={axisPositions[index]} y={CHART.height - 8} textAnchor="middle" className="fill-fg-subtle text-[10px]">
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
          strokeWidth={level.kind === 'pivot' || level.kind === 'last' ? 1.4 : 1.1}
          strokeDasharray={level.kind === 'last' ? '3 3' : undefined}
          className={cx(levelTone[level.kind].line, 'opacity-70')}
        />
      ))}

      <g className="animate-reveal motion-reduce:animate-none">
        <path d={bandPath} className="fill-primary/10" />
        <path d={linePath(series.ma20)} fill="none" strokeWidth="1.5" className="stroke-primary" />
        <path d={linePath(series.ma50)} fill="none" strokeWidth="1.5" className="stroke-info" />
        {series.candles.map((candle, index) => {
          const rising = candle.close >= candle.open;
          const bodyTop = priceToY(Math.max(candle.open, candle.close));
          const bodyHeight = Math.max(1, priceToY(Math.min(candle.open, candle.close)) - bodyTop);
          const centerX = indexToX(index);
          return (
            <g key={index} className={rising ? 'fill-success stroke-success' : 'fill-danger stroke-danger'}>
              <line x1={centerX} x2={centerX} y1={priceToY(candle.high)} y2={priceToY(candle.low)} strokeWidth="1" />
              <rect x={centerX - step * 0.32} y={bodyTop} width={step * 0.64} height={bodyHeight} rx="0.6" strokeWidth="0" />
            </g>
          );
        })}
      </g>

      <g className="animate-fade motion-reduce:animate-none">
        <path
          d={`M${endX.toFixed(1)},${endY.toFixed(1)} L${(endX + CHART.projection * 0.35).toFixed(1)},${endY.toFixed(1)} L${(plotRight - 8).toFixed(1)},${targetY.toFixed(1)}`}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={`url(#${arrowId})`}
          className={projectionColor}
        />
        <circle cx={endX} cy={endY} r="7" className="animate-pulse fill-primary/30 motion-reduce:animate-none" />
        <circle cx={endX} cy={endY} r="3.5" className="fill-primary" />

        {labels.map(({ level, lineY, labelY }) => (
          <g key={`label-${level.kind}-${level.value}`}>
            {Math.abs(labelY - lineY) > 1 && <line x1={plotRight} x2={plotRight + 4} y1={lineY} y2={labelY} className={levelTone[level.kind].line} />}
            <rect x={plotRight + 4} y={labelY - LABEL_HEIGHT / 2} width={CHART.labelWidth - 4} height={LABEL_HEIGHT} rx="3" className={levelTone[level.kind].label} />
            <text x={plotRight + 4 + (CHART.labelWidth - 4) / 2} y={labelY + 3.5} textAnchor="middle" className={cx('font-mono text-[10px] font-semibold', levelTone[level.kind].text)}>
              {level.value}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Horizontal tape of setups under the hero; each card carries its own sparkline. */
function SignalTape({
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
    <section style={staggerStyle(1, 200)} className="flex min-w-0 animate-rise flex-col gap-3 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span className="grid size-7 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Icon name="pieChart" size={14} />
          </span>
          {translate('tc.tv.signals')}
        </h2>
        <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-fg-muted tabular-nums">
          {views.length} {translate('tc.tv.setups')}
        </span>
        <div className="ml-auto inline-grid grid-cols-3 rounded-xl border border-line bg-fg/[0.02] p-1">
          {DIRECTION_FILTERS.map((option) => {
            const isActive = filter === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isActive}
                onClick={() => onFilterChange(option)}
                className={cx(
                  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'bg-primary/20 text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {option !== 'all' && <Icon name={option === 'up' ? 'trendUp' : 'trendDown'} size={13} className={option === 'up' ? 'text-success' : 'text-danger'} />}
                {translate(directionFilterKey[option])}
              </button>
            );
          })}
        </div>
      </div>

      {views.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">{translate('tc.tv.emptyFilter')}</p>
      ) : (
        <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
          {views.map((view, index) => {
            const isSelected = view.id === selectedId;
            const isUp = view.direction === 'up';
            return (
              <li key={view.id} style={{ animationDelay: `${index * 50}ms` }} className="w-56 shrink-0 animate-feed-in motion-reduce:animate-none">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(view.id)}
                  className={cx(
                    'group relative flex w-full flex-col gap-2 overflow-hidden rounded-2xl border p-3.5 text-left transition-[background-color,border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                    isSelected
                      ? 'border-primary/55 bg-primary/[0.1] shadow-[0_18px_36px_-24px_var(--brand-primary)]'
                      : 'orbit-card hover:border-primary/35',
                  )}
                >
                  {isSelected && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent" />}
                  <span className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm font-semibold text-fg">{view.symbol}</span>
                    <span className="rounded border border-line px-1 py-0.5 text-[9px] font-semibold tracking-wide text-fg-subtle">{view.timeframe}</span>
                    {isSelected && (
                      <span aria-hidden="true" className="relative ml-auto flex size-2">
                        <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none" />
                        <span className="relative size-2 rounded-full bg-primary" />
                      </span>
                    )}
                  </span>
                  <Sparkline view={view} />
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
                      <Icon name="clock" size={11} />
                      {view.localTime} ({LOCAL_TIMEZONE_LABEL})
                    </span>
                    <span
                      className={cx(
                        'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                        isUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                      )}
                    >
                      <DirectionIcon direction={view.direction} size={12} />
                      {view.move}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HorizonBar({ horizons, value, onChange }: { horizons: TechnicalAnalysis['horizons']; value: AnalysisHorizon; onChange: (horizon: AnalysisHorizon) => void }) {
  return (
    <div role="tablist" aria-label="Analysis horizon" className="grid divide-x divide-line border-b border-line sm:grid-cols-3">
      {horizons.map((horizon) => {
        const isActive = horizon.id === value;
        const isUp = horizon.direction === 'up';
        return (
          <button
            key={horizon.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(horizon.id)}
            className={cx(
              'relative flex flex-col gap-1 px-5 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              isActive ? 'bg-primary/[0.08]' : 'hover:bg-hover',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary shadow-[0_0_10px_var(--brand-primary)] transition-transform duration-300 motion-reduce:transition-none',
                isActive ? 'scale-x-100' : 'scale-x-0',
              )}
            />
            <span className={cx(eyebrow, isActive ? 'text-primary' : 'text-fg-subtle')}>{horizon.label}</span>
            <span className={cx('flex items-center gap-1 font-mono text-lg font-semibold tabular-nums', isUp ? 'text-success' : 'text-danger')}>
              <DirectionIcon direction={horizon.direction} size={16} />
              {horizon.move}
            </span>
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
  const narrative = [
    { title: analysisCopy.preference, body: analysis.preference, icon: isUp ? 'trendUp' : 'trendDown' },
    { title: analysisCopy.alternative, body: analysis.alternative, icon: 'refresh' },
    { title: analysisCopy.comment, body: analysis.comment, icon: 'fileText' },
  ] as const;

  return (
    <div className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
      <h3 className="border-l-2 border-primary pl-4 text-lg leading-snug font-semibold text-fg">{analysis.headline}</h3>

      <dl className="grid overflow-hidden rounded-2xl border border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
        {keyLevels.map((level, index) => (
          <div
            key={level.label}
            style={{ animationDelay: `${200 + index * 90}ms` }}
            className={cx('flex animate-feed-in flex-col gap-1 px-4 py-3 motion-reduce:animate-none', index === 0 && 'bg-primary/[0.07]')}
          >
            <dt className={cx(eyebrow, 'text-fg-subtle')}>{level.label}</dt>
            <dd className={cx('flex items-center gap-1 font-mono text-xl font-semibold tabular-nums', level.className)}>
              {level.showArrow && <DirectionIcon direction={view.direction} size={16} />}
              {level.value}
            </dd>
          </div>
        ))}
      </dl>

      <ol className="grid gap-3 md:grid-cols-3">
        {narrative.map((item, index) => (
          <li key={item.title} style={{ animationDelay: `${300 + index * 120}ms` }} className="flex animate-feed-in flex-col gap-2 rounded-2xl border border-line bg-fg/[0.02] p-4 motion-reduce:animate-none">
            <span className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Icon name={item.icon} size={13} />
              </span>
              <h4 className="text-sm font-semibold text-fg">{item.title}</h4>
              <span className="ml-auto font-mono text-[10px] text-fg-subtle">{pad2(index + 1)}</span>
            </span>
            <p className="text-sm leading-relaxed text-fg-muted">{item.body}</p>
          </li>
        ))}
      </ol>

      <button
        type="button"
        aria-expanded={isStoryOpen}
        onClick={() => setIsStoryOpen(true)}
        className="group flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3 text-left text-sm font-semibold text-fg transition-[border-color,box-shadow] duration-200 hover:border-primary/55 hover:shadow-[0_14px_30px_-20px_var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="grid size-8 place-items-center rounded-xl bg-primary/25 text-primary transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
          <Icon name="bolt" size={15} />
        </span>
        {analysisCopy.storyteller}
        <Icon name="arrowRight" size={16} className="ml-auto text-primary transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </button>

      {isStoryOpen && <StorytellerPanel story={story} onClose={() => setIsStoryOpen(false)} />}
    </div>
  );
}

/** Published levels as a vertical price ladder, highest on top; the last price row pulses. */
function LevelLadder({ view }: { view: TechnicalView }) {
  const pivot = toNumber(view.pivot);
  const rungs = [...view.levels].sort((a, b) => toNumber(b.value) - toNumber(a.value));

  return (
    <div className="flex flex-col gap-3">
      <h3 className={cx(eyebrow, 'flex items-center gap-2 text-fg-subtle')}>
        <Icon name="signalBars" size={13} className="text-primary" />
        {translate('tc.tv.levels')}
      </h3>
      <ol className="relative flex flex-col gap-1.5">
        <span aria-hidden="true" className="absolute top-3 bottom-3 left-[7px] w-px bg-linear-to-b from-success/50 via-line-strong to-danger/50" />
        {rungs.map((level, index) => {
          const tone = levelTone[level.kind];
          const distance = ((toNumber(level.value) - pivot) / pivot) * 100;
          const isLast = level.kind === 'last';
          const isPivot = level.kind === 'pivot';
          return (
            <li
              key={`${level.kind}-${level.value}`}
              style={{ animationDelay: `${300 + index * 60}ms` }}
              className="relative flex animate-feed-in items-center gap-3 motion-reduce:animate-none"
            >
              <span aria-hidden="true" className="relative grid size-[15px] shrink-0 place-items-center">
                {isLast && <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/50 motion-reduce:animate-none" />}
                <span className={cx('relative size-2.5 rounded-full ring-2 ring-surface', tone.chip)} />
              </span>
              <span
                className={cx(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 transition-colors hover:border-primary/35',
                  isLast || isPivot ? 'border-primary/30 bg-primary/[0.07]' : 'border-line bg-fg/[0.02]',
                )}
              >
                <span className="text-[11px] text-fg-muted">{translate(tone.nameKey)}</span>
                <span className="ml-auto font-mono text-sm font-semibold text-fg tabular-nums">{level.value}</span>
                <span className="w-14 text-right font-mono text-[10px] text-fg-subtle tabular-nums">
                  {isPivot ? '—' : `${distance > 0 ? '+' : ''}${distance.toFixed(2)}%`}
                </span>
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
    <section key={view.id} aria-label={view.symbol} style={staggerStyle(2, 200)} className="orbit-card min-w-0 animate-rise overflow-hidden motion-reduce:animate-none">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex items-center gap-4">
          <span
            className={cx(
              'grid size-12 shrink-0 place-items-center rounded-2xl border',
              isUp ? 'border-success/35 bg-success/10' : 'border-danger/35 bg-danger/10',
            )}
          >
            <DirectionIcon direction={view.direction} size={22} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-2xl font-semibold tracking-tight text-fg">{view.symbol}</h2>
              <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted">{view.timeframe}</span>
              <span className={cx('text-[11px] font-semibold tracking-wide uppercase', isUp ? 'text-success' : 'text-danger')}>
                {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">{analysis.publishedAt}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 rounded-lg border border-line bg-fg/[0.03] px-2.5 py-1 font-mono text-xs text-fg">
            <Icon name="clock" size={13} className="text-primary" />
            {analysis.localTime} ({LOCAL_TIMEZONE_LABEL})
          </p>
          <LinkButton href="/trading-central/education" size="sm" variant="outline" leftIcon="fileText">
            {analysisCopy.learningCenter}
          </LinkButton>
        </div>
      </header>

      <HorizonBar horizons={analysis.horizons} value={horizon} onChange={setHorizon} />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-primary" />
                {translate('tc.tv.legendMaBb')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-info" />
                {translate('tc.tv.legendMa50')}
              </span>
              <span className="ml-auto text-fg-subtle">{translate('tc.tv.research')}</span>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-fg/[0.02] p-2">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-comet bg-linear-to-r from-transparent via-primary/[0.06] to-transparent [animation-duration:7s] motion-reduce:hidden" />
              <TechnicalChart view={view} />
            </div>
          </div>

          {horizon === primaryHorizon && <AnalysisPanel view={view} analysis={analysis} />}

          {activeHorizon && horizon !== primaryHorizon && (
            <div key={horizon} className="flex animate-rise items-center gap-4 rounded-2xl border border-dashed border-line-strong p-5 motion-reduce:animate-none">
              <span className="relative grid size-11 shrink-0 place-items-center">
                <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
                <Icon name="clock" size={20} className="relative text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">
                  {activeHorizon.label}: <span className={activeHorizon.direction === 'up' ? 'text-success' : 'text-danger'}>{activeHorizon.move}</span>
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  The {activeHorizon.label.toLowerCase()} write-up for {view.symbol} is on the way.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line p-5 xl:border-t-0 xl:border-l">
          <LevelLadder view={view} />
        </div>
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
    const classViews = technicalViews.filter((view) => view.assetClass === next);
    const first = classViews[0];
    if (first) setSelectedId(first.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.tcTechnicalViews')} />

      <section className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/3 -z-10 size-96 animate-drift rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center">
          <div className="flex flex-col gap-3">
            <p className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <LiveDot />
              {translate('tc.tv.eyebrow')}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('nav.tcTechnicalViews')}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-fg-muted">{translate('tc.tv.subtitle')}</p>
          </div>
          <SentimentMeter bullish={bullish} bearish={bearish} />
        </div>

        <AssetTabs value={assetClass} onChange={changeAssetClass} />
      </section>

      <SignalTape key={assetClass} views={visibleViews} selectedId={selectedView?.id} onSelect={setSelectedId} filter={filter} onFilterChange={setFilter} />

      {selectedView ? (
        <ViewDetail key={selectedView.id} view={selectedView} />
      ) : (
        <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <span className="relative grid size-14 place-items-center">
            <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
            <Icon name="pieChart" size={24} className="relative text-primary" />
          </span>
          <p className="text-sm font-medium text-fg">{translate('tc.tv.emptyFilter')}</p>
        </section>
      )}

      <footer className="orbit-card flex gap-4 p-5 text-[11px] leading-relaxed text-fg-subtle">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-fg/[0.03] text-fg-muted">
          <Icon name="info" size={16} />
        </span>
        <div className="flex flex-col gap-2">
          {disclaimerParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </footer>
    </div>
  );
}
