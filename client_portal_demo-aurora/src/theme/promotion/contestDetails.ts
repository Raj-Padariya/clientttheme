import { formatMoney } from '@/core/format';
import type { DemoContest } from '@/core/pages/useDemoContest';
import type { IconName } from '../ui/Icon';

export interface ContestRule {
  key: string;
  icon: IconName;
  label: string;
  value: string;
  /** Shown as a small pill instead of plain text (e.g. "Required"). */
  isPill?: boolean;
  hint?: string;
}

export interface ContestPrize {
  place: number;
  label: string;
  amount: string;
  kind: string;
}

export interface ContestStep {
  key: string;
  title: string;
  text: string;
  state: 'done' | 'blocked';
}

export interface ContestNote {
  key: string;
  icon: IconName;
  text: string;
}

export interface ContestDetail {
  participants: number;
  maxParticipants: number;
  prizePool: number;
  registrationClosesAt: string;
  startingBalanceNote: string;
  eligibility: ContestRule[];
  tradingRules: ContestRule[];
  prizes: ContestPrize[];
  steps: ContestStep[];
  notes: ContestNote[];
}

export const contestText = {
  back: 'Back to all contests',
  participants: 'PARTICIPANTS',
  filled: (percent: number) => `${percent}% Filled`,
  prizePool: 'PRIZE POOL',
  totalPrizePool: 'Total Prize Pool',
  daysLeft: 'DAYS LEFT',
  daysRemaining: 'DAYS remaining',
  liveTimer: 'LIVE TIMER',
  ended: 'Ended',
  contestStarts: 'Contest Starts',
  registrationCloses: 'Registration Closes',
  contestEnds: 'Contest Ends',
  startingBalance: 'Starting Balance',
  registrationClosed: 'Registration Closed',
  registrationOpen: 'Registration Open',
  yourRank: 'Your Rank',
  currentStanding: 'Current standing',
  yourReturn: 'Your Return',
  performance: 'Performance',
  yourEquity: 'Your Equity',
  totalAccountValue: 'Total account value',
  startTrading: 'Start Trading',
  startTradingHint: 'Open your contest account',
  viewLeaderboard: 'View Full Leaderboard',
  leaderboardTitle: 'Contest Leaderboard',
  backToDashboard: 'Back to Dashboard',
  live: 'LIVE',
  rank: 'RANK',
  trader: 'TRADER',
  account: 'ACCOUNT',
  equity: 'EQUITY',
  returnPercent: 'RETURN %',
  you: 'YOU',
  noTraders: 'No traders on the leaderboard yet.',
  joinContest: 'Join Contest',
  enrolled: 'Enrolled',
  hrs: 'HRS',
  min: 'MIN',
  sec: 'SEC',
  eligibilityTitle: 'Eligibility & KYC Rules',
  eligibilityHint: 'Requirements to register for this contest.',
  tradingTitle: 'Trading Rules',
  tradingHint: 'Rules that apply during the contest period.',
  prizeTitle: 'Prize Structure',
  prizeHint: 'Rewards for top-performing traders.',
  statusTitle: 'Registration & Status',
  statusHint: 'Check your eligibility and complete steps to join.',
  register: 'Register & Start Trading',
  registered: 'You are registered for this contest',
  notesTitle: 'Important Notes',
  notesHint: 'Must read before participating.',
  notFound: 'Contest not found',
  notFoundHint: 'This contest is no longer listed on Demo Contests.',
};

const placeLabel = ['1st Place', '2nd Place', '3rd Place'];

/** Detail figures from the contest's admin screen; contests without a reference fall back to their list data. */
const DAY_MS = 86_400_000;

const overrides: Record<string, Partial<ContestDetail> & { secondPrizes?: number[]; maxOpenPositions?: number }> = {
  'CT-001': {
    participants: 7,
    maxParticipants: 1000,
    prizePool: 0,
    registrationClosesAt: '2026-09-24T00:00:00Z',
    secondPrizes: [2500, 1000],
  },
  'CT-004': {
    // Matches the four other traders on this contest's leaderboard.
    participants: 4,
    maxParticipants: 1000,
    prizePool: 0,
    registrationClosesAt: '2026-11-12T16:35:00Z',
    secondPrizes: [2500, 1000],
    maxOpenPositions: 50,
  },
};

export interface LeaderboardEntry {
  id: string;
  rank: number;
  trader: string;
  account: string;
  equity: number;
  returnPercent: number;
  isYou: boolean;
}

type LeaderboardSeed = Omit<LeaderboardEntry, 'rank' | 'isYou'>;

