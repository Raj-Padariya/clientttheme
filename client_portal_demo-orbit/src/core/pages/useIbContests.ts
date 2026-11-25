'use client';

import { useMockQuery } from '../lib/mock';
import { mockIbContests, type IbContests } from '../mock/ibContests';

function loadIbContests(): IbContests {
  return mockIbContests;
}
export function useIbContests() {
  return useMockQuery(loadIbContests);
}
