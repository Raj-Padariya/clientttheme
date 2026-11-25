/* Master's own copy-trading plans (My Plans list + plan detail). Static demo data until the backend exists. */

export type PlanStatus = 'approved' | 'pending' | 'rejected' | 'inactive';

export interface MasterPlanRow {
  id: number;
  name: string;
  status: PlanStatus;
  copiers: number;
  /** `null` means unlimited copier slots. */
  maxCopiers: number | null;
  aum: number;
  commissionPercent: number;
  commissionBasis: string;
  subscriptionFee: number | null;
  billingPeriod: string | null;
  tradingAccount: string;
  serverName: string;
  serverType: string;
  /** ISO date (YYYY-MM-DD). */
  createdAt: string;
}

export const myPlans: MasterPlanRow[] = [
  {
    id: 1,
    name: 'grow with profit',
    status: 'approved',
    copiers: 0,
    maxCopiers: null,
    aum: 0,
    commissionPercent: 15,
    commissionBasis: 'hwm',
    subscriptionFee: null,
    billingPeriod: null,
    tradingAccount: 'TA#2000011',
    serverName: 'Tenax',
    serverType: 'selfHosted',
    createdAt: '2026-10-29',
  },
];

export interface PlanCopier {
  name: string;
  email: string;
  account: string;
  capital: number;
  openTrades: number;
  totalPnl: number;
  commissionPaid: number;
  pendingFee: number;
  status: 'Active' | 'Stopped';
  joined: string;
}

export interface PlanActivity {
  title: string;
  detail: string;
  at: string;
  kind: 'trade' | 'join';
}

export interface PlanTimelineStep {
  title: string;
  detail: string;
  at: string;
}

export interface PlanTrade {
  id: string;
  date: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  copierAccount: string;
  copierName: string;
  copierPnl: number;
  paidToMaster: number;
  runningFeeEstimate: number;
  feeStatus: string;
  status: string;
}

export interface PlanDetail {
  activeCopiers: number;
  planAum: number;
  openPositions: number;
  floatingCommission: number;
  commissionEarned: number;
  netPnl: number;
  performance: {
    closedTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    netPnl: number;
    maxDrawdown: number;
  };
  /** One equity value per day, oldest first, ending on `equityEnd`. */
  equity: number[];
  equityEnd: string;
  commission: { lifetime: number; thisMonth: number; pending: number; settled: number };
  settlement: { cycle: string; lastSettled: string; nextPayout: string; nextPayoutState: string };
  commissionLabel: string;
  commissionType: string;
  minimumCapital: number;
  noFeeGraceDays: number;
  planFull: boolean;
  copyingActive: boolean;
  tradingAccountNumber: string;
  initialEquity: number;
  strategyDescription: string | null;
  riskInformation: string | null;
  copiers: PlanCopier[];
  activity: PlanActivity[];
  timeline: PlanTimelineStep[];
  trades: PlanTrade[];
}

const EQUITY_DAYS = 91;
const EQUITY_LEVEL = 43.65;
// The curve sits at the plan's net P&L and drops to zero for one day on Oct 30 (index 86 from Aug 5).
const EQUITY_DIP_INDEX = 86;

function tradeRows(): PlanTrade[] {
  const rows: [string, PlanTrade['direction'], number, number][] = [
    ['Oct 30, 2026, 07:21 PM', 'SELL', 23.64, 0],
    ['Oct 30, 2026, 07:21 PM', 'SELL', 23.72, 3.32],
    ['Oct 30, 2026, 07:21 PM', 'SELL', 22.8, 6.74],
    ['Oct 30, 2026, 07:21 PM', 'SELL', 22.44, 10.1],
    ['Oct 30, 2026, 07:21 PM', 'SELL', 22.44, 13.47],
    ['Oct 30, 2026, 07:21 PM', 'SELL', 23.84, 17.05],
    ['Oct 30, 2026, 07:16 PM', 'BUY', -14.8, 0],
    ['Oct 30, 2026, 07:16 PM', 'BUY', -13.08, 0],
    ['Oct 30, 2026, 07:16 PM', 'SELL', 11.24, 0],
    ['Oct 30, 2026, 07:16 PM', 'SELL', 11.84, 0],
    ['Oct 30, 2026, 07:16 PM', 'SELL', 11.92, 0.4],
    ['Oct 30, 2026, 07:14 PM', 'SELL', 1.65, 0],
    ['Oct 30, 2026, 07:14 PM', 'SELL', 1.65, 0],
    ['Oct 30, 2026, 07:14 PM', 'SELL', 1.89, 0],
    ['Oct 30, 2026, 07:14 PM', 'SELL', 1.68, 0],
  ];
  return rows.map(([date, direction, copierPnl, runningFeeEstimate], index) => ({
    id: `t${index + 1}`,
    date,
    symbol: 'XAUUSD',
    direction,
    copierAccount: '****0001',
    copierName: 'Harry test',
    copierPnl,
    paidToMaster: 0,
    runningFeeEstimate,
    feeStatus: 'Settled',
    status: 'Closed',
  }));
}

