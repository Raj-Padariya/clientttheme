import type {
  Candle,
  Country,
  DashboardStats,
  FundsFlowPeriod,
  KycDocument,
  MarketQuote,
  PaymentMethod,
  TradingAccount,
  Transaction,
  User,
  Wallet,
} from '../types';

export const DEMO_CREDENTIALS = { email: 'demo@gmail.com', password: 'password' } as const;

export const mockUser: User = {
  id: 'u_1001',
  firstName: 'Rohan',
  lastName: 'Mehta',
  email: DEMO_CREDENTIALS.email,
  kycStatus: 'pending',
};

export const mockWallet: Wallet = { balance: 110, currency: 'USD' };

export const mockAccounts: TradingAccount[] = [
  { id: 'a1', login: '2000001', type: 'live', platform: 'MT5', group: 'Standard', currency: 'USD', balance: 1090, equity: 1162.4, credit: 0, freeMargin: 1098.15, leverage: 500 },
  { id: 'a2', login: '1988203968', type: 'live', platform: 'MT5', group: 'Raw ECN', currency: 'USD', balance: 250, equity: 218.6, credit: 0, freeMargin: 196.3, leverage: 200 },
  { id: 'a3', login: '9100342', type: 'demo', platform: 'MT5', group: 'Demo', currency: 'USD', balance: 100000, equity: 100245.8, credit: 0, freeMargin: 99820.4, leverage: 500 },
];

// `formatDate` prints in UTC (so server and client render the same text); times are stored in UTC to show exactly as on the reference screens.
export const mockTransactions: Transaction[] = [
  { id: 't1', type: 'internal', amount: 10, currency: 'USD', method: 'Internal Transfer', accountLogin: '2000001', status: 'approved', createdAt: '2026-09-22T12:41:00Z', reference: 'INT-000027', source: 'TA#2000001', destination: 'WA#1988203968', updatedAt: '2026-09-22T12:41:00Z' },
  { id: 't2', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '2000001', status: 'approved', createdAt: '2026-09-07T15:43:00Z', reference: 'DEP-858695797', source: 'Local', destination: 'TA#2000001', proofName: 'DEP-858695797-receipt.jpg', updatedAt: '2026-09-07T15:43:00Z' },
  { id: 't3', type: 'deposit', amount: 1000, currency: 'USD', method: 'Local', accountLogin: '2000001', status: 'approved', createdAt: '2026-09-03T11:25:00Z', reference: 'DEP-9732', source: 'Local', destination: 'TA#2000001', proofName: 'DEP-9732-receipt.jpg', updatedAt: '2026-09-03T11:25:00Z' },
  { id: 't4', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '1988203968', status: 'rejected', createdAt: '2026-08-17T18:31:00Z', reference: 'DEP-9682', source: 'Local', destination: 'WA#1988203968', proofName: 'DEP-9682-receipt.jpg', updatedAt: '2026-08-17T18:31:00Z' },
  { id: 't5', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '1988203968', status: 'rejected', createdAt: '2026-08-17T12:48:00Z', reference: 'DEP-1497', source: 'Local', destination: 'WA#1988203968', proofName: 'DEP-1497-receipt.jpg', updatedAt: '2026-08-17T12:48:00Z' },
  { id: 't6', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '1988203968', status: 'approved', createdAt: '2026-08-14T12:05:00Z', reference: 'DEP-6183', source: 'Local', destination: 'WA#1988203968', proofName: 'DEP-6183-receipt.jpg', updatedAt: '2026-08-14T12:05:00Z' },
];

// The wallet ledger records entries at the date it was credited, which is why its times differ from the transaction list.
export const mockWalletTransactions: Transaction[] = [
  { id: 'w1', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '1988203968', status: 'rejected', createdAt: '2026-08-17T05:30:00Z', reference: 'DEP-9682', source: 'Local', destination: 'Wallet', updatedAt: '2026-08-17T05:30:00Z' },
  { id: 'w2', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '1988203968', status: 'rejected', createdAt: '2026-08-17T05:30:00Z', reference: 'DEP-1497', source: 'Local', destination: 'Wallet', updatedAt: '2026-08-17T05:30:00Z' },
  { id: 'w3', type: 'deposit', amount: 100, currency: 'USD', method: 'Local', accountLogin: '1988203968', status: 'approved', createdAt: '2026-08-14T05:30:00Z', reference: 'DEP-6183', source: 'Local', destination: 'Wallet', updatedAt: '2026-08-14T05:30:00Z' },
];

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm_local', name: 'Local', kind: 'bank', currency: 'USD', minAmount: 100, maxAmount: 10000000, feePercent: 0, processing: 'instant', averageMinutes: 0, maxMinutes: 10 },
  { id: 'pm_enet', name: 'Enet', kind: 'ewallet', currency: 'USD', minAmount: 1, maxAmount: 100, feePercent: 1, processing: 'hours', averageMinutes: 60, maxMinutes: 1440 },
  { id: 'pm_enet_one', name: 'enet one', kind: 'ewallet', currency: 'USD', minAmount: 1, maxAmount: 100, feePercent: 1, processing: 'hours', averageMinutes: 60, maxMinutes: 1440 },
  { id: 'pm_zain_cash', name: 'Zain Cash', kind: 'card', currency: 'USD', minAmount: 10, maxAmount: 1000, feePercent: 0, processing: 'hours', averageMinutes: 60, maxMinutes: 240 },
];

