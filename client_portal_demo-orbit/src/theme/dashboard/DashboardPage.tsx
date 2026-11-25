'use client';

import Link from 'next/link';
import { useDashboardView } from '@/core/dashboard/useDashboardView';
import { translate } from '@/core/i18n';
import { useSession } from '@/core/session/useSession';
import { Icon } from '../ui/Icon';
import { ActivityPanel } from './ActivityPanel';
import { BalanceColumn } from './BalanceColumn';
import { EquityChartCard, OverviewTiles } from './EquityChartCard';
import { PowerColumn } from './PowerColumn';
import { ffText } from './finflowParts';

/** Soft violet light falling from the top of the page, like the reference's stage glow. */
function StageGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[520px] overflow-hidden">
      <span className="absolute top-[-180px] left-1/2 h-[420px] w-[70%] -translate-x-1/2 animate-glow rounded-full bg-primary/15 blur-[110px] motion-reduce:animate-none" />
      <span className="absolute top-0 left-[38%] h-[360px] w-24 -rotate-12 bg-linear-to-b from-primary/12 to-transparent blur-2xl" />
      <span className="absolute top-0 left-[58%] h-[300px] w-16 rotate-12 bg-linear-to-b from-primary/10 to-transparent blur-2xl" />
    </div>
  );
}

function HeadingBar() {
  return (
    <div className="flex animate-rise flex-wrap items-center justify-between gap-4 motion-reduce:animate-none">
      <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.02em] text-fg uppercase sm:text-[38px]">{translate('nav.dashboard')}</h1>
      <Link
        href="/accounts"
        aria-label={ffText.layout}
        title={ffText.layout}
        className="grid size-12 place-items-center rounded-full border border-line-strong bg-surface/60 text-fg transition-[color,border-color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <Icon name="dashboard" size={19} />
      </Link>
    </div>
  );
}

/*
 * Orbit dashboard, laid out after the user's FinFlow reference: a big DASHBOARD heading, then three columns —
 * total balance + account stack + goals/cash flow, the chart stage (balance / funds-flow, date presets, custom
 * range) + monthly overview tiles, and the violet wallet card + free margin + send-to + wallet rows.
 */
export default function DashboardPage() {
  const { user, wallet } = useSession();
  const { data, isFetching, refetch } = useDashboardView();

  const currency = data?.stats.currency ?? wallet.currency;
  const currentWallet = data?.wallet ?? wallet;
  const holderName = `${user.firstName} ${user.lastName}`;
  const accountsTotal = data?.liveAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalBalance = accountsTotal === undefined ? undefined : accountsTotal + currentWallet.balance;
  const isRefreshing = Boolean(data) && isFetching;

  return (
    <div className="relative isolate flex flex-col gap-6 sm:gap-8">
      <StageGlow />

      <HeadingBar />

      {/* Columns stretch to the tallest one; each column's last card grows so all three end on one line. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.3fr)_minmax(300px,0.9fr)]">
        <BalanceColumn
          total={totalBalance}
          walletBalance={data ? currentWallet.balance : undefined}
          currency={currency}
          accounts={data?.liveAccounts}
          holderName={holderName}
          monthlyFlows={data?.monthlyFlows}
          depositTrend={data?.stats.trends.monthDeposits}
          isRefreshing={isRefreshing}
          onRefresh={refetch}
        />

        <div className="flex min-w-0 flex-col gap-6 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          <EquityChartCard
            series={data?.balanceHistory}
            equity={data?.stats.totalEquity}
            monthly={data?.monthlyFlows}
            yearly={data?.yearlyFlows}
            currency={currency}
          />
          <OverviewTiles monthlyFlows={data?.monthlyFlows} transactions={data?.recentTransactions} currency={currency} />
        </div>

        <PowerColumn accounts={data?.liveAccounts} currency={currency} />
      </div>

      <ActivityPanel transactions={data?.recentTransactions} isRefreshing={isRefreshing} onRefresh={refetch} />
    </div>
  );
}
