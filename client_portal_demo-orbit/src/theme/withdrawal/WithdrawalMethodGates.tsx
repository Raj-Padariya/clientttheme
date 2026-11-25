'use client';

import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { EtaTrack, FeeChip, kindIcon, limitsText } from '../payment/PaymentParts';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

const GATE_STAGGER_MS = 110;

// Money leaving the wallet for the method: a track with a comet running along it toward the method's core.
function PayoutBeam() {
  return (
    <span aria-hidden="true" className="relative mx-1 flex h-6 flex-1 items-center">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-line-strong" />
      <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 overflow-hidden rounded-full">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary to-transparent motion-reduce:animate-none" />
      </span>
      <span className="relative mx-auto grid size-6 place-items-center rounded-full border border-line bg-surface text-primary transition-transform duration-500 group-hover/gate:translate-x-2 motion-reduce:transition-none">
        <Icon name="arrowRight" size={12} />
      </span>
    </span>
  );
}

// One payout method as a gate: wallet → beam → method core on top, then timings, limits and the action.
function PayoutGate({ method, index, onChoose }: { method: PaymentMethod; index: number; onChoose: () => void }) {
  const icon = kindIcon[method.kind];

  return (
    <li className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${120 + index * GATE_STAGGER_MS}ms` }}>
      <article className="group/gate relative isolate h-full overflow-hidden rounded-[28px] p-px transition-[translate,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_32px_64px_-36px_var(--brand-primary)] motion-reduce:transition-none">
        <span aria-hidden="true" className="absolute inset-0 -z-20 bg-line transition-colors duration-500 group-hover/gate:bg-primary/30" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -mt-[110%] -ml-[110%] aspect-square w-[220%] animate-orbit bg-[conic-gradient(from_0deg,transparent_0deg,transparent_230deg,var(--brand-primary)_320deg,transparent_360deg)] opacity-0 transition-opacity duration-500 group-hover/gate:opacity-100 motion-reduce:animate-none"
        />

        <div className="relative flex h-full flex-col gap-5 overflow-hidden rounded-[27px] bg-surface p-5 sm:p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 opacity-60 [background-image:repeating-linear-gradient(90deg,color-mix(in_srgb,var(--brand-primary)_14%,transparent)_0_1px,transparent_1px_18px)] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 animate-drift rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none" />

          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-surface-2/80 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-fg-muted ring-1 ring-line">
              {String(index + 1).padStart(2, '0')}
            </span>
            <FeeChip method={method} />
          </div>

          <div className="flex items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-fg-muted ring-1 ring-line">
              <Icon name="wallet" size={20} />
            </span>
            <PayoutBeam />
            <span className="relative grid size-16 shrink-0 place-items-center">
              <span aria-hidden="true" className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
                <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)]" />
              </span>
              <span aria-hidden="true" className="orbit-ring absolute -inset-2 animate-orbit-spin-rev opacity-50 motion-reduce:animate-none" />
              <span className="relative grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary ring-1 ring-primary/30 transition-[background-color,color,scale] duration-500 group-hover/gate:scale-110 group-hover/gate:bg-primary group-hover/gate:text-on-primary motion-reduce:transition-none">
                <Icon name={icon} size={20} />
              </span>
            </span>
          </div>

          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-[-0.02em] text-fg">{method.name}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{translate(`payment.kind.${method.kind}`)}</p>
          </div>

          <EtaTrack method={method} />

          <div className="flex items-center justify-between gap-3 border-t border-dashed border-line-strong pt-4">
            <span className="text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('payment.limits')}</span>
            <span className="truncate text-sm font-semibold text-fg tabular-nums">{limitsText(method)}</span>
          </div>

          <Button onClick={onChoose} fullWidth size="lg" className="relative mt-auto overflow-hidden">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-[left,opacity] duration-700 group-hover/gate:left-full group-hover/gate:opacity-100 motion-reduce:hidden"
            />
            <span className="relative">{translate('withdrawal.proceedTo')}</span>
            <Icon name="arrowRight" size={16} className="relative transition-transform group-hover/gate:translate-x-1 motion-reduce:transition-none" />
          </Button>
        </div>
      </article>
    </li>
  );
}

export function WithdrawalMethodGates({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  return (
    <ul aria-label={translate('payment.methodsLabel')} className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {methods.map((method, index) => (
        <PayoutGate key={method.id} method={method} index={index} onChoose={() => onChoose(method.id)} />
      ))}
    </ul>
  );
}