export const planDetails: Record<number, PlanDetail> = {
  1: {
    activeCopiers: 0,
    planAum: 0,
    openPositions: 0,
    floatingCommission: 0,
    commissionEarned: 17.55,
    netPnl: 43.65,
    performance: {
      closedTrades: 51,
      winRate: 78.43,
      avgWin: 5.87,
      avgLoss: 17.38,
      profitFactor: 1.23,
      expectancy: 0.86,
      netPnl: 43.65,
      maxDrawdown: 93.88,
    },
    equity: Array.from({ length: EQUITY_DAYS }, (_, index) => (index === EQUITY_DIP_INDEX ? 0 : EQUITY_LEVEL)),
    equityEnd: '2026-11-03',
    commission: { lifetime: 17.55, thisMonth: 0, pending: 0, settled: 17.55 },
    settlement: { cycle: 'Daily', lastSettled: 'Nov 3, 2026, 03:00 AM', nextPayout: 'Nov 3, 2026, 05:30 AM', nextPayoutState: 'Due now' },
    commissionLabel: '15% commission on profit',
    commissionType: 'Per trade',
    minimumCapital: 50,
    noFeeGraceDays: 0,
    planFull: false,
    copyingActive: true,
    tradingAccountNumber: '2000011',
    initialEquity: 0,
    strategyDescription: null,
    riskInformation: null,
    copiers: [
      {
        name: 'Harry test',
        email: 'harry@tenaxcode.com',
        account: '****0001',
        capital: 9050.9,
        openTrades: 0,
        totalPnl: 0,
        commissionPaid: 0,
        pendingFee: 0,
        status: 'Stopped',
        joined: 'Oct 29, 2026',
      },
    ],
    activity: [
      { title: 'XAUUSD SELL closed', detail: '+$22.48 master P&L', at: 'Oct 30, 2026, 07:21 PM', kind: 'trade' },
      { title: 'XAUUSD SELL closed', detail: '+$23.40 master P&L', at: 'Oct 30, 2026, 07:21 PM', kind: 'trade' },
      { title: 'XAUUSD SELL closed', detail: '+$23.32 master P&L', at: 'Oct 30, 2026, 07:21 PM', kind: 'trade' },
      { title: 'XAUUSD SELL closed', detail: '+$22.12 master P&L', at: 'Oct 30, 2026, 07:21 PM', kind: 'trade' },
      { title: 'Harry test joined the plan', detail: 'Account ****0001', at: 'Oct 29, 2026', kind: 'join' },
    ],
    timeline: [
      { title: 'Plan created', detail: 'Submitted for review.', at: 'Oct 29, 2026, 05:20 PM' },
      { title: 'Plan approved', detail: 'Live for copiers to subscribe.', at: 'Oct 29, 2026, 05:21 PM' },
      { title: 'Last settlement', detail: 'Cycle: Daily.', at: 'Nov 3, 2026, 03:00 AM' },
    ],
    trades: tradeRows(),
  },
};

