'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Input, Select } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
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
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';

const riskTiers: { tier: RiskTier; labelKey: MessageKey; dot: string }[] = [
  { tier: 'all', labelKey: 'copy.explore.risk.all', dot: 'bg-primary' },
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

function RiskMeter({ risk }: { risk: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span aria-hidden="true" className="flex h-5 items-end gap-0.5">
        {Array.from({ length: RISK_LEVELS }, (_, level) => (
          <span
            key={level}
            style={{ height: `${40 + level * 15}%`, ...staggerStyle(level, 300) }}
            className={cx('w-1.5 origin-bottom animate-bar-rise rounded-full motion-reduce:animate-none', level < risk ? riskColor(risk) : 'bg-line-strong')}
          />
        ))}
      </span>
      <span className="text-[10px] font-semibold tracking-wide text-fg-muted uppercase">
        {translate('copy.explore.risk')} {risk}
      </span>
    </div>
  );
}

function MasterAvatar({ name, isLeader }: { name: string; isLeader: boolean }) {
  return (
    <span className="relative grid size-13 shrink-0 place-items-center">
      {isLeader && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-[spin_5s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_50%,var(--brand-primary))] motion-reduce:animate-none"
        />
      )}
      <span className={cx('relative grid size-12 place-items-center rounded-full bg-surface', !isLeader && 'ring-1 ring-line')}>
        <Avatar name={name} />
      </span>
    </span>
  );
}

function CopyButton({ plan, onCopy, size = 'sm' }: { plan: MasterPlan; onCopy: (plan: MasterPlan) => void; size?: 'sm' | 'lg' }) {
  return (
    <Button size={size} aria-haspopup="dialog" onClick={() => onCopy(plan)} className="group/copy relative z-20 overflow-hidden">
      <span
        aria-hidden="true"
        className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/copy:translate-x-full motion-reduce:hidden"
      />
      <Icon name="copy" size={15} className="relative transition-transform duration-200 group-hover/copy:-rotate-12 motion-reduce:transition-none" />
      <span className="relative">{translate('copy.explore.copy')}</span>
    </Button>
  );
}

/* ───────────── Hero: community pulse + spotlight ───────────── */