/** The client's own contest account; other traders are masked as the reference shows them. */
const leaderboardSeeds: Record<string, { you: LeaderboardSeed; others: LeaderboardSeed[] }> = {
  'CT-004': {
    you: { id: 'you', trader: 'demo t.', account: '99900303', equity: 10_000, returnPercent: 0 },
    others: [
      { id: 'l2', trader: 't*** s*', account: '99900316', equity: 10_000, returnPercent: 0 },
      { id: 'l3', trader: 't*** d*', account: '99900317', equity: 10_000, returnPercent: 0 },
      { id: 'l4', trader: 'i** s*', account: '99900318', equity: 10_000, returnPercent: 0 },
      { id: 'l5', trader: 'i** s*', account: '99900319', equity: 10_000, returnPercent: 0 },
    ],
  },
};

export function getLeaderboard(contest: DemoContest, isEnrolled: boolean): LeaderboardEntry[] {
  const seed = leaderboardSeeds[contest.id] ?? {
    you: { id: 'you', trader: 'You', account: '—', equity: contest.startingBalance, returnPercent: 0 },
    others: [],
  };
  const rows = [...(isEnrolled ? [{ ...seed.you, isYou: true }] : []), ...seed.others.map((entry) => ({ ...entry, isYou: false }))];
  // Stable sort: on a tie (everyone at 0% at the start) the client stays on top, as in the reference.
  return rows.sort((a, b) => b.returnPercent - a.returnPercent).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function getContestDetail(contest: DemoContest, currency: string, now: number): ContestDetail {
  const override = overrides[contest.id] ?? {};
  const daysLeft = Math.max(0, Math.ceil((Date.parse(contest.endsAt) - now) / DAY_MS));
  const maxParticipants = override.maxParticipants ?? 1000;
  const topPrize = contest.topPrizePercent === undefined ? formatMoney(contest.topPrize, currency) : `${contest.topPrizePercent}%`;
  const prizeAmounts = [topPrize, ...(override.secondPrizes ?? []).map((amount) => formatMoney(amount, currency))];

  return {
    participants: override.participants ?? 0,
    maxParticipants,
    prizePool: override.prizePool ?? 0,
    registrationClosesAt: override.registrationClosesAt ?? contest.endsAt,
    startingBalanceNote: 'Real Account',
    eligibility: [
      { key: 'ranked', icon: 'arrowsUpDown', label: 'Ranked By', value: contest.winCriteria },
      { key: 'balance', icon: 'wallet', label: 'Starting Balance', value: formatMoney(contest.startingBalance, currency) },
      { key: 'max', icon: 'user', label: 'Max Participants', value: String(maxParticipants) },
      { key: 'who', icon: 'globe', label: 'Who Can Register?', value: 'All Clients' },
      { key: 'kyc', icon: 'kyc', label: 'KYC Required?', value: 'Yes' },
      { key: 'real', icon: 'bank', label: 'Real Account to Claim', value: 'Required', isPill: true },
    ],
    tradingRules: [
      { key: 'leverage', icon: 'areaChart', label: 'Max Leverage', value: `1:${contest.maxLeverage}` },
      { key: 'duration', icon: 'clock', label: 'Min Trade Duration', value: '3 min' },
      { key: 'positions', icon: 'barChart', label: 'Max Open Positions', value: String(override.maxOpenPositions ?? 100) },
      { key: 'instruments', icon: 'filter', label: 'Allowed Instruments', value: 'Selected Instruments', hint: 'Only instruments selected by the broker count towards this contest.' },
      { key: 'lots', icon: 'signalBars', label: 'Max Lots Per Trade', value: '10' },
      { key: 'timezone', icon: 'globe', label: 'Timezone', value: contest.timezoneLabel },
    ],
    prizes: prizeAmounts.map((amount, index) => ({ place: index + 1, label: placeLabel[index], amount, kind: 'CASH' })),
    steps: [
      { key: 'kyc', title: 'KYC Verification', text: 'Your KYC is verified and approved.', state: 'done' },
      contest.registrationOpen
        ? { key: 'registration', title: 'Registration Open', text: `Contest is accepting registrations — ${daysLeft} day(s) left.`, state: 'done' }
        : { key: 'registration', title: 'Registration Closed', text: 'Contest is not accepting registrations at this moment.', state: 'blocked' },
    ],
    notes: [
      { key: 'period', icon: 'fileText', text: 'All trades must be placed and closed within the contest period.' },
      { key: 'strategies', icon: 'alert', text: 'Use of prohibited strategies may result in disqualification.' },
      { key: 'results', icon: 'pieChart', text: 'Results will be calculated based on highest return percentage.' },
      { key: 'decision', icon: 'check', text: 'Our decision will be final in case of any disputes.' },
    ],
  };
}
