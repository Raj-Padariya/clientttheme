'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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

const riskTiers: { tier: RiskTier; labelKey: MessageKey }[] = [
  { tier: 'all', labelKey: 'copy.explore.risk.all' },
  { tier: 'low', labelKey: 'copy.explore.risk.low' },
  { tier: 'medium', labelKey: 'copy.explore.risk.medium' },
  { tier: 'high', labelKey: 'copy.explore.risk.high' },
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

function StatsRibbon() {
  const avgGain = masterPlans.reduce((sum, plan) => sum + plan.totalGain, 0) / masterPlans.length;
  const stats: { key: string; icon: IconName; labelKey: MessageKey; captionKey: MessageKey; value: number; format: (current: number) => string; tone?: string }[] = [
    {
      key: 'plans',
      icon: 'dashboard',
      labelKey: 'copy.explore.availablePlans',
      captionKey: 'copy.explore.browseAll',
      value: masterPlans.length,
      format: (current) => String(Math.round(current)),
    },
    {
      key: 'aum',
      icon: 'wallet',
      labelKey: 'copy.explore.communityAum',
      captionKey: 'copy.explore.totalLocked',
      value: COMMUNITY_AUM,
      format: (current) => compactUsd.format(current),
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
    <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/3 size-80 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
      />
      <ul className="relative grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        {stats.map((stat, index) => (
          <li
            key={stat.key}
            style={staggerStyle(index, 100)}
            className="group relative flex animate-rise flex-col gap-3 p-5 motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-fg-muted">{translate(stat.labelKey)}</span>
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/25 transition-[transform,background-color,color] duration-300 group-hover:rotate-12 group-hover:bg-primary group-hover:text-on-primary motion-reduce:transition-none">
                <Icon name={stat.icon} size={17} />
              </span>
            </div>
            <p className={cx('text-3xl font-semibold tabular-nums tracking-tight', stat.tone ?? 'text-fg')}>
              <CountUp value={stat.value} format={stat.format} />
            </p>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">{translate(stat.captionKey)}</span>
            <span
              aria-hidden="true"
              style={staggerStyle(index, 500)}
              className="absolute inset-x-5 bottom-0 h-0.5 origin-left animate-grow rounded-full bg-linear-to-r from-primary to-transparent motion-reduce:animate-none"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RiskMeter({ risk }: { risk: number }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span aria-hidden="true" className="flex h-5 items-end gap-0.5">
        {Array.from({ length: RISK_LEVELS }, (_, level) => (
          <span
            key={level}
            style={{ height: `${40 + level * 15}%`, ...staggerStyle(level, 300) }}
            className={cx(
              'w-1.5 origin-bottom animate-bar-rise rounded-full motion-reduce:animate-none',
              level < risk ? riskColor(risk) : 'bg-line-strong',
            )}
          />
        ))}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
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

function MasterCard({ plan, rank, index, onCopy }: { plan: MasterPlan; rank: number; index: number; onCopy: (plan: MasterPlan) => void }) {
  const isLeader = rank === 1;
  const metrics = [
    { key: 'drawdown', label: translate('copy.explore.maxDrawdown'), value: drawdownLabel(plan.maxDrawdown), tone: 'text-danger' },
    { key: 'pnl', label: translate('copy.explore.totalPnl'), value: signedMoney(plan.totalPnl), tone: 'text-success' },
    { key: 'min', label: translate('copy.explore.minInvestment'), value: minInvestmentLabel(plan), tone: 'text-fg' },
  ];

  return (
    <article
      style={staggerStyle(index, 250)}
      className={cx(
        'group relative flex animate-rise flex-col overflow-hidden rounded-xl bg-surface p-5 shadow-card transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--brand-primary)_75%,transparent)] motion-reduce:animate-none motion-reduce:transition-none',
        isLeader ? 'glow-border' : 'border border-line',
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 -right-2 text-[96px] leading-none font-black tracking-tighter text-fg/[0.04] transition-colors duration-500 select-none group-hover:text-primary/10"
      >
        {rankLabel(rank)}
      </span>
      <span
        aria-hidden="true"
        className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
      />
      <Link
        href={`/copy-trading/masters/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            isLeader ? 'bg-primary text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]' : 'bg-surface-2 text-fg-muted',
          )}
        >
          {isLeader && <Icon name="trophy" size={12} />}
          {isLeader ? translate('copy.explore.topMaster') : `#${rank}`}
        </span>
        <RiskMeter risk={plan.risk} />
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <MasterAvatar name={plan.name} isLeader={isLeader} />
        <div className="min-w-0">
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
      </div>

      <div className="relative mt-5 flex items-center justify-between rounded-lg bg-success-soft px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-success/80">{translate('copy.explore.totalGain')}</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-success">
            <CountUp value={plan.totalGain} format={formatPercent} />
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-success text-on-primary transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-12 motion-reduce:transition-none">
          <Icon name="trendUp" size={18} />
        </span>
      </div>

      <dl className="relative mt-3 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-md border border-line px-2.5 py-2 transition-colors duration-200 group-hover:border-primary/30">
            <dt className="truncate text-[10px] uppercase tracking-wide text-fg-subtle">{metric.label}</dt>
            <dd className={cx('mt-0.5 text-sm font-semibold tabular-nums', metric.tone)}>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-5 flex items-center gap-3 border-t border-line pt-4">
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-fg-muted">
          {translate('copy.explore.fee')}: <span className="font-semibold text-primary">{plan.feePercent}%</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-fg-muted" title={translate('copy.explore.copiers')}>
          <Icon name="user" size={14} />
          <span className="tabular-nums">{plan.copiers}</span>
          <span className="sr-only">{translate('copy.explore.copiers')}</span>
        </span>
        <Button size="sm" aria-haspopup="dialog" onClick={() => onCopy(plan)} className="group/copy relative z-20 ml-auto overflow-hidden">
          <span
            aria-hidden="true"
            className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/copy:translate-x-full motion-reduce:hidden"
          />
          <Icon name="copy" size={15} className="relative transition-transform duration-200 group-hover/copy:-rotate-12 motion-reduce:transition-none" />
          <span className="relative">{translate('copy.explore.copy')}</span>
        </Button>
      </div>
    </article>
  );
}

function LeaderboardTable({ items, firstRank, onCopy }: { items: MasterPlan[]; firstRank: number; onCopy: (plan: MasterPlan) => void }) {
  const headClass = 'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle';
  const cellClass = 'px-4 py-3 tabular-nums';

  return (
    <div className="glow-border animate-rise overflow-x-auto rounded-xl bg-surface shadow-card motion-reduce:animate-none">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-surface-2">
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
              <tr
                key={plan.id}
                style={staggerStyle(index, 150)}
                className="group animate-feed-in transition-colors hover:bg-hover motion-reduce:animate-none"
              >
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      'grid size-8 place-items-center rounded-full text-xs font-bold tabular-nums',
                      rank === 1 ? 'bg-primary text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]' : 'bg-surface-2 text-fg-muted',
                    )}
                  >
                    {rank === 1 ? <Icon name="trophy" size={14} /> : rankLabel(rank)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MasterAvatar name={plan.name} isLeader={rank === 1} />
                    <div className="min-w-0">
                      <Link href={`/copy-trading/masters/${plan.id}`} className="block truncate font-semibold text-fg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
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

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { mode: ViewMode; icon: IconName; labelKey: MessageKey }[] = [
    { mode: 'grid', icon: 'dashboard', labelKey: 'copy.explore.viewGrid' },
    { mode: 'list', icon: 'menu', labelKey: 'copy.explore.viewList' },
  ];

  return (
    <div className="relative grid shrink-0 grid-cols-2 rounded-md border border-line bg-surface p-1">
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-sm bg-primary shadow-[0_6px_16px_-6px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none',
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
            'relative flex size-8 items-center justify-center rounded-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
            view === option.mode ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
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
      className="flex size-8 items-center justify-center rounded-full border border-line text-fg-muted transition-[color,background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

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

      <StatsRibbon />

      <Card style={staggerStyle(1, 200)} className="glow-border flex animate-rise flex-col gap-4 motion-reduce:animate-none">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed="true"
            className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)]"
          >
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
            <span className="relative">{translate('copy.explore.filterAll')}</span>
            <span className="relative rounded-full bg-on-primary/20 px-2 text-xs tabular-nums">{masterPlans.length}</span>
          </button>

          <div role="group" aria-label={translate('copy.explore.riskLabel')} className="flex flex-wrap gap-1 rounded-full bg-surface-2 p-1">
            {riskTiers.map((option) => (
              <button
                key={option.tier}
                type="button"
                aria-pressed={riskTier === option.tier}
                onClick={() => resetPageAnd(setRiskTier)(option.tier)}
                className={cx(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                  riskTier === option.tier ? 'bg-surface text-primary shadow-card' : 'text-fg-muted hover:text-fg',
                )}
              >
                {translate(option.labelKey)}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <Select
            aria-label={translate('copy.explore.timeLabel')}
            value={trackRecord}
            onChange={(event) => resetPageAnd(setTrackRecord)(event.target.value as TrackRecord)}
          >
            <option value="all">{translate('copy.explore.time.all')}</option>
            <option value="30">{translate('copy.explore.time.30')}</option>
            <option value="90">{translate('copy.explore.time.90')}</option>
          </Select>
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
      </Card>

      {pageItems.length === 0 ? (
        <Card className="flex animate-rise flex-col items-center gap-3 py-12 text-center motion-reduce:animate-none">
          <span className="flex size-14 animate-float items-center justify-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
            <Icon name="search" size={24} />
          </span>
          <p className="text-sm font-medium text-fg">{translate('copy.explore.emptyTitle')}</p>
        </Card>
      ) : view === 'grid' ? (
        <div key="grid" className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {pageItems.map((plan, index) => (
            <MasterCard key={plan.id} plan={plan} rank={firstIndex + index + 1} index={index} onCopy={setCopyPlan} />
          ))}
        </div>
      ) : (
        <LeaderboardTable key="list" items={pageItems} firstRank={firstIndex + 1} onCopy={setCopyPlan} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {translate('copy.explore.showing')}{' '}
          <span className="font-semibold tabular-nums text-fg">
            {rangeStart}–{rangeEnd}
          </span>{' '}
          {translate('copy.explore.of')} <span className="font-semibold tabular-nums text-fg">{filteredPlans.length}</span>
        </p>
        <div className="flex items-center gap-2">
          <PagerButton labelKey="copy.explore.firstPage" symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
          <PagerButton labelKey="copy.explore.prevPage" symbol="‹" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} />
          <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
            {translate('copy.explore.page')}
            <span className="flex size-7 items-center justify-center rounded-full bg-primary font-semibold tabular-nums text-on-primary">
              {currentPage}
            </span>
            / {pageCount}
          </span>
          <PagerButton labelKey="copy.explore.nextPage" symbol="›" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} />
          <PagerButton labelKey="copy.explore.lastPage" symbol="»" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)} />
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
