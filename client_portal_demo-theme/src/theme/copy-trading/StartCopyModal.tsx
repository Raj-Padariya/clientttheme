'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Checkbox, Field, Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';

export interface CopyPlanSummary {
  name: string;
  feePercent: number;
  minInvestment: number;
  minInvestmentLabel: string;
}

interface CopyAccount {
  id: string;
  login: string;
  balance: number;
  /** Only shown when it differs from the balance, as in the screenshot. */
  equity?: number;
  server: string;
}

type Step = 'account' | 'configure';
type MultiplierChoice = number | 'custom';
type TpSlMode = 'pips' | 'dollar';

/** Copied from the Start Copy screenshot. */
const copyAccounts: CopyAccount[] = [
  { id: 'acc-0001', login: '****0001', balance: 1090, server: 'Tenax' },
  { id: 'acc-0075', login: '****0075', balance: 0, equity: 0.88, server: 'Tenax' },
];

const HOSTING = 'selfHosted';
const COPIER_METHOD = 'multiplier';
const MULTIPLIERS = [1, 2, 3, 4, 5];
const MAX_CUSTOM_MULTIPLIER = 100;

const copyText = {
  title: (name: string) => `Start Copy to ${name}`,
  steps: ['Plan & account', 'Copy settings'],
  selectPlan: 'Select a Plan',
  selectAccount: 'Select Your Trading Account',
  selfHosted: 'SELFHOSTED',
  min: 'Min:',
  fee: 'Fee:',
  feeDetail: (percent: number) => `${percent}% commission on profit`,
  planOption: (name: string, percent: number) => `${name} [${HOSTING}] – Fee: ${percent}% commission on profit`,
  equity: 'Equity:',
  belowMin: 'Below min',
  linkAccount: '+ Link a new trading account',
  linkHint: 'Create or link an account to copy this plan.',
  investmentAmount: 'Investment Amount (USD)',
  copierMethod: 'Copier Method',
  multiplierMethod: 'Multiplier — master lots × your multiplier',
  multiplierExample: 'Ex: Multiplier set to 2×. Master opens 0.50 lot → your order is placed at 1.00 lot (0.50 × 2 = 1.00).',
  advancedSettings: 'Advanced Settings',
  lotMultiplier: 'LOT MULTIPLIER',
  multiplyMasterLot: 'Multiply master lot size',
  custom: 'Custom',
  customMultiplier: 'Custom multiplier',
  lotPreview: 'Master trades 1 lot → your lot = 1 lot ×',
  perTradeTpSl: 'PER-TRADE TP / SL',
  overrideMaster: 'Override master',
  tpSlHelp:
    'Set your own TP / SL in pips or a fixed dollar amount. Pip mode: 1 pip = 0.0001 for EURUSD · 0.01 for JPY pairs · $1.00 for XAUUSD / metals. Dollar mode: trade closes when profit or loss reaches the dollar target you set.',
  noMasterTpSl: 'No TP/SL configured by master — trades will open without automatic TP/SL.',
  usingMasterTpSl: 'Using master\'s TP/SL. Enable "Override master" to set your own levels.',
  pips: 'Pips',
  dollar: 'Dollar',
  takeProfit: 'Take profit',
  stopLoss: 'Stop loss',
  summary: 'Summary',
  capital: 'Capital',
  allocation: 'Allocation',
  ofAccount: 'of account',
  serverType: 'Server Type',
  feeLabel: 'Fee',
  gracePeriod: 'Grace Period',
  graceDays: 'Grace days',
  minAmount: (label: string) => `Minimum investment is ${label}`,
  overBalance: 'Amount exceeds the account balance',
  invalidMultiplier: `Enter a multiplier between 0.01 and ${MAX_CUSTOM_MULTIPLIER}`,
  cancel: 'Cancel',
  next: 'Next',
  back: 'Back',
  subscribe: 'Subscribe',
  submitted: (login: string) => `Copy request submitted for ${login}`,
};

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-danger">*</span>
    </>
  );
}

function availableFunds(account: CopyAccount) {
  return account.equity ?? account.balance;
}

