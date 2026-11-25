'use client';

import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbTransferSetup } from '@/core/mock/ibTransfer';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Dropdown, type DropdownOption } from '../ui/Dropdown';
import { Icon, type IconName } from '../ui/Icon';
import { ACCENT, FieldError, FieldLabel, NoteCounter, boardClass, captionClass, fieldShell, sanitizeAmount, type FieldName, type StepState } from './ibTransferKit';

const METER_MARKS = [25, 50, 75];

/* ───────────── Buying power: rebate balance as account buying power, minimum as the lot-size rule ───────────── */

function BuyingPower({ setup }: { setup: IbTransferSetup }) {
  const balance = useAnimatedNumber(setup.availableBalance, 1400);

  return (
    <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
      <div className="min-w-0">
        <p className={cx(captionClass, 'flex items-center gap-2 text-fg-muted')}>
          <span className="grid size-7 place-items-center rounded-[8px] bg-fg text-app">
            <Icon name="wallet" size={13} />
          </span>
          {translate('ibTransfer.available')}
        </p>
        <p className="mt-3 font-mono text-5xl leading-[0.9] font-black tracking-tighter break-all text-fg tabular-nums sm:text-6xl">{formatMoney(balance, setup.currency)}</p>
        <p className="mt-2 text-sm text-fg-muted">{translate('ibTransfer.availableHint')}</p>
      </div>
      <div className="flex items-center gap-3 rounded-[14px] bg-fg/[0.04] p-2 pr-3 ring-1 ring-line">
        <span style={{ background: ACCENT }} className="grid size-10 shrink-0 place-items-center rounded-[10px] text-white">
          <Icon name="crypto" size={16} />
        </span>
        <div className="min-w-0">
          <p className={cx(captionClass, 'text-fg-subtle')}>{translate('ibTransfer.smallest')}</p>
          <p className="font-mono text-base font-black text-fg tabular-nums">{formatMoney(setup.minTransfer, setup.currency)}</p>
          <p className="text-[10.5px] text-fg-muted">{translate('ibTransfer.smallestHint')}</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Step tape: three order legs, the one being filled blinks in clay ───────────── */

function StepTape({ steps, doneCount }: { steps: { label: string; icon: IconName; state: StepState }[]; doneCount: number }) {
  return (
    <div className="flex items-stretch gap-2 border-b border-line px-4 py-3 sm:px-5">
      <ol className="grid flex-1 grid-cols-3 gap-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex min-w-0 flex-col gap-1.5">
            <span
              aria-hidden="true"
              style={step.state === 'active' ? { background: ACCENT } : undefined}
              className={cx('h-1.5 rounded-full transition-colors duration-300', step.state === 'done' && 'bg-success', step.state === 'active' && 'zenith-blink', step.state === 'idle' && 'bg-fg/12')}
            />
            <span className={cx('flex min-w-0 items-center gap-1.5 text-[11px] font-bold', step.state === 'idle' ? 'text-fg-subtle' : 'text-fg')}>
              <span key={step.state} className="grid size-5 shrink-0 animate-dot-pop place-items-center rounded-[6px] bg-fg/[0.06] motion-reduce:animate-none">
                {step.state === 'done' ? <Icon name="check" size={11} className="text-success" /> : <span className="font-mono text-[10px]">{index + 1}</span>}
              </span>
              <Icon name={step.icon} size={12} className="shrink-0" />
              <span className="truncate">{step.label}</span>
            </span>
          </li>
        ))}
      </ol>
      <span className="self-center rounded-md bg-fg px-2 py-1 font-mono text-[11px] font-black text-app tabular-nums">
        {doneCount}/{steps.length}
      </span>
    </div>
  );
}

/* ───────────── Margin meter: how much of the buying power this transfer draws ───────────── */

function MarginMeter({ setup, drawAmount, isOverBalance }: { setup: IbTransferSetup; drawAmount: number; isOverBalance: boolean }) {
  const share = setup.availableBalance > 0 ? drawAmount / setup.availableBalance : 0;
  const percent = Math.round(share * 100);
  const fill = Math.min(100, Math.max(0, share * 100));

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="relative h-3 flex-1 overflow-hidden rounded-md bg-fg/[0.06] ring-1 ring-line">
          <span
            style={{ width: `${isOverBalance ? 100 : fill}%` }}
            className={cx('absolute inset-y-0 left-0 transition-[width] duration-500 motion-reduce:transition-none', isOverBalance ? 'zenith-blink bg-danger' : 'itx-stripes bg-success')}
          />
          {METER_MARKS.map((mark) => (
            <span key={mark} style={{ left: `${mark}%` }} className="absolute inset-y-0 w-px bg-app/60" />
          ))}
        </span>
        <span className={cx('w-14 rounded-md px-1.5 py-0.5 text-center font-mono text-xs font-black tabular-nums', isOverBalance ? 'bg-danger text-white' : 'bg-fg text-app')}>{percent}%</span>
      </div>
      <div className="flex justify-between pr-[4.25rem] font-mono text-[10.5px] font-bold text-fg-subtle tabular-nums">
        <span>{formatMoney(0, setup.currency)}</span>
        <span className={cx(isOverBalance && 'text-danger')}>{formatMoney(setup.availableBalance, setup.currency)}</span>
      </div>
    </div>
  );
}

