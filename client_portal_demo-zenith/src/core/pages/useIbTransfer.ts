'use client';

import { useMockQuery } from '../lib/mock';
import { mockIbTransferSetup, type IbTransferSetup } from '../mock/ibTransfer';

function loadIbTransferSetup(): IbTransferSetup {
  return mockIbTransferSetup;
}
export function useIbTransfer() {
  return useMockQuery(loadIbTransferSetup);
}