/** Matches the screenshot's "$1090.00" (no thousands separator). */
function plainUsd(value: number) {
  return `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

function StepIndicator({ step }: { step: Step }) {
  const activeIndex = step === 'account' ? 0 : 1;
  return (
    <ol className="flex items-center gap-3">
      {copyText.steps.map((label, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={label} className="flex flex-1 items-center gap-2.5">
            <span
              className={cx(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-300',
                isDone || isActive ? 'bg-primary text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]' : 'bg-surface-2 text-fg-subtle ring-1 ring-line',
              )}
            >
              {isDone ? <Icon name="checkCircle" size={14} /> : index + 1}
            </span>
            <span className={cx('truncate text-xs font-semibold', isActive ? 'text-fg' : 'text-fg-subtle')}>{label}</span>
            {index === 0 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <span className={cx('absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out', activeIndex > 0 ? 'w-full' : 'w-0')} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SegmentButton({ isSelected, onClick, children }: { isSelected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onClick}
      className={cx(
        'min-w-12 rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,color,box-shadow,translate] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
        isSelected ? 'bg-primary text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]' : 'bg-surface text-fg-muted ring-1 ring-line hover:-translate-y-0.5 hover:text-fg hover:ring-primary/40',
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular-nums text-fg">{children}</dd>
    </div>
  );
}

export function StartCopyModal({ plan, onClose }: { plan: CopyPlanSummary | null; onClose: () => void }) {
  const eligible = (account: CopyAccount) => plan !== null && availableFunds(account) >= plan.minInvestment;
  const [step, setStep] = useState<Step>('account');
  const [accountId, setAccountId] = useState<string | null>(() => copyAccounts.find(eligible)?.id ?? null);
  const [amount, setAmount] = useState('');
  const [multiplier, setMultiplier] = useState<MultiplierChoice>(1);
  const [customMultiplier, setCustomMultiplier] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const [isOverridingTpSl, setIsOverridingTpSl] = useState(false);
  const [tpSlMode, setTpSlMode] = useState<TpSlMode>('pips');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const selected = copyAccounts.find((account) => account.id === accountId);

  const funds = selected ? availableFunds(selected) : 0;
  const amountValue = Number(amount);
  const effectiveMultiplier = multiplier === 'custom' ? Number(customMultiplier) : multiplier;
  const allocation = funds > 0 && Number.isFinite(amountValue) ? (amountValue / funds) * 100 : 0;

  let amountError: string | undefined;
  if (plan && !(amountValue >= plan.minInvestment)) amountError = copyText.minAmount(plan.minInvestmentLabel);
  else if (amountValue > funds) amountError = copyText.overBalance;

  const isMultiplierValid = effectiveMultiplier > 0 && effectiveMultiplier <= MAX_CUSTOM_MULTIPLIER;
  const multiplierError = multiplier === 'custom' && customMultiplier !== '' && !isMultiplierValid ? copyText.invalidMultiplier : undefined;
  const canSubscribe = !amountError && isMultiplierValid;

  function goToSettings() {
    if (!selected) return;
    setAmount(availableFunds(selected).toFixed(2));
    setStep('configure');
  }

  function subscribe() {
    if (!selected || !canSubscribe) return;
    toast(copyText.submitted(selected.login));
    onClose();
  }

  const footer =
    step === 'account' ? (
      <>
        <Button type="button" variant="outline" onClick={onClose}>
          {copyText.cancel}
        </Button>
        <Button type="button" disabled={!selected} onClick={goToSettings}>
          {copyText.next}
          <Icon name="arrowRight" size={16} />
        </Button>
      </>
    ) : (
      <>
        <Button type="button" variant="outline" onClick={() => setStep('account')}>
          {copyText.back}
        </Button>
        <Button type="button" disabled={!canSubscribe} onClick={subscribe} leftIcon="checkCircle">
          {copyText.subscribe}
        </Button>
      </>
    );

  return (
    <Modal open={plan !== null} onClose={onClose} size="lg" title={plan ? copyText.title(plan.name) : ''} footer={footer}>
      {plan && (
        <div className="flex flex-col gap-5">
          <StepIndicator step={step} />

          {step === 'account' ? (
            <div key="account" className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
              <Field htmlFor="copy-plan" label={<RequiredLabel>{copyText.selectPlan}</RequiredLabel>}>
                <Select id="copy-plan" value={HOSTING} onChange={() => undefined}>
                  <option value={HOSTING}>{copyText.planOption(plan.name, plan.feePercent)}</option>
                </Select>
              </Field>

              <div className="glow-border relative overflow-hidden rounded-xl bg-surface-2 p-4">
                <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
                <div className="relative flex flex-wrap items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary text-on-primary shadow-[0_6px_16px_-6px_var(--brand-primary)]">
                    <Icon name="copy" size={16} />
                  </span>
                  <p className="text-base font-semibold text-fg">{plan.name}</p>
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary ring-1 ring-primary/30">{copyText.selfHosted}</span>
                </div>
                <dl className="relative mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-surface px-3 py-2 ring-1 ring-line">
                    <dt className="text-[11px] text-fg-subtle uppercase">{copyText.min}</dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{plan.minInvestmentLabel}</dd>
                  </div>
                  <div className="rounded-lg bg-surface px-3 py-2 ring-1 ring-line">
                    <dt className="text-[11px] text-fg-subtle uppercase">{copyText.fee}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-fg">{copyText.feeDetail(plan.feePercent)}</dd>
                  </div>
                </dl>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium text-fg">
                  <RequiredLabel>{copyText.selectAccount}</RequiredLabel>
                </legend>
                {copyAccounts.map((account, index) => {
                  const isEligible = eligible(account);
                  const isSelected = account.id === accountId;
                  return (
                    <label
                      key={account.id}
                      style={staggerStyle(index, 120)}
                      className={cx(
                        'relative flex animate-rise items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-[background-color,box-shadow,translate] duration-200 motion-reduce:animate-none',
                        isSelected ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface ring-line',
                        isEligible ? 'cursor-pointer hover:-translate-y-0.5 hover:ring-primary/50' : 'cursor-not-allowed opacity-70',
                      )}
                    >
                      <input
                        type="radio"
                        name="copy-account"
                        value={account.id}
                        checked={isSelected}
                        disabled={!isEligible}
                        onChange={() => setAccountId(account.id)}
                        className="sr-only"
                      />
                      <span className={cx('grid size-5 shrink-0 place-items-center rounded-full ring-2 transition-colors', isSelected ? 'bg-primary text-on-primary ring-primary' : 'ring-line-strong')}>
                        {isSelected && <Icon name="checkCircle" size={14} className="animate-rise motion-reduce:animate-none" />}
                      </span>
                      <span className="font-mono text-sm font-semibold text-fg">{account.login}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">
                        <span className="tabular-nums">{formatMoney(account.balance, 'USD')}</span>
                        {account.equity !== undefined && (
                          <span className="tabular-nums">
                            {' '}
                            ({copyText.equity} {formatMoney(account.equity, 'USD')})
                          </span>
                        )}
                        {' · '}
                        {account.server}
                      </span>
                      {!isEligible && <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-warning/30">{copyText.belowMin}</span>}
                    </label>
                  );
                })}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line-strong px-4 py-3">
                  <Link href="/accounts" className="text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {copyText.linkAccount}
                  </Link>
                  <span className="text-xs text-fg-subtle">{copyText.linkHint}</span>
                </div>
              </fieldset>
            </div>
          ) : (
            <div key="configure" className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
              <Field htmlFor="copy-amount" label={<RequiredLabel>{copyText.investmentAmount}</RequiredLabel>} error={amountError}>
                <Input
                  id="copy-amount"
                  type="number"
                  inputMode="decimal"
                  min={plan.minInvestment}
                  max={funds}
                  step="0.01"
                  leftIcon="wallet"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>

              <Field htmlFor="copy-method" label={<RequiredLabel>{copyText.copierMethod}</RequiredLabel>} hint={copyText.multiplierExample}>
                <Select id="copy-method" value={COPIER_METHOD} onChange={() => undefined}>
                  <option value={COPIER_METHOD}>{copyText.multiplierMethod}</option>
                </Select>
              </Field>

              <div className="rounded-xl ring-1 ring-line">
                <button
                  type="button"
                  aria-expanded={isAdvancedOpen}
                  aria-controls="copy-advanced"
                  onClick={() => setIsAdvancedOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-fg transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center gap-2">
                    <Icon name="settings" size={16} className={cx('text-primary transition-transform duration-500', isAdvancedOpen && 'rotate-90')} />
                    {copyText.advancedSettings}
                  </span>
                  <Icon name="chevronDown" size={16} className={cx('text-fg-muted transition-transform duration-300', isAdvancedOpen && 'rotate-180')} />
                </button>
                <div id="copy-advanced" className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isAdvancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden" inert={!isAdvancedOpen}>
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      <section className="relative overflow-hidden rounded-xl bg-surface-2 p-4">
                        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />
                        <p className="text-[11px] font-bold tracking-wider text-fg-subtle">{copyText.lotMultiplier}</p>
                        <p className="mt-1 text-sm font-semibold text-fg">{copyText.multiplyMasterLot}</p>
                        <div role="radiogroup" aria-label={copyText.multiplyMasterLot} className="mt-3 flex flex-wrap gap-2">
                          {MULTIPLIERS.map((value) => (
                            <SegmentButton key={value} isSelected={multiplier === value} onClick={() => setMultiplier(value)}>
                              {`${value}x`}
                            </SegmentButton>
                          ))}
                          <SegmentButton isSelected={multiplier === 'custom'} onClick={() => setMultiplier('custom')}>
                            {copyText.custom}
                          </SegmentButton>
                        </div>
                        {multiplier === 'custom' && (
                          <div className="mt-3 max-w-48 animate-rise motion-reduce:animate-none">
                            <Field htmlFor="copy-custom-multiplier" label={copyText.customMultiplier} error={multiplierError}>
                              <Input
                                id="copy-custom-multiplier"
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                max={MAX_CUSTOM_MULTIPLIER}
                                step="0.01"
                                placeholder="1.5"
                                value={customMultiplier}
                                onChange={(event) => setCustomMultiplier(event.target.value)}
                              />
                            </Field>
                          </div>
                        )}
                        <p className="mt-3 text-xs text-fg-muted">
                          {copyText.lotPreview} <span className="font-bold text-primary tabular-nums">{isMultiplierValid ? `${effectiveMultiplier}x` : '—'}</span>
                        </p>
                      </section>

                      <section className="relative overflow-hidden rounded-xl bg-surface-2 p-4">
                        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-warning" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-bold tracking-wider text-fg-subtle">{copyText.perTradeTpSl}</p>
                          <Checkbox label={copyText.overrideMaster} checked={isOverridingTpSl} onChange={(event) => setIsOverridingTpSl(event.target.checked)} />
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-fg-muted">{copyText.tpSlHelp}</p>
                        <p className="mt-3 flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning italic">
                          <Icon name="alert" size={14} className="mt-px shrink-0" />
                          {copyText.noMasterTpSl}
                        </p>
                        {isOverridingTpSl ? (
                          <div className="mt-3 flex animate-rise flex-col gap-3 motion-reduce:animate-none">
                            <div role="radiogroup" aria-label={copyText.perTradeTpSl} className="flex gap-2">
                              <SegmentButton isSelected={tpSlMode === 'pips'} onClick={() => setTpSlMode('pips')}>
                                {copyText.pips}
                              </SegmentButton>
                              <SegmentButton isSelected={tpSlMode === 'dollar'} onClick={() => setTpSlMode('dollar')}>
                                {copyText.dollar}
                              </SegmentButton>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field htmlFor="copy-tp" label={copyText.takeProfit}>
                                <Input id="copy-tp" type="number" inputMode="decimal" min="0" step="0.01" placeholder={tpSlMode === 'pips' ? '50' : '10.00'} value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} />
                              </Field>
                              <Field htmlFor="copy-sl" label={copyText.stopLoss}>
                                <Input id="copy-sl" type="number" inputMode="decimal" min="0" step="0.01" placeholder={tpSlMode === 'pips' ? '30' : '5.00'} value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
                              </Field>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-fg-subtle">{copyText.usingMasterTpSl}</p>
                        )}
                      </section>
                    </div>
                  </div>
                </div>
              </div>

              <section className="glow-border relative overflow-hidden rounded-xl bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-fg">{copyText.summary}</p>
                  <span className="relative grid size-11 place-items-center" aria-hidden="true">
                    <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-line" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        strokeWidth="4"
                        strokeLinecap="round"
                        pathLength={100}
                        strokeDasharray={100}
                        className="stroke-primary transition-[stroke-dashoffset] duration-500"
                        style={{ strokeDashoffset: 100 - Math.min(100, Math.max(0, allocation)) }}
                      />
                    </svg>
                    <Icon name="wallet" size={14} className="text-primary" />
                  </span>
                </div>
                <dl className="mt-2 divide-y divide-line">
                  <SummaryRow label={copyText.capital}>{plainUsd(amountValue)}</SummaryRow>
                  <SummaryRow label={copyText.allocation}>
                    {allocation.toFixed(2)}% {copyText.ofAccount}
                  </SummaryRow>
                  <SummaryRow label={copyText.serverType}>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary ring-1 ring-primary/30">{copyText.selfHosted}</span>
                  </SummaryRow>
                  <SummaryRow label={copyText.feeLabel}>{copyText.feeDetail(plan.feePercent)}</SummaryRow>
                  <SummaryRow label={copyText.gracePeriod}>{copyText.graceDays}</SummaryRow>
                </dl>
              </section>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
