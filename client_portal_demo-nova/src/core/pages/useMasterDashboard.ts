'use client';

import { useMockQuery } from '../lib/mock';
import { mockMasterDashboard, type MasterDashboard } from '../mock/masterDashboard';

function loadMasterDashboard(): MasterDashboard {
  return mockMasterDashboard;
}
export function useMasterDashboard() {
  return useMockQuery(loadMasterDashboard);
}
