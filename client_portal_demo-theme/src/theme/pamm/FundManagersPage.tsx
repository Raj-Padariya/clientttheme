'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { formatMoney, formatPercent } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { Input, Select } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { fundPlans, investPlanOptions, type FundPlan } from './fundManagersData';
import { InvestNowModal } from './InvestNowModal';
import { CountUp, LiveDot, staggerStyle } from './motion';



type SortKey = 'gain' | 'drawdown' | 'pnl' | 'minInvestment';
type SortOrder = 'desc' | 'asc';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 9;
const COMMUNITY_AUM = 202_700;


const plans = fundPlans;

const sortValue: Record<SortKey, (plan: FundPlan) => number> = {
  gain: (plan) => plan.totalGain,
  drawdown: (plan) => plan.maxDrawdown,
  pnl: (plan) => plan.totalPnl,
  minInvestment: (plan) => plan.minInvestment,
};

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function signedMoney(amount: number): string {
  return `${amount > 0 ? '+' : ''}${formatMoney(amount, 'USD')}`;
}

function toneClass(value: number): string {
  return value >= 0 ? 'text-success' : 'text-danger';
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function StatTile({
  icon,
  label,
  caption,
  index,
  children,
}: {
  icon: IconName;
  label: string;
  caption: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <div
      style={staggerStyle(index, 150)}
      className="group glass relative flex animate-rise items-center gap-4 overflow-hidden rounded-lg p-4 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_-22px_color-mix(in_srgb,var(--brand-primary)_70%,transparent)] motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
      />
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-[0_8px_20px_-8px_var(--brand-primary)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="text-xl font-semibold tabular-nums tracking-tight text-fg">{children}</p>
        <p className="mt-0.5 inline-flex rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
          {caption}
        </p>
      </div>
    </div>
  );
}

function SummaryHero() {
  const avgGain = average(plans.map((plan) => plan.totalGain));
  const avgCommission = average(plans.map((plan) => plan.feePercent));

  return (
    <section className="kpi-card relative animate-rise overflow-hidden rounded-xl p-5 sm:p-6 motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-20 size-72 animate-float rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -bottom-28 size-64 animate-glow rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
      />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] xl:items-center">
        <div className="flex flex-col gap-2">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
            <LiveDot />
            {translate('pamm.explore.live')}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
            <Icon name="wallet" size={16} />
            {translate('pamm.explore.communityAum')}
          </p>
          <p className="bg-linear-to-r from-fg via-primary to-fg bg-clip-text text-5xl font-semibold tabular-nums tracking-tight text-transparent">
            <CountUp value={COMMUNITY_AUM} format={(current) => compactUsd.format(current)} />
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-fg-subtle">{translate('pamm.explore.totalLocked')}</p>
          <span aria-hidden="true" className="mt-2 h-px w-full origin-left animate-grow bg-linear-to-r from-primary to-transparent motion-reduce:animate-none" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile icon="dashboard" label={translate('pamm.explore.availablePlans')} caption={translate('pamm.explore.browseAll')} index={0}>
            <CountUp value={plans.length} format={(current) => String(Math.round(current))} />
          </StatTile>
          <StatTile icon="trendUp" label={translate('pamm.explore.avgGain')} caption={translate('pamm.explore.performance')} index={1}>
            <span className={toneClass(avgGain)}>
              <CountUp value={avgGain} format={formatPercent} />
            </span>
          </StatTile>
          <StatTile icon="pieChart" label={translate('pamm.explore.avgCommission')} caption={translate('pamm.explore.platformAvg')} index={2}>
            <CountUp value={avgCommission} format={(current) => `${current.toFixed(2)}%`} />
          </StatTile>
        </div>
      </div>
    </section>
  );
}

function ManagerAvatar({ name }: { name: string }) {
  return (
    <span className="relative grid size-13 shrink-0 place-items-center">
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_55%,var(--brand-primary))] motion-reduce:animate-none"
      />
      <span className="relative grid size-12 place-items-center rounded-full bg-surface">
        <Avatar name={name} />
      </span>
      <LiveDot className="absolute right-0.5 bottom-0.5 ring-2 ring-surface" />
    </span>
  );
}

