'use client';

import { translate } from '@/core/i18n';
import type { PaymentMethod } from '@/core/types';
import { cx } from '../lib/cx';
import { durationLabel, FeeChip, kindIcon, limitsText } from '../payment/PaymentParts';
import { Icon } from '../ui/Icon';

const TICKET_STAGGER_MS = 110;
const MIN_ETA_SHARE = 6;
// The arc is drawn in a fixed 132×44 box so the CSS offset-path (px) and the SVG path share one coordinate space.
const FLIGHT_PATH = 'M 6 38 C 36 0, 96 0, 126 38';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const labelClass = 'block text-[10px] tracking-[0.14em] text-fg-subtle uppercase';

export const ticketShell = 'relative isolate overflow-hidden rounded-[28px] bg-surface ring-1 ring-fg/10 shadow-[0_22px_44px_-28px_rgb(0_0_0/0.55)]';

/** Dashed flight arc with a bead flying along it; `tone` lets it sit on the sage header as well as on the paper. */
export function FlightArc({ tone = 'paper' }: { tone?: 'paper' | 'ink' }) {
  const onInk = tone === 'ink';
  return (
    <span aria-hidden="true" className="relative block h-11 w-[132px] shrink-0">
      <svg viewBox="0 0 132 44" width={132} height={44} className="absolute inset-0">
        <path d={FLIGHT_PATH} fill="none" strokeWidth={1.6} strokeLinecap="round" className={cx('aurora-dash', onInk ? 'stroke-(--aurora-cta-fg)/45' : 'stroke-fg/30')} />
        <circle cx={6} cy={38} r={3} className={onInk ? 'fill-(--aurora-cta-fg)/60' : 'fill-fg/30'} />
        <circle cx={126} cy={38} r={3} className={onInk ? 'fill-(--aurora-cta-fg)/60' : 'fill-fg/30'} />
      </svg>
      <span
        style={{ offsetPath: `path('${FLIGHT_PATH}')` }}
        className={cx(
          'aurora-flight absolute top-0 left-0 size-3 rounded-full',
          onInk ? 'bg-(--aurora-cta-fg) shadow-[0_0_0_4px_rgb(255_255_255/0.25)]' : 'bg-(--hero-buy) shadow-[0_0_0_4px_rgb(255_255_255/0.08)]',
        )}
      />
    </span>
  );
}

/** Two half-circle cut-outs on the perforation, so the pass reads as a tearable ticket. */
function TicketNotches() {
  return (
    <>
      <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full bg-app ring-1 ring-fg/10" />
      <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full bg-app ring-1 ring-fg/10 sm:top-auto sm:right-auto sm:-bottom-3 sm:-left-3" />
    </>
  );
}

function EtaTrack({ method }: { method: PaymentMethod }) {
  const isImmediate = method.averageMinutes <= 0;
  const share = method.maxMinutes > 0 ? Math.max(Math.min((method.averageMinutes / method.maxMinutes) * 100, 100), MIN_ETA_SHARE) : 100;

  return (
    <div className="min-w-0">
      <span className={cx(labelClass, 'flex items-center gap-1.5')}>
        <Icon name={isImmediate ? 'bolt' : 'clock'} size={11} />
        {translate('payment.averageTime')}
      </span>
      <p className="mt-1 truncate text-lg font-semibold tracking-[-0.01em] text-fg">{durationLabel(method.averageMinutes)}</p>
      <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-fg/[0.07]">
        <span className="zenith-capsule block h-full rounded-full bg-(--hero-buy) [transform-origin:left]" style={{ width: `${share}%` }} />
      </span>
      <p className="mt-1.5 truncate text-[11px] text-fg-subtle">
        {translate('payment.upTo')} <span className="font-semibold text-fg-muted">{durationLabel(method.maxMinutes)}</span>
      </p>
    </div>
  );
}

// One payout method as a boarding pass: wallet → method flight on the main part, fee + action on the tear-off stub.
function PayoutTicket({ method, index, total, onChoose }: { method: PaymentMethod; index: number; total: number; onChoose: () => void }) {
  return (
    // The print-in animation lives on the <li> so it never fights the hover transform on the pass itself.
    <li className="aurora-ticket" style={{ animationDelay: `${100 + index * TICKET_STAGGER_MS}ms` }}>
      <article
        className={cx(
          ticketShell,
          'group/ticket grid h-full transition-[translate,rotate,box-shadow] duration-300 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:ring-fg/20 motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_200px]',
        )}
      >
        <span aria-hidden="true" className="aurora-ticket-shine pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/4 bg-linear-to-r from-transparent via-white/[0.14] to-transparent" />

        <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className={labelClass}>{translate(`payment.kind.${method.kind}`)}</span>
            <span className="shrink-0 rounded-full bg-fg/[0.05] px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] text-fg-muted ring-1 ring-fg/10">
              {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-fg-muted ring-1 ring-fg/10">
              <Icon name="wallet" size={18} />
            </span>
            <FlightArc />
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-(--aurora-cta-from) text-(--aurora-cta-fg) shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-300 group-hover/ticket:scale-110 group-hover/ticket:rotate-6 motion-reduce:transition-none">
              <Icon name={kindIcon[method.kind]} size={20} />
            </span>
          </div>

          <p className="truncate text-2xl font-semibold tracking-[-0.02em] text-fg">{method.name}</p>

          <div className="grid grid-cols-2 gap-4 border-t border-dashed border-fg/15 pt-4">
            <EtaTrack method={method} />
            <div className="min-w-0">
              <span className={labelClass}>{translate('payment.limits')}</span>
              <span className="mt-1 block truncate text-sm font-semibold text-fg tabular-nums">{limitsText(method)}</span>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-between gap-4 border-t-2 border-dashed border-fg/15 p-5 transition-transform duration-300 group-hover/ticket:translate-x-1 group-hover/ticket:rotate-1 motion-reduce:transition-none sm:border-t-0 sm:border-l-2 sm:origin-bottom-left">
          <TicketNotches />
          <div className="flex flex-col items-start gap-2">
            <span className={labelClass}>{translate('payment.fee')}</span>
            <FeeChip method={method} />
          </div>
          <button
            type="button"
            onClick={onChoose}
            className={cx(
              'group/cta relative isolate inline-flex h-12 w-full items-center justify-between gap-2 overflow-hidden rounded-full bg-fg pr-2 pl-5 text-sm font-bold text-surface transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
              focusRing,
            )}
          >
            <span aria-hidden="true" className="aurora-ticket-shine pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />
            <span className="truncate">{translate('withdrawal.proceedTo')}</span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--aurora-cta-from) text-(--aurora-cta-fg) transition-transform group-hover/cta:translate-x-0.5 motion-reduce:transition-none">
              <Icon name="arrowRight" size={15} />
            </span>
          </button>
        </div>
      </article>
    </li>
  );
}

// Aurora withdrawal method step: every payout method as a boarding pass on a two-up departures wall.
export function WithdrawalMethodGates({ methods, onChoose }: { methods: PaymentMethod[]; onChoose: (id: string) => void }) {
  return (
    <ul aria-label={translate('payment.methodsLabel')} className="grid gap-4 [perspective:1200px] xl:grid-cols-2">
      {methods.map((method, index) => (
        <PayoutTicket key={method.id} method={method} index={index} total={methods.length} onChoose={() => onChoose(method.id)} />
      ))}
    </ul>
  );
}
