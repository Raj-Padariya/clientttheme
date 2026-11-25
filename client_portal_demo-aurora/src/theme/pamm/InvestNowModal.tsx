'use client';

import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { staggerStyle } from './motion';

export interface InvestPlanOption {
  id: string;
  name: string;
  commissionPercent: number;
  minInvestment: number;
}

interface InvestAccount {
  id: string;
  login: string;
  balance: number;
  server: string;
}

/** Demo trading accounts, the same two the Copy Trading popup lists. */
const investAccounts: InvestAccount[] = [
  { id: 'acc-0001', login: '****0001', balance: 1090, server: 'Tenax' },
  { id: 'acc-0075', login: '****0075', balance: 0, server: 'Tenax' },
];

const investText = {
  title: 'Invest Now',
  selectPlan: 'Select plan:',
  planOption: (plan: InvestPlanOption) => `${plan.name} - ${plan.commissionPercent}% Commission`,
  minInvestmentHint: (plan: InvestPlanOption) => `MIN INVESTMENT: ${plan.minInvestment.toFixed(2)}`,
  tradingAccount: 'Trading Account',
  plan: 'Plan',
  commission: 'Commission',
  minInvestment: 'MIN INVESTMENT',
  belowMin: 'Below min',
  cancel: 'Cancel',
  submit: 'Invest Now',
  submitted: (login: string) => `Investment request submitted from ${login}`,
};

function accountLabel(account: InvestAccount, isEligible: boolean) {
  const base = `${account.login} · ${formatMoney(account.balance, 'USD')} · ${account.server}`;
  return isEligible ? base : `${base} (${investText.belowMin})`;
}

export function InvestNowModal({ plans, initialPlanId, onClose }: { plans: InvestPlanOption[]; initialPlanId: string; onClose: () => void }) {
  const [planId, setPlanId] = useState(initialPlanId);
  const [accountId, setAccountId] = useState('');
  const plan = plans.find((item) => item.id === planId) ?? plans[0];
  const account = investAccounts.find((item) => item.id === accountId);

  function submit() {
    if (!account) return;
    toast(investText.submitted(account.login));
    onClose();
  }

  const summary: { key: string; icon: IconName; label: string; value: string }[] = [
    { key: 'plan', icon: 'trendUp', label: investText.plan, value: plan.name },
    { key: 'commission', icon: 'card', label: investText.commission, value: `${plan.commissionPercent}%` },
    { key: 'min', icon: 'wallet', label: investText.minInvestment, value: plan.minInvestment.toFixed(2) },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={investText.title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {investText.cancel}
          </Button>
          <Button type="button" disabled={!account} onClick={submit} className="group/invest relative overflow-hidden">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/invest:translate-x-full motion-reduce:hidden" />
            <span className="relative">{investText.submit}</span>
            <Icon name="arrowRight" size={16} className="relative transition-transform duration-200 group-hover/invest:translate-x-0.5" />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div key={plan.id} className="orbit-card animate-rise overflow-hidden motion-reduce:animate-none">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-40 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
          {/* Plan gets its own full-width row so long plan names never get clipped in the narrow popup. */}
          <dl className="relative grid grid-cols-2">
            {summary.map((item, index) => (
              <div
                key={item.key}
                style={staggerStyle(index, 110)}
                className={cx(
                  'flex min-w-0 animate-rise items-center gap-3 p-4 motion-reduce:animate-none',
                  index === 0 ? 'col-span-2 border-b border-line' : 'border-line even:border-r',
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon name={item.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] whitespace-nowrap text-fg-subtle">{item.label}</dt>
                  <dd className={cx('font-semibold tabular-nums break-words text-primary', index === 0 ? 'text-base' : 'text-sm')}>{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <Field htmlFor="invest-plan" label={investText.selectPlan} hint={investText.minInvestmentHint(plan)}>
          <Select id="invest-plan" value={plan.id} onChange={(event) => setPlanId(event.target.value)}>
            {plans.map((option) => (
              <option key={option.id} value={option.id}>
                {investText.planOption(option)}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="invest-account" label={investText.tradingAccount}>
          <Select id="invest-account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">{investText.tradingAccount}</option>
            {investAccounts.map((option) => {
              const isEligible = option.balance >= plan.minInvestment;
              return (
                <option key={option.id} value={option.id} disabled={!isEligible}>
                  {accountLabel(option, isEligible)}
                </option>
              );
            })}
          </Select>
        </Field>

        <div
          aria-hidden="true"
          className={cx(
            'flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-[background-color,box-shadow,opacity] duration-300',
            account ? 'bg-primary-soft opacity-100 ring-primary/40' : 'bg-surface-2/50 opacity-60 ring-line',
          )}
        >
          <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1.5 font-mono text-xs font-semibold text-fg ring-1 ring-line">{account?.login ?? '••••'}</span>
          <svg className="h-3 min-w-8 flex-1 overflow-visible">
            <line x1="0" x2="100%" y1="50%" y2="50%" strokeWidth="2" strokeDasharray="4 4" className="stroke-primary/40" />
            {account && (
              <circle cy="50%" r="4" className="fill-primary motion-reduce:hidden">
                <animate attributeName="cx" values="0%;100%" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>
          <span className="max-w-[45%] shrink-0 truncate rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-on-primary">{plan.name}</span>
        </div>
      </div>
    </Modal>
  );
}
