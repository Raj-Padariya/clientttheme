'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { pausePlanCopy as copy, type MasterPlanRow } from './myPlansData';

const PAUSE_DELAY_MS = 700;
const COPIER_NODES = 3;

interface PausePlanDialogProps {
  /** The plan to pause; `null` keeps the dialog closed. */
  plan: MasterPlanRow | null;
  onClose: () => void;
  onPaused: (plan: MasterPlanRow) => void;
}

/**
 * Master → copiers route cut in the middle: signal beads run from the master up to the red pause gate and stop there,
 * while the copier side stays a dim dashed line with greyed pixel nodes.
 */
function PausedFeed() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 rounded-[24px] bg-fg/[0.03] px-4 py-4 ring-1 ring-line">
      <span className="flex flex-col items-center gap-1.5">
        <span className="relative grid size-11 place-items-center rounded-full bg-fg text-app">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-fg/25 motion-reduce:animate-none" />
          <Icon name="trendUp" size={16} className="relative" />
        </span>
        <span className="text-[10.5px] font-semibold text-fg-muted">{copy.masterLabel}</span>
      </span>

      <span className="relative flex flex-1 items-center pb-5">
        <span className="relative h-0 flex-1 border-t-2 border-fg/60">
          <span className="zenith-route absolute top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
        </span>
        <span style={{ background: 'var(--zenith-red)' }} className="relative grid size-9 shrink-0 place-items-center rounded-full text-white">
          <span style={{ borderColor: 'var(--zenith-red)' }} className="absolute -inset-1.5 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
          <Icon name="pause" size={14} className="animate-pulse motion-reduce:animate-none" />
        </span>
        <span className="h-0 flex-1 border-t-2 border-dashed border-fg/15" />
      </span>

      <span className="flex flex-col items-center gap-1.5">
        <span className="grid grid-cols-3 gap-1">
          {Array.from({ length: COPIER_NODES * 2 }, (_, index) => (
            <span key={index} style={{ animationDelay: `${index * 260}ms` }} className="zenith-twinkle size-3 rounded-[3px] bg-fg/20" />
          ))}
        </span>
        <span className="flex -space-x-2">
          {Array.from({ length: COPIER_NODES }, (_, index) => (
            <span key={index} className="grid size-7 place-items-center rounded-full bg-app text-fg-subtle opacity-70 ring-1 ring-line-strong">
              <Icon name="user" size={12} />
            </span>
          ))}
        </span>
        <span className="text-[10.5px] font-semibold text-fg-subtle">{copy.copiersLabel}</span>
      </span>
    </div>
  );
}

export function PausePlanDialog({ plan, onClose, onPaused }: PausePlanDialogProps) {
  const [pausing, setPausing] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function confirm() {
    if (!plan) return;
    // No backend yet: mimic the round trip, then report back.
    setPausing(true);
    timer.current = window.setTimeout(() => {
      setPausing(false);
      onPaused(plan);
    }, PAUSE_DELAY_MS);
  }

  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      title={copy.title}
      description={plan ? copy.message(plan.name) : undefined}
      size="md"
      calm
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pausing}>
            {copy.cancel}
          </Button>
          <Button type="button" variant="secondary" leftIcon="pause" loading={pausing} onClick={confirm} className="min-w-24">
            {copy.confirm}
          </Button>
        </>
      }
    >
      {plan && <PausedFeed />}
    </Modal>
  );
}
