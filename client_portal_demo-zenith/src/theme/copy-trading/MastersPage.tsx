'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { Input } from '../ui/Input';
import { masterPlans, minInvestmentLabel, type MasterPlan } from './mastersData';
import { StartCopyModal } from './StartCopyModal';

type RiskTier = 'all' | 'low' | 'medium' | 'high';
type TrackRecord = 'all' | '30' | '90';
type SortKey = 'gain' | 'drawdown' | 'pnl' | 'copiers' | 'fee';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 9;
const COMMUNITY_AUM = 18_410;
const ENROLLED_COUNT = 0;
const RISK_LEVELS = 5;
const SPOT_PIXELS = 64;

const RED = 'var(--zenith-red)';

const riskTiers: { tier: RiskTier; labelKey: MessageKey; dot: string }[] = [
  { tier: 'all', labelKey: 'copy.explore.risk.all', dot: 'bg-fg' },
  { tier: 'low', labelKey: 'copy.explore.risk.low', dot: 'bg-success' },
  { tier: 'medium', labelKey: 'copy.explore.risk.medium', dot: 'bg-warning' },
  { tier: 'high', labelKey: 'copy.explore.risk.high', dot: 'bg-[var(--zenith-red)]' },
];

const matchesRiskTier: Record<RiskTier, (risk: number) => boolean> = {
  all: () => true,
  low: (risk) => risk <= 2,
  medium: (risk) => risk === 3,
  high: (risk) => risk >= 4,
};

