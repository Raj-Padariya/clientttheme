'use client';

import { useMockQuery } from '../lib/mock';

export type BonusClaimMode = 'request' | 'auto';
export type BonusClaimStatus = 'pending' | 'approved' | 'rejected';

export interface BonusCampaign {
  id: string;
  name: string;
  /** Share of the deposit paid as bonus, e.g. 50 for a 50% match. */
  percent: number;
  kind: string;
  category: string;
  claimMode: BonusClaimMode;
  /** Empty means every account group can claim it. */
  allowedGroups: string[];
  maxCap: number;
  minDeposit: number;
  /** null means the bonus never expires. */
  durationDays: number | null;
}

export type BonusType = 'tradable' | 'losable';

/** One bonus request raised from a deposit. The admin reviews it and decides the credited amount. */
export interface BonusClaim {
  id: string;
  campaignId: string;
  depositAmount: number;
  depositRef: string;
  account: string;
  bonusType: BonusType;
  /** Set by the admin on approval; null while pending or when rejected. */
  amount: number | null;
  claimedAt: string;
  creditedAt?: string;
  status: BonusClaimStatus;
}

export interface BonusesOverview {
  currency: string;
  campaigns: BonusCampaign[];
  claims: BonusClaim[];
}

function loadBonuses(): BonusesOverview {
  return {
    currency: 'USD',
    // Sample grants so the page shows how several admin-credited bonuses look; newest first.
    claims: [
      {
        id: 'BC-004',
        campaignId: 'BN-001',
        depositAmount: 2000,
        depositRef: 'DEP-21094',
        account: 'MT5 · 102345',
        bonusType: 'tradable',
        amount: null,
        claimedAt: '2026-10-24T09:12:00Z',
        status: 'pending',
      },
      {
        id: 'BC-003',
        campaignId: 'BN-001',
        depositAmount: 5000,
        depositRef: 'DEP-20961',
        account: 'MT5 · 102345',
        bonusType: 'losable',
        amount: 1500,
        claimedAt: '2026-10-12T14:40:00Z',
        creditedAt: '2026-10-13T08:05:00Z',
        status: 'approved',
      },
      {
        id: 'BC-002',
        campaignId: 'BN-001',
        depositAmount: 1000,
        depositRef: 'DEP-20817',
        account: 'MT5 · 108812',
        bonusType: 'tradable',
        amount: 500,
        claimedAt: '2026-10-02T11:20:00Z',
        creditedAt: '2026-10-03T10:00:00Z',
        status: 'approved',
      },
      {
        id: 'BC-001',
        campaignId: 'BN-001',
        depositAmount: 80,
        depositRef: 'DEP-20544',
        account: 'MT5 · 108812',
        bonusType: 'tradable',
        amount: null,
        claimedAt: '2026-09-18T16:05:00Z',
        status: 'rejected',
      },
    ],
    campaigns: [
      {
        id: 'BN-001',
        name: 'Deposit Bonus',
        percent: 50,
        kind: 'Tradable Bonus',
        category: 'Deposit Bonus',
        claimMode: 'request',
        allowedGroups: [],
        maxCap: 25000,
        minDeposit: 100,
        durationDays: null,
      },
    ],
  };
}

export function useBonuses() {
  return useMockQuery(loadBonuses);
}
