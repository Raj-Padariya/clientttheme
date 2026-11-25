'use client';

import { useState } from 'react';
import { useDashboardView } from '@/core/dashboard/useDashboardView';
import { useSession } from '@/core/session/useSession';
import { ActivityPanel } from './ActivityPanel';
import { AssetTreemap, CashflowStrip, GoalTrack, PowerTrack, TransferRoute } from './AuroraDeck';
import { AccountTiles, BalanceHeader, BalanceWaveChart, FlowTracks } from './ZenithBoard';

/*
 * Aurora dashboard on a 12-column bento grid: the wallet panel across the top; the balance chart beside a vertical
 * holdings list; a tall activity timeline on the left with money flow, the assets treemap and the cashflow strip
 * filling the right; and finally trading power, transfer and the goal track in uneven widths.
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
      <div className="md:col-span-2 xl:col-span-12">
        <BalanceHeader
          holderName={holderName}
          total={totalBalance}
          walletBalance={walletBalance}
          accounts={data?.liveAccounts}
          currency={currency}
          balanceHistory={data?.balanceHistory}
          hidden={hidden}
          onToggleHidden={() => setHidden((value) => !value)}
          isRefreshing={isRefreshing}
          onRefresh={refetch}
        />
      </div>

      <div className="grid md:col-span-2 xl:col-span-8">
        <BalanceWaveChart series={data?.balanceHistory} currency={currency} hidden={hidden} />
      </div>
      <div className="grid md:col-span-2 xl:col-span-4">
        <AccountTiles accounts={data?.liveAccounts} walletBalance={walletBalance} total={totalBalance} currency={currency} hidden={hidden} />
      </div>

      <div className="grid md:col-span-2 xl:col-span-4 xl:row-span-2">
        <ActivityPanel transactions={data?.recentTransactions} isRefreshing={isRefreshing} onRefresh={refetch} />
      </div>
      <div className="grid md:col-span-2 xl:col-span-8">
        <FlowTracks monthly={data?.monthlyFlows} yearly={data?.yearlyFlows} currency={currency} hidden={hidden} />
      </div>
      <div className="grid xl:col-span-4">
        <AssetTreemap accounts={data?.liveAccounts} walletBalance={walletBalance} total={totalBalance} currency={currency} hidden={hidden} />
      </div>
      <div className="grid xl:col-span-4">
        <CashflowStrip monthly={data?.monthlyFlows} series={data?.balanceHistory} currency={currency} hidden={hidden} />
      </div>

      <div className="grid md:col-span-2 xl:col-span-5">
        <PowerTrack accounts={data?.liveAccounts} balanceHistory={data?.balanceHistory} currency={currency} hidden={hidden} />
      </div>
      <div className="grid xl:col-span-4">
        <TransferRoute accounts={data?.liveAccounts} walletBalance={walletBalance} currency={currency} hidden={hidden} />
      </div>
      <div className="grid xl:col-span-3">
        <GoalTrack monthlyFlows={data?.monthlyFlows} depositTrend={data?.stats.trends.monthDeposits} currency={currency} hidden={hidden} />
      </div>
    </div>
  );
}
