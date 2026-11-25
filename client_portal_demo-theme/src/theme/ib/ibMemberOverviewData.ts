// Content of the IB Manager Portal "My Network › member" pages (reference screenshots, 2026-11-04), kept verbatim.

import type { DirectPeriod } from './ibDirectClientsData';

export type MemberTab = 'overview' | 'trades' | 'network' | 'symbols' | 'plan';

/** Whose page it is: your own, a sub-IB under you, or a client (wording differs per page). */
export type MemberVoice = 'you' | 'them' | 'client';

export type TradeSide = 'all' | 'buy' | 'sell';

export interface ReferralLink {
  id: string;
  name: string;
  isDefault: boolean;
  code: string;
  signedUp: number;
  funded: number;
  isOn: boolean;
}

export interface SymbolCommission {
  pair: string;
  trades: number;
  lots: number;
  fromOwnClients: number;
  fromSubIbs: number;
  earned: number;
}

export interface MemberTrade {
  id: string;
  account: string;
  side: 'buy' | 'sell';
  symbol: string;
  lots: number;
  closedAt: string;
  commission: number;
}

export interface TradingAccount {
  number: string;
  currency: string;
  group: string;
  balance: number;
  equity: number;
  lots: number;
}

export interface PlanRate {
  instrumentType: string;
  ratePerLot: number;
}

export interface MemberPlan {
  planId: string;
  name: string;
  givenOn: string;
  givenBy: string;
  groups: { name: string; rates: PlanRate[]; symbolRules: { symbol: string; ratePerLot: number }[] }[];
}

export interface PlanOption {
  id: string;
  name: string;
  partners: number;
}

export interface MemberTag {
  label: string;
  tone: 'role' | 'client';
}

export interface MemberOverview {
  /** `you` for your own page, otherwise the member's id in the network cascade. */
  id: string;
  voice: MemberVoice;
  name: string;
  email: string;
  tags: MemberTag[];
  facts: string[];
  cameVia: string | null;
  cameViaNote: string | null;
  /** Breadcrumbs between "My Network" and this member. */
  trail: { label: string; href: string }[];
  upline: { label: string; href: string } | null;
  tabs: MemberTab[];
  /** Node of the network cascade shown on the Network tab; null when the page has no Network tab. */
  cascadeId: string | null;
  currency: string;
  deposits: number;
  withdrawals: number;
  equity: number;
  lots: number;
  earned: number;
  /** IB pages only. */
  downline: { ownClients: number; branchClients: number; subIbs: number } | null;
  links: ReferralLink[] | null;
  wallet: { available: number; pending: number; earnedAllTime: number; paidOut: number } | null;
  /** Client pages only. */
  accounts: TradingAccount[] | null;
  symbols: SymbolCommission[] | null;
  /** Closed trades on their own accounts; null when the page has no Trades tab. */
  trades: MemberTrade[] | null;
  /** Commission plan you gave them; null when they have none. */
  plan: MemberPlan | null;
  /** Their own trading history; null when the member is not anyone's client (you). */
  history: { label: string; date: string }[] | null;
}