export const planDetailCopy = {
  back: 'Back to My Plans',
  notFound: 'Plan not found',
  notFoundText: "This plan doesn't exist or was removed.",
  copyingOn: 'Copying on',
  copyingOff: 'Copying off',
  edit: 'Edit',
  pause: 'Pause',
  inactivate: 'Inactivate',
  activeCopiers: 'Active Copiers',
  currentlyLive: 'Currently live',
  planAum: 'Plan AUM',
  lockedCapital: 'Locked capital',
  openPositions: 'Open Positions',
  currentlyOpen: 'Currently open',
  floatingCommission: 'Floating Commission',
  onOpenTrades: 'On open trades',
  commissionEarned: 'Commission Earned',
  settledCaption: 'Settled',
  netPnl: 'Net P&L',
  afterAllFees: 'After all fees',
  performance: 'Performance',
  closedTrades: 'Closed trades',
  winRate: 'Win rate',
  avgWin: 'Avg win',
  avgLoss: 'Avg loss',
  profitFactor: 'Profit factor',
  expectancy: 'Expectancy',
  maxDrawdown: 'Max drawdown',
  equityCurve: 'Equity curve (last 90 days)',
  commissionSummary: 'Commission summary',
  lifetime: 'Lifetime',
  thisMonth: 'This month',
  pending: 'Pending',
  pendingHint: 'High-water-mark estimate',
  settled: 'Settled',
  settlementCycle: 'Settlement cycle',
  cycle: 'Cycle',
  cycleHint: 'How often pending commissions are flushed to your wallet.',
  lastSettled: 'Last settled',
  lastSettledHint: 'When the previous cycle ran.',
  nextPayout: 'Next payout',
  nextPayoutHint: 'Projected date of the next cycle flush.',
  commissionAndFee: 'Commission & subscription fee',
  commission: 'Commission',
  commissionHint: 'What copiers pay according to this plan.',
  commissionType: 'Commission Type',
  commissionTypeHint: 'Per profitable trade vs subscription.',
  copierRules: 'Copier rules',
  minimumCapital: 'Minimum Capital',
  minimumCapitalHint: 'Smallest account a copier can join with.',
  activeCap: 'Active / cap',
  activeCapHint: 'Current copiers vs limit.',
  planFull: 'Plan full',
  planFullHint: 'No new copiers until someone leaves.',
  yes: 'Yes',
  no: 'No',
  myCopiers: 'My copiers',
  copier: 'Copier',
  account: 'Account',
  capital: 'Capital',
  openTrades: 'Open trades',
  totalPnl: 'Total P&L',
  commissionPaid: 'Commission paid',
  pendingFee: 'Pending fee',
  status: 'Status',
  joined: 'Joined',
  noCopiers: 'No copiers yet',
  strategyAndRisk: 'Strategy & risk disclosure',
  strategyDescription: 'Strategy description',
  strategyMissing: 'Not provided. Edit the plan to add a public description for copiers.',
  riskInformation: 'Risk information',
  riskMissing: 'Not provided. Edit the plan to disclose drawdown and risk.',
  accountAndSystem: 'Account & system',
  statusHint: 'Broker / admin approval state.',
  copying: 'Copying',
  copyingHint: 'Whether new master trades are replicated to copiers.',
  active: 'Active',
  inactive: 'Inactive',
  server: 'Server',
  serverHint: 'Execution routing label.',
  tradingAccount: 'Trading Account',
  tradingAccountHint: 'Account number used for this plan.',
  initialEquity: 'Initial equity snapshot',
  initialEquityHint: 'Captured when the plan was approved (if recorded).',
  created: 'Created',
  createdHint: 'Plan creation timestamp.',
  recentActivity: 'Recent activity',
  planTimeline: 'Plan timeline',
  tradeHistory: 'Trade & Commission History',
  allSymbols: 'All Symbols',
  allDirections: 'All Directions',
  allCopiers: 'All Copiers',
  symbol: 'Symbol',
  direction: 'Direction',
  date: 'Date',
  copierAccount: 'Copier account',
  copierName: 'Copier name',
  copierPnl: 'Copier P&L',
  paidToYou: 'Paid to you (master)',
  runningFee: 'Running fee estimate',
  feeStatus: 'Fee status',
  paidToYouNote: 'is what actually hit your wallet from that ledger line when the fee settled.',
  runningFeeNote:
    "is the whole-account fee picture after that copier's trade closed — it can change on the next trade and is not \"paid per row\"; do not sum this column to guess your income.",
  noTrades: 'No trades match these filters.',
  showing: 'Showing',
  of: 'of',
  page: 'Page',
  firstPage: 'First page',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  hoverHint: 'Hover the curve to read a day',
  approved: 'Approved',
};

export type CopierStatus = 'active' | 'pending' | 'paused' | 'stopped';

export interface MasterCopierRow {
  id: string;
  name: string;
  email: string;
  account: string;
  planId: number;
  planName: string;
  status: CopierStatus;
  capital: number;
  pnl: number;
  commissionRate: number;
  estimatedCommission: number;
  netPnl: number;
  openTrades: number;
  method: string;
  lastUpdate: string;
}

