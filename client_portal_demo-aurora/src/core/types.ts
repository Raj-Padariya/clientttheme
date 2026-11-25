export type RequestStatus = 'pending' | 'processing' | 'approved' | 'rejected';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'internal';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  kycStatus: RequestStatus;
}

export interface Wallet {
  balance: number;
  currency: string;
}

export interface TradingAccount {
  id: string;
  login: string;
  type: 'live' | 'demo';
  platform: string;
  group: string;
  currency: string;
  balance: number;
  equity: number;
  credit: number;
  freeMargin: number;
  leverage: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  method: string;
  accountLogin: string;
  status: RequestStatus;
  createdAt: string;
  /** Broker reference shown to the client, e.g. "DEP-9732" or "INT-000027". */
  reference: string;
  /** Where the money came from / went to: a payment method name, "TA#<login>" (trading account) or "WA#<login>" (wallet account). */
  source: string;
  destination: string;
  /** Back-office note on a rejected request; absent when none was given. */
  rejectionReason?: string;
  /** Provider-side id (blockchain hash, gateway id); absent until the provider reports one. */
  transactionId?: string;
  /** File name of the payment proof the client uploaded, if any. */
  proofName?: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  kind: 'card' | 'bank' | 'crypto' | 'ewallet';
  currency: string;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  processing: 'instant' | 'hours' | 'days';
  /** Typical time until the money arrives, in minutes; 0 means immediate. */
  averageMinutes: number;
  /** Longest time the provider may take, in minutes. */
  maxMinutes: number;
}

export type KycDocumentKind = 'identity' | 'address' | 'selfie';

export interface KycDocument {
  kind: KycDocumentKind;
  status: RequestStatus | 'missing';
  fileName: string | null;
  uploadedAt: string | null;
}

export interface DashboardStats {
  totalBalance: number;
  totalEquity: number;
  liveAccounts: number;
  todayLots: number;
  monthDeposits: number;
  currency: string;
  /** Last seven daily values per stat, oldest first; drives the KPI sparklines and change %. */
  trends: Record<DashboardTrendKey, number[]>;
}

export type DashboardTrendKey = 'liveAccounts' | 'todayLots' | 'monthDeposits' | 'totalEquity';

/** Approved money in and out of the client's funds over one calendar month or year. */
export interface FundsFlowPeriod {
  /** First day of the period as an ISO date: YYYY-MM-01 for months, YYYY-01-01 for years. */
  start: string;
  deposits: number;
  withdrawals: number;
}

export interface Country {
  code: string;
  name: string;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  digits: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}