// Higher is better for every key except drawdown and fee, where the smallest value ranks first.
const sortScore: Record<SortKey, (plan: MasterPlan) => number> = {
  gain: (plan) => plan.totalGain,
  drawdown: (plan) => plan.maxDrawdown,
  pnl: (plan) => plan.totalPnl,
  copiers: (plan) => plan.copiers,
  fee: (plan) => -plan.feePercent,
};

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'grid shrink-0 place-items-center rounded-full bg-fg text-app';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : ''}${formatMoney(amount, 'USD')}`;
}

function drawdownLabel(value: number): string {
  return `-${Math.abs(value)}%`;
}

function riskColor(risk: number): string {
  if (risk <= 2) return 'bg-success';
  if (risk === 3) return 'bg-warning';
  return 'bg-[var(--zenith-red)]';
}

function rankLabel(rank: number): string {
  return String(rank).padStart(2, '0');
}

/* ───────────── Shared bits ───────────── */

function RedDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx('relative flex size-2 shrink-0', className)}>
      <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
      <span style={{ background: RED }} className="relative size-full rounded-full" />
    </span>
  );
}

/** Risk as five square pixels rising in height; the lit ones take the tier colour. */
function RiskBeads({ risk }: { risk: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {Array.from({ length: RISK_LEVELS }, (_, level) => (
          <span
            key={level}
            style={{ height: `${6 + level * 2}px`, animationDelay: `${300 + level * 80}ms` }}
            className={cx('w-1.5 animate-dot-pop rounded-[2px] motion-reduce:animate-none', level < risk ? riskColor(risk) : 'bg-fg/15')}
          />
        ))}
      </span>
      <span className="text-[10px] font-bold tracking-[0.12em] text-fg-muted uppercase">
        {translate('copy.explore.risk')} {risk}
      </span>
    </span>
  );
}

function CopyButton({ plan, onCopy, size = 'sm' }: { plan: MasterPlan; onCopy: (plan: MasterPlan) => void; size?: 'sm' | 'lg' }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onCopy(plan)}
      className={cx(
        'group/copy relative z-20 inline-flex shrink-0 items-center gap-2 rounded-full bg-fg py-1 pr-4 pl-1 font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'lg' ? 'h-12 text-sm' : 'h-10 text-sm',
      )}
    >
      <span
        aria-hidden="true"
        style={{ background: RED }}
        className={cx('grid place-items-center rounded-full text-white transition-transform duration-300 group-hover/copy:-rotate-12 motion-reduce:transition-none', size === 'lg' ? 'size-10' : 'size-8')}
      >
        <Icon name="copy" size={14} />
      </span>
      {translate('copy.explore.copy')}
    </button>
  );
}

function RankBead({ rank, className }: { rank: number; className?: string }) {
  const isLeader = rank === 1;
  return (
    <span
      style={isLeader ? { background: RED } : undefined}
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-mono text-[11px] font-black tabular-nums',
        isLeader ? 'text-white' : 'bg-fg text-app',
        className ?? 'size-8',
      )}
    >
      {isLeader ? <Icon name="trophy" size={13} /> : rankLabel(rank)}
    </span>
  );
}

/* ───────────── Title ───────────── */

function PageTitle() {
  return (
    <header className="zenith-tile border-b border-line pb-6">
      <p className={cx(captionClass, 'flex items-center gap-2')}>
        <RedDot className="size-1.5" />
        {translate('nav.copyTrading')}
      </p>
      <h2 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('nav.copyMasters')}</h2>
    </header>
  );
}

/* ───────────── Spotlight: open hero for the top master + community pulse ───────────── */

function Spotlight({ plan, onCopy }: { plan: MasterPlan | undefined; onCopy: (plan: MasterPlan) => void }) {
  if (!plan) {
    return (
      <section style={staggerStyle(1, 150)} className="zenith-tile flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-line-strong p-10 text-center">
        <span aria-hidden="true" className="relative grid size-16 place-items-center">
          <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
          <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
            <Icon name="search" size={20} />
          </span>
        </span>
        <p className="text-sm font-semibold text-fg">{translate('copy.explore.emptyTitle')}</p>
      </section>
    );
  }

  const metrics: { key: string; icon: IconName; label: string; value: string; tone: string }[] = [
    { key: 'drawdown', icon: 'trendDown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', icon: 'trendUp', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', icon: 'wallet', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
    { key: 'fee', icon: 'sliders', label: translate('copy.explore.fee'), value: `${plan.feePercent}%`, tone: 'text-fg' },
    { key: 'copiers', icon: 'user', label: translate('copy.explore.copiers'), value: String(plan.copiers), tone: 'text-fg' },
  ];

  return (
    <section key={plan.id} style={staggerStyle(0, 150)} className="group/spot zenith-tile relative flex h-full min-w-0 flex-col gap-6">
      <Link
        href={`/copy-trading/masters/${plan.id}`}
        aria-label={plan.name}
        className="absolute -inset-3 z-10 rounded-[28px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-1 text-[10.5px] font-bold tracking-[0.12em] text-app uppercase">
          <span aria-hidden="true" style={{ background: RED }} className="grid size-6 place-items-center rounded-full text-white">
            <Icon name="trophy" size={11} />
          </span>
          {translate('copy.explore.topMaster')}
        </span>
        <RiskBeads risk={plan.risk} />
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="relative grid size-32 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/35 motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-3 -translate-x-1/2 rounded-full" />
          </span>
          <span aria-hidden="true" className="absolute inset-3 animate-rim-spin rounded-full border border-fg/20 [animation-direction:reverse] motion-reduce:animate-none" />
          <Avatar name={plan.name} className="size-20 text-2xl transition-transform duration-500 group-hover/spot:scale-105 motion-reduce:transition-none" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-3xl font-black tracking-tight text-fg sm:text-4xl" title={plan.name}>
            {plan.name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
            <LiveDot />
            <span className="truncate">
              {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
            </span>
          </p>
        </div>
      </div>

      <div>
        <p className={captionClass}>{translate('copy.explore.totalGain')}</p>
        <p className="mt-2 text-6xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-7xl">
          <CountUp value={plan.totalGain} format={formatPercent} />
        </p>
        {/* Pixel field under the gain: cells twinkle in a scattered order, one red cell blinking. */}
        <div aria-hidden="true" className="mt-4 grid grid-cols-16 gap-1">
          {Array.from({ length: SPOT_PIXELS }, (_, index) => (
            <span
              key={index}
              style={{ animationDelay: `${(index * 173) % 2400}ms`, ...(index === 37 ? { background: RED } : {}) }}
              className={cx('h-2.5 rounded-[2px]', index === 37 ? 'animate-pulse' : 'zenith-twinkle bg-fg/15')}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4 md:flex-row md:items-end">
        <dl className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric, index) => (
            <div
              key={metric.key}
              style={staggerStyle(index, 300)}
              className="flex min-w-0 animate-feed-in flex-col gap-1.5 rounded-[20px] bg-fg/[0.03] p-3 ring-1 ring-line motion-reduce:animate-none"
            >
              <dt className={cx(captionClass, 'flex min-w-0 items-center gap-1.5')}>
                <span aria-hidden="true" className={cx(beadClass, 'size-5')}>
                  <Icon name={metric.icon} size={10} />
                </span>
                <span className="truncate">{metric.label}</span>
              </dt>
              <dd className={cx('truncate font-mono text-sm font-black tabular-nums', metric.tone)}>{metric.value}</dd>
            </div>
          ))}
        </dl>
        <CopyButton plan={plan} onCopy={onCopy} size="lg" />
      </div>
    </section>
  );
}

function PulsePanel() {
  const avgGain = masterPlans.reduce((sum, plan) => sum + plan.totalGain, 0) / masterPlans.length;
  const rows: { key: string; icon: IconName; labelKey: MessageKey; captionKey: MessageKey; value: number; format: (current: number) => string; tone: string }[] = [
    { key: 'plans', icon: 'dashboard', labelKey: 'copy.explore.availablePlans', captionKey: 'copy.explore.browseAll', value: masterPlans.length, format: (current) => String(Math.round(current)), tone: 'text-fg' },
    { key: 'gain', icon: 'trendUp', labelKey: 'copy.explore.avgGain', captionKey: 'copy.explore.performance', value: avgGain, format: formatPercent, tone: 'text-success' },
    { key: 'enrolled', icon: 'user', labelKey: 'copy.explore.enrolled', captionKey: 'copy.explore.subscribed', value: ENROLLED_COUNT, format: (current) => String(Math.round(current)), tone: 'text-success' },
  ];

  return (
    <section style={staggerStyle(1, 150)} className="zenith-tile flex min-w-0 flex-col border-t border-line pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="wallet" size={13} />
            </span>
            {translate('copy.explore.communityAum')}
          </p>
          <p className="mt-4 truncate text-5xl leading-none font-black tracking-tighter text-fg tabular-nums">
            <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
          </p>
          <p className={cx(captionClass, 'mt-2')}>{translate('copy.explore.totalLocked')}</p>
        </div>
        {/* Radar: dashed rim, rippling red ring and an orbiting red bead. */}
        <span aria-hidden="true" className="relative mt-1 grid size-16 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full" />
          </span>
          <span className="size-3 rounded-full bg-fg" />
        </span>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {rows.map((row, index) => (
          <li
            key={row.key}
            style={staggerStyle(index, 250)}
            className="group/pulse flex animate-feed-in items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-line-strong motion-reduce:animate-none"
          >
            <span aria-hidden="true" className={cx(beadClass, 'size-9 transition-transform duration-300 group-hover/pulse:-rotate-12 motion-reduce:transition-none')}>
              <Icon name={row.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-fg">{translate(row.labelKey)}</span>
              <span className="block truncate text-[11px] text-fg-muted">{translate(row.captionKey)}</span>
            </span>
            <span className={cx('shrink-0 font-mono text-xl font-black tabular-nums', row.tone)}>
              <CountUp value={row.value} format={row.format} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Filter bar ───────────── */

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { mode: ViewMode; icon: IconName; labelKey: MessageKey }[] = [
    { mode: 'grid', icon: 'dashboard', labelKey: 'copy.explore.viewGrid' },
    { mode: 'list', icon: 'menu', labelKey: 'copy.explore.viewList' },
  ];

  return (
    <div className="relative grid shrink-0 grid-cols-2 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
      <span
        aria-hidden="true"
        className={cx('absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-fg transition-transform duration-300 ease-out motion-reduce:transition-none', view === 'list' && 'translate-x-full')}
      />
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          aria-label={translate(option.labelKey)}
          title={translate(option.labelKey)}
          aria-pressed={view === option.mode}
          onClick={() => onChange(option.mode)}
          className={cx(
            'relative grid size-9 place-items-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
            view === option.mode ? 'text-app' : 'text-fg-muted hover:text-fg',
          )}
        >
          <Icon name={option.icon} size={16} />
        </button>
      ))}
    </div>
  );
}

/* ───────────── Results: master capsule cards / ranked list ───────────── */

function MasterCard({ plan, rank, index, onCopy }: { plan: MasterPlan; rank: number; index: number; onCopy: (plan: MasterPlan) => void }) {
  const isLeader = rank === 1;
  const metrics: { key: string; icon: IconName; label: string; value: string; tone: string }[] = [
    { key: 'drawdown', icon: 'trendDown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', icon: 'trendUp', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', icon: 'wallet', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
  ];

  return (
    <article
      style={staggerStyle(index, 120)}
      className="group/card relative isolate flex animate-rise flex-col rounded-[28px] bg-fg/[0.03] p-5 ring-1 ring-line transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-fg/[0.05] hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <Link
        href={`/copy-trading/masters/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="flex items-center justify-between gap-3">
        <RankBead rank={rank} />
        {isLeader ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-app uppercase">
            <RedDot className="size-1.5" />
            {translate('copy.explore.topMaster')}
          </span>
        ) : (
          <RiskBeads risk={plan.risk} />
        )}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="relative grid size-18 shrink-0 place-items-center">
          <span aria-hidden="true" className={cx('absolute inset-0 animate-rim-spin rounded-full border border-dashed motion-reduce:animate-none', isLeader ? 'border-fg/60' : 'border-line-strong')} />
          {isLeader && (
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full" />
            </span>
          )}
          <Avatar name={plan.name} className="size-13 text-lg transition-transform duration-500 group-hover/card:scale-105 motion-reduce:transition-none" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-tight text-fg" title={plan.name}>
            {plan.name}
          </p>
          <p className="flex max-w-full items-center gap-1.5 text-xs text-fg-muted">
            <LiveDot />
            <span className="truncate">
              {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
            </span>
          </p>
          {isLeader && (
            <span className="mt-1.5 block">
              <RiskBeads risk={plan.risk} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className={captionClass}>{translate('copy.explore.totalGain')}</p>
        <p className="mt-1 text-4xl leading-none font-black tracking-tighter text-fg tabular-nums">
          <CountUp value={plan.totalGain} format={formatPercent} />
        </p>
      </div>

      <dl className="mt-4 flex flex-col gap-1.5">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2 rounded-full bg-fg/[0.03] py-1 pr-3 pl-1 ring-1 ring-line">
            <span aria-hidden="true" className={cx(beadClass, 'size-6')}>
              <Icon name={metric.icon} size={11} />
            </span>
            <dt className={cx(captionClass, 'min-w-0 flex-1 truncate')}>{metric.label}</dt>
            <dd className={cx('shrink-0 font-mono text-sm font-bold tabular-nums', metric.tone)}>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center gap-3 pt-5">
        <span className="rounded-full px-2.5 py-1 text-xs text-fg-muted ring-1 ring-line-strong">
          {translate('copy.explore.fee')}: <span className="font-bold text-fg">{plan.feePercent}%</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-fg-muted" title={translate('copy.explore.copiers')}>
          <Icon name="user" size={14} />
          <span className="font-mono font-bold text-fg tabular-nums">{plan.copiers}</span>
          <span className="sr-only">{translate('copy.explore.copiers')}</span>
        </span>
        <span className="ml-auto">
          <CopyButton plan={plan} onCopy={onCopy} />
        </span>
      </div>
    </article>
  );
}

function RankedList({ items, firstRank, onCopy }: { items: MasterPlan[]; firstRank: number; onCopy: (plan: MasterPlan) => void }) {
  const headClass = cx(captionClass, 'px-3 py-3 text-left whitespace-nowrap');
  const cellClass = 'px-3 py-3 font-mono tabular-nums';
  const topGain = Math.max(1, ...items.map((plan) => plan.totalGain));

  return (
    <div className="animate-rise overflow-x-auto motion-reduce:animate-none">
      <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr>
            <th scope="col" className={headClass}>#</th>
            <th scope="col" className={headClass}>{translate('copy.explore.master')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.totalGain')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.maxDrawdown')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.totalPnl')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.minInvestment')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.fee')}</th>
            <th scope="col" className={headClass}>{translate('copy.explore.copiers')}</th>
            <th scope="col" className={headClass}>
              <span className="sr-only">{translate('copy.explore.copy')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((plan, index) => {
            const rank = firstRank + index;
            const gainShare = Math.max(0, (plan.totalGain / topGain) * 100);
            return (
              <tr
                key={plan.id}
                style={staggerStyle(index, 150)}
                className="group/row animate-feed-in bg-fg/[0.03] transition-colors hover:bg-fg/[0.06] motion-reduce:animate-none [&>td:first-child]:rounded-l-full [&>td:last-child]:rounded-r-full"
              >
                <td className="py-2 pr-3 pl-2">
                  <RankBead rank={rank} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="relative grid size-11 shrink-0 place-items-center">
                      <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
                      <Avatar name={plan.name} className="size-8 text-xs" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/copy-trading/masters/${plan.id}`}
                        className="block truncate font-bold text-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {plan.name}
                      </Link>
                      <p className="text-xs text-fg-muted">
                        {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D · {translate('copy.explore.risk')} {plan.risk}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cx(cellClass, 'py-2')}>
                  <span className="flex flex-col gap-1">
                    <span className="font-black text-fg">{formatPercent(plan.totalGain)}</span>
                    <span aria-hidden="true" className="relative block h-1.5 w-24 overflow-hidden rounded-full bg-fg/10">
                      <span
                        style={{ width: `${gainShare}%`, animationDelay: `${200 + index * 80}ms`, ...(rank === 1 ? { background: RED } : {}) }}
                        className="zenith-capsule absolute inset-y-0 left-0 origin-left rounded-full bg-fg"
                      />
                    </span>
                  </span>
                </td>
                <td className={cx(cellClass, 'text-danger')}>{drawdownLabel(plan.maxDrawdown)}</td>
                <td className={cx(cellClass, 'text-success')}>{signedMoney(plan.totalPnl)}</td>
                <td className={cx(cellClass, 'text-fg')}>{minInvestmentLabel(plan)}</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.copiers}</td>
                <td className="py-2 pr-2 pl-3 text-right">
                  <CopyButton plan={plan} onCopy={onCopy} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PagerButton({ labelKey, symbol, disabled, onClick }: { labelKey: MessageKey; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={translate(labelKey)}
      title={translate(labelKey)}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35"
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

/* ───────────── Page ───────────── */

export default function MastersPage() {
  const [masterQuery, setMasterQuery] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [riskTier, setRiskTier] = useState<RiskTier>('all');
  const [trackRecord, setTrackRecord] = useState<TrackRecord>('all');
  const [sortKey, setSortKey] = useState<SortKey>('gain');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [copyPlan, setCopyPlan] = useState<MasterPlan | null>(null);

  const filteredPlans = useMemo(() => {
    const masterNeedle = masterQuery.trim().toLowerCase();
    const planNeedle = planQuery.trim().toLowerCase();
    const minDays = trackRecord === 'all' ? 0 : Number(trackRecord);

    return masterPlans
      .filter((plan) => plan.master.toLowerCase().includes(masterNeedle))
      .filter((plan) => plan.name.toLowerCase().includes(planNeedle))
      .filter((plan) => matchesRiskTier[riskTier](plan.risk))
      .filter((plan) => plan.activeDays >= minDays)
      .sort((left, right) => sortScore[sortKey](right) - sortScore[sortKey](left));
  }, [masterQuery, planQuery, riskTier, trackRecord, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredPlans.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredPlans.slice(firstIndex, firstIndex + PAGE_SIZE);
  const rangeStart = filteredPlans.length === 0 ? 0 : firstIndex + 1;
  const rangeEnd = firstIndex + pageItems.length;

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  // Skeleton: open title, top-master hero beside the community pulse, an open filter strip, then cards / ranked list.
  return (
    <div className="flex flex-col gap-10">
      <PageTitle />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Spotlight plan={filteredPlans[0]} onCopy={setCopyPlan} />
        <PulsePanel />
      </div>

      <section style={staggerStyle(2, 150)} className="zenith-tile flex flex-col gap-4 border-t border-line pt-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-fg py-1 pr-1 pl-3.5 text-sm font-semibold text-app lg:self-auto">
            {translate('copy.explore.filterAll')}
            <span style={{ background: RED }} className="grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold text-white tabular-nums">
              {masterPlans.length}
            </span>
          </span>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Input
              type="search"
              leftIcon="search"
              aria-label={translate('copy.explore.searchMaster')}
              placeholder={translate('copy.explore.searchMaster')}
              value={masterQuery}
              onChange={(event) => resetPageAnd(setMasterQuery)(event.target.value)}
            />
            <Input
              type="search"
              leftIcon="search"
              aria-label={translate('copy.explore.searchPlan')}
              placeholder={translate('copy.explore.searchPlan')}
              value={planQuery}
              onChange={(event) => resetPageAnd(setPlanQuery)(event.target.value)}
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={translate('copy.explore.riskLabel')} className="flex flex-wrap items-center gap-1 rounded-[26px] bg-fg/[0.03] p-1 ring-1 ring-line sm:rounded-full">
            <span className={cx(captionClass, 'px-3')}>{translate('copy.explore.riskLabel')}</span>
            {riskTiers.map((option) => {
              const isActive = riskTier === option.tier;
              const tierCount = masterPlans.filter((plan) => matchesRiskTier[option.tier](plan.risk)).length;
              return (
                <button
                  key={option.tier}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => resetPageAnd(setRiskTier)(option.tier)}
                  className={cx(
                    'flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3 text-sm font-semibold transition-[color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                  )}
                >
                  <span aria-hidden="true" className={cx('size-2 rounded-[2px]', isActive && option.tier === 'all' ? 'bg-app' : option.dot)} />
                  {translate(option.labelKey)}
                  <span
                    style={isActive ? { background: RED } : undefined}
                    className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold tabular-nums', isActive ? 'text-white' : 'bg-fg/10 text-fg-subtle')}
                  >
                    {tierCount}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
            <Dropdown
              label={translate('copy.explore.timeLabel')}
              value={trackRecord}
              options={[
                { value: 'all', label: translate('copy.explore.time.all') },
                { value: '30', label: translate('copy.explore.time.30') },
                { value: '90', label: translate('copy.explore.time.90') },
              ]}
              onChange={(value) => resetPageAnd(setTrackRecord)(value as TrackRecord)}
              icon="calendar"
            />
            <Dropdown
              label={translate('copy.explore.sortLabel')}
              value={sortKey}
              options={[
                { value: 'gain', label: translate('copy.explore.sort.gain') },
                { value: 'drawdown', label: translate('copy.explore.sort.drawdown') },
                { value: 'pnl', label: translate('copy.explore.sort.pnl') },
                { value: 'copiers', label: translate('copy.explore.sort.copiers') },
                { value: 'fee', label: translate('copy.explore.sort.fee') },
              ]}
              onChange={(value) => resetPageAnd(setSortKey)(value as SortKey)}
              icon="arrowsUpDown"
            />
          </div>
        </div>
      </section>

      <div className="-mt-4 flex flex-col gap-5">
        {pageItems.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-line-strong py-14 text-center">
            <span aria-hidden="true" className="relative grid size-16 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
              <span style={{ borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border motion-reduce:hidden" />
              <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
                <Icon name="search" size={17} />
              </span>
            </span>
            <p className="text-sm font-semibold text-fg">{translate('copy.explore.emptyTitle')}</p>
          </section>
        ) : view === 'grid' ? (
          <div key={`grid-${currentPage}`} className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {pageItems.map((plan, index) => (
              <MasterCard key={plan.id} plan={plan} rank={firstIndex + index + 1} index={index} onCopy={setCopyPlan} />
            ))}
          </div>
        ) : (
          <RankedList key={`list-${currentPage}`} items={pageItems} firstRank={firstIndex + 1} onCopy={setCopyPlan} />
        )}

        <div className="flex flex-col items-center gap-3 border-t border-dashed border-line pt-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-fg-muted" aria-live="polite">
            {translate('copy.explore.showing')}{' '}
            <span className="font-semibold text-fg tabular-nums">
              {rangeStart}
              {'\u2013'}
              {rangeEnd}
            </span>{' '}
            {translate('copy.explore.of')} <span className="font-semibold text-fg tabular-nums">{filteredPlans.length}</span>
          </p>
          <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-line">
            <PagerButton labelKey="copy.explore.firstPage" symbol={'\u00AB'} disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton labelKey="copy.explore.prevPage" symbol={'\u2039'} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('copy.explore.page')}
              <span className="grid size-7 place-items-center rounded-full bg-fg font-bold text-app tabular-nums">{currentPage}</span>/ {pageCount}
            </span>
            <PagerButton labelKey="copy.explore.nextPage" symbol={'\u203A'} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
            <PagerButton labelKey="copy.explore.lastPage" symbol={'\u00BB'} disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
          </div>
        </div>
      </div>

      {copyPlan && (
        <StartCopyModal
          key={copyPlan.id}
          plan={{ name: copyPlan.name, feePercent: copyPlan.feePercent, minInvestment: copyPlan.minInvestment, minInvestmentLabel: minInvestmentLabel(copyPlan) }}
          onClose={() => setCopyPlan(null)}
        />
      )}
    </div>
  );
}
