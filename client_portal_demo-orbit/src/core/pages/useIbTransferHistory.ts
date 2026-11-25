'use client';

import { useMockQuery } from '../lib/mock';
import { mockIbTransferHistory, type IbTransferHistory } from '../mock/ibTransferHistory';

function loadIbTransferHistory(): IbTransferHistory {
  return mockIbTransferHistory;
}
export function useIbTransferHistory() {
  return useMockQuery(loadIbTransferHistory);
}