export const memberOverviewCopy = {
  breadcrumbRoot: 'My Network',
  notFound: 'Member not found',
  periods: ['today', '7d', '30d', 'mtd', 'all'] as DirectPeriod[],
  tabLabels: {
    overview: 'Overview',
    trades: 'Trades',
    network: 'Network',
    symbols: 'Symbol-wise commission',
    plan: 'Commission plan',
  } as Record<MemberTab, string>,
  upline: (name: string) => `Upline · ${name}`,
  cameVia: 'Came via',
  clients: 'Clients',
  subIbs: 'Sub-IBs',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  netFunding: 'Net funding',
  netFundingHint: 'deposits − withdrawals',
  equity: 'Equity',
  equityHint: 'right now, not the period',
  lots: 'Lots',
  youEarned: 'You earned',
  linkColumns: { link: 'Link', code: 'Code', signedUp: 'Signed up', funded: 'Funded', status: 'Status' },
  defaultTag: 'Default',
  statusOn: 'On',
  statusOff: 'Off',
  available: (currency: string) => `Available · ${currency}`,
  pending: 'Pending payout',
  pendingHint: 'locked in an open request',
  earnedAllTime: 'Earned all time',
  paidOut: 'Paid out',
  paidOutHint: 'settled',
  noOwnTrading: 'You are not your own client, so there is no trading of your own here.',
  ownTradingTitle: 'Their own trading',
  historyTitle: 'History',
  historyOrder: 'newest first',
  tradingAccounts: 'Trading accounts',
  accountCount: (count: number) => `${count} account(s)`,
  balance: 'Balance',
  lotsSuffix: 'lots',
  seeTrades: 'See trades',
  allAccounts: 'All accounts',
  accountLabel: 'Account',
  sides: [
    { id: 'all', label: 'All' },
    { id: 'buy', label: 'Buy' },
    { id: 'sell', label: 'Sell' },
  ] as { id: TradeSide; label: string }[],
  tradeSymbol: 'Symbol',
  tradesEmptyTitle: 'No closed trades',
  tradesEmptyBody: 'Nothing closed on this selection in this period. Commission is booked on close.',
  tradeColumns: { closed: 'Closed', account: 'Account', side: 'Side', symbol: 'Symbol', lots: 'Lots', commission: 'You earned' },
  planGiven: (date: string, by: string) => `Given on ${date} · by ${by} · rates below are what they keep per lot; anything above them is yours`,
  changePlan: 'Change plan',
  rateCount: (count: number) => `${count} rates`,
  rebateTitle: 'Rebate by instrument type',
  instrumentType: 'Instrument type',
  theirRate: 'Their rate / lot',
  perSymbolTitle: 'Per-symbol rules',
  perSymbolEmpty: 'No symbol is singled out — every symbol earns its instrument-type rate above.',
  moveTitle: (name: string) => `Move ${name} to another plan`,
  moveHint: 'It applies to commission from now on — nothing already booked changes',
  searchPlans: 'Search your plans',
  onItNow: 'On it now',
  partnersOnIt: (count: number) => `${count} partner(s) on it`,
  moveThem: 'Move them',
  cancel: 'Cancel',
  noPlanMatch: 'No plan matches this search.',
  symbolSearch: 'Filter by pair, e.g. XAU',
  symbolDates: 'Dates',
  symbolColumns: {
    pair: 'Pair',
    trades: 'Trades',
    lots: 'Lots',
    subIbs: 'Their sub-IBs',
    earned: 'You earned',
    share: 'Share',
  },
  symbolTotal: (currency: string) => `All pairs · ${currency}`,
  symbolEmpty: 'No pair matches this filter.',
};

interface VoiceCopy {
  downlineTitle: string;
  clientsHint: string;
  subIbsHint: string;
  depositsHint: string;
  withdrawalsHint: string;
  lotsHint: string;
  youEarnedHint: string;
  referralTitle: string;
  walletTitle: string;
  availableHint: string;
  earnedAllTimeHint: string;
  networkHint: string;
  symbolOwnClients: string;
}

const ibVoiceBase = {
  depositsHint: 'branch, this period',
  withdrawalsHint: 'branch, this period',
  lotsHint: 'branch, this period',
};

/** Wording that changes between your own page, a sub-IB's page and a client's page. */
export const memberVoiceCopy: Record<MemberVoice, VoiceCopy> = {
  you: {
    ...ibVoiceBase,
    downlineTitle: 'Your downline',
    clientsHint: 'your own / whole branch',
    subIbsHint: 'working under you',
    youEarnedHint: 'your share, whole network',
    referralTitle: 'Your referral links',
    walletTitle: 'Your wallet',
    availableHint: 'you can request this',
    earnedAllTimeHint: 'your own share',
    networkHint: 'Everyone under you. Open a row to read that person.',
    symbolOwnClients: 'Your own clients',
  },
  them: {
    ...ibVoiceBase,
    downlineTitle: 'Their downline',
    clientsHint: 'their own / whole branch',
    subIbsHint: 'working under them',
    youEarnedHint: 'your share from them',
    referralTitle: 'Their referral links',
    walletTitle: 'Their wallet',
    availableHint: 'they can request this',
    earnedAllTimeHint: 'their own share',
    networkHint: 'Everyone under them. Open a row to read that person.',
    symbolOwnClients: 'Their own clients',
  },
  client: {
    downlineTitle: '',
    clientsHint: '',
    subIbsHint: '',
    depositsHint: 'this period',
    withdrawalsHint: 'this period',
    lotsHint: 'this period',
    youEarnedHint: 'your share',
    referralTitle: '',
    walletTitle: '',
    availableHint: '',
    earnedAllTimeHint: '',
    networkHint: '',
    symbolOwnClients: '',
  },
};

const youPage = { label: 'You', href: '/ib/network/you' };
const harryPage = { label: 'harry sub ib Ly', href: '/ib/network/CM-1' };