export const myCopiers: MasterCopierRow[] = [
  {
    id: 'c1',
    name: 'Harry test',
    email: 'harry@tenaxcode.com',
    account: '****0001',
    planId: 1,
    planName: 'grow with profit',
    status: 'stopped',
    capital: 9050.9,
    pnl: 0,
    commissionRate: 15,
    estimatedCommission: 0,
    netPnl: 0,
    openTrades: 0,
    method: 'Proportional · Multiplier · 1×',
    lastUpdate: 'Nov 2, 2026, 12:37 PM',
  },
];

export interface CopierTrade {
  symbol: string;
  side: 'BUY' | 'SELL';
  volume: number;
  open: string;
  close: string;
  profit: number;
  closedAt: string;
}

export interface CopierSubscriptionPeriod {
  index: number;
  status: 'subscribed' | 'unsubscribed';
  start: string;
  end: string;
  durationDays: number;
  equityAtSubscribe: number;
  periodPnl: number;
  commission: number;
  tradeCount: number;
  trades: CopierTrade[];
}

export interface CopierSubscriptionHistory {
  totalSubscriptions: number;
  lifetimePnl: number;
  lifetimeCommission: number;
  periods: CopierSubscriptionPeriod[];
}

type TradeRow = [side: CopierTrade['side'], volume: number, open: string, close: string, profit: number, closedAt: string];

const harryTradeRows: TradeRow[] = [
  ['SELL', 0.04, '3924.72', '3919.11', 22.44, 'Oct 30, 2026, 07:21 PM'],
  ['SELL', 0.04, '3924.72', '3919.11', 22.44, 'Oct 30, 2026, 07:21 PM'],
  ['SELL', 0.04, '3924.98', '3919.02', 23.84, 'Oct 30, 2026, 07:21 PM'],
  ['SELL', 0.04, '3925.02', '3919.11', 23.64, 'Oct 30, 2026, 07:21 PM'],
  ['SELL', 0.04, '3925.04', '3919.11', 23.72, 'Oct 30, 2026, 07:21 PM'],
  ['SELL', 0.04, '3924.81', '3919.11', 22.8, 'Oct 30, 2026, 07:21 PM'],
  ['BUY', 0.04, '3930.39', '3927.12', -13.08, 'Oct 30, 2026, 07:16 PM'],
  ['BUY', 0.04, '3930.82', '3927.12', -14.8, 'Oct 30, 2026, 07:16 PM'],
  ['SELL', 0.04, '3930.41', '3927.45', 11.84, 'Oct 30, 2026, 07:16 PM'],
  ['SELL', 0.04, '3930.43', '3927.45', 11.92, 'Oct 30, 2026, 07:16 PM'],
  ['SELL', 0.04, '3930.26', '3927.45', 11.24, 'Oct 30, 2026, 07:16 PM'],
  ['SELL', 0.03, '3928.95', '3928.40', 1.65, 'Oct 30, 2026, 07:14 PM'],
  ['SELL', 0.03, '3928.97', '3928.44', 1.59, 'Oct 30, 2026, 07:14 PM'],
  ['SELL', 0.03, '3928.97', '3928.43', 1.62, 'Oct 30, 2026, 07:14 PM'],
  ['SELL', 0.03, '3928.97', '3928.43', 1.62, 'Oct 30, 2026, 07:14 PM'],
  ['SELL', 0.03, '3928.95', '3928.40', 1.65, 'Oct 30, 2026, 07:14 PM'],
  ['SELL', 0.03, '3929.01', '3928.44', 1.71, 'Oct 30, 2026, 07:14 PM'],
];

/** Per-copier subscription periods, keyed by copier id. Only the trades the server has sent so far are listed. */
export const copierSubscriptions: Record<string, CopierSubscriptionHistory> = {
  c1: {
    totalSubscriptions: 1,
    lifetimePnl: 116.98,
    lifetimeCommission: 17.55,
    periods: [
      {
        index: 1,
        status: 'unsubscribed',
        start: 'Oct 29, 2026, 06:35 PM',
        end: 'Nov 2, 2026, 12:37 PM',
        durationDays: 3.7512962962962964,
        equityAtSubscribe: 9050.9,
        periodPnl: 116.98,
        commission: 17.55,
        tradeCount: 51,
        trades: harryTradeRows.map(([side, volume, open, close, profit, closedAt]) => ({ symbol: 'XAUUSD', side, volume, open, close, profit, closedAt })),
      },
    ],
  },
};

