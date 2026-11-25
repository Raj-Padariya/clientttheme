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

function Sparkline({ view }: { view: TechnicalView }) {
  const { closes } = seriesFor(view);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const points = closes
    .map((value, index) => `${((index / (closes.length - 1)) * 96).toFixed(1)},${(30 - ((value - min) / (max - min || 1)) * 28).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24 shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth="1.6" strokeLinejoin="round" className={view.direction === 'up' ? 'stroke-success' : 'stroke-danger'} />
    </svg>
  );
}

function SentimentGauge({ bullish, bearish }: { bullish: number; bearish: number }) {
  const total = bullish + bearish;
  const ratio = total > 0 ? bullish / total : 0.5;
  const angle = -90 + ratio * 180;

  return (
    <div style={staggerStyle(1, 200)} className="glass flex animate-rise flex-col items-center gap-3 rounded-xl p-5 motion-reduce:animate-none">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{translate('tc.tv.sentiment')}</p>
      <svg viewBox="0 0 160 92" className="w-52" aria-hidden="true">
        <defs>
          <linearGradient id="tv-gauge-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--color-danger)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--color-warning)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-success)' }} />
          </linearGradient>
        </defs>
        <path d="M 12 82 A 68 68 0 0 1 148 82" fill="none" stroke="url(#tv-gauge-gradient)" strokeWidth="12" strokeLinecap="round" />
        {[0, 45, 90, 135, 180].map((tick) => (
          <line
            key={tick}
            x1="80"
            y1="22"
            x2="80"
            y2="28"
            strokeWidth="2"
            className="stroke-surface"
            style={{ transform: `rotate(${tick - 90}deg)`, transformOrigin: '80px 82px' }}
          />
        ))}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '80px 82px' }} className="transition-transform duration-700 ease-out motion-reduce:transition-none">
          <line x1="80" y1="82" x2="80" y2="32" strokeWidth="3" strokeLinecap="round" className="stroke-fg" />
        </g>
        <circle cx="80" cy="82" r="7" className="fill-primary" />
        <circle cx="80" cy="82" r="3" className="fill-surface" />
      </svg>
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 ring-1 ring-success/30">
          <DirectionIcon direction="up" />
          <span className="text-xs text-fg-muted">{translate('tc.tv.bullish')}</span>
          <span className="ml-auto text-lg font-semibold tabular-nums text-fg">
            <CountUp value={bullish} format={(current) => String(Math.round(current))} />
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 ring-1 ring-danger/30">
          <DirectionIcon direction="down" />
          <span className="text-xs text-fg-muted">{translate('tc.tv.bearish')}</span>
          <span className="ml-auto text-lg font-semibold tabular-nums text-fg">
            <CountUp value={bearish} format={(current) => String(Math.round(current))} />
          </span>
        </div>
      </div>
    </div>
  );
}

function AssetSwitch({ value, onChange }: { value: AssetClass; onChange: (value: AssetClass) => void }) {
  const activeIndex = ASSET_CLASSES.indexOf(value);

  return (
    <div role="tablist" className="relative grid w-full max-w-md grid-cols-3 rounded-full bg-surface-2 p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        style={{ width: `calc((100% - 8px) / ${ASSET_CLASSES.length})`, transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute inset-y-1 left-1 rounded-full bg-primary shadow-[0_6px_18px_-6px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none"
      />
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
              'relative flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
            )}
          >
            {translate(`tc.tv.asset.${assetClass}`)}
            <span className={cx('rounded-full px-1.5 text-[10px] tabular-nums', isActive ? 'bg-black/15' : 'bg-surface')}>{count}</span>
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

function SignalBoard({
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
    <aside style={staggerStyle(1, 250)} className="flex animate-rise flex-col gap-4 rounded-xl bg-surface p-4 shadow-card lg:sticky lg:top-24 lg:self-start motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon name="pieChart" size={16} className="text-primary" />
          {translate('tc.tv.signals')}
        </h2>
        <span className="text-xs tabular-nums text-fg-muted">
          {views.length} {translate('tc.tv.setups')}
        </span>
      </div>

      <div className="flex gap-2">
        {DIRECTION_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => onFilterChange(option)}
            className={cx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
              filter === option ? 'bg-primary text-on-primary ring-primary shadow-[0_6px_16px_-8px_var(--brand-primary)]' : 'bg-surface-2 text-fg-muted ring-line hover:text-fg',
            )}
          >
            {option !== 'all' && <Icon name={option === 'up' ? 'trendUp' : 'trendDown'} size={13} />}
            {translate(directionFilterKey[option])}
          </button>
        ))}
      </div>

      {views.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">{translate('tc.tv.emptyFilter')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {views.map((view, index) => {
            const isSelected = view.id === selectedId;
            return (
              <li key={view.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-feed-in motion-reduce:animate-none">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(view.id)}
                  className={cx(
                    'group relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left ring-1 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                    isSelected ? 'bg-primary-soft shadow-[0_12px_26px_-18px_var(--brand-primary)] ring-primary/60' : 'bg-surface-2 ring-line hover:ring-line-strong',
                  )}
                >
                  <span aria-hidden="true" className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full transition-opacity', isSelected ? 'bg-primary opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-fg">{view.symbol}</span>
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-fg-subtle ring-1 ring-line">{view.timeframe}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-fg-subtle">
                      <Icon name="clock" size={11} />
                      {view.localTime} ({LOCAL_TIMEZONE_LABEL})
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className={cx('flex items-center gap-1 text-xs font-semibold tabular-nums', view.direction === 'up' ? 'text-success' : 'text-danger')}>
                      <DirectionIcon direction={view.direction} size={13} />
                      {view.move}
                    </span>
                    <Sparkline view={view} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function HorizonTabs({ horizons, value, onChange }: { horizons: TechnicalAnalysis['horizons']; value: AnalysisHorizon; onChange: (horizon: AnalysisHorizon) => void }) {
  return (
    <div role="tablist" aria-label="Analysis horizon" className="grid gap-2 sm:grid-cols-3">
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
              'group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-3.5 py-2.5 text-left ring-1 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-primary-soft ring-primary/60 shadow-[0_10px_24px_-16px_var(--brand-primary)]' : 'bg-surface-2 ring-line hover:ring-line-strong',
            )}
          >
            <span className={cx('absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300', isActive ? 'scale-x-100' : 'scale-x-0')} />
            <span className={cx('text-xs font-semibold tracking-wide uppercase', isActive ? 'text-primary' : 'text-fg-muted')}>{horizon.label}</span>
            <span className={cx('flex items-center gap-1 text-sm font-semibold tabular-nums', isUp ? 'text-success' : 'text-danger')}>
              <DirectionIcon direction={horizon.direction} size={14} />
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
    <div className="grid animate-rise gap-4 motion-reduce:animate-none lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="kpi-card relative flex flex-col gap-4 overflow-hidden rounded-xl p-4">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <h3 className="relative text-base leading-snug font-semibold text-fg">{analysis.headline}</h3>
        <dl className="relative flex flex-col gap-2">
          {keyLevels.map((level, index) => (
            <div
              key={level.label}
              style={{ animationDelay: `${200 + index * 90}ms` }}
              className="flex animate-feed-in items-center justify-between gap-3 rounded-lg bg-surface/70 px-3.5 py-3 ring-1 ring-line motion-reduce:animate-none"
            >
              <dt className="text-xs text-fg-muted">{level.label}</dt>
              <dd className={cx('flex items-center gap-1 font-mono text-lg font-semibold tabular-nums', level.className)}>
                {level.showArrow && <DirectionIcon direction={view.direction} size={16} />}
                {level.value}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          aria-expanded={isStoryOpen}
          onClick={() => setIsStoryOpen(true)}
          className="group relative mt-auto flex items-center justify-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-line transition-[box-shadow,color] duration-200 hover:text-primary hover:shadow-[0_10px_24px_-14px_var(--brand-primary)] hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="grid size-6 place-items-center rounded-md bg-linear-to-br from-primary to-info text-on-primary transition-transform duration-300 group-hover:rotate-12">
            <Icon name="bolt" size={13} />
          </span>
          {analysisCopy.storyteller}
        </button>
      </div>

      <ol className="relative flex flex-col gap-4 pl-6">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[11px] w-px bg-linear-to-b from-primary/70 via-line to-transparent" />
        {narrative.map((item, index) => (
          <li key={item.title} style={{ animationDelay: `${300 + index * 120}ms` }} className="relative animate-feed-in motion-reduce:animate-none">
            <span className="absolute top-0 -left-6 grid size-6 place-items-center rounded-full bg-surface text-primary ring-1 ring-primary/40">
              <Icon name={item.icon} size={12} />
            </span>
            <h4 className="text-sm font-semibold text-fg">{item.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.body}</p>
          </li>
        ))}
      </ol>

      {isStoryOpen && <StorytellerPanel story={story} onClose={() => setIsStoryOpen(false)} />}
    </div>
  );
}

function ViewDetail({ view }: { view: TechnicalView }) {
  const pivot = toNumber(view.pivot);
  const isUp = view.direction === 'up';
  const analysis = getTechnicalAnalysis(view);
  const primaryHorizon = analysis.horizons[0].id;
  const [horizon, setHorizon] = useState<AnalysisHorizon>(primaryHorizon);
  const activeHorizon = analysis.horizons.find((item) => item.id === horizon);

  return (
    <section
      key={view.id}
      aria-label={view.symbol}
      style={staggerStyle(2, 250)}
      className="glow-border flex min-w-0 animate-rise flex-col gap-5 rounded-xl bg-surface p-5 shadow-card motion-reduce:animate-none"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-fg">{view.symbol}</h2>
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg-muted ring-1 ring-line">{view.timeframe}</span>
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1',
                isUp ? 'bg-success/10 text-success ring-success/30' : 'bg-danger/10 text-danger ring-danger/30',
              )}
            >
              <DirectionIcon direction={view.direction} size={12} />
              {translate(isUp ? 'tc.tv.bullish' : 'tc.tv.bearish')}
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-muted">{analysis.publishedAt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg ring-1 ring-line">
            <Icon name="clock" size={13} className="text-primary" />
            {analysis.localTime} ({LOCAL_TIMEZONE_LABEL})
          </p>
          <LinkButton href="/trading-central/education" size="sm" variant="outline" leftIcon="fileText">
            {analysisCopy.learningCenter}
          </LinkButton>
        </div>
      </header>

      <HorizonTabs horizons={analysis.horizons} value={horizon} onChange={setHorizon} />

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

      <div className="overflow-hidden rounded-lg bg-surface-2 p-2 ring-1 ring-line">
        <TechnicalChart view={view} />
      </div>

      {horizon === primaryHorizon && <AnalysisPanel view={view} analysis={analysis} />}

      {activeHorizon && horizon !== primaryHorizon && (
        <div key={horizon} className="flex animate-rise items-center gap-4 rounded-xl border border-dashed border-line-strong bg-surface-2/60 p-5 motion-reduce:animate-none">
          <span className="grid size-11 shrink-0 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
            <Icon name="clock" size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">
              {activeHorizon.label}: <span className={activeHorizon.direction === 'up' ? 'text-success' : 'text-danger'}>{activeHorizon.move}</span>
            </p>
            <p className="mt-0.5 text-sm text-fg-muted">The {activeHorizon.label.toLowerCase()} write-up for {view.symbol} is on the way.</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">{translate('tc.tv.levels')}</h3>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {view.levels.map((level, index) => {
            const tone = levelTone[level.kind];
            const distance = ((toNumber(level.value) - pivot) / pivot) * 100;
            return (
              <li
                key={`${level.kind}-${level.value}`}
                style={{ animationDelay: `${300 + index * 60}ms` }}
                className="flex animate-feed-in items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-hover motion-reduce:animate-none"
              >
                <span className={cx('size-2.5 shrink-0 rounded-full', tone.chip)} />
                <span className="text-xs text-fg-muted">{translate(tone.nameKey)}</span>
                <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-fg">{level.value}</span>
                <span className="w-16 text-right text-[11px] tabular-nums text-fg-subtle">
                  {level.kind === 'pivot' ? '—' : `${distance > 0 ? '+' : ''}${distance.toFixed(2)}%`}
                </span>
              </li>
            );
          })}
        </ul>
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

      <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-96 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
        />
        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="flex flex-col gap-4">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
              <LiveDot />
              {translate('tc.tv.eyebrow')}
            </p>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('nav.tcTechnicalViews')}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{translate('tc.tv.subtitle')}</p>
            </div>
            <AssetSwitch value={assetClass} onChange={changeAssetClass} />
          </div>
          <SentimentGauge bullish={bullish} bearish={bearish} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <SignalBoard
          key={assetClass}
          views={visibleViews}
          selectedId={selectedView?.id}
          onSelect={setSelectedId}
          filter={filter}
          onFilterChange={setFilter}
        />
        {selectedView ? (
          <ViewDetail key={selectedView.id} view={selectedView} />
        ) : (
          <section className="flex flex-col items-center justify-center gap-3 rounded-xl bg-surface p-10 text-center shadow-card">
            <span className="grid size-14 animate-float place-items-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
              <Icon name="pieChart" size={24} />
            </span>
            <p className="text-sm font-medium text-fg">{translate('tc.tv.emptyFilter')}</p>
          </section>
        )}
      </div>

      <footer className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-5 text-[11px] leading-relaxed text-fg-subtle">
        {disclaimerParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </footer>
    </div>
  );
}
