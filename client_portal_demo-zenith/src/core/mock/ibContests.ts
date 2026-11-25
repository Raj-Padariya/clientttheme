export type IbContestStatus = 'draft' | 'active' | 'ended';

export interface IbContest {
  id: string;
  name: string;
  description: string;
  status: IbContestStatus;
  participants: number;
  /** Entry fee per participant; 0 means free entry. */
  entryFee: number;
  totalPool: number;
  adminSharePercent: number;
  adminShare: number;
  yourShare: number;
  /** Full settings the contest was created with; shown read-only on "View". */
  details: ContestDraft;
}

export interface IbContests {
  currency: string;
  contests: IbContest[];
}

export type ContestSymbolGroupId = 'forex' | 'metals' | 'energy' | 'indices';

export interface ContestPrizeRow {
  id: string;
  rank: number;
  type: string;
  percentage: number;
  condition: string;
}

export interface ContestDraft {
  name: string;
  tagline: string;
  startDate: string;
  endDate: string;
  registrationCloses: string;
  timezone: string;
  startingBalance: number;
  rankingBy: string;
  minParticipants: number;
  maxParticipants: number;
  enrollmentType: string;
  multipleParticipation: string;
  minTradingDays: number;
  maxLeverage: string;
  maxLots: number;
  autoDisqualify: boolean;
  symbols: string[];
  prohibitedStrategies: string[];
  whoCanRegister: string;
  kycRequired: string;
  realAccountRequired: string;
  kycToClaimPrize: string;
  excludedCountries: string[];
  prizePoolType: string;
  adminSharePercent: number;
  prizes: ContestPrizeRow[];
  enrollmentTasks: boolean;
  termsAndConditions: boolean;
  showInClientPortal: boolean;
  showInAgency: boolean;
  sendPushNotification: boolean;
  alertSalesTeam: boolean;
}

export const contestFormOptions = {
  timezones: ['UTC', 'GMT-5', 'GMT+1', 'GMT+3', 'GMT+4', 'GMT+5:30', 'GMT+8'],
  rankingBy: ['Return %', 'Profit', 'Equity'],
  enrollmentTypes: ['Free', 'Paid'],
  multipleParticipation: ['Allowed', 'Not Allowed'],
  leverages: ['1:50', '1:100', '1:200', '1:500'],
  whoCanRegister: ['All Clients', 'Verified Clients'],
  yesNo: ['No', 'Yes'],
  prizePoolTypes: ['Percentage', 'Fixed'],
  prizeTypes: ['Cash', 'Bonus'],
  /** Set by the MT5 group; shown read-only on the form. */
  maxPositions: 100,
  minAdminSharePercent: 20,
  noteMaxLength: 500,
  strategies: ['grid', 'hft', 'copy', 'ea'] as const,
  symbolGroups: [
    {
      id: 'forex',
      symbols: [
        'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD', 'AUDSGD', 'AUDUSD', 'CADCHF', 'CADJPY', 'CHFJPY', 'EURAUD',
        'EURCAD', 'EURCHF', 'EURGBP', 'EURHKD', 'EURJPY', 'EURNOK', 'EURNZD', 'EURPLN', 'EURSEK', 'EURSGD',
        'EURTRY', 'EURUSD', 'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNOK', 'GBPNZD', 'GBPSEK', 'GBPSGD',
        'GBPUSD', 'HKDJPY', 'NOKJPY', 'NOKSEK', 'NZDCAD', 'NZDCHF', 'NZDJPY', 'NZDSGD', 'NZDUSD', 'SGDJPY',
        'USDCAD', 'USDCHF', 'USDCNH', 'USDDKK', 'USDJPY', 'USDMXN', 'USDNOK', 'USDPLN', 'USDSEK', 'USDSGD',
        'USDTRY', 'USDZAR',
      ],
    },
    { id: 'metals', symbols: ['GOLD', 'SILVER', 'XAGUSD', 'XAUUSD', 'XPDUSD', 'XPTUSD'] },
    { id: 'energy', symbols: ['BRENT', 'BRENT.FUTURE', 'CRUDE', 'CRUDE.FUTURE', 'NGAS', 'OIL', 'UKOIL', 'USOIL'] },
    {
      id: 'indices',
      symbols: ['AU200', 'BR20', 'CN50', 'DE40', 'DE40.FUTURE', 'ES35', 'EU50', 'FR40', 'HK50', 'IT40', 'JP225', 'MX35', 'NAS100'],
    },
  ] satisfies { id: ContestSymbolGroupId; symbols: string[] }[],
  countries: [
    'Afghanistan', 'Australia', 'Bangladesh', 'Brazil', 'Canada', 'China', 'France', 'Germany', 'India', 'Indonesia',
    'Iran', 'Japan', 'Malaysia', 'Nigeria', 'North Korea', 'Pakistan', 'Russia', 'Saudi Arabia', 'Singapore',
    'South Africa', 'Syria', 'Turkey', 'United Arab Emirates', 'United Kingdom', 'United States',
  ],
};

export function createContestDraft(): ContestDraft {
  return {
    name: '',
    tagline: '',
    startDate: '',
    endDate: '',
    registrationCloses: '',
    timezone: 'UTC',
    startingBalance: 10000,
    rankingBy: 'Return %',
    minParticipants: 1,
    maxParticipants: 100,
    enrollmentType: 'Free',
    multipleParticipation: 'Allowed',
    minTradingDays: 0,
    maxLeverage: '1:100',
    maxLots: 100,
    autoDisqualify: false,
    symbols: [],
    prohibitedStrategies: [],
    whoCanRegister: 'All Clients',
    kycRequired: 'No',
    realAccountRequired: 'No',
    kycToClaimPrize: 'No',
    excludedCountries: [],
    prizePoolType: 'Percentage',
    adminSharePercent: 20,
    prizes: [
      { id: 'PR-1', rank: 1, type: 'Cash', percentage: 50, condition: 'Withdrawable immediately' },
      { id: 'PR-2', rank: 2, type: 'Cash', percentage: 20, condition: 'Withdrawable immediately' },
      { id: 'PR-3', rank: 3, type: 'Cash', percentage: 10, condition: 'Withdrawable immediately' },
    ],
    enrollmentTasks: false,
    termsAndConditions: false,
    showInClientPortal: true,
    showInAgency: true,
    sendPushNotification: false,
    alertSalesTeam: false,
  };
}

export const mockIbContests: IbContests = {
  currency: 'USD',
  contests: [
    {
      id: 'CN-1',
      name: 'avb',
      description: 'tb',
      status: 'draft',
      participants: 0,
      entryFee: 0,
      totalPool: 0,
      adminSharePercent: 20,
      adminShare: 0,
      yourShare: 0,
      details: {
        ...createContestDraft(),
        name: 'avb',
        tagline: 'tb',
        startDate: '2026-10-25T15:12',
        endDate: '2026-11-14T15:14',
        registrationCloses: '2026-11-14T15:13',
        rankingBy: '',
        enrollmentType: '',
        whoCanRegister: '',
        kycRequired: '',
        kycToClaimPrize: '',
        showInClientPortal: false,
        showInAgency: false,
      },
    },
  ],
};
