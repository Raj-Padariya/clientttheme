'use client';

import { useMockQuery } from '../lib/mock';
import { mockIbDashboard, type IbDashboard } from '../mock/ib';

function loadIbDashboard(): IbDashboard {
  return mockIbDashboard;
}

export function useIbDashboard() {
  return useMockQuery(loadIbDashboard);
}