function GainDrawdownBars({ gain, drawdown }: { gain: number; drawdown: number }) {
  const scale = Math.max(Math.abs(gain), Math.abs(drawdown)) || 1;
  const rows = [
    { key: 'gain', label: translate('pamm.explore.totalGain'), value: gain, barClass: 'bg-success' },
    { key: 'drawdown', label: translate('pamm.explore.maxDrawdown'), value: drawdown, barClass: 'bg-danger' },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-fg-subtle">
            <span>{row.label}</span>
            <span className={cx('font-semibold tabular-nums', toneClass(row.value))}>{formatPercent(row.value)}</span>
          </div>
          <div className="progress-track h-1.5 overflow-hidden rounded-full">
            <div
              style={{ width: `${(Math.abs(row.value) / scale) * 100}%`, ...staggerStyle(index, 400) }}
              className={cx('h-full origin-left animate-grow rounded-full motion-reduce:animate-none', row.barClass)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanCard({ plan, index, onInvest }: { plan: FundPlan; index: number; onInvest: (plan: FundPlan) => void }) {
  return (
    <article
      style={staggerStyle(index, 250)}
      className="group glow-border relative flex animate-rise flex-col overflow-hidden rounded-xl bg-surface p-5 shadow-card transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-26px_color-mix(in_srgb,var(--brand-primary)_75%,transparent)] motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-primary/20 opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
      />
      <Link
        href={`/pamm/fund-managers/${plan.id}`}
        aria-label={plan.name}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />

      <div className="relative flex items-start gap-3">
        <ManagerAvatar name={plan.manager} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold uppercase tracking-wide text-fg" title={plan.name}>
            {plan.name}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {plan.manager} · {translate('pamm.explore.active')} {plan.activeDays}D
          </p>
        </div>
        <Badge tone="info" dot>
          {translate('pamm.explore.risk')} {plan.risk}
        </Badge>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{translate('pamm.explore.totalPnl')}</p>
          <p className={cx('text-3xl font-semibold tabular-nums tracking-tight', toneClass(plan.totalPnl))}>
            <CountUp value={plan.totalPnl} format={signedMoney} />
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none">
          <Icon name="trendUp" size={18} />
        </span>
      </div>

      <div className="relative mt-4">
        <GainDrawdownBars gain={plan.totalGain} drawdown={plan.maxDrawdown} />
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { key: 'min', label: translate('pamm.explore.minInvestment'), value: formatMoney(plan.minInvestment, 'USD') },
          { key: 'fee', label: translate('pamm.explore.fee'), value: `${plan.feePercent}%` },
          { key: 'investors', label: translate('pamm.explore.investors'), value: String(plan.investors) },
        ].map((item) => (
          <div key={item.key} className="rounded-md bg-surface-2 px-2 py-2.5 transition-colors duration-200 group-hover:bg-hover">
            <dt className="truncate text-[10px] uppercase tracking-wide text-fg-subtle">{item.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{item.value}</dd>
          </div>
        ))}
      </dl>

      <Button className="group/invest relative z-20 mt-5 overflow-hidden" fullWidth aria-haspopup="dialog" onClick={() => onInvest(plan)}>
        <span
          aria-hidden="true"
          className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/invest:translate-x-full motion-reduce:hidden"
        />
        {translate('pamm.explore.invest')}
        <Icon
          name="arrowRight"
          size={18}
          className="transition-transform duration-200 group-hover/invest:translate-x-1 motion-reduce:transition-none"
        />
      </Button>
    </article>
  );
}

function PlanTable({ items, onInvest }: { items: FundPlan[]; onInvest: (plan: FundPlan) => void }) {
  const headClass = 'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle';
  const cellClass = 'px-4 py-3 tabular-nums';

  return (
    <div className="glow-border animate-rise overflow-x-auto rounded-xl bg-surface shadow-card motion-reduce:animate-none">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className={headClass}>{translate('pamm.explore.plan')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.totalGain')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.maxDrawdown')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.totalPnl')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.minInvestment')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.fee')}</th>
            <th scope="col" className={headClass}>{translate('pamm.explore.investors')}</th>
            <th scope="col" className={headClass}>
              <span className="sr-only">{translate('pamm.explore.invest')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((plan, index) => (
            <tr
              key={plan.id}
              style={staggerStyle(index, 150)}
              className="animate-feed-in transition-colors hover:bg-hover motion-reduce:animate-none"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ManagerAvatar name={plan.manager} />
                  <div className="min-w-0">
                    <Link
                      href={`/pamm/fund-managers/${plan.id}`}
                      className="block truncate font-semibold uppercase text-fg transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {plan.name}
                    </Link>
                    <p className="text-xs text-fg-muted">
                      {plan.manager} · {translate('pamm.explore.active')} {plan.activeDays}D ·{' '}
                      {translate('pamm.explore.risk')} {plan.risk}
                    </p>
                  </div>
                </div>
              </td>
              <td className={cx(cellClass, 'font-semibold', toneClass(plan.totalGain))}>{formatPercent(plan.totalGain)}</td>
              <td className={cx(cellClass, toneClass(plan.maxDrawdown))}>{formatPercent(plan.maxDrawdown)}</td>
              <td className={cx(cellClass, toneClass(plan.totalPnl))}>{signedMoney(plan.totalPnl)}</td>
              <td className={cx(cellClass, 'text-fg')}>{formatMoney(plan.minInvestment, 'USD')}</td>
              <td className={cx(cellClass, 'text-fg')}>{plan.feePercent}%</td>
              <td className={cx(cellClass, 'text-fg')}>{plan.investors}</td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" rightIcon="arrowRight" aria-haspopup="dialog" onClick={() => onInvest(plan)}>
                  {translate('pamm.explore.invest')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PagerButton({ label, symbol, disabled, onClick }: { label: string; symbol: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md border border-line text-fg-muted transition-[color,background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { mode: ViewMode; icon: IconName; label: string }[] = [
    { mode: 'grid', icon: 'dashboard', label: translate('pamm.explore.viewGrid') },
    { mode: 'list', icon: 'menu', label: translate('pamm.explore.viewList') },
  ];

  return (
    <div className="relative grid grid-cols-2 rounded-md border border-line bg-surface p-1">
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
          aria-label={option.label}
          title={option.label}
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

export default function FundManagersPage() {
  const [managerQuery, setManagerQuery] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [investPlan, setInvestPlan] = useState<FundPlan | null>(null);

  const filteredPlans = useMemo(() => {
    const managerNeedle = managerQuery.trim().toLowerCase();
    const planNeedle = planQuery.trim().toLowerCase();
    const direction = sortOrder === 'desc' ? -1 : 1;

    return plans
      .filter((plan) => plan.manager.toLowerCase().includes(managerNeedle))
      .filter((plan) => plan.name.toLowerCase().includes(planNeedle))
      .sort((left, right) => direction * (sortValue[sortKey](left) - sortValue[sortKey](right)));
  }, [managerQuery, planQuery, sortKey, sortOrder]);

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
      <PageHeader title={translate('nav.pammFundManagers')} />

      <SummaryHero />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card
          style={staggerStyle(0, 200)}
          className="glow-border flex h-fit animate-rise flex-col gap-4 lg:sticky lg:top-24 motion-reduce:animate-none"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Icon name="search" size={16} className="text-primary" />
            {translate('pamm.explore.filters')}
          </h2>

          <button
            type="button"
            aria-pressed="true"
            className="group relative flex items-center justify-between overflow-hidden rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-on-primary shadow-[0_10px_24px_-12px_var(--brand-primary)]"
          >
            <span
              aria-hidden="true"
              className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none"
            />
            <span className="relative">{translate('pamm.explore.filterAll')}</span>
            <span className="relative rounded-full bg-on-primary/20 px-2 text-xs tabular-nums">{plans.length}</span>
          </button>

          <Input
            type="search"
            leftIcon="search"
            aria-label={translate('pamm.explore.searchManager')}
            placeholder={translate('pamm.explore.searchManager')}
            value={managerQuery}
            onChange={(event) => resetPageAnd(setManagerQuery)(event.target.value)}
          />
          <Input
            type="search"
            leftIcon="search"
            aria-label={translate('pamm.explore.searchPlan')}
            placeholder={translate('pamm.explore.searchPlan')}
            value={planQuery}
            onChange={(event) => resetPageAnd(setPlanQuery)(event.target.value)}
          />
          <Select
            aria-label={translate('pamm.explore.sortLabel')}
            value={sortKey}
            onChange={(event) => resetPageAnd(setSortKey)(event.target.value as SortKey)}
          >
            <option value="gain">{translate('pamm.explore.sort.gain')}</option>
            <option value="drawdown">{translate('pamm.explore.sort.drawdown')}</option>
            <option value="pnl">{translate('pamm.explore.sort.pnl')}</option>
            <option value="minInvestment">{translate('pamm.explore.sort.minInvestment')}</option>
          </Select>
          <Select
            aria-label={translate('pamm.explore.orderLabel')}
            value={sortOrder}
            onChange={(event) => resetPageAnd(setSortOrder)(event.target.value as SortOrder)}
          >
            <option value="desc">{translate('pamm.explore.order.desc')}</option>
            <option value="asc">{translate('pamm.explore.order.asc')}</option>
          </Select>
        </Card>

        <section className="flex min-w-0 flex-col gap-4" aria-label={translate('nav.pammFundManagers')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted" aria-live="polite">
              {translate('pamm.explore.showing')}{' '}
              <span className="font-semibold tabular-nums text-fg">
                {rangeStart}–{rangeEnd}
              </span>{' '}
              {translate('pamm.explore.of')} <span className="font-semibold tabular-nums text-fg">{filteredPlans.length}</span>
            </p>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {pageItems.length === 0 ? (
            <Card className="flex animate-rise flex-col items-center gap-3 py-12 text-center motion-reduce:animate-none">
              <span className="flex size-14 animate-float items-center justify-center rounded-full bg-primary-soft text-primary motion-reduce:animate-none">
                <Icon name="search" size={24} />
              </span>
              <p className="text-sm font-medium text-fg">{translate('pamm.explore.emptyTitle')}</p>
            </Card>
          ) : view === 'grid' ? (
            <div key="grid" className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {pageItems.map((plan, index) => (
                <PlanCard key={plan.id} plan={plan} index={index} onInvest={setInvestPlan} />
              ))}
            </div>
          ) : (
            <PlanTable key="list" items={pageItems} onInvest={setInvestPlan} />
          )}

          {investPlan && (
            <InvestNowModal
              key={investPlan.id}
              plans={investPlanOptions}
              initialPlanId={investPlan.id}
              onClose={() => setInvestPlan(null)}
            />
          )}

          <div className="flex items-center justify-end gap-2">
            <PagerButton label={translate('pamm.explore.firstPage')} symbol="«" disabled={currentPage === 1} onClick={() => setPage(1)} />
            <PagerButton
              label={translate('pamm.explore.prevPage')}
              symbol="‹"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            />
            <span className="flex items-center gap-1.5 px-2 text-sm text-fg-muted">
              {translate('pamm.explore.page')}
              <span className="flex size-7 items-center justify-center rounded-md bg-primary font-semibold tabular-nums text-on-primary">
                {currentPage}
              </span>
              / {pageCount}
            </span>
            <PagerButton
              label={translate('pamm.explore.nextPage')}
              symbol="›"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            />
            <PagerButton
              label={translate('pamm.explore.lastPage')}
              symbol="»"
              disabled={currentPage === pageCount}
              onClick={() => setPage(pageCount)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
