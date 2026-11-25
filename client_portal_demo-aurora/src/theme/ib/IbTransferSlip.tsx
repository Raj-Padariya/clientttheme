'use client';

import type { ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbTransferSetup } from '@/core/mock/ibTransfer';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { ACCENT, Monogram, boardClass, captionClass } from './ibTransferKit';

function SlipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <dt className="shrink-0 text-xs text-fg-subtle">{label}</dt>
      <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b border-dashed border-line-strong" />
      <dd className="min-w-0 truncate text-right font-mono text-sm font-bold text-fg">{children}</dd>
    </div>
  );
}

/*
 * Settlement slip: sender at the top, recipient at the bottom, and a vertical settlement line between them
 * where pulses flow down once the order is valid. The slip mirrors the order and carries the submit.
 */
export function SettlementSlip({
  setup,
  recipient,
  amount,
  amountLabel,
  isArmed,
  submittedMessage,
}: {
  setup: IbTransferSetup;
  recipient: { name: string; accountNumber: string } | null;
  amount: string;
  amountLabel: string;
  isArmed: boolean;
  submittedMessage: string;
}) {
  return (
    <aside style={{ animationDelay: '120ms' }} className={cx(boardClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-5 lg:self-start')}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <p className={cx(captionClass, 'flex items-center gap-2 text-fg-muted')}>
          <span className="grid size-7 place-items-center rounded-[8px] bg-fg text-app">
            <Icon name="transfer" size={13} />
          </span>
          {translate('ibTransfer.title')}
        </p>
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span key={dot} style={{ animationDelay: `${dot * 0.3}s`, background: isArmed ? ACCENT : undefined }} className={cx('zenith-blink size-1.5 rounded-full', !isArmed && 'bg-fg/25')} />
          ))}
        </span>
      </header>

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        {/* Vertical settlement route. */}
        <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4">
          <Monogram name={setup.senderName} isEmpty={false} isLive={isArmed} />
          <div className="min-w-0 self-center">
            <p className={cx(captionClass, 'text-fg-subtle')}>{translate('ibTransfer.from')}</p>
            <p className="flex items-center gap-1.5 text-base font-black text-fg">
              <span className="truncate">{setup.senderName}</span>
              <span className="shrink-0 rounded-md bg-fg px-1.5 py-0.5 text-[9px] font-black tracking-wider text-app uppercase">{translate('ibNet.roleIb')}</span>
            </p>
          </div>

          <div aria-hidden="true" className="relative mx-auto h-24 w-full">
            <span className={cx('absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full', isArmed ? 'bg-fg/30' : 'bg-fg/10')} />
            {isArmed &&
              [0, 0.6, 1.2].map((delay) => (
                <span key={delay} style={{ background: ACCENT, animationDelay: `${delay}s` }} className="itx-flow absolute left-1/2 size-2.5 rounded-full motion-reduce:hidden" />
              ))}
          </div>
          <div className="flex items-center">
            <span
              className={cx(
                'inline-flex max-w-full items-center gap-2 rounded-[10px] py-1 pr-3 pl-1 ring-1 transition-colors duration-300',
                isArmed ? 'bg-fg text-app ring-fg' : 'bg-fg/[0.03] text-fg-subtle ring-line',
              )}
            >
              <span style={isArmed ? { background: ACCENT } : undefined} className={cx('grid size-6 shrink-0 place-items-center rounded-[7px]', isArmed ? 'text-white' : 'bg-fg/[0.06]')}>
                <Icon name="arrowRight" size={12} className="rotate-90" />
              </span>
              <span className="truncate font-mono text-xs font-black tabular-nums">{amountLabel}</span>
            </span>
          </div>

          <Monogram name={recipient?.name ?? ''} isEmpty={recipient === null} isLive={false} />
          <div className="min-w-0 self-center">
            <p className={cx(captionClass, 'text-fg-subtle')}>{translate('ibTransfer.to')}</p>
            <p className={cx('truncate text-base font-black', recipient ? 'text-fg' : 'text-fg-subtle')}>{recipient?.name ?? '—'}</p>
          </div>
        </div>

        <dl className="flex flex-col gap-3 border-t border-line pt-4">
          <SlipRow label={translate('ibTransfer.from')}>
            <span className="inline-flex items-center gap-1.5 font-sans">
              {setup.senderName}
              <span className="rounded-md bg-fg px-1.5 py-0.5 text-[9px] font-black tracking-wider text-app uppercase">{translate('ibNet.roleIb')}</span>
            </span>
          </SlipRow>
          <SlipRow label={translate('ibTransfer.to')}>
            {recipient ? (
              <span className="font-sans">
                {recipient.name} <span className="font-mono text-xs font-normal text-fg-subtle">· {recipient.accountNumber}</span>
              </span>
            ) : (
              <span className="text-fg-subtle">—</span>
            )}
          </SlipRow>
          <SlipRow label={translate('ibTransfer.available')}>
            <span className="tabular-nums">{formatMoney(setup.availableBalance, setup.currency)}</span>
          </SlipRow>
        </dl>

        <div className={cx('relative overflow-hidden rounded-[14px] p-4 ring-1 transition-colors duration-300', isArmed ? 'bg-fg text-app ring-fg' : 'bg-fg/[0.03] text-fg ring-line')}>
          <p className={cx(captionClass, isArmed ? 'opacity-60' : 'text-fg-subtle')}>{translate('ibTransfer.amount', { currency: setup.currency })}</p>
          <p className={cx('mt-1 flex items-center truncate font-mono text-4xl font-black tracking-tight tabular-nums', !amount && 'opacity-35')}>
            {amountLabel}
            {!amount && <span aria-hidden="true" className="itx-caret ml-1 h-8 w-0.5 bg-current" />}
          </p>
          {submittedMessage && (
            <span aria-hidden="true" className="itx-stamp absolute top-3 right-3 rounded-md border-[3px] border-success px-2 py-0.5 font-mono text-sm font-black tracking-[0.2em] text-success">
              <Icon name="check" size={16} />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            className="group/send relative inline-flex h-14 w-full items-center justify-between gap-3 overflow-hidden rounded-[14px] bg-fg py-1.5 pr-1.5 pl-5 text-sm font-black text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0 motion-reduce:transition-none"
          >
            {isArmed && <span aria-hidden="true" className="itx-sweep absolute inset-y-0 left-0 w-1/5 bg-app/25" />}
            <span className="relative">{translate('ibTransfer.submit')}</span>
            <span style={{ background: ACCENT }} className="relative grid size-11 place-items-center rounded-[10px] text-white">
              <Icon name="arrowRight" size={15} className="transition-transform duration-300 group-hover/send:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </button>
          {submittedMessage && (
            <p role="status" className="flex animate-feed-in items-center gap-2 rounded-[12px] bg-success/15 px-4 py-2 text-sm font-semibold text-success ring-1 ring-success/35 motion-reduce:animate-none">
              <Icon name="checkCircle" size={15} className="shrink-0" />
              {submittedMessage}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
