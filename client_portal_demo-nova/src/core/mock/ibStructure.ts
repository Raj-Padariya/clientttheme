export interface IbStructureStats {
  activeClients: number;
  totalDeposit: number;
  totalWithdrawal: number;
  netDepositVolume: number;
  currentTier: string;
  totalLots: number;
  currentTierRebate: number;
  totalEarned: number;
}

export type IbTierTargetKind = 'activeClients' | 'netDeposit';

export interface IbTierTarget {
  kind: IbTierTargetKind;
  current: number;
  target: number;
}

export interface IbRebateCategory {
  id: string;
  name: string;
  /** Payout per lot for levels L1, L2, … in order. */
  rates: number[];
}

export interface IbStructure {
  currency: string;
  stats: IbStructureStats;
  nextTier: string;
  targets: IbTierTarget[];
  rebates: IbRebateCategory[];
}

export const mockIbStructure: IbStructure = {
  currency: 'USD',
  stats: {
    activeClients: 2,
    totalDeposit: 3100,
    totalWithdrawal: 220,
    netDepositVolume: 2880,
    currentTier: 'Normal',
    totalLots: 2.03,
    currentTierRebate: 0.08,
    totalEarned: 15.28,
  },
  nextTier: 'Silver',
  targets: [
    { kind: 'activeClients', current: 2, target: 2 },
    { kind: 'netDeposit', current: 2880, target: 50001 },
  ],
  rebates: [
    { id: 'currency', name: 'Currency', rates: [8, 2, 1, 1, 1, 1, 1] },
    { id: 'metals', name: 'Metals', rates: [8, 2, 1, 1, 1, 1, 1] },
  ],
};
