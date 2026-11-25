'use client';

import { useState } from 'react';
import { useDashboardView } from '@/core/dashboard/useDashboardView';
import { translate } from '@/core/i18n';
import { useSession } from '@/core/session/useSession';
import type { FundsFlowPeriod } from '@/core/types';
import { cx } from '../lib/cx';
import { DateRangePicker, addDays, fromKey, toKey, type DateRange } from '../ui/DateRangePicker';
import { Icon, type IconName } from '../ui/Icon';
import { AccountsPanel } from './AccountsPanel';
import { ActivityPanel } from './ActivityPanel';
import { DashboardBackdrop } from './DashboardBackdrop';
import { FundsFlowPanel } from './FundsFlowPanel';
import { GreetingBar } from './GreetingBar';
import { KpiTiles } from './KpiTiles';
import { PortfolioPanel } from './PortfolioPanel';

type StageView = 'balance' | 'flow';

const stageViews: { id: StageView; icon: IconName; label: string }[] = [
  { id: 'balance', icon: 'areaChart', label: translate('home.balanceActivity') },
  { id: 'flow', icon: 'transfer', label: translate('home.fundsActivity') },
];

type RangePreset = '7d' | '30d' | '3m' | '1y' | 'all';

const rangePresets: { id: RangePreset; label: string; days?: number; months?: number }[] = [
  { id: '7d', label: translate('home.range7d'), days: 7 },
  { id: '30d', label: translate('home.range30d'), days: 30 },
  { id: '3m', label: translate('home.range3m'), months: 3 },
  { id: '1y', label: translate('home.range1y'), months: 12 },
  { id: 'all', label: translate('home.rangeAll') },
];

const ALL_TIME: DateRange = { from: '', to: '' };
const rangeDayFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

function presetRange(preset: (typeof rangePresets)[number]): DateRange {
  if (!preset.days && !preset.months) return ALL_TIME;
  const today = new Date();
  const from = new Date(today);
  if (preset.days) from.setDate(from.getDate() - (preset.days - 1));
  else from.setMonth(from.getMonth() - (preset.months ?? 0));
  return { from: toKey(from), to: toKey(today) };
}

function isAllTime(range: DateRange) {
  return !range.from && !range.to;
}

function inRange(key: string, range: DateRange) {
  return (!range.from || key >= range.from) && (!range.to || key <= range.to);
}

// A month or year bucket stays in view when any of its days falls inside the range.
function overlapsRange(period: FundsFlowPeriod, span: 'month' | 'year', range: DateRange) {
  const start = fromKey(period.start);
  const end = span === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 0) : new Date(start.getFullYear(), 11, 31);
  return (!range.to || period.start <= range.to) && (!range.from || toKey(end) >= range.from);
}

// The balance series is one point per day ending today. Only reached after the user picks a range,
// so reading the clock here never affects the prerendered markup.
function sliceBalance(series: number[], range: DateRange): { series: number[]; endDaysAgo: number } {
  if (isAllTime(range)) return { series, endDaysAgo: 0 };
  const todayKey = toKey(new Date());
  const lastIndex = series.length - 1;
  const kept = series.map((value, index) => ({ value, index })).filter((point) => inRange(addDays(todayKey, point.index - lastIndex), range));
  const lastKept = kept[kept.length - 1];
  return { series: kept.map((point) => point.value), endDaysAgo: lastKept ? lastIndex - lastKept.index : 0 };
}

function rangeCaption(range: DateRange): string {
  if (isAllTime(range)) return translate('home.trendLabel');
  const from = range.from ? rangeDayFormat.format(fromKey(range.from)) : '…';
  const to = range.to ? rangeDayFormat.format(fromKey(range.to)) : '…';
  return `${from} – ${to}`;
}

interface PerformanceStageProps {
  series?: number[];
  balance?: number;
  equity?: number;
  monthly?: FundsFlowPeriod[];
  yearly?: FundsFlowPeriod[];
  currency: string;
  className?: string;
}

