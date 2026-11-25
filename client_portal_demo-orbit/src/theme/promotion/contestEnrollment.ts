'use client';

import { useSyncExternalStore } from 'react';

// There is no backend: enrollments live in memory so the list, dashboard and leaderboard agree while navigating,
// and a page reload resets them so the enroll flow can be demoed again.
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let enrollments: string[] = EMPTY;

function readEnrollments(): string[] {
  return enrollments;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enrollInContest(contestId: string) {
  enrollments = [...new Set([...enrollments, contestId])];
  listeners.forEach((listener) => listener());
}

export function useEnrolledContestIds(): string[] {
  return useSyncExternalStore(subscribe, readEnrollments, () => EMPTY);
}
