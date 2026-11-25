'use client';

import { useState } from 'react';
import type { TradeWinOverview, TradeWinReward } from '@/core/pages/useTradeWin';
import { Skeleton } from '../ui/Feedback';
import { VolumeBoard, FillsBlotter } from './IbTradeWinBoards';
import { RewardExchange } from './IbTradeWinStore';
import { AccountStrip } from './IbTradeWinStrip';
import { FIRST_REFERENCE, type PastWin } from './TradeWinPage';
import './ibTradeWin.css';

/*
 * Aurora IB Trade & Win as a rewards exchange: the lot balance as an account strip, rewards as a watchlist
 * beside an order ticket that "fills" on redeem, the leaderboard as a top-volume board and past wins as a fills blotter.
 */
export function IbTradeWinScreen({ data, isLoading }: { data: TradeWinOverview | undefined; isLoading: boolean }) {
  const [redemptions, setRedemptions] = useState<PastWin[]>([]);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-60 rounded-[20px] lg:col-span-12" />
        <Skeleton className="h-[36rem] rounded-[20px] lg:col-span-12" />
        <Skeleton className="h-[26rem] rounded-[20px] lg:col-span-7" />
        <Skeleton className="h-[26rem] rounded-[20px] lg:col-span-5" />
      </div>
    );
  }

  const { currency } = data;
  const pastWins = [...redemptions, ...data.pastWins];
  const valueWon = pastWins.reduce((sum, entry) => sum + entry.value, 0);
  const sessionLotsSpent = redemptions.reduce((sum, entry) => sum + entry.lotsSpent, 0);
  const availableLots = data.availableLots - sessionLotsSpent;

  function redeemedQuantity(reward: TradeWinReward): number {
    return redemptions.filter((entry) => entry.rewardId === reward.id).reduce((sum, entry) => sum + entry.quantity, 0);
  }

  function handleRedeem(reward: TradeWinReward, quantity: number): string {
    // New claims continue after any reference already on record.
    const reference = `INDP-${FIRST_REFERENCE + pastWins.length}`;
    const entry: PastWin = {
      id: `${reward.id}-${redemptions.length + 1}`,
      rewardId: reward.id,
      rewardName: reward.name,
      redeemedAt: new Date().toISOString(),
      quantity,
      value: reward.value * quantity,
      lotsSpent: reward.lotRequirement * quantity,
      reference,
      category: reward.category,
    };
    setRedemptions((current) => [entry, ...current]);
    return reference;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <AccountStrip
        availableLots={availableLots}
        tradedLots={data.tradedLots}
        spentLots={data.spentLots + sessionLotsSpent}
        pastWins={pastWins.length}
        valueWon={valueWon}
        currency={currency}
      />
      <RewardExchange
        rewards={data.rewards}
        currency={currency}
        availableLots={availableLots}
        availableDeposit={data.availableDeposit}
        stockLeftOf={(reward) => Math.max(0, reward.stock - redeemedQuantity(reward))}
        claimedOf={(reward) => reward.claimed + redeemedQuantity(reward)}
        onRedeem={handleRedeem}
      />
      <VolumeBoard leaders={data.leaders} />
      <FillsBlotter entries={pastWins} currency={currency} />
    </div>
  );
}
