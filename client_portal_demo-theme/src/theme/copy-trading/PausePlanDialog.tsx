'use client';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { pausePlanCopy as copy, type MasterPlanRow } from './myPlansData';

interface PausePlanDialogProps {
  plan: MasterPlanRow | null;
  onClose: () => void;
  onPaused: (plan: MasterPlanRow) => void;
}

/** Confirms pausing a plan; the master → copiers link is drawn with a break in the middle. */
export function PausePlanDialog({ plan, onClose, onPaused }: PausePlanDialogProps) {
  return (
    <Modal
      open={plan !== null}
      onClose={onClose}
      size="sm"
      title={copy.title}
      footer={
        plan && (
          <>
            <Button variant="ghost" onClick={onClose}>
              {copy.cancel}
            </Button>
            <Button variant="secondary" leftIcon="pause" onClick={() => onPaused(plan)}>
              {copy.confirm}
            </Button>
          </>
        )
      }
    >
      {plan && (
        <div className="flex flex-col gap-5">
          <div aria-hidden="true" className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-2 text-xs font-medium text-primary">
              <Icon name="trendUp" size={14} />
              <span className="truncate">{copy.masterLabel}</span>
            </span>
            <span className="flex shrink-0 items-center">
              <span className="h-px w-4 bg-primary/60" />
              <span className="grid size-7 place-items-center rounded-full border border-warning/40 bg-warning/10 text-warning">
                <Icon name="pause" size={12} />
              </span>
              <span className="h-px w-4 border-t border-dashed border-fg/25" />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2 rounded-md border border-dashed border-line-strong px-2.5 py-2 text-xs font-medium text-fg-muted">
              <span className="truncate">{copy.copiersLabel}</span>
              <Icon name="user" size={14} />
            </span>
          </div>
          <p className="text-sm leading-relaxed text-fg-muted">{copy.message(plan.name)}</p>
        </div>
      )}
    </Modal>
  );
}
