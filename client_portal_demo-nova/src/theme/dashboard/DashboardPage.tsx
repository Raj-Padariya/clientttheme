'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useDashboardView } from '@/core/dashboard/useDashboardView';
import { translate } from '@/core/i18n';
import { useSession } from '@/core/session/useSession';
import { Icon } from '../ui/Icon';
import { ActivityPanel } from './ActivityPanel';
import { BalanceHero, GoalsCard } from './BalanceColumn';
import { AccountsDeck, OverviewDeck, PowerDeck, TransferDeck } from './DeskCards';
import { EquityChartCard } from './EquityChartCard';
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
 * Nova dashboard: a frosted balance card beside the chart stage, then a row of four desk cards (overview, trading
 * power, accounts, transfer) with thin bar strips, then the transaction tiles beside goals / cash flow.
 */
export default function DashboardPage() {
  const { user, wallet } = useSession();
  const { data, isFetching, refetch } = useDashboardView();
  const [hidden, setHidden] = useState(false);

  const currency = data?.stats.currency ?? wallet.currency;
  const currentWallet = data?.wallet ?? wallet;
  const holderName = `${user.firstName} ${user.lastName}`;
  const accountsTotal = data?.liveAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalBalance = accountsTotal === undefined ? undefined : accountsTotal + currentWallet.balance;
  const walletBalance = data ? currentWallet.balance : undefined;
  const isRefreshing = Boolean(data) && isFetching;

  return (
    <div className="relative isolate flex flex-col gap-6 sm:gap-8">
      <StageGlow />

      <HeadingBar />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        <BalanceHero
          total={totalBalance}
          walletBalance={walletBalance}
          currency={currency}
          accounts={data?.liveAccounts}
          holderName={holderName}
          monthlyFlows={data?.monthlyFlows}
          balanceHistory={data?.balanceHistory}
          isRefreshing={isRefreshing}
          onRefresh={refetch}
          hidden={hidden}
          onToggleHidden={() => setHidden((value) => !value)}
        />
        <EquityChartCard
          series={data?.balanceHistory}
          equity={data?.stats.totalEquity}
          monthly={data?.monthlyFlows}
          yearly={data?.yearlyFlows}
          currency={currency}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <OverviewDeck monthlyFlows={data?.monthlyFlows} transactions={data?.recentTransactions} currency={currency} />
        <PowerDeck accounts={data?.liveAccounts} balanceHistory={data?.balanceHistory} currency={currency} />
        <AccountsDeck accounts={data?.liveAccounts} walletBalance={walletBalance} currency={currency} hidden={hidden} />
        <TransferDeck accounts={data?.liveAccounts} walletBalance={walletBalance} currency={currency} hidden={hidden} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <ActivityPanel transactions={data?.recentTransactions} isRefreshing={isRefreshing} onRefresh={refetch} />
        <GoalsCard monthlyFlows={data?.monthlyFlows} depositTrend={data?.stats.trends.monthDeposits} currency={currency} />
      </div>
    </div>
  );
}
