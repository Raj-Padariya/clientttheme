'use client';

import Link from 'next/link';
import { useState, type KeyboardEvent } from 'react';
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

function AccountCard({ account }: { account: TradingAccount }) {
  const isLive = account.type === 'live';
  const details = [
    { label: translate('home.platform'), value: account.platform },
    { label: translate('home.type'), value: account.group },
    { label: translate('accounts.leverage'), value: `1:${account.leverage}` },
    { label: translate('accounts.credit'), value: formatMoney(account.credit, account.currency) },
    { label: translate('accounts.equity'), value: formatMoney(account.equity, account.currency) },
    { label: translate('accounts.freeMargin'), value: formatMoney(account.freeMargin, account.currency) },
  ];

  return (
    <div className="relative isolate flex animate-rise flex-col gap-4 overflow-hidden rounded-[22px] border border-primary/30 bg-surface-2 p-4 shadow-[0_24px_48px_-28px_var(--brand-primary)] motion-reduce:animate-none sm:p-5">
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 -z-10 size-44 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl [background-image:var(--brand-gradient)] text-on-primary shadow-raised">
            <Icon name="accounts" size={20} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="truncate font-mono text-sm font-semibold text-fg">#{account.login}</span>
              <Badge tone={isLive ? 'primary' : 'neutral'} dot>
                {translate(isLive ? 'accounts.live' : 'accounts.demo')}
              </Badge>
            </p>
            <p className="truncate text-xs text-fg-muted">{account.currency}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <p className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('home.balance')}</p>
        <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">{formatMoney(account.balance, account.currency)}</p>
      </div>

      {/* Two columns on phones so money values like "$12,345.67" aren't cut to "$12,3…". */}
      <dl className="relative grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[420px]:grid-cols-3">
        {details.map((detail) => (
          <div key={detail.label} className="min-w-0 bg-surface px-2.5 py-2">
            <dt className="truncate text-[10px] font-medium tracking-[0.08em] text-fg-subtle uppercase">{detail.label}</dt>
            <dd className="mt-0.5 truncate text-[13px] font-semibold text-fg tabular-nums">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <div className="relative">
        <PnlMeter account={account} />
      </div>

      <div className="relative flex items-center gap-2">
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
  );
}

// Cards behind the front one: each sits a little lower, narrower and turned, so the stack reads as a fanned deck.
const peekClass = ['z-[2] inset-x-3 translate-y-3 rotate-[1.2deg]', 'z-[1] inset-x-6 translate-y-6 -rotate-[1.2deg]'];

/** Live accounts as a fanned deck: the front card is fully detailed, the next ones peek behind it. */
function AccountDeck({ accounts }: { accounts: TradingAccount[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = accounts.length;
  const frontIndex = activeIndex % count;
  const front = accounts[frontIndex];
  const peeks = Array.from({ length: Math.min(count - 1, peekClass.length) }, (_, depth) => (frontIndex + depth + 1) % count);

  function move(step: number) {
    setActiveIndex((frontIndex + step + count) % count);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (count < 2) return;
    if (event.key === 'ArrowRight') move(1);
    if (event.key === 'ArrowLeft') move(-1);
  }

  return (
    <div role="group" aria-roledescription="carousel" aria-label={translate('home.tradingAccounts')} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      <div className="relative pb-6">
        {peeks.map((accountIndex, depth) => (
          <button
            key={accounts[accountIndex].id}
            type="button"
            tabIndex={-1}
            aria-label={`#${accounts[accountIndex].login}`}
            onClick={() => setActiveIndex(accountIndex)}
            className={cx(
              'absolute top-0 bottom-6 rounded-[22px] border border-line bg-surface-2/80 transition-[transform,border-color] duration-300 hover:translate-y-7 hover:border-primary/40 motion-reduce:transition-none',
              peekClass[depth],
            )}
          />
        ))}
        <div key={front.id} className="relative z-[3]">
          <AccountCard account={front} />
        </div>
      </div>

      {count > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={translate('walletHistory.previous')}
            className="grid size-8 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="arrowRight" size={14} className="rotate-180" />
          </button>
          <div className="flex items-center gap-1.5">
            {accounts.map((account, index) => (
              <button
                key={account.id}
                type="button"
                aria-label={`#${account.login}`}
                aria-current={index === frontIndex}
                onClick={() => setActiveIndex(index)}
                className={cx(
                  'h-1.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  index === frontIndex ? 'w-6 bg-primary shadow-[0_0_8px_var(--brand-primary)]' : 'w-1.5 bg-line-strong hover:bg-primary/50',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={translate('walletHistory.next')}
            className="grid size-8 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountsPanel({ accounts, className }: { accounts?: TradingAccount[]; className?: string }) {
  let body;
  if (!accounts) {
    body = <Skeleton className="h-[420px] rounded-[22px]" />;
  } else if (accounts.length > 0) {
    body = <AccountDeck accounts={accounts} />;
  }

  return (
    <section
      aria-labelledby="accounts-title"
      className={cx('glass relative isolate flex min-w-0 animate-rise flex-col gap-5 overflow-hidden rounded-[28px] p-5 [animation-delay:220ms] motion-reduce:animate-none sm:p-6', className)}
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