export const mockWithdrawalMethods: PaymentMethod[] = [
  { id: 'wm_local', name: 'Local', kind: 'bank', currency: 'USD', minAmount: 10, maxAmount: 500, feePercent: 0, processing: 'hours', averageMinutes: 240, maxMinutes: 1440 },
  { id: 'wm_crypto', name: 'Crypto', kind: 'crypto', currency: 'USD', minAmount: 10, maxAmount: 500, feePercent: 0, processing: 'hours', averageMinutes: 240, maxMinutes: 1440 },
];

export const mockKycDocuments: KycDocument[] = [
  { kind: 'identity', status: 'approved', fileName: 'passport.pdf', uploadedAt: '2026-09-01T10:12:00Z' },
  { kind: 'address', status: 'rejected', fileName: 'electricity-bill.jpg', uploadedAt: '2026-09-01T10:15:00Z' },
  { kind: 'selfie', status: 'missing', fileName: null, uploadedAt: null },
];

export const mockDashboardStats: DashboardStats = {
  totalBalance: 1090,
  totalEquity: 1090,
  liveAccounts: 2,
  todayLots: 0,
  monthDeposits: 0,
  currency: 'USD',
  trends: {
    liveAccounts: [1, 1, 1, 2, 2, 2, 2],
    todayLots: [0.4, 1.2, 0.8, 1.6, 0.9, 0.3, 0],
    monthDeposits: [500, 500, 250, 250, 100, 0, 0],
    totalEquity: [1012, 1036, 1021, 1058, 1049, 1074, 1090],
  },
};

/** Daily total balance for the last 30 days, oldest first. */
export const mockBalanceHistory: number[] = [
  612, 640, 628, 655, 690, 672, 701, 735, 722, 760, 748, 781, 805, 790, 828,
  852, 840, 871, 905, 892, 930, 958, 944, 976, 1008, 995, 1031, 1052, 1071, 1090,
];

/** Approved deposits and withdrawals for the last six months, oldest first; October matches the $0 "This Month" stat. */
export const mockMonthlyFlows: FundsFlowPeriod[] = [
  { start: '2026-05-01', deposits: 1800, withdrawals: 250 },
  { start: '2026-06-01', deposits: 950, withdrawals: 600 },
  { start: '2026-07-01', deposits: 2600, withdrawals: 400 },
  { start: '2026-08-01', deposits: 1200, withdrawals: 350 },
  { start: '2026-09-01', deposits: 5500, withdrawals: 0 },
  { start: '2026-10-01', deposits: 0, withdrawals: 0 },
];

/** Approved deposits and withdrawals for the last five years, oldest first. */
export const mockYearlyFlows: FundsFlowPeriod[] = [
  { start: '2022-01-01', deposits: 4200, withdrawals: 1500 },
  { start: '2023-01-01', deposits: 7600, withdrawals: 2900 },
  { start: '2024-01-01', deposits: 9800, withdrawals: 3600 },
  { start: '2025-01-01', deposits: 6400, withdrawals: 4100 },
  { start: '2026-01-01', deposits: 15800, withdrawals: 2350 },
];

export const mockCountries: Country[] = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ZA', name: 'South Africa' },
];

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// Seeded walk (Park–Miller) so the server render and the client hydrate the same chart.
function buildCandles(count: number, start: number, seed: number): Candle[] {
  let state = seed;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };

  const candles: Candle[] = [];
  let open = start;
  for (let index = 0; index < count; index += 1) {
    const close = open + (next() - 0.4) * 9;
    candles.push({
      open: roundTo(open, 2),
      high: roundTo(Math.max(open, close) + next() * 4, 2),
      low: roundTo(Math.min(open, close) - next() * 4, 2),
      close: roundTo(close, 2),
    });
    open = close;
  }
  return candles;
}

export const mockGoldCandles: Candle[] = buildCandles(36, 2368, 7);

const lastGoldClose = mockGoldCandles[mockGoldCandles.length - 1].close;

export const mockQuotes: MarketQuote[] = [
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', price: lastGoldClose, changePercent: 0.84, digits: 2 },
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', price: 1.08412, changePercent: 0.21, digits: 5 },
  { symbol: 'GBP/USD', name: 'Pound vs US Dollar', price: 1.29874, changePercent: -0.12, digits: 5 },
  { symbol: 'USD/JPY', name: 'US Dollar vs Yen', price: 149.732, changePercent: 0.35, digits: 3 },
  { symbol: 'BTC/USD', name: 'Bitcoin', price: 67412.5, changePercent: 1.92, digits: 1 },
  { symbol: 'US30', name: 'Dow Jones 30', price: 39118.4, changePercent: -0.28, digits: 1 },
  { symbol: 'NAS100', name: 'Nasdaq 100', price: 18204.7, changePercent: 0.61, digits: 1 },
  { symbol: 'XAG/USD', name: 'Silver vs US Dollar', price: 28.412, changePercent: 1.12, digits: 3 },
  { symbol: 'USOIL', name: 'WTI Crude Oil', price: 78.64, changePercent: -0.94, digits: 2 },
];

