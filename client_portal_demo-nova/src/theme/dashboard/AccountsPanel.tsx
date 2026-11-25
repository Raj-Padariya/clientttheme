'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { LinkButton } from '../ui/Button';
import { Badge, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

// A move of this many percent of the balance fills one half of the P&L bar.
const PNL_SCALE_PERCENT = 20;
const PNL_SCALE_MIN = -PNL_SCALE_PERCENT;

type PnlTone = 'profit' | 'loss' | 'flat';

const pnlText: Record<PnlTone, string> = { profit: 'text-success', loss: 'text-danger', flat: 'text-fg-muted' };
const pnlSign: Record<PnlTone, string> = { profit: '+', loss: '-', flat: '' };

// Floating P&L (equity minus balance), drawn from a centre zero line: profit grows right in green, loss grows left in red.
function PnlMeter({ account }: { account: TradingAccount }) {
  const pnl = account.equity - account.balance;
  const percent = account.balance > 0 ? (pnl / account.balance) * 100 : 0;
  const tone: PnlTone = pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'flat';
  const clampedPercent = Math.min(Math.max(percent, PNL_SCALE_MIN), PNL_SCALE_PERCENT);
  const fillWidth = (Math.abs(clampedPercent) / PNL_SCALE_PERCENT) * 50;
  const amountText = `${pnlSign[tone]}${formatMoney(Math.abs(pnl), account.currency)}`;
  const percentText = `${pnlSign[tone]}${Math.abs(percent).toFixed(2)}%`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-fg-muted">{translate('home.pnl')}</span>
        <span className={cx('font-mono font-semibold tabular-nums', pnlText[tone])}>
          {amountText} <span className="opacity-75">({percentText})</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={translate('home.pnl')}
        aria-valuemin={PNL_SCALE_MIN}
        aria-valuemax={PNL_SCALE_PERCENT}
        aria-valuenow={clampedPercent}
        aria-valuetext={`${amountText} (${percentText})`}
        className="progress-track relative mt-1.5 h-2.5 overflow-hidden rounded-full"
      >
        {tone !== 'flat' && (
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-y-0 animate-fade transition-[width] duration-500 motion-reduce:animate-none motion-reduce:transition-none',
              tone === 'profit'
                ? 'left-1/2 rounded-r-full bg-success shadow-[0_0_10px_color-mix(in_srgb,var(--success)_55%,transparent)]'
                : 'right-1/2 rounded-l-full bg-danger shadow-[0_0_10px_color-mix(in_srgb,var(--danger)_55%,transparent)]',
            )}
            style={{ width: `${fillWidth}%` }}
          />
        )}
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-fg-muted/70" />
      </div>
    </div>
  );
}

