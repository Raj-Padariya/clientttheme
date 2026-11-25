'use client';

import type { ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { DashboardStats, DashboardTrendKey } from '@/core/types';
import { cx } from '../lib/cx';

import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';


const TILE_START_MS = 160;
const PIECE_STAGGER_MS = 60;

type Trend = 'up' | 'down' | 'flat';
type Visual = 'grid' | 'candles' | 'waveform' | 'curve';

interface Tile {
  key: DashboardTrendKey;
  label: string;
  value: string;
  note: string;
  icon: IconName;
  visual: Visual;
}

const trendClass: Record<Trend, string> = {
  up: 'text-primary',
  down: 'text-danger',
  flat: 'text-fg-subtle',
};

// Scales and transitions SVG pieces from their own box, not from the SVG's origin.
const pieceClass = '[transform-box:fill-box] animate-bar-rise motion-reduce:animate-none';

function buildTiles(stats: DashboardStats): Tile[] {
  const equityRatio = stats.totalBalance === 0 ? 0 : stats.totalEquity / stats.totalBalance;
  return [
    { key: 'liveAccounts', label: translate('home.liveAccounts'), value: String(stats.liveAccounts), note: translate('home.activeTrading'), icon: 'accounts', visual: 'grid' },
    { key: 'todayLots', label: translate('home.todayLots'), value: stats.todayLots.toFixed(2), note: translate('home.lotsToday'), icon: 'trendUp', visual: 'candles' },
    { key: 'monthDeposits', label: translate('home.thisMonth'), value: formatMoney(stats.monthDeposits, stats.currency), note: translate('home.monthlyDeposits'), icon: 'deposit', visual: 'waveform' },
    {
      key: 'totalEquity',
      label: translate('home.totalEquity'),
      value: formatMoney(stats.totalEquity, stats.currency),
      note: translate('home.equityOfBalance', { percent: `${Math.round(equityRatio * 100)}%` }),
      icon: 'bolt',
      visual: 'curve',
    },
  ];
}

// Change of the latest day against the day before; a jump from zero has no meaningful percent.
function describeChange(series: number[]): { trend: Trend; text: string } {
  const latest = series[series.length - 1] ?? 0;
  const previous = series[series.length - 2] ?? latest;
  if (latest === previous) return { trend: 'flat', text: `0.0% ${translate('home.vsYesterday')}` };
  const trend: Trend = latest > previous ? 'up' : 'down';
  const arrow = trend === 'up' ? '▲' : '▼';
  if (previous === 0) return { trend, text: `${arrow} ${translate('home.vsYesterday')}` };
  const percent = Math.abs(((latest - previous) / Math.abs(previous)) * 100);
  return { trend, text: `${arrow} ${percent.toFixed(1)}% ${translate('home.vsYesterday')}` };
}

// Maps a series onto 0..1; a flat series sits in the middle.
function normalize(series: number[]): number[] {
  const min = Math.min(...series);
  const range = Math.max(...series) - min;
  return series.map((value) => (range === 0 ? 0.5 : (value - min) / range));
}

function staggered(index: number) {
  return { animationDelay: `${TILE_START_MS + 200 + index * PIECE_STAGGER_MS}ms` };
}

// Column of squares per day; taller columns on busier days, the latest day's top square lit.
function PixelGrid({ series }: { series: number[] }) {
  const rows = 5;
  const cell = 11;
  const step = 14;
  const levels = normalize(series.slice(-6)).map((value) => 1 + Math.round(value * 3));
  const offsetX = 120 - levels.length * step;

  return levels.map((level, column) => {
    const isLatest = column === levels.length - 1;
    return Array.from({ length: rows }, (_, row) => {
      const fromBottom = rows - 1 - row;
      const isFilled = fromBottom < level;
      const isPeak = isLatest && fromBottom === level - 1;
      return (
        <rect
          key={`${column}-${row}`}
          x={offsetX + column * step}
          y={8 + row * step}
          width={cell}
          height={cell}
          rx="2"
          fill={isPeak ? 'currentColor' : inkColor}
          opacity={isPeak ? 1 : isFilled ? 0.32 : 0.07}
          className={cx(isPeak ? 'animate-glow motion-reduce:animate-none' : cx('origin-bottom', pieceClass))}
          style={isPeak ? undefined : staggered(column)}
        />
      );
    });
  });
}

// Light mode pairs gold highlights with graphite bodies; --chart-ink is unset in dark mode, so everything stays gold there.
const inkColor = 'var(--chart-ink, currentColor)';

// One candle per day: opens at the previous day's value, closes at the day's value.
function Candles({ series }: { series: number[] }) {
  const points = normalize(series.slice(-7));
  const candles = points.slice(1).map((close, index) => ({ open: points[index], close }));
  const slot = 120 / Math.max(candles.length, 1);
  const toY = (value: number) => 68 - value * 52;

  return candles.map((candle, index) => {
    const x = slot * index + slot / 2;
    const top = toY(Math.max(candle.open, candle.close));
    const bottom = toY(Math.min(candle.open, candle.close));
    const bodyHeight = Math.max(bottom - top, 4);
    const bodyY = (top + bottom) / 2 - bodyHeight / 2;
    const isUp = candle.close >= candle.open;
    return (
      <g key={index} className={cx('origin-center', pieceClass)} style={staggered(index)}>
        <line x1={x} x2={x} y1={bodyY - 9} y2={bodyY + bodyHeight + 9} stroke={inkColor} strokeWidth="1.2" opacity="0.55" />
        <rect
          x={x - 4.5}
          y={bodyY}
          width="9"
          height={bodyHeight}
          rx="2.5"
          fill={isUp ? 'currentColor' : 'var(--bg-surface)'}
          stroke={isUp ? 'currentColor' : inkColor}
          strokeWidth="1.2"
        />
      </g>
    );
  });
}

// Mirrored bars around the latest day, like an audio level meter.
function Waveform({ series }: { series: number[] }) {
  const points = normalize(series.slice(-8));
  const latestFirst = [...points].reverse();
  const bars = [...latestFirst.slice(1).reverse(), ...latestFirst];
  const center = (bars.length - 1) / 2;
  const gap = 120 / (bars.length + 1);

  return bars.map((value, index) => {
    const distance = center === 0 ? 0 : Math.abs(index - center) / center;
    const halfHeight = (0.25 + 0.75 * value) * (1 - distance * 0.55) * 34;
    const x = gap * (index + 1);
    return (
      <line
        key={index}
        x1={x}
        x2={x}
        y1={40 - halfHeight}
        y2={40 + halfHeight}
        stroke={distance === 0 ? 'currentColor' : inkColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={1 - distance * 0.7}
        className={cx('origin-center', pieceClass)}
        style={staggered(Math.round(Math.abs(index - center)))}
      />
    );
  });
}

// Smoothed line inside a framed panel; quadratic segments through the midpoints keep it soft.
function Curve({ series }: { series: number[] }) {
  const points = normalize(series.slice(-10)).map((value, index, all) => ({
    x: all.length === 1 ? 112 : 10 + (index / (all.length - 1)) * 102,
    y: 64 - value * 46,
  }));
  const first = points[0];
  const last = points[points.length - 1];
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return `Q${point.x},${point.y} ${(point.x + next.x) / 2},${(point.y + next.y) / 2}`;
  });
  const line = `M${first.x},${first.y} ${segments.join(' ')} L${last.x},${last.y}`;
  const area = `${line} L${last.x},74 L${first.x},74 Z`;

  return (
    <>
      <rect x="4" y="4" width="112" height="72" rx="8" fill={inkColor} fillOpacity="0.05" stroke={inkColor} strokeOpacity="0.16" />
      <path d="M43 4V76M80 4V76M4 40H116" stroke={inkColor} strokeOpacity="0.08" />
      <path d={area} fill="currentColor" fillOpacity="0.1" className="animate-fade motion-reduce:animate-none" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        className="animate-draw motion-reduce:animate-none"
      />
      <circle cx={last.x} cy={last.y} r="2.6" fill="currentColor" className="animate-glow motion-reduce:animate-none" />
    </>
  );
}

