'use client';

import { useMockQuery } from '../lib/mock';

export type ContestStatus = 'active' | 'upcoming' | 'completed';

export interface DemoContest {
  id: string;
  name: string;
  description: string;
  status: ContestStatus;
  registrationOpen: boolean;
  startingBalance: number;
  maxLeverage: number;
  winCriteria: string;
  entryFee: number;
  topPrize: number;
  /** Set when the top prize is paid as a share of the pool. */
  topPrizePercent?: number;
  startsAt: string;
  endsAt: string;
  timezoneLabel: string;
}

export interface DemoContestOverview {
  currency: string;
  contests: DemoContest[];
  enrolledIds: string[];
}

function loadDemoContests(): DemoContestOverview {
  return {
    currency: 'USD',
    enrolledIds: [],
    contests: [
      {
        id: 'CT-001',
        name: 'contest one',
        description: 'complete contest and win prices',
        status: 'active',
        registrationOpen: false,
        startingBalance: 10000,
        maxLeverage: 200,
        winCriteria: 'Return %',
        entryFee: 0,
        topPrize: 5000,
        startsAt: '2026-08-03T00:00:00Z',
        endsAt: '2026-09-30T00:00:00Z',
        timezoneLabel: 'Dubai Time (UTC+4)',
      },
      {
        id: 'CT-002',
        name: 'test',
        description: 'test',
        status: 'active',
        registrationOpen: false,
        startingBalance: 10000,
        maxLeverage: 200,
        winCriteria: 'Return %',
        entryFee: 0,
        topPrize: 5000,
        startsAt: '2026-08-01T00:00:00Z',
        endsAt: '2026-09-04T00:00:00Z',
        timezoneLabel: 'Dubai Time (UTC+4)',
      },
      {
        id: 'CT-003',
        name: 'sc',
        description: 'asd',
        status: 'completed',
        registrationOpen: false,
        startingBalance: 10000,
        maxLeverage: 200,
        winCriteria: 'Return %',
        entryFee: 0,
        topPrize: 0,
        topPrizePercent: 20,
        startsAt: '2026-09-04T00:00:00Z',
        endsAt: '2026-09-11T00:00:00Z',
        timezoneLabel: 'Dubai Time (UTC+4)',
      },
      {
        id: 'CT-004',
        name: 'Testing',
        description: 'Trade for win',
        status: 'active',
        registrationOpen: true,
        startingBalance: 10000,
        maxLeverage: 200,
        winCriteria: 'Return %',
        entryFee: 0,
        topPrize: 5000,
        // Wall-clock times as the reference shows them (4:34 PM); the theme formats contest times in UTC and labels them with timezoneLabel.
        startsAt: '2026-10-01T16:34:00Z',
        endsAt: '2026-11-30T16:34:00Z',
        timezoneLabel: 'Dubai Time (UTC+4)',
      },
    ],
  };
}

export function useDemoContest() {
  return useMockQuery(loadDemoContests);
}
