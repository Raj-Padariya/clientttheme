export type PammPeriod = 'today' | '7d' | '30d' | '90d' | '1y' | 'all';
export type PammSeriesKey = 'netEquity' | 'aum' | 'netPl';

export interface PammPlanStat {
  id: string;
  name: string;
  investors: number;
  roiPercent: number;
}

export interface PammTrade {
  id: string;
  plan: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  profit: number;
}

export interface PammManagerDashboard {
  currency: string;
  /** Local `YYYY-MM-DDTHH:mm`; every period window ends here. */
  windowEnd: string;
  defaultPeriod: PammPeriod;
  /** Window length in days; `today` is the window end's calendar day. */
  periodDays: Record<Exclude<PammPeriod, 'today'>, number>;
  approvedPlans: number;
  totalAum: number;
  activeInvestors: number;
  commissionEarned: number;
  roiPercent: number;
  investors: { active: number; pending: number; inactive: number; newInWindow: number; churned: number; avgAgeDays: number; retentionPercent: number };
  plans: PammPlanStat[];
  payouts: { earned: number; pending: number };
  trades: PammTrade[];
  autoRefreshSeconds: number;
}

// Copied from the reference screenshot: a manager with no approved plans, investors, payouts or trades.
export const mockPammManager: PammManagerDashboard = {
  currency: 'USD',
  windowEnd: '2026-10-28T23:00',
  defaultPeriod: '30d',
  periodDays: { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: 730 },
  approvedPlans: 0,
  totalAum: 0,
  activeInvestors: 0,
  commissionEarned: 0,
  roiPercent: 0,
  // Dummy investor book (the screenshot shows all zeros) so the health grid has something to draw.
  investors: { active: 18, pending: 5, inactive: 3, newInWindow: 7, churned: 2, avgAgeDays: 46, retentionPercent: 88 },
  plans: [],
  payouts: { earned: 0, pending: 0 },
  trades: [],
  autoRefreshSeconds: 60,
};

const DAY_MS = 86_400_000;
const HISTORY_DAYS = 730;
const seriesEnd = new Date(2026, 9, 28, 23, 0).getTime();

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Dummy chart history (the screenshot's chart is empty): deterministic waves on a two-year trend so every
// period has movement. Net P&L is the per-point change, so it swings around zero and is drawn as bars.
export function pammSeriesAt(time: number): Record<PammSeriesKey, number> {
  const day = (time - seriesEnd) / DAY_MS;
  const growth = Math.min(1, Math.max(0, (day + HISTORY_DAYS) / HISTORY_DAYS));
  return {
    aum: round2(14000 + 22000 * growth + 1800 * Math.sin(day / 11) + 700 * Math.sin(day / 2.7) + 220 * Math.sin(day * 3.4) + 90 * Math.sin(day * 8.8)),
    netEquity: round2(11000 + 15000 * growth + 1300 * Math.sin(day / 8 + 0.6) + 520 * Math.sin(day / 2.1) + 160 * Math.sin(day * 4.9) + 60 * Math.sin(day * 9.6)),
    netPl: round2(180 * Math.sin(day / 3.2 + 1.3) + 120 * Math.sin(day * 1.7) + 60 * Math.sin(day * 6.1) + 40),
  };
}