interface AccountRowProps {
  account: TradingAccount;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

// One account as a compact row (login, type, balance); opening it reveals the full details, P&L and actions.
function AccountRow({ account, index, isOpen, onToggle }: AccountRowProps) {
  const isLive = account.type === 'live';
  const panelId = `account-${account.id}`;
  const details = [
    { label: translate('home.platform'), value: account.platform },
    { label: translate('home.type'), value: account.group },
    { label: translate('accounts.leverage'), value: `1:${account.leverage}` },
    { label: translate('accounts.credit'), value: formatMoney(account.credit, account.currency) },
    { label: translate('accounts.equity'), value: formatMoney(account.equity, account.currency) },
    { label: translate('accounts.freeMargin'), value: formatMoney(account.freeMargin, account.currency) },
  ];

  return (
    <li
      className={cx(
        'relative isolate animate-rise overflow-hidden rounded-[20px] border transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:animate-none motion-reduce:transition-none',
        isOpen ? 'border-primary/35 bg-surface-2 shadow-[0_20px_40px_-28px_var(--brand-primary)]' : 'border-line bg-surface/50 hover:border-primary/30',
      )}
      style={{ animationDelay: `${220 + index * 70}ms` }}
    >
      {isOpen && <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 -z-10 size-44 rounded-full bg-primary/15 blur-3xl" />}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center">
          {isOpen && (
            <span className="orbit-ring absolute -inset-1 animate-orbit-spin-fast motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_2px_var(--brand-primary)]" />
            </span>
          )}
          <span className="grid size-10 place-items-center rounded-xl [background-image:var(--brand-gradient)] text-on-primary shadow-raised">
            <Icon name="accounts" size={18} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-sm font-semibold text-fg">#{account.login}</span>
            <Badge tone={isLive ? 'primary' : 'neutral'} dot>
              {translate(isLive ? 'accounts.live' : 'accounts.demo')}
            </Badge>
          </span>
          <span className="block truncate text-xs text-fg-muted">{account.currency}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('home.balance')}</span>
          <span className="text-base font-medium text-fg tabular-nums">{formatMoney(account.balance, account.currency)}</span>
        </span>
        <Icon name="chevronDown" size={16} className={cx('shrink-0 text-fg-subtle transition-transform duration-300 motion-reduce:transition-none', isOpen && 'rotate-180 text-primary')} />
      </button>

      <div id={panelId} className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="flex min-h-0 flex-col gap-3.5 overflow-hidden px-3.5" inert={!isOpen}>
          {/* Two columns on phones so money values like "$12,345.67" aren't cut to "$12,3…". */}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[420px]:grid-cols-3">
            {details.map((detail) => (
              <div key={detail.label} className="min-w-0 bg-surface px-2.5 py-2">
                <dt className="truncate text-[10px] font-medium tracking-[0.08em] text-fg-subtle uppercase">{detail.label}</dt>
                <dd className="mt-0.5 truncate text-[13px] font-semibold text-fg tabular-nums">{detail.value}</dd>
              </div>
            ))}
          </dl>

          <PnlMeter account={account} />

          <div className="flex items-center gap-2 pb-3.5">
            <LinkButton href="/deposit" size="sm" variant="outline" leftIcon="deposit" className="flex-1">
              {translate('home.addBalance')}
            </LinkButton>
            <LinkButton href="/platforms" size="sm" leftIcon="monitor" className="flex-1">
              {translate('home.trade')}
            </LinkButton>
            <Link
              href="/accounts"
              aria-label={translate('home.accountSettings')}
              title={translate('home.accountSettings')}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line-strong text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Icon name="settings" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Live accounts as a compact stack; one row is open at a time (the first by default). */
function AccountStack({ accounts }: { accounts: TradingAccount[] }) {
  const [openId, setOpenId] = useState<string | null>(accounts[0]?.id ?? null);

  return (
    <ul aria-label={translate('home.tradingAccounts')} className="grid items-start gap-2.5 xl:grid-cols-2 2xl:grid-cols-1">
      {accounts.map((account, index) => (
        <AccountRow
          key={account.id}
          account={account}
          index={index}
          isOpen={openId === account.id}
          onToggle={() => setOpenId(openId === account.id ? null : account.id)}
        />
      ))}
    </ul>
  );
}

export function AccountsPanel({ accounts, className }: { accounts?: TradingAccount[]; className?: string }) {
  let body;
  if (!accounts) {
    body = <Skeleton className="h-[320px] rounded-[22px]" />;
  } else if (accounts.length > 0) {
    body = <AccountStack accounts={accounts} />;
  }

  return (
    <section
      aria-labelledby="accounts-title"
      className={cx('orbit-card flex min-w-0 animate-rise flex-col gap-5 overflow-hidden p-5 [animation-delay:220ms] motion-reduce:animate-none sm:p-6', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 id="accounts-title" className="text-base font-semibold tracking-tight text-fg">
            {translate('home.tradingAccounts')}
          </h2>
          {accounts && (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
              {translate('home.accountsCount', { count: accounts.length })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href="/accounts" size="sm" leftIcon="plus">
            {translate('home.createLive')}
          </LinkButton>
          <LinkButton href="/accounts" size="sm" variant="outline">
            {translate('home.viewAll')}
          </LinkButton>
        </div>
      </div>

      {body}
    </section>
  );
}
