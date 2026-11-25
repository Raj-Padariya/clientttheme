export type MasterPeriod = 'today' | '7d' | '30d' | '90d' | '1y' | 'all';
export type MasterSeriesKey = 'equity' | 'aum' | 'netPl' | 'benchmark';

export interface MasterPlanStat {
  id: string;
  name: string;
  copiers: number;
  roiPercent: number;
}

export interface MasterPayout {
  id: string;
  amount: number;
  /** `YYYY-MM-DD` */
  date: string;
}

export interface MasterTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  profit: number;
  /** Local `YYYY-MM-DDTHH:mm` */
  openedAt: string;
}

export interface MasterRiskAlert {
  id: string;
  message: string;
}

export interface MasterDashboard {
  currency: string;
  /** Local `YYYY-MM-DDTHH:mm`; every period window ends here. */
  windowEnd: string;
  defaultPeriod: MasterPeriod;
  /** Window length in days; `today` is the window end's calendar day. */
  periodDays: Record<Exclude<MasterPeriod, 'today'>, number>;
  totalAum: number;
  activeCopiers: number;
  netNewCopiers: number;
  earnings: number;
  nextPayout: { amount: number; date: string };
  roiPercent: number;
  benchmarkPercent: number;

  copiers: { active: number; paused: number; stopped: number; newInWindow: number; churned: number; avgAgeDays: number; retentionPercent: number };
  plans: MasterPlanStat[];
  payouts: { earned: number; pending: number; upcoming: MasterPayout[]; recent: MasterPayout[] };
  trades: MasterTrade[];
  autoRefreshSeconds: number;
  riskAlerts: MasterRiskAlert[];
}

// Copied from the reference screenshot: a new master with no copiers, plans, payouts or trades.
export const mockMasterDashboard: MasterDashboard = {
  currency: 'USD',
  windowEnd: '2026-10-28T23:00',
  defaultPeriod: '30d',
  periodDays: { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: 730 },
  // Dummy figures (the screenshot shows zeros) so the hero and copier health show a populated design.
  totalAum: 24_860.35,
  activeCopiers: 34,
  netNewCopiers: 6,
  earnings: 1_284.5,
  nextPayout: { amount: 312.4, date: '2026-11-01' },
  roiPercent: 8.42,
  benchmarkPercent: 3.15,

  copiers: { active: 34, paused: 5, stopped: 3, newInWindow: 9, churned: 3, avgAgeDays: 52, retentionPercent: 91 },
  plans: [],
  payouts: { earned: 0, pending: 0, upcoming: [], recent: [] },
  trades: [],
  autoRefreshSeconds: 15,
  riskAlerts: [],
};

const DAY_MS = 86_400_000;
const HISTORY_DAYS = 730;
const seriesEnd = new Date(2026, 9, 28, 23, 0).getTime();

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Dummy chart history (not in the screenshot): smooth, deterministic waves on a two-year growth trend,
// so every period from Today to All has movement and the same instant always gives the same value.
export function masterSeriesAt(time: number): Record<MasterSeriesKey, number> {
  const day = (time - seriesEnd) / DAY_MS;
  const growth = Math.min(1, Math.max(0, (day + HISTORY_DAYS) / HISTORY_DAYS));
  return {
    aum: round2(9000 + 16000 * growth + 1400 * Math.sin(day / 9) + 600 * Math.sin(day / 2.3) + 250 * Math.sin(day * 3.1) + 80 * Math.sin(day * 8.4)),
    equity: round2(5200 + 3400 * growth + 900 * Math.sin(day / 6 + 1) + 380 * Math.sin(day / 1.7) + 120 * Math.sin(day * 5.3) + 50 * Math.sin(day * 9.1)),
    netPl: round2(650 + 1300 * growth + 700 * Math.sin(day / 7.5 + 2) + 260 * Math.sin(day / 1.9) + 90 * Math.sin(day * 4.7) + 40 * Math.sin(day * 10.3)),
    benchmark: round2(4800 + 2600 * growth + 500 * Math.sin(day / 14) + 150 * Math.sin(day / 3.3) + 30 * Math.sin(day * 7.7)),
  };
}
