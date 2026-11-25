'use client';

import { useMockQuery } from '../lib/mock';
import { mockIbNetwork, type IbNetwork } from '../mock/ibNetwork';

function loadIbNetwork(): IbNetwork {
  return mockIbNetwork;
}
export function useIbNetwork() {
  return useMockQuery(loadIbNetwork);
}
