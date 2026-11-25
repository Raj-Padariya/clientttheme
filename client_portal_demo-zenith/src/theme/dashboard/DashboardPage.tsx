'use client';

import { useState } from 'react';
import { useDashboardView } from '@/core/dashboard/useDashboardView';
import { useSession } from '@/core/session/useSession';
import { ActivityPanel } from './ActivityPanel';
import { AccountTiles, AssetFlow, BalanceHeader, BalanceWaveChart, CashflowPixels, FlowTracks } from './ZenithBoard';
import { GoalRing, PowerGauge, TransferBridge } from './ZenithDesk';

/**
 * A soft white light falling from the top-left onto the open balance header. The layer fades out towards its left and
 * top edges, so the blurred glow never meets the content edge as a hard vertical line.
 */
function StageLight() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[480px] overflow-hidden [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_22%),linear-gradient(to_bottom,transparent,#000_20%,#000_55%,transparent)]"
    >
      <span className="zenith-spot absolute -top-32 left-[12%] h-[420px] w-[55%] rounded-full bg-fg/[0.08] blur-[110px]" />
    </div>
  );
}

/*
 * Zenith dashboard: open balance header (no card) with the money actions, a sideways row of account tiles, the
 * two-line balance chart beside the monthly flow capsules, then activity / total assets flow / net cashflow pixels,
 * and finally the transfer, trading power and goals cards.
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
    <div className="relative isolate flex flex-col gap-5 sm:gap-6">
      <StageLight />

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

      <AccountTiles accounts={data?.liveAccounts} walletBalance={walletBalance} total={totalBalance} currency={currency} hidden={hidden} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <BalanceWaveChart series={data?.balanceHistory} currency={currency} hidden={hidden} />
        <FlowTracks monthly={data?.monthlyFlows} yearly={data?.yearlyFlows} currency={currency} hidden={hidden} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
        <ActivityPanel transactions={data?.recentTransactions} isRefreshing={isRefreshing} onRefresh={refetch} />
        <AssetFlow accounts={data?.liveAccounts} walletBalance={walletBalance} total={totalBalance} currency={currency} hidden={hidden} />
        <CashflowPixels monthly={data?.monthlyFlows} series={data?.balanceHistory} currency={currency} hidden={hidden} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TransferBridge accounts={data?.liveAccounts} walletBalance={walletBalance} currency={currency} hidden={hidden} />
        <PowerGauge accounts={data?.liveAccounts} balanceHistory={data?.balanceHistory} currency={currency} hidden={hidden} />
        <GoalRing monthlyFlows={data?.monthlyFlows} depositTrend={data?.stats.trends.monthDeposits} currency={currency} hidden={hidden} />
      </div>
    </div>
  );
}