/* ───────────── Order entry panel ───────────── */

export function OrderEntry({
  setup,
  ids,
  recipientId,
  amount,
  note,
  errors,
  stepStates,
  drawAmount,
  isOverBalance,
  onRecipient,
  onAmount,
  onNote,
}: {
  setup: IbTransferSetup;
  ids: Record<FieldName, string>;
  recipientId: string;
  amount: string;
  note: string;
  errors: Partial<Record<FieldName, string>>;
  stepStates: StepState[];
  drawAmount: number;
  isOverBalance: boolean;
  onRecipient: (value: string) => void;
  onAmount: (value: string) => void;
  onNote: (value: string) => void;
}) {
  const recipientOptions: DropdownOption<string>[] = [
    { value: '', label: translate('ibTransfer.recipientPlaceholder', { count: String(setup.clients.length) }) },
    ...setup.clients.map((client) => ({ value: client.id, label: `${client.name} · ${client.accountNumber}` })),
  ];
  const steps: { label: string; icon: IconName; state: StepState }[] = [
    { label: translate('ibTransfer.recipient'), icon: 'user', state: stepStates[0] },
    { label: translate('ibTransfer.amount', { currency: setup.currency }), icon: 'wallet', state: stepStates[1] },
    { label: translate('ibTransfer.note'), icon: 'pencil', state: stepStates[2] },
  ];
  const doneCount = stepStates.filter((state) => state === 'done').length;

  return (
    <section className={cx(boardClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-7')}>
      <BuyingPower setup={setup} />
      <StepTape steps={steps} doneCount={doneCount} />

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div style={{ animationDelay: '80ms' }} className="animate-feed-in motion-reduce:animate-none">
          <FieldLabel htmlFor={ids.recipient} required>
            {translate('ibTransfer.recipient')}
          </FieldLabel>
          <div
            aria-invalid={Boolean(errors.recipient)}
            aria-describedby={errors.recipient ? `${ids.recipient}-error` : undefined}
            className={cx('rounded-2xl', errors.recipient && 'ring-2 ring-danger/60')}
          >
            <Dropdown id={ids.recipient} label={translate('ibTransfer.recipient')} icon="user" value={recipientId} options={recipientOptions} onChange={onRecipient} />
          </div>
          <FieldError id={`${ids.recipient}-error`} message={errors.recipient} />
        </div>

        <div style={{ animationDelay: '160ms' }} className="animate-feed-in motion-reduce:animate-none">
          <FieldLabel htmlFor={ids.amount} required>
            {translate('ibTransfer.amount', { currency: setup.currency })}
          </FieldLabel>
          <div className={cx(fieldShell, 'flex items-center gap-3 px-3', errors.amount && 'ring-2 ring-danger/60')}>
            <span
              aria-hidden="true"
              style={amount ? { background: ACCENT } : undefined}
              className={cx('grid size-10 shrink-0 place-items-center rounded-[10px] font-mono text-base font-black transition-colors', amount ? 'text-white' : 'bg-fg/[0.06] text-fg-subtle')}
            >
              $
            </span>
            <input
              id={ids.amount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              placeholder="0.00"
              aria-required="true"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? `${ids.amount}-error` : undefined}
              onChange={(event) => onAmount(sanitizeAmount(event.target.value))}
              className="h-16 min-w-0 flex-1 bg-transparent font-mono text-3xl font-black text-fg tabular-nums placeholder:text-fg-subtle/60 focus:outline-none"
            />
            <span className="rounded-md bg-fg px-2.5 py-1 font-mono text-[11px] font-black tracking-wider text-app">{setup.currency}</span>
          </div>
          <MarginMeter setup={setup} drawAmount={drawAmount} isOverBalance={isOverBalance} />
          <FieldError id={`${ids.amount}-error`} message={errors.amount} />
        </div>

        <div style={{ animationDelay: '240ms' }} className="animate-feed-in motion-reduce:animate-none">
          <FieldLabel htmlFor={ids.note} aside={<NoteCounter used={note.length} max={setup.noteMaxLength} />}>
            {translate('ibTransfer.note')}
          </FieldLabel>
          <div className={cx(fieldShell, errors.note && 'ring-2 ring-danger/60')}>
            <textarea
              id={ids.note}
              rows={4}
              value={note}
              maxLength={setup.noteMaxLength}
              placeholder={translate('ibTransfer.notePlaceholder')}
              aria-invalid={Boolean(errors.note)}
              aria-describedby={errors.note ? `${ids.note}-error` : undefined}
              onChange={(event) => onNote(event.target.value)}
              className="block w-full resize-y bg-transparent px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </div>
          <FieldError id={`${ids.note}-error`} message={errors.note} />
        </div>
      </div>
    </section>
  );
}
