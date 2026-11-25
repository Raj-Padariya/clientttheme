'use client';

import { useMockQuery } from '../lib/mock';
import { mockIbStructure, type IbStructure } from '../mock/ibStructure';

function loadIbStructure(): IbStructure {
  return mockIbStructure;
}
export function useIbStructure() {
  return useMockQuery(loadIbStructure);
}