export const mockMembers: MemberOverview[] = [
  {
    id: 'you',
    voice: 'you',
    name: 'You',
    email: 'harryib@gmail.com',
    tags: [{ label: 'Master IB', tone: 'role' }],
    facts: [],
    cameVia: null,
    cameViaNote: null,
    trail: [],
    upline: null,
    tabs: ['overview', 'network', 'symbols'],
    cascadeId: 'CM-0',
    currency: 'USD',
    deposits: 0,
    withdrawals: 0,
    equity: 9147.24,
    lots: 0,
    earned: 0,
    downline: { ownClients: 1, branchClients: 2, subIbs: 1 },
    links: [{ id: 'RL-1', name: 'My referral link', isDefault: true, code: 'K8JHOF6OCY', signedUp: 0, funded: 0, isOn: true }],
    wallet: { available: 0.75, pending: 0, earnedAllTime: 0.75, paidOut: 0 },
    accounts: null,
    symbols: [{ pair: 'XAUUSD', trades: 7, lots: 0.25, fromOwnClients: 0, fromSubIbs: 0.75, earned: 0.75 }],
    trades: null,
    plan: null,
    history: null,
  },
  {
    id: 'CM-1',
    voice: 'them',
    name: 'harry sub ib Ly',
    email: 'harrysubib@gmail.com',
    tags: [
      { label: 'Sub-IB · L1', tone: 'role' },
      { label: 'Your own client', tone: 'client' },
    ],
    facts: ['Joined 30 Oct 2026', 'Never traded', 'Last login 03 Nov 2026'],
    cameVia: 'My referral link',
    cameViaNote: null,
    trail: [youPage],
    upline: youPage,
    tabs: ['overview', 'trades', 'network', 'symbols', 'plan'],
    cascadeId: 'CM-1',
    currency: 'USD',
    deposits: 0,
    withdrawals: 0,
    equity: 9147.24,
    lots: 0,
    earned: 0,
    downline: { ownClients: 1, branchClients: 1, subIbs: 0 },
    links: [{ id: 'RL-2', name: 'My referral link', isDefault: true, code: 'ULKQ8VHZXF', signedUp: 0, funded: 0, isOn: true }],
    wallet: { available: 0.5, pending: 0, earnedAllTime: 0.5, paidOut: 0 },
    accounts: null,
    symbols: [{ pair: 'XAUUSD', trades: 7, lots: 0.25, fromOwnClients: 0.75, fromSubIbs: 0, earned: 0.75 }],
    trades: [],
    plan: {
      planId: 'PL-1',
      name: 'hhhhn',
      givenOn: '30 Oct 2026',
      givenBy: 'you',
      groups: [
        {
          name: 'Standard',
          rates: [
            { instrumentType: 'Currency', ratePerLot: 3 },
            { instrumentType: 'Metals', ratePerLot: 2 },
            { instrumentType: 'Energies', ratePerLot: 2 },
          ],
          symbolRules: [],
        },
      ],
    },
    history: [{ label: 'Assigned to you', date: '30 Oct 2026' }],
  },
  {
    id: 'CM-2',
    voice: 'client',
    name: 'H•••• T•••',
    email: 'ha•••@tenaxcode.com',
    tags: [{ label: "harry sub ib Ly's client", tone: 'client' }],
    facts: ['Joined 30 Oct 2026', 'Last trade 4d ago', 'Last rebate 30 Oct 2026', 'Last login 04 Nov 2026', 'Last deposit 19 Jun 2026'],
    cameVia: 'My referral link',
    cameViaNote: "(harry sub ib Ly's link)",
    trail: [youPage, harryPage],
    upline: harryPage,
    tabs: ['overview', 'trades'],
    cascadeId: null,
    currency: 'USD',
    deposits: 0,
    withdrawals: 0,
    equity: 9147.24,
    lots: 0,
    earned: 0,
    downline: null,
    links: null,
    wallet: null,
    accounts: [
      { number: '2000001', currency: 'USD', group: 'Standard', balance: 9147.24, equity: 9147.24, lots: 0 },
      { number: '2000010', currency: 'USD', group: 'Standard', balance: 0, equity: 0, lots: 0 },
    ],
    symbols: null,
    trades: [],
    plan: null,
    history: [{ label: 'Assigned to harry sub ib Ly', date: '30 Oct 2026' }],
  },
];

/** Your commission plans, offered in "Change plan". */
export const yourPlans: PlanOption[] = [{ id: 'PL-1', name: 'hhhhn', partners: 1 }];

export function getMember(id: string): MemberOverview | undefined {
  return mockMembers.find((member) => member.id === id);
}

/** Page of a network member, when one exists (the cascade's "Open →"). */
export function memberPageHref(id: string): string | null {
  return getMember(id) ? `/ib/network/${id}` : null;
}
