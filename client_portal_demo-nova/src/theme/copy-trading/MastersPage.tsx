'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { FrostCard } from '../dashboard/FrostCard';
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

const riskTiers: { tier: RiskTier; labelKey: MessageKey; dot: string }[] = [
  { tier: 'all', labelKey: 'copy.explore.risk.all', dot: 'bg-fg' },
  { tier: 'low', labelKey: 'copy.explore.risk.low', dot: 'bg-success' },
  { tier: 'medium', labelKey: 'copy.explore.risk.medium', dot: 'bg-warning' },
  { tier: 'high', labelKey: 'copy.explore.risk.high', dot: 'bg-danger' },
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

const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : ''}${formatMoney(amount, 'USD')}`;
}

function drawdownLabel(value: number): string {
  return `-${Math.abs(value)}%`;
}

function riskColor(risk: number): string {
  if (risk <= 2) return 'bg-success';
  if (risk === 3) return 'bg-warning';
  return 'bg-danger';
}

function rankLabel(rank: number): string {
  return String(rank).padStart(2, '0');
}

/* ───────────── Shared bits ───────────── */

/** Risk as a string of five beads; the lit ones take the tier colour. */
function RiskBeads({ risk, onFrost = false }: { risk: number; onFrost?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: RISK_LEVELS }, (_, level) => (
          <span
            key={level}
            style={{ animationDelay: `${300 + level * 80}ms` }}
            className={cx(
              'size-2 animate-dot-pop rounded-full motion-reduce:animate-none',
              level < risk ? riskColor(risk) : onFrost ? 'bg-[#0a1220]/15' : 'bg-line-strong',
            )}
          />
        ))}
      </span>
      <span className={cx('text-[10px] font-bold tracking-[0.12em] uppercase', onFrost ? inkMutedClass : 'text-fg-muted')}>
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
        'group/copy relative z-20 inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-fg font-semibold text-app transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        size === 'lg' ? 'h-11 px-5 text-sm' : 'h-9 px-3.5 text-sm',
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/copy:translate-x-full motion-reduce:hidden" />
      <Icon name="copy" size={15} className="relative transition-transform duration-200 group-hover/copy:-rotate-12 motion-reduce:transition-none" />
      <span className="relative">{translate('copy.explore.copy')}</span>
    </button>
  );
}

function RankBead({ rank, className }: { rank: number; className?: string }) {
  const isLeader = rank === 1;
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-mono text-[11px] font-black tabular-nums',
        isLeader ? 'bg-fg text-app' : 'nova-gloss text-fg',
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
    <header className="animate-rise motion-reduce:animate-none">
      <p className={captionClass}>{translate('nav.copyTrading')}</p>
      <h2 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">{translate('nav.copyMasters')}</h2>
    </header>
  );
}

/* ───────────── Spotlight (frosted) + community pulse ───────────── */

function Spotlight({ plan, onCopy }: { plan: MasterPlan | undefined; onCopy: (plan: MasterPlan) => void }) {
  if (!plan) {
    return (
      <section style={staggerStyle(1, 150)} className={cx(panelClass, 'flex animate-rise flex-col items-center justify-center gap-3 p-10 text-center motion-reduce:animate-none')}>
        <span aria-hidden="true" className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:hidden" />
          <span className={cx(beadClass, 'size-11 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
            <Icon name="search" size={20} />
          </span>
        </span>
        <p className="text-sm font-semibold text-fg">{translate('copy.explore.emptyTitle')}</p>
      </section>
    );
  }

  const metrics = [
    { key: 'drawdown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-[#b4233c]' },
    { key: 'pnl', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-[#13784a]' },
    { key: 'min', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: '' },
    { key: 'fee', label: translate('copy.explore.fee'), value: `${plan.feePercent}%`, tone: '' },
    { key: 'copiers', label: translate('copy.explore.copiers'), value: String(plan.copiers), tone: '' },
  ];

  return (
    <div key={plan.id} style={staggerStyle(0, 150)} className="group/spot relative animate-rise motion-reduce:animate-none">
      <FrostCard className="h-full">
        <div className={cx('relative flex h-full flex-col gap-5 sm:p-1', inkClass)}>
          <Link
            href={`/copy-trading/masters/${plan.id}`}
            aria-label={plan.name}
            className="absolute -inset-4 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0a1220]"
          />

          <div className="flex items-center justify-between gap-3">
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold tracking-[0.12em] uppercase', frostChipClass)}>
              <Icon name="trophy" size={12} />
              {translate('copy.explore.topMaster')}
            </span>
            <RiskBeads risk={plan.risk} onFrost />
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="relative grid size-28 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/30 motion-reduce:animate-none" />
              <span aria-hidden="true" className="absolute inset-2.5 animate-rim-spin rounded-full border border-[#0a1220]/20 [animation-direction:reverse] motion-reduce:animate-none" />
              <Avatar name={plan.name} className="size-20 text-2xl shadow-[0_14px_30px_-14px_rgb(10_18_32/0.8)]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-2xl font-black tracking-[-0.02em] sm:text-3xl" title={plan.name}>
                {plan.name}
              </p>
              <p className={cx('mt-1 flex items-center gap-1.5 text-sm', inkMutedClass)}>
                <LiveDot />
                <span className="truncate">
                  {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
                </span>
              </p>
            </div>
            <div className="sm:text-right">
              <p className={inkCaptionClass}>{translate('copy.explore.totalGain')}</p>
              <p className="text-5xl font-black tracking-tight text-[#13784a] tabular-nums">
                <CountUp value={plan.totalGain} format={formatPercent} />
              </p>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-4 border-t border-dotted border-[#0a1220]/25 pt-4 md:flex-row md:items-center">
            <dl className="grid flex-1 grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-5">
              {metrics.map((metric) => (
                <div key={metric.key} className="min-w-0">
                  <dt className={cx(inkCaptionClass, 'truncate')}>{metric.label}</dt>
                  <dd className={cx('mt-0.5 truncate text-sm font-black tabular-nums', metric.tone)}>{metric.value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => onCopy(plan)}
              className="group/copy relative z-20 inline-flex h-11 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-[#0a1220] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgb(10_18_32/0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/copy:translate-x-full motion-reduce:hidden" />
              <Icon name="copy" size={15} className="relative transition-transform duration-200 group-hover/copy:-rotate-12 motion-reduce:transition-none" />
              <span className="relative">{translate('copy.explore.copy')}</span>
            </button>
          </div>
        </div>
      </FrostCard>
    </div>
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
    <section style={staggerStyle(1, 150)} className={cx(panelClass, 'flex animate-rise flex-col p-5 motion-reduce:animate-none sm:p-6')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
              <Icon name="wallet" size={13} />
            </span>
            {translate('copy.explore.communityAum')}
          </p>
          <p className="mt-3 text-5xl font-black tracking-tight text-fg tabular-nums">
            <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
          </p>
          <p className={cx(captionClass, 'mt-1.5')}>{translate('copy.explore.totalLocked')}</p>
        </div>
        <span aria-hidden="true" className="relative mt-1 grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-ring-ripple rounded-full border border-fg/30 motion-reduce:hidden" />
          <span className="size-3 rounded-full bg-fg" />
        </span>
      </div>

      <ul className="mt-5 flex flex-col border-t border-dotted border-line-strong pt-1">
        {rows.map((row, index) => (
          <li key={row.key} style={staggerStyle(index, 250)} className="group/pulse flex animate-feed-in items-center gap-3 border-b border-dotted border-line-strong py-3 last:border-b-0 motion-reduce:animate-none">
            <span aria-hidden="true" className={cx(beadClass, 'size-9 transition-transform duration-300 group-hover/pulse:-rotate-12 motion-reduce:transition-none')}>
              <Icon name={row.icon} size={15} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-fg">{translate(row.labelKey)}</span>
              <span className={cx(captionClass, 'block truncate')}>{translate(row.captionKey)}</span>
            </span>
            <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-line-strong" />
            <span className={cx('shrink-0 text-2xl font-black tabular-nums', row.tone)}>
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
    <div className="relative grid shrink-0 grid-cols-2 rounded-full p-1 ring-1 ring-line">
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

/* ───────────── Results: master cards / ranked list ───────────── */

function MasterCard({ plan, rank, index, onCopy }: { plan: MasterPlan; rank: number; index: number; onCopy: (plan: MasterPlan) => void }) {
  const isLeader = rank === 1;
  const metrics = [
    { key: 'drawdown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
  ];

  return (
    <article
      style={staggerStyle(index, 120)}
      className={cx(
        panelClass,
        'group/card flex animate-rise flex-col p-5 transition-transform duration-300 hover:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <Link
        href={`/copy-trading/masters/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="flex items-center justify-between gap-3">
        <RankBead rank={rank} />
        {isLeader ? (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-fg uppercase ring-1 ring-fg/40">{translate('copy.explore.topMaster')}</span>
        ) : (
          <RiskBeads risk={plan.risk} />
        )}
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        <span className="relative grid size-20 place-items-center">
          <span aria-hidden="true" className={cx('absolute inset-0 animate-rim-spin rounded-full border border-dashed motion-reduce:animate-none', isLeader ? 'border-fg/60' : 'border-line-strong')} />
          <Avatar name={plan.name} className="size-14 text-lg transition-transform duration-500 group-hover/card:scale-105 motion-reduce:transition-none" />
        </span>
        <p className="mt-3 max-w-full truncate text-base font-bold text-fg" title={plan.name}>
          {plan.name}
        </p>
        <p className="flex max-w-full items-center gap-1.5 text-xs text-fg-muted">
          <LiveDot />
          <span className="truncate">
            {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
          </span>
        </p>
        {isLeader && (
          <span className="mt-2">
            <RiskBeads risk={plan.risk} />
          </span>
        )}
        <p className={cx(captionClass, 'mt-4')}>{translate('copy.explore.totalGain')}</p>
        <p className="text-4xl font-black tracking-tight text-success tabular-nums">
          <CountUp value={plan.totalGain} format={formatPercent} />
        </p>
      </div>

      <dl className="mt-4 flex flex-col border-t border-dotted border-line-strong pt-1">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2 border-b border-dotted border-line-strong py-2 last:border-b-0">
            <dt className={cx(captionClass, 'min-w-0 truncate')}>{metric.label}</dt>
            <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dotted border-line-strong" />
            <dd className={cx('shrink-0 font-mono text-sm font-bold tabular-nums', metric.tone)}>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center gap-3 pt-4">
        <span className="rounded-full px-2.5 py-1 text-xs text-fg-muted ring-1 ring-line-strong">
          {translate('copy.explore.fee')}: <span className="font-bold text-fg">{plan.feePercent}%</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-fg-muted" title={translate('copy.explore.copiers')}>
          <Icon name="user" size={14} />
          <span className="tabular-nums">{plan.copiers}</span>
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

  return (
    <div className={cx(panelClass, 'animate-rise overflow-x-auto px-2 motion-reduce:animate-none sm:px-4')}>
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-dashed border-line-strong">
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
            return (
              <tr key={plan.id} style={staggerStyle(index, 150)} className="animate-feed-in border-b border-dotted border-line-strong transition-colors last:border-b-0 hover:bg-fg/[0.04] motion-reduce:animate-none">
                <td className="px-3 py-3">
                  <RankBead rank={rank} />
                </td>
                <td className="px-3 py-3">
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
                <td className={cx(cellClass, 'font-black text-success')}>{formatPercent(plan.totalGain)}</td>
                <td className={cx(cellClass, 'text-danger')}>{drawdownLabel(plan.maxDrawdown)}</td>
                <td className={cx(cellClass, 'text-success')}>{signedMoney(plan.totalPnl)}</td>
                <td className={cx(cellClass, 'text-fg')}>{minInvestmentLabel(plan)}</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.copiers}</td>
                <td className="px-3 py-3 text-right">
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Spotlight plan={filteredPlans[0]} onCopy={setCopyPlan} />
        <PulsePanel />
      </div>

      <section style={staggerStyle(2, 150)} className={cx(panelClass, 'flex animate-rise flex-col gap-4 p-4 motion-reduce:animate-none sm:p-5')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-fg py-1 pr-1 pl-3.5 text-sm font-semibold text-app lg:self-auto">
            {translate('copy.explore.filterAll')}
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-app px-1.5 font-mono text-[10px] text-fg tabular-nums">{masterPlans.length}</span>
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

        <div className="flex flex-col gap-3 border-t border-dotted border-line-strong pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={translate('copy.explore.riskLabel')} className="flex flex-wrap items-center gap-1.5">
            <span className={cx(captionClass, 'mr-1')}>{translate('copy.explore.riskLabel')}</span>
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
                    'flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3 text-sm font-semibold transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
                  )}
                >
                  <span aria-hidden="true" className={cx('size-2 rounded-full', isActive && option.tier === 'all' ? 'bg-app' : option.dot)} />
                  {translate(option.labelKey)}
                  <span className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[10px] tabular-nums', isActive ? 'bg-app text-fg' : 'bg-surface-2 text-fg-subtle')}>
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

      {pageItems.length === 0 ? (
        <section className={cx(panelClass, 'flex animate-rise flex-col items-center gap-3 py-14 text-center motion-reduce:animate-none')}>
          <span aria-hidden="true" className="relative grid size-16 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line motion-reduce:hidden" />
            <span className={cx(beadClass, 'size-10 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
              <Icon name="search" size={17} />
            </span>
          </span>
          <p className="text-sm font-semibold text-fg">{translate('copy.explore.emptyTitle')}</p>
        </section>
      ) : view === 'grid' ? (
        <div key={`grid-${currentPage}`} className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {pageItems.map((plan, index) => (
            <MasterCard key={plan.id} plan={plan} rank={firstIndex + index + 1} index={index} onCopy={setCopyPlan} />
          ))}
        </div>
      ) : (
        <RankedList key={`list-${currentPage}`} items={pageItems} firstRank={firstIndex + 1} onCopy={setCopyPlan} />
      )}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
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