function PulsePanel() {
  const avgGain = masterPlans.reduce((sum, plan) => sum + plan.totalGain, 0) / masterPlans.length;
  const rows: { key: string; icon: IconName; labelKey: MessageKey; captionKey: MessageKey; value: number; format: (current: number) => string; tone: string }[] = [
    {
      key: 'plans',
      icon: 'dashboard',
      labelKey: 'copy.explore.availablePlans',
      captionKey: 'copy.explore.browseAll',
      value: masterPlans.length,
      format: (current) => String(Math.round(current)),
      tone: 'text-fg',
    },
    {
      key: 'gain',
      icon: 'trendUp',
      labelKey: 'copy.explore.avgGain',
      captionKey: 'copy.explore.performance',
      value: avgGain,
      format: formatPercent,
      tone: 'text-success',
    },
    {
      key: 'enrolled',
      icon: 'user',
      labelKey: 'copy.explore.enrolled',
      captionKey: 'copy.explore.subscribed',
      value: ENROLLED_COUNT,
      format: (current) => String(Math.round(current)),
      tone: 'text-success',
    },
  ];

  return (
    <section className="orbit-card relative isolate flex animate-rise flex-col overflow-hidden motion-reduce:animate-none">
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-36 -left-28 -z-10 size-96 animate-orbit-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -left-10 -z-10 size-72 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />

      <div className="p-6">
        <p className={cx(eyebrow, 'flex items-center gap-2 text-fg-subtle')}>
          <span className="grid size-6 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
            <Icon name="wallet" size={12} />
          </span>
          {translate('copy.explore.communityAum')}
        </p>
        <p className="orbit-text mt-3 text-5xl font-semibold tracking-tight tabular-nums">
          <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
        </p>
        <p className={cx(eyebrow, 'mt-2 text-fg-subtle')}>{translate('copy.explore.totalLocked')}</p>
      </div>

      <ul className="mt-auto divide-y divide-line border-t border-line">
        {rows.map((row, index) => (
          <li key={row.key} style={staggerStyle(index, 100)} className="group flex animate-rise items-center gap-3 px-6 py-3.5 motion-reduce:animate-none">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
              <Icon name={row.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-fg-muted">{translate(row.labelKey)}</span>
              <span className={cx(eyebrow, 'block text-fg-subtle')}>{translate(row.captionKey)}</span>
            </span>
            <span className={cx('text-2xl font-semibold tabular-nums', row.tone)}>
              <CountUp value={row.value} format={row.format} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Spotlight({ plan, onCopy }: { plan: MasterPlan | undefined; onCopy: (plan: MasterPlan) => void }) {
  if (!plan) {
    return (
      <section style={staggerStyle(1, 150)} className="orbit-card flex animate-rise flex-col items-center justify-center gap-3 p-10 text-center motion-reduce:animate-none">
        <span className="flex size-14 animate-float items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
          <Icon name="search" size={24} />
        </span>
        <p className="text-sm font-medium text-fg">{translate('copy.explore.emptyTitle')}</p>
      </section>
    );
  }

  const metrics = [
    { key: 'drawdown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
    { key: 'fee', label: translate('copy.explore.fee'), value: `${plan.feePercent}%`, tone: 'text-primary' },
    { key: 'copiers', label: translate('copy.explore.copiers'), value: String(plan.copiers), tone: 'text-fg' },
  ];

  return (
    <section
      key={plan.id}
      style={staggerStyle(1, 150)}
      className="orbit-card group relative isolate flex animate-rise flex-col overflow-hidden motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 -z-10 size-80 animate-float rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--glass-grid)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_left,#000,transparent_70%)]" />
      <Link
        href={`/copy-trading/masters/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="flex items-start justify-between gap-3 p-6 pb-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-fg uppercase">
          <Icon name="trophy" size={12} className="text-primary" />
          {translate('copy.explore.topMaster')}
        </span>
        <RiskMeter risk={plan.risk} />
      </div>

      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <span className="relative grid size-24 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_55%,var(--brand-primary))] motion-reduce:animate-none"
          />
          <span className="relative grid size-[88px] place-items-center rounded-full bg-surface">
            <Avatar name={plan.name} className="size-20 text-2xl" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-semibold tracking-tight text-fg" title={plan.name}>
            {plan.name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
            <LiveDot />
            <span className="truncate">
              {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
            </span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('copy.explore.totalGain')}</p>
          <p className="text-5xl font-semibold tracking-tight text-success tabular-nums">
            <CountUp value={plan.totalGain} format={formatPercent} />
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4 border-t border-line bg-fg/[0.02] p-6 pt-5 md:flex-row md:items-center">
        <dl className="grid flex-1 grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.key} className="min-w-0">
              <dt className="truncate text-[10px] tracking-wide text-fg-subtle uppercase">{metric.label}</dt>
              <dd className={cx('mt-0.5 truncate text-sm font-semibold tabular-nums', metric.tone)}>{metric.value}</dd>
            </div>
          ))}
        </dl>
        <CopyButton plan={plan} onCopy={onCopy} size="lg" />
      </div>
    </section>
  );
}

/* ───────────── Results: split tiles / leaderboard table ───────────── */

function MasterTile({ plan, rank, index, onCopy }: { plan: MasterPlan; rank: number; index: number; onCopy: (plan: MasterPlan) => void }) {
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
        'group relative grid animate-rise grid-cols-[5.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-surface shadow-card transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--brand-primary)_75%,transparent)] motion-reduce:animate-none motion-reduce:transition-none',
        isLeader ? 'border-primary/45' : 'border-line',
      )}
    >
      <span
        aria-hidden="true"
        className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
      />
      <Link
        href={`/copy-trading/masters/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      {/* Rank stub: rank, avatar and risk stacked on a tinted strip, torn off by a dashed edge. */}
      <div className="relative flex flex-col items-center justify-between gap-3 border-r border-dashed border-line bg-primary/[0.06] px-2 py-4">
        <span className={cx('flex items-center gap-1 font-mono text-xl font-black tabular-nums', isLeader ? 'text-primary' : 'text-fg-subtle')}>
          {isLeader ? <Icon name="trophy" size={18} /> : `#${rankLabel(rank)}`}
        </span>
        <MasterAvatar name={plan.name} isLeader={isLeader} />
        <RiskMeter risk={plan.risk} />
      </div>

      <div className="relative flex min-w-0 flex-col p-4">
        <div className="min-w-0">
          {isLeader && (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg uppercase">
              {translate('copy.explore.topMaster')}
            </span>
          )}
          <p className="truncate text-base font-semibold text-fg" title={plan.name}>
            {plan.name}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <LiveDot />
            <span className="truncate">
              {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D
            </span>
          </p>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-success/80 uppercase">{translate('copy.explore.totalGain')}</p>
            <p className="text-3xl font-semibold tracking-tight text-success tabular-nums">
              <CountUp value={plan.totalGain} format={formatPercent} />
            </p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl border border-success/30 bg-success-soft text-success transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-12 motion-reduce:transition-none">
            <Icon name="trendUp" size={16} />
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line">
          {metrics.map((metric) => (
            <div key={metric.key} className="min-w-0 px-2.5 py-2">
              <dt className="truncate text-[10px] tracking-wide text-fg-subtle uppercase">{metric.label}</dt>
              <dd className={cx('mt-0.5 truncate text-sm font-semibold tabular-nums', metric.tone)}>{metric.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-fg-muted">
            {translate('copy.explore.fee')}: <span className="font-semibold text-primary">{plan.feePercent}%</span>
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
      </div>
    </article>
  );
}

function LeaderboardTable({ items, firstRank, onCopy }: { items: MasterPlan[]; firstRank: number; onCopy: (plan: MasterPlan) => void }) {
  const headClass = 'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle';
  const cellClass = 'px-4 py-3 tabular-nums';

  return (
    <div className="orbit-card animate-rise overflow-x-auto motion-reduce:animate-none">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-primary/[0.06]">
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
        <tbody className="divide-y divide-line">
          {items.map((plan, index) => {
            const rank = firstRank + index;
            return (
              <tr key={plan.id} style={staggerStyle(index, 150)} className="group animate-feed-in transition-colors hover:bg-hover motion-reduce:animate-none">
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      'grid size-8 place-items-center rounded-lg border text-xs font-bold tabular-nums',
                      rank === 1 ? 'border-primary/45 bg-primary/15 text-primary' : 'border-line bg-surface-2 text-fg-muted',
                    )}
                  >
                    {rank === 1 ? <Icon name="trophy" size={14} /> : rankLabel(rank)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MasterAvatar name={plan.name} isLeader={rank === 1} />
                    <div className="min-w-0">
                      <Link
                        href={`/copy-trading/masters/${plan.id}`}
                        className="block truncate font-semibold text-fg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {plan.name}
                      </Link>
                      <p className="text-xs text-fg-muted">
                        {plan.master} · {translate('copy.explore.active')} {plan.activeDays}D · {translate('copy.explore.risk')} {plan.risk}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cx(cellClass, 'font-semibold text-success')}>{formatPercent(plan.totalGain)}</td>
                <td className={cx(cellClass, 'text-danger')}>{drawdownLabel(plan.maxDrawdown)}</td>
                <td className={cx(cellClass, 'text-success')}>{signedMoney(plan.totalPnl)}</td>
                <td className={cx(cellClass, 'text-fg')}>{minInvestmentLabel(plan)}</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
                <td className={cx(cellClass, 'text-fg')}>{plan.copiers}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" leftIcon="copy" aria-haspopup="dialog" onClick={() => onCopy(plan)}>
                    {translate('copy.explore.copy')}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Filter rail ───────────── */

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { mode: ViewMode; icon: IconName; labelKey: MessageKey }[] = [
    { mode: 'grid', icon: 'dashboard', labelKey: 'copy.explore.viewGrid' },
    { mode: 'list', icon: 'menu', labelKey: 'copy.explore.viewList' },
  ];

  return (
    <div className="relative grid shrink-0 grid-cols-2 rounded-xl border border-line bg-fg/[0.03] p-1">
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg border border-primary/40 bg-primary/20 transition-transform duration-300 ease-out motion-reduce:transition-none',
          view === 'list' && 'translate-x-full',
        )}
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
            'relative flex size-8 items-center justify-center rounded-lg transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
            view === option.mode ? 'text-primary' : 'text-fg-muted hover:text-fg',
          )}
        >
          <Icon name={option.icon} size={16} />
        </button>
      ))}
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
      className="flex size-9 items-center justify-center rounded-xl border border-line bg-fg/[0.03] text-fg-muted transition-[color,background-color,border-color] duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
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
      <PageHeader title={translate('nav.copyMasters')} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <PulsePanel />
        <Spotlight plan={filteredPlans[0]} onCopy={setCopyPlan} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside style={staggerStyle(2, 150)} className="orbit-card flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-pressed="true"
              className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-sm font-medium text-fg"
            >
              <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
              <span className="relative">{translate('copy.explore.filterAll')}</span>
              <span className="relative rounded-full bg-primary/25 px-2 text-xs tabular-nums">{masterPlans.length}</span>
            </button>
            <ViewToggle view={view} onChange={setView} />
          </div>

          <div className="flex flex-col gap-3">
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

          <div role="group" aria-label={translate('copy.explore.riskLabel')} className="flex flex-col gap-1">
            <p className={cx(eyebrow, 'mb-1 text-fg-subtle')}>{translate('copy.explore.riskLabel')}</p>
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
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-[color,background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                    isActive ? 'border-primary/40 bg-primary/10 font-semibold text-fg' : 'border-transparent text-fg-muted hover:bg-hover hover:text-fg',
                  )}
                >
                  <span aria-hidden="true" className={cx('size-2 rounded-full', option.dot)} />
                  <span className="flex-1">{translate(option.labelKey)}</span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">{tierCount}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('copy.explore.timeLabel')}</p>
            <Select
              aria-label={translate('copy.explore.timeLabel')}
              value={trackRecord}
              onChange={(event) => resetPageAnd(setTrackRecord)(event.target.value as TrackRecord)}
            >
              <option value="all">{translate('copy.explore.time.all')}</option>
              <option value="30">{translate('copy.explore.time.30')}</option>
              <option value="90">{translate('copy.explore.time.90')}</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('copy.explore.sortLabel')}</p>
            <Select
              aria-label={translate('copy.explore.sortLabel')}
              value={sortKey}
              onChange={(event) => resetPageAnd(setSortKey)(event.target.value as SortKey)}
            >
              <option value="gain">{translate('copy.explore.sort.gain')}</option>
              <option value="drawdown">{translate('copy.explore.sort.drawdown')}</option>
              <option value="pnl">{translate('copy.explore.sort.pnl')}</option>
              <option value="copiers">{translate('copy.explore.sort.copiers')}</option>
              <option value="fee">{translate('copy.explore.sort.fee')}</option>
            </Select>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          {pageItems.length === 0 ? (
            <div className="orbit-card flex animate-rise flex-col items-center gap-3 py-12 text-center motion-reduce:animate-none">
              <span className="flex size-14 animate-float items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none">
                <Icon name="search" size={24} />
              </span>
              <p className="text-sm font-medium text-fg">{translate('copy.explore.emptyTitle')}</p>
            </div>
          ) : view === 'grid' ? (
            <div key="grid" className="grid gap-4 2xl:grid-cols-2">
              {pageItems.map((plan, index) => (
                <MasterTile key={plan.id} plan={plan} rank={firstIndex + index + 1} index={index} onCopy={setCopyPlan} />
              ))}
            </div>
          ) : (
            <LeaderboardTable key="list" items={pageItems} firstRank={firstIndex + 1} onCopy={setCopyPlan} />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-fg/[0.02] px-4 py-3">
            <p className="text-sm text-fg-muted" aria-live="polite">
              {translate('copy.explore.showing')}{' '}
              <span className="font-semibold text-fg tabular-nums">
                {rangeStart}
                {'\u2013'}
                {rangeEnd}
              </span>{' '}
              {translate('copy.explore.of')} <span className="font-semibold text-fg tabular-nums">{filteredPlans.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <PagerButton labelKey="copy.explore.firstPage" symbol={'\u00AB'} disabled={currentPage === 1} onClick={() => setPage(1)} />
              <PagerButton labelKey="copy.explore.prevPage" symbol={'\u2039'} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
              <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
                {translate('copy.explore.page')}
                <span className="flex size-8 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 font-semibold text-fg tabular-nums">
                  {currentPage}
                </span>
                / {pageCount}
              </span>
              <PagerButton labelKey="copy.explore.nextPage" symbol={'\u203A'} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
              <PagerButton labelKey="copy.explore.lastPage" symbol={'\u00BB'} disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
            </div>
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
