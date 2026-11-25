'use client';

import { useState } from 'react';
import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { durationLabel, EtaTrack, FeeChip, kindIcon, limitsText } from '../payment/PaymentParts';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

const ROW_STAGGER_MS = 70;

// One method in the deck: hovering or clicking it puts it on the stage.
function ChannelRow({ method, index, isActive, onPreview }: { method: PaymentMethod; index: number; isActive: boolean; onPreview: () => void }) {
  return (
    <li className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${100 + index * ROW_STAGGER_MS}ms` }}>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onPreview}
        onMouseEnter={onPreview}
        className={cx(
          'group/row relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-[translate,border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          isActive
            ? 'translate-x-1 border-primary/60 bg-primary-soft/40 shadow-[0_18px_40px_-28px_var(--brand-primary)]'
            : 'border-line bg-surface/60 hover:translate-x-1 hover:border-primary/30',
        )}
      >
        <span
          aria-hidden="true"
          className={cx('absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary transition-transform duration-300 motion-reduce:transition-none', isActive ? 'scale-y-100' : 'scale-y-0')}
        />
        {isActive && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />}

        <span className="w-6 shrink-0 font-mono text-[10px] tracking-[0.15em] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
        <span
          className={cx(
            'grid size-11 shrink-0 place-items-center rounded-xl ring-1 transition-colors duration-300',
            isActive ? 'bg-primary text-on-primary ring-primary' : 'bg-surface-2 text-primary ring-line group-hover/row:ring-primary/40',
          )}
        >
          <Icon name={kindIcon[method.kind]} size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-fg">{method.name}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">
            {translate(`payment.kind.${method.kind}`)} · {durationLabel(method.averageMinutes)}
          </span>
        </span>
        <FeeChip method={method} />
        <Icon
          name="arrowRight"
          size={16}
          className={cx('shrink-0 transition-[translate,color] duration-300 motion-reduce:transition-none', isActive ? 'translate-x-0.5 text-primary' : 'text-fg-subtle group-hover/row:text-fg')}
        />
      </button>
    </li>
  );
}

// The previewed method on an orbit stage: rings and satellites around the method's core, then its timings,
// limits and the action. Re-keyed per method so switching replays the entrance.
function MethodStage({ method, onChoose }: { method: PaymentMethod; onChoose: () => void }) {
  return (
    <div key={method.id} className="orbit-card relative isolate animate-rise overflow-hidden p-px motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -mt-[110%] -ml-[110%] aspect-square w-[220%] animate-orbit bg-[conic-gradient(from_0deg,transparent_0deg,transparent_230deg,var(--brand-primary)_320deg,transparent_360deg)] motion-reduce:animate-none"
      />
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-[var(--r-xl)] bg-surface-2/85 p-5 backdrop-blur-xl sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 opacity-70 [background-image:radial-gradient(color-mix(in_srgb,var(--brand-primary)_35%,transparent)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(circle_at_50%_40%,black,transparent_70%)]"
        />

        <div aria-hidden="true" className="relative mx-auto grid size-52 place-items-center">
          <span className="absolute size-32 animate-drift rounded-full bg-primary/25 blur-2xl motion-reduce:animate-none" />
          <span className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none">
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
          </span>
          <span className="orbit-ring absolute inset-7 animate-orbit-spin-rev opacity-80 motion-reduce:animate-none">
            <span className="absolute top-1/2 -right-1 size-1.5 -translate-y-1/2 rounded-full bg-[var(--orbit-violet)] shadow-[0_0_8px_var(--orbit-violet)]" />
          </span>
          <span className="orbit-ring absolute inset-14 animate-orbit-spin opacity-60 motion-reduce:animate-none" />
          <span className="relative grid size-20 animate-pop-in place-items-center rounded-3xl bg-[image:var(--brand-gradient)] text-on-primary shadow-[0_0_40px_-8px_var(--brand-primary)] motion-reduce:animate-none">
            <span className="absolute inset-0 animate-ring-ripple rounded-3xl ring-2 ring-primary/50 motion-reduce:hidden" />
            <Icon name={kindIcon[method.kind]} size={32} />
          </span>
        </div>

        <div className="text-center">
          <p className="text-[10.5px] tracking-[0.16em] text-fg-subtle uppercase">{translate(`payment.kind.${method.kind}`)}</p>
          <p className="mt-1 truncate text-3xl font-semibold tracking-[-0.02em] text-fg">{method.name}</p>
          <div className="mt-3 flex justify-center">
            <FeeChip method={method} />
          </div>
        </div>

        <EtaTrack method={method} />

        <div className="flex items-center justify-between gap-3 border-t border-dashed border-line-strong pt-4">
          <span className="text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('payment.limits')}</span>
          <span className="truncate text-sm font-semibold text-fg tabular-nums">{limitsText(method)}</span>
        </div>

        <Button size="lg" fullWidth onClick={onChoose} className="group/cta relative overflow-hidden">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span className="relative">{translate('deposit.processFor')}</span>
          <Icon name="arrowRight" size={16} className="relative transition-transform group-hover/cta:translate-x-1 motion-reduce:transition-none" />
        </Button>
      </div>
    </div>
  );
}

// Orbit deposit method step as a control deck: the methods as a list on the left, the previewed one on a
// sticky stage on the right with the action.
export function DepositMethodPicker({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  const [previewId, setPreviewId] = useState(methods[0]?.id);
  const preview = methods.find((method) => method.id === previewId) ?? methods[0];
  if (!preview) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <ul aria-label={translate('payment.methodsLabel')} className="flex flex-col gap-2.5">
        {methods.map((method, index) => (
          <ChannelRow key={method.id} method={method} index={index} isActive={method.id === preview.id} onPreview={() => setPreviewId(method.id)} />
        ))}
      </ul>
      <div className="min-w-0 lg:sticky lg:top-24">
        <MethodStage method={preview} onChoose={() => onChoose(preview.id)} />
      </div>
    </div>
  );
}
