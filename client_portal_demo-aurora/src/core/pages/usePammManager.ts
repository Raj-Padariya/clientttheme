'use client';

import { useMockQuery } from '../lib/mock';
import { mockPammManager, type PammManagerDashboard } from '../mock/pammManager';

function loadPammManager(): PammManagerDashboard {
  return mockPammManager;
}
export function usePammManager() {
  return useMockQuery(loadPammManager);
}