export const subscriptionHistoryCopy = {
  title: 'Subscription history',
  totalSubscriptions: 'Total subscriptions',
  lifetimePnl: 'Lifetime P&L (sum of periods)',
  lifetimeCommission: 'Lifetime commission',
  subscribed: 'Subscribed',
  unsubscribed: 'Unsubscribed',
  equityAtSubscribe: 'Equity at subscribe',
  periodPnl: 'Period P&L',
  commission: 'Commission',
  trades: 'Trades',
  showTrades: (count: number) => `Show ${count} trades`,
  hideTrades: (count: number) => `Hide ${count} trades`,
  loaded: (shown: number, total: number) => `${shown} of ${total} trades loaded`,
  symbol: 'Symbol',
  side: 'Side',
  volume: 'Volume',
  open: 'Open',
  close: 'Close',
  profit: 'Profit',
  closedAt: 'Closed at',
  noHistory: 'No subscriptions yet',
  closeDialog: 'Close',
  openPlan: 'Open plan',
};

/** Header totals as reported by the server (stopped copiers' funds are no longer invested). */
export const myCopiersTotals = {
  activeCopiers: 0,
  totalCapital: 0,
  totalPnl: 0,
  estimatedCommission: 0,
  commissionEarned: 0,
};

export const myCopiersCopy = {
  subtitle: 'Everyone copying your plans, their capital and what they owe you.',
  activeCopiers: 'Active Copiers',
  currentlyLive: 'Currently live',
  totalCapital: 'Total Capital',
  investedFunds: 'Invested funds',
  totalPnl: 'Total P&L',
  realized: 'Realized',
  estimatedCommission: 'Estimated Commission',
  projected: 'Projected',
  commissionEarned: 'Commission Earned',
  settled: 'Settled',
  network: 'Copier network',
  you: 'You',
  filterAll: 'All',
  filterActive: 'Active',
  filterPending: 'Pending',
  filterPaused: 'Paused',
  filterStopped: 'Stopped / Removed',
  statusFilter: 'Filter copiers by status',
  planFilter: 'Plan',
  allPlans: 'All plans',
  copier: 'Copier',
  account: 'Account',
  plan: 'Plan',
  status: 'Status',
  capital: 'Capital',
  pnl: 'P&L',
  commissionRate: 'Commission rate',
  estimated: 'Estimated commission',
  netPnl: 'Net P&L',
  open: 'Open',
  method: 'Method',
  lastUpdate: 'Last update',
  actions: 'Actions',
  view: 'Subscription history',
  statusActive: 'Active',
  statusPending: 'Pending',
  statusPaused: 'Paused',
  statusStopped: 'Stopped',
  noMatch: 'No copiers match this filter',
  noMatchText: 'Try another status or plan.',
  showing: 'Showing',
  of: 'of',
  page: 'Page',
  firstPage: 'First page',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  close: 'Close',
  openPlan: 'Open plan',
};

export const pausePlanCopy = {
  title: 'Pause copying',
  message: (planName: string) => `Pause copying for “${planName}”? Copiers will not receive new trades until you resume.`,
  masterLabel: 'Your trades',
  copiersLabel: 'Copiers',
  confirm: 'OK',
  cancel: 'Cancel',
  resume: 'Resume',
  paused: 'Copying paused',
};

export const SETTLEMENT_CYCLES = ['Daily', 'Weekly', 'Monthly'] as const;

export const editPlanCopy = {
  title: 'Edit plan',
  description: 'Changes apply to new copier settlements from the next cycle.',
  sectionDetails: 'Plan details',
  sectionCommission: 'Commission',
  sectionRules: 'Copier rules',
  planName: 'Plan Name',
  strategyDescription: 'Strategy Description',
  riskInformation: 'Risk Information',
  commissionRate: 'Commission rate (%)',
  commissionRateHint: "% of copier's net equity gain above their high-water mark. Charged at settlement cycle / unsubscribe (not per trade).",
  settlementCycle: 'Settlement cycle',
  settlementCycleHint: 'How often pending commission is debited from copiers and credited to you. Default: daily.',
  graceDays: 'No-Fee Grace Period (days)',
  minCapital: 'Min. Capital (USD)',
  maxCopiers: 'Max copiers',
  maxCopiersPlaceholder: 'Unlimited if empty',
  commissionPreview: 'commission on profit',
  required: 'Required',
  nameRequired: 'Plan name is required.',
  rateInvalid: 'Enter a rate between 0 and 100.',
  capitalInvalid: 'Enter a minimum capital above 0.',
  wholeNumber: 'Use a whole number of 0 or more.',
  days: 'days',
  cancel: 'Cancel',
  save: 'Save',
};
