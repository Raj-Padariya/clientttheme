import type { CSSProperties } from 'react';
import type { IconName } from '../ui/Icon';
import type { RequestStage } from './ibSubIbRequestsData';

export const ACCENT = 'var(--zenith-red)';
export const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
export const boardClass = 'relative overflow-hidden rounded-[24px] bg-surface ring-1 ring-line';

export const stageIcons: Record<RequestStage, IconName> = {
  waiting: 'clock',
  broker: 'bank',
  approved: 'checkCircle',
  declined: 'xCircle',
};

// Colour of each stage's status chip, bar fill and text; the stage names and counts come from the data.
export const stageTone: Record<RequestStage, { chip: string; fill: string }> = {
  waiting: { chip: 'bg-warning/12 text-warning ring-warning/30', fill: 'bg-warning' },
  broker: { chip: 'bg-fg/[0.06] text-fg ring-line-strong', fill: 'bg-fg' },
  approved: { chip: 'bg-success/12 text-success ring-success/30', fill: 'bg-success' },
  declined: { chip: 'bg-danger/10 text-danger ring-danger/30', fill: 'bg-danger' },
};

export function isPendingStage(stage: RequestStage): boolean {
  return stage === 'waiting' || stage === 'broker';
}

export function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

export function firstLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export function percentOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