/** Balance chart and funds flow share one stage; a sliding gold switch picks which one is on show. */
function PerformanceStage({ series, balance, equity, monthly, yearly, currency, className }: PerformanceStageProps) {
  const [view, setView] = useState<StageView>('balance');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [preset, setPreset] = useState<RangePreset | 'custom'>('all');

  const balanceWindow = series ? sliceBalance(series, range) : undefined;
  const monthlyInRange = monthly?.filter((period) => overlapsRange(period, 'month', range));
  const yearlyInRange = yearly?.filter((period) => overlapsRange(period, 'year', range));
  const caption = rangeCaption(range);

  function pickPreset(item: (typeof rangePresets)[number]) {
    setPreset(item.id);
    setRange(presetRange(item));
  }

  function pickCustom(next: DateRange) {
    setRange(next);
    setPreset(isAllTime(next) ? 'all' : 'custom');
  }

  return (
    <section
      aria-label={translate('home.balanceActivity')}
      className={cx('glass glass-strong relative isolate flex min-w-0 animate-rise flex-col gap-5 rounded-[28px] p-5 [animation-delay:160ms] motion-reduce:animate-none sm:p-6', className)}
    >
      {/* Only the glow is clipped, so the date picker's calendar can open past the card's edge. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <span className="absolute -top-28 -left-24 size-72 animate-drift rounded-full bg-primary/12 blur-3xl motion-reduce:animate-none" />
      </span>

      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div role="tablist" aria-label={translate('home.balanceActivity')} className="relative grid w-full shrink-0 grid-cols-2 rounded-full border border-line bg-surface/70 p-1 sm:w-[380px]">
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-y-1 left-1 w-[calc(50%-4px)] overflow-hidden rounded-full bg-primary shadow-[0_8px_24px_-8px_var(--brand-primary)] transition-transform duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)] motion-reduce:transition-none',
            view === 'flow' && 'translate-x-full',
          )}
        >
          <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
        </span>
        {stageViews.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setView(item.id)}
              className={cx(
                'relative z-10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Icon name={item.icon} size={15} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

        <div role="group" aria-label={translate('home.dateFilter')} className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface/70 p-1">
            {rangePresets.map((item) => {
              const isActive = preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => pickPreset(item)}
                  className={cx(
                    'relative h-8 min-w-10 rounded-full px-2.5 text-xs font-semibold tabular-nums transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive ? 'bg-primary text-on-primary shadow-[0_6px_18px_-8px_var(--brand-primary)]' : 'text-fg-muted hover:bg-hover hover:text-fg',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <DateRangePicker
            value={range}
            onChange={pickCustom}
            fromLabel={translate('home.rangeFrom')}
            toLabel={translate('home.rangeTo')}
            align="end"
            className={cx('min-w-0 flex-1 sm:flex-none', preset === 'custom' && 'rounded-full ring-1 ring-primary/50')}
          />
        </div>
      </div>

      <p className="-mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/25">
        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
        {translate('home.rangeShowing', { range: caption })}
      </p>

      <div key={view} role="tabpanel" className="flex min-w-0 flex-1 animate-rise flex-col motion-reduce:animate-none">
        {view === 'balance' ? (
          <PortfolioPanel
            series={balanceWindow?.series}
            endDaysAgo={balanceWindow?.endDaysAgo}
            balance={balance}
            equity={equity}
            currency={currency}
            periodLabel={caption}
            bare
            className="flex-1"
          />
        ) : (
          <FundsFlowPanel monthly={monthlyInRange} yearly={yearlyInRange} currency={currency} bare className="flex-1" />
        )}
      </div>
    </section>
  );
}

// Command-deck layout: the hero (greeting + wallet card), the KPI rail right under it, then the performance
// stage beside the account deck, and the transactions timeline at full width. Pairs stack below xl.
export default function DashboardPage() {
  const { user, wallet } = useSession();
  const { data, isFetching, refetch } = useDashboardView();
  const currency = data?.stats.currency ?? wallet.currency;
  const accountsTotal = data?.liveAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalBalance = accountsTotal === undefined ? undefined : accountsTotal + (data?.wallet ?? wallet).balance;

  return (
    <div className="relative isolate flex flex-col gap-5 sm:gap-6">
      <DashboardBackdrop />

      <GreetingBar user={user} wallet={data?.wallet ?? wallet} totalBalance={totalBalance} liveAccountCount={data?.liveAccounts.length} currency={currency} />

      <KpiTiles stats={data?.stats} />

      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-12">
        <PerformanceStage
          series={data?.balanceHistory}
          balance={data?.stats.totalBalance}
          equity={data?.stats.totalEquity}
          monthly={data?.monthlyFlows}
          yearly={data?.yearlyFlows}
          currency={currency}
          className="xl:col-span-8"
        />

        <AccountsPanel accounts={data?.liveAccounts} className="xl:col-span-4" />
      </div>

      <ActivityPanel transactions={data?.recentTransactions} isRefreshing={Boolean(data) && isFetching} onRefresh={refetch} />
    </div>
  );
}
