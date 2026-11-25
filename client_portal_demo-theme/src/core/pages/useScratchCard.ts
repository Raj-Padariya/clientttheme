'use client';

import { useMockQuery } from '../lib/mock';

export type ScratchCardState = 'ready' | 'locked';

export interface ScratchCardItem {
  id: string;
  state: ScratchCardState;
  /** Amount revealed when a ready card is scratched; 0 means the card is a "better luck next time" card. */
  reward: number;
  /** Seconds until a locked card unlocks; 0 for ready cards. */
  unlocksInSeconds: number;
}

export interface ScratchLeader {
  rank: number;
  name: string;
  amount: number;
}

export interface ScratchHistoryEntry {
  id: string;
  scratchedAt: string;
  amount: number;
}

export interface ScratchCardOverview {
  currency: string;
  cards: ScratchCardItem[];
  totalWon: number;
  history: ScratchHistoryEntry[];
  lotsAccumulated: number;
  lotsTarget: number;
  leaders: ScratchLeader[];
}

const NEXT_CARD_SECONDS = 5 * 3600 + 31 * 60 + 36;

function loadScratchCard(): ScratchCardOverview {
  return {
    currency: 'USD',
    cards: [
      { id: 'SC-1003', state: 'locked', reward: 0, unlocksInSeconds: NEXT_CARD_SECONDS },
      { id: 'SC-1002', state: 'ready', reward: 0.88, unlocksInSeconds: 0 },
      { id: 'SC-1001', state: 'ready', reward: 0, unlocksInSeconds: 0 },
    ],
    totalWon: 0,
    history: [],
    lotsAccumulated: 0,
    lotsTarget: 0,
    leaders: [
      { rank: 1, name: 'T***** C*****', amount: 0.92 },
      { rank: 2, name: 'r***** d*****', amount: 0.75 },
      { rank: 3, name: 'h***** h*****', amount: 0.67 },
      { rank: 4, name: 'B***** V*****', amount: 0.08 },
    ],
  };
}

export function useScratchCard() {
  return useMockQuery(loadScratchCard);
}
