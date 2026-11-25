'use client';

import { useMockQuery } from '../lib/mock';

export type RewardCategory = 'travel' | 'electronics' | 'cash' | 'merchandise';

export interface TradeWinReward {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  /** Product image URL; the card falls back to the category icon when it is missing. */
  image?: string;
  lotRequirement: number;
  closedTradesOnly: boolean;
  /** Empty list means every group / symbol is allowed. */
  allowedGroups: string[];
  allowedSymbols: string[];
  value: number;
  stock: number;
  claimed: number;
}

export interface TradeWinLeader {
  rank: number;
  name: string;
  closedLots: number;
}

export interface TradeWinRedemption {
  id: string;
  rewardId: string;
  rewardName: string;
  redeemedAt: string;
  quantity: number;
  value: number;
  lotsSpent: number;
  /** Claim reference for a prize still being processed. */
  reference?: string;
  category?: RewardCategory;
}

export interface TradeWinOverview {
  currency: string;
  availableLots: number;
  tradedLots: number;
  spentLots: number;
  availableDeposit: number;
  pastWins: TradeWinRedemption[];
  rewards: TradeWinReward[];
  leaders: TradeWinLeader[];
}

function loadTradeWin(): TradeWinOverview {
  return {
    currency: 'USD',
    availableLots: 0,
    tradedLots: 0,
    spentLots: 0,
    availableDeposit: 1200,
    pastWins: [],
    rewards: [
      {
        id: 'RW-CASH-1000',
        name: 'Cash',
        description: 'Exclusive loyalty reward',
        category: 'cash',
        image: '/rewards/cash.svg',
        lotRequirement: 0,
        closedTradesOnly: true,
        allowedGroups: [],
        allowedSymbols: [],
        value: 1000,
        stock: 2,
        claimed: 9,
      },
      // Demo rewards below show how the store looks with several products and different states.
      {
        id: 'RW-TRAVEL-DXB',
        name: 'Dubai Weekend Trip',
        description: '3 nights for two, flights included',
        category: 'travel',
        image: '/rewards/dubai-trip.svg',
        lotRequirement: 150,
        closedTradesOnly: true,
        allowedGroups: ['VIP', 'Pro'],
        allowedSymbols: [],
        value: 2500,
        stock: 3,
        claimed: 4,
      },
      {
        id: 'RW-ELEC-PHONE',
        name: 'iPhone 16 Pro',
        description: 'Latest flagship, 256 GB',
        category: 'electronics',
        image: '/rewards/phone.svg',
        lotRequirement: 80,
        closedTradesOnly: true,
        allowedGroups: [],
        allowedSymbols: ['XAUUSD', 'EURUSD'],
        value: 1199,
        stock: 5,
        claimed: 12,
      },
      {
        id: 'RW-ELEC-WATCH',
        name: 'Smart Watch',
        description: 'Fitness and trading alerts on your wrist',
        category: 'electronics',
        image: '/rewards/smart-watch.svg',
        lotRequirement: 25,
        closedTradesOnly: false,
        allowedGroups: [],
        allowedSymbols: [],
        value: 349,
        stock: 0,
        claimed: 20,
      },
      {
        id: 'RW-CASH-AMAZON',
        name: 'Amazon Gift Card',
        description: 'Digital voucher delivered by email',
        category: 'cash',
        image: '/rewards/gift-card.svg',
        lotRequirement: 10,
        closedTradesOnly: true,
        allowedGroups: [],
        allowedSymbols: [],
        value: 100,
        stock: 25,
        claimed: 31,
      },
      {
        id: 'RW-MERCH-HOODIE',
        name: 'Brand Hoodie',
        description: 'Premium cotton, limited edition',
        category: 'merchandise',
        image: '/rewards/hoodie.svg',
        lotRequirement: 0,
        closedTradesOnly: false,
        allowedGroups: [],
        allowedSymbols: [],
        value: 60,
        stock: 15,
        claimed: 7,
      },
    ],
    leaders: [
      { rank: 1, name: 's**** d****', closedLots: 114.9 },
      { rank: 2, name: 'b**** w****', closedLots: 2.3 },
      { rank: 3, name: 's**** y****', closedLots: 2 },
      { rank: 4, name: 'S**** N****', closedLots: 1 },
      { rank: 5, name: 'L**** T****', closedLots: 0.8 },
      { rank: 6, name: 'F**** C****', closedLots: 0.8 },
      { rank: 7, name: 'T**** A****', closedLots: 0.8 },
      { rank: 8, name: 'L**** T****', closedLots: 0.7 },
    ],
  };
}

export function useTradeWin() {
  return useMockQuery(loadTradeWin);
}

// IB portal store: lots come from the downline, and the reference shows one Cash prize already claimed.
function loadIbTradeWin(): TradeWinOverview {
  const client = loadTradeWin();
  const cash = client.rewards[0];
  return {
    ...client,
    availableLots: 0,
    tradedLots: 0,
    spentLots: 0,
    pastWins: [
      {
        id: 'IB-WIN-1',
        rewardId: cash.id,
        rewardName: cash.name,
        redeemedAt: '2026-10-28',
        quantity: 1,
        value: 1000,
        lotsSpent: 0,
        reference: 'INDP-1044',
        category: 'cash',
      },
    ],
    rewards: [{ ...cash, stock: 1, claimed: 10 }],
    leaders: [
      ...client.leaders.slice(0, 7),
      { rank: 8, name: 'L**** T****', closedLots: 0.7 },
      { rank: 9, name: 'L**** T****', closedLots: 0.7 },
      { rank: 10, name: 'L**** T****', closedLots: 0.7 },
    ],
  };
}

export function useIbTradeWin() {
  return useMockQuery(loadIbTradeWin);
}
