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

/** Master → copiers link with the feed cut in the middle: what pausing does, at a glance. */
function PausedFeed() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 rounded-2xl border border-line bg-fg/[0.02] px-4 py-4">
      <span className="flex flex-col items-center gap-1.5">
        <span className="relative grid size-10 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/30">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-primary/15 motion-reduce:animate-none" />
          <Icon name="trendUp" size={16} />
        </span>
        <span className="text-[10.5px] text-fg-subtle">{copy.masterLabel}</span>
      </span>

      <span className="relative flex flex-1 items-center pb-5">
        <span className="h-px flex-1 bg-linear-to-r from-primary/50 to-primary/15" />
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-warning/40 bg-warning/10 text-warning">
          <Icon name="pause" size={14} className="animate-pulse motion-reduce:animate-none" />
        </span>
        <span className="h-px flex-1 border-t border-dashed border-fg/15" />
      </span>

      <span className="flex flex-col items-center gap-1.5">
        <span className="flex -space-x-2">
          {Array.from({ length: COPIER_NODES }, (_, index) => (
            <span key={index} className="grid size-8 place-items-center rounded-full bg-surface text-fg-subtle opacity-70 ring-1 ring-line">
              <Icon name="user" size={13} />
            </span>
          ))}
        </span>
        <span className="text-[10.5px] text-fg-subtle">{copy.copiersLabel}</span>
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