const visuals: Record<Visual, (props: { series: number[] }) => ReactNode> = {
  grid: PixelGrid,
  candles: Candles,
  waveform: Waveform,
  curve: Curve,
};

function TileVisual({ visual, series }: { visual: Visual; series: number[] }) {
  if (series.length === 0) return null;
  const Shape = visuals[visual];
  return (
    <svg aria-hidden="true" viewBox="0 0 120 80" className="pointer-events-none h-9 w-16 shrink-0 overflow-visible text-primary">
      <Shape series={series} />
    </svg>
  );
}

// "$1,090.00" → "$1,090" + dim ".00", as in the reference stat boxes.
function SplitDecimals({ value }: { value: string }) {
  const decimalIndex = value.lastIndexOf('.');
  if (decimalIndex === -1) return <>{value}</>;
  return (
    <>
      {value.slice(0, decimalIndex)}
      <span className="text-fg-subtle">{value.slice(decimalIndex)}</span>
    </>
  );
}

interface KpiRowProps {
  tile: Tile;
  index: number;
  series: number[];
}

// One stat row: the icon rides a tiny orbit, label and note on the left, value and day change on the right.
function KpiRow({ tile, index, series }: KpiRowProps) {
  const change = describeChange(series);
  const isReverse = index % 2 === 1;

  return (
    <li
      className="group relative flex min-w-0 animate-rise items-center gap-3 rounded-2xl px-2.5 py-3 transition-colors duration-300 hover:bg-hover motion-reduce:animate-none motion-reduce:transition-none"
      style={{ animationDelay: `${TILE_START_MS + index * PIECE_STAGGER_MS}ms` }}
    >
      <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
        <span className={cx('orbit-ring absolute inset-0 opacity-70', isReverse ? 'animate-orbit-spin-rev' : 'animate-orbit-spin', 'motion-reduce:animate-none')}>
          <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_2px_var(--brand-primary)]" />
        </span>
        <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/30 transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
          <Icon name={tile.icon} size={13} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-fg-muted">{tile.label}</p>
        <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{tile.note}</p>
      </div>

      <TileVisual visual={tile.visual} series={series} />

      <div className="flex min-w-0 shrink-0 flex-col items-end">
        <p className="truncate text-lg leading-tight font-medium tracking-[-0.01em] text-fg tabular-nums">
          <SplitDecimals value={tile.value} />
        </p>
        <p className={cx('text-[11px] whitespace-nowrap tabular-nums', trendClass[change.trend])}>{change.text}</p>
      </div>
    </li>
  );
}

// The four KPIs as a vertical stat list inside one card; rows are separated by hairlines.
export function KpiTiles({ stats, className }: { stats?: DashboardStats; className?: string }) {
  if (!stats) {
    return <Skeleton className={cx('h-[300px] rounded-[24px]', className)} />;
  }

  return (
    <div className={cx('orbit-card min-w-0 p-2.5', className)}>
      <ul className="flex flex-col divide-y divide-line">
        {buildTiles(stats).map((tile, index) => (
          <KpiRow key={tile.key} tile={tile} index={index} series={stats.trends[tile.key]} />
        ))}
      </ul>
    </div>
  );
}
