'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { IbTransferSetup } from '@/core/mock/ibTransfer';
import { useIbTransfer } from '@/core/pages/useIbTransfer';
import { Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { OrderEntry } from './IbTransferEntry';
import { SettlementSlip } from './IbTransferSlip';
import { ACCENT, NOTE_PATTERN, type FieldName, type StepState } from './ibTransferKit';
import './ibTransfer.css';

/*
 * Aurora IB transfer as an order entry desk: the rebate balance is buying power, the form is an order ticket
 * with a margin meter, and a settlement slip shows the funds flowing from sender to recipient before submit.
 */
function TransferForm({ setup }: { setup: IbTransferSetup }) {
  const fieldId = useId();
  const ids: Record<FieldName, string> = {
    recipient: `${fieldId}-recipient`,
    amount: `${fieldId}-amount`,
    note: `${fieldId}-note`,
  };
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submittedMessage, setSubmittedMessage] = useState('');

  const recipient = setup.clients.find((client) => client.id === recipientId) ?? null;
  const amountValue = Number(amount);
  const drawAmount = Number.isFinite(amountValue) ? amountValue : 0;
  const isAmountValid = amountValue >= setup.minTransfer && amountValue <= setup.availableBalance;
  const isArmed = recipient !== null && isAmountValid;
  const isOverBalance = amountValue > setup.availableBalance;
  const isNoteDone = note.trim() !== '' && NOTE_PATTERN.test(note);
  const stepDone = [recipient !== null, isAmountValid, isNoteDone];
  const activeStep = stepDone.findIndex((done) => !done);
  const stepStates: StepState[] = stepDone.map((done, step) => (done ? 'done' : step === activeStep ? 'active' : 'idle'));
  const amountLabel = formatMoney(drawAmount, setup.currency);

  function clearError(field: FieldName) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmittedMessage('');
  }

  function validate(): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    if (!recipient) found.recipient = translate('ibTransfer.errRecipient');
    if (amount === '' || !(amountValue >= setup.minTransfer)) {
      found.amount = translate('ibTransfer.errAmountMin', { amount: formatMoney(setup.minTransfer, setup.currency) });
    } else if (amountValue > setup.availableBalance) {
      found.amount = translate('ibTransfer.errAmountMax');
    }
    if (!NOTE_PATTERN.test(note)) found.note = translate('ibTransfer.errNote');
    return found;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const firstInvalid = (Object.keys(ids) as FieldName[]).find((field) => found[field]);
    if (firstInvalid || !recipient) {
      if (firstInvalid) document.getElementById(ids[firstInvalid])?.focus();
      return;
    }
    setSubmittedMessage(translate('ibTransfer.submitted', { amount: formatMoney(amountValue, setup.currency), name: recipient.name }));
    setRecipientId('');
    setAmount('');
    setNote('');
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <OrderEntry
        setup={setup}
        ids={ids}
        recipientId={recipientId}
        amount={amount}
        note={note}
        errors={errors}
        stepStates={stepStates}
        drawAmount={drawAmount}
        isOverBalance={isOverBalance}
        onRecipient={(value) => {
          setRecipientId(value);
          clearError('recipient');
        }}
        onAmount={(value) => {
          setAmount(value);
          clearError('amount');
        }}
        onNote={(value) => {
          setNote(value);
          clearError('note');
        }}
      />
      <SettlementSlip setup={setup} recipient={recipient} amount={amount} amountLabel={amountLabel} isArmed={isArmed} submittedMessage={submittedMessage} />
    </form>
  );
}

export default function IbTransferPage() {
  const { data } = useIbTransfer();

  return (
    <div className="space-y-5">
      <header className="flex animate-rise flex-wrap items-end justify-between gap-4 border-b border-line pb-5 motion-reduce:animate-none">
        <div className="flex min-w-0 items-stretch gap-4">
          <span aria-hidden="true" className="flex w-2 flex-col gap-1">
            <span style={{ background: ACCENT }} className="flex-[2] rounded-full" />
            <span className="flex-1 rounded-full bg-success" />
            <span className="flex-[3] rounded-full bg-fg/15" />
          </span>
          <div className="min-w-0">
            <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{translate('ibTransfer.title')}</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">{translate('ibTransfer.subtitle')}</p>
          </div>
        </div>
        <Link
          href="/ib/commission-history"
          className="group inline-flex h-11 items-center gap-2.5 rounded-[12px] bg-fg/[0.04] px-4 text-sm font-bold text-fg ring-1 ring-line transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="history" size={15} className="transition-transform duration-500 group-hover:-rotate-[360deg] motion-reduce:transition-none" />
          {translate('ibTransfer.history')}
        </Link>
      </header>

      {data ? (
        <TransferForm setup={data} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-[40rem] rounded-[20px] lg:col-span-7" />
          <Skeleton className="h-[34rem] rounded-[20px] lg:col-span-5" />
        </div>
      )}
    </div>
  );
}
