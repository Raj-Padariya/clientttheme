'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useAccounts } from '@/core/pages/useAccounts';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { AccountActionsMenu, AccountPasswordModal, LeverageModal, NicknameModal, type AccountAction } from './AccountActions';
import { Button, LinkButton } from '../ui/Button';
import { Badge, EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Tabs, type TabItem } from '../ui/Tabs';

type AccountFilter = 'all' | TradingAccount['type'];

const CARD_STAGGER_MS = 60;
const PNL_RING_SCALE_PERCENT = 20;
const PNL_RING_MIN_PERCENT = -PNL_RING_SCALE_PERCENT;

function floatingPnl(account: TradingAccount): number {
  return account.equity - account.balance;
}

function PnlPill({ pnl, percent, currency }: { pnl: number; percent?: number; currency: string }) {
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  const sign = isProfit ? '+' : isLoss ? '-' : '';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        isProfit && 'bg-success-soft text-success',
        isLoss && 'bg-danger-soft text-danger',
        !isProfit && !isLoss && 'bg-surface-2 text-fg-muted',
      )}
    >
      {(isProfit || isLoss) && <Icon name={isProfit ? 'trendUp' : 'trendDown'} size={12} />}
      {sign}
      {formatMoney(Math.abs(pnl), currency)}
      {percent !== undefined && <span className="opacity-75">({`${sign}${Math.abs(percent).toFixed(2)}%`})</span>}
    </span>
  );
}

// Floating P&L as a share of balance. Profit runs clockwise in green, loss runs anticlockwise in red,
// and a move of PNL_RING_SCALE_PERCENT or more fills the whole ring.
function PnlRing({ pnl, percent }: { pnl: number; percent: number }) {
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  const clampedPercent = Math.min(Math.max(percent, PNL_RING_MIN_PERCENT), PNL_RING_SCALE_PERCENT);
  const fill = Math.round((Math.abs(clampedPercent) / PNL_RING_SCALE_PERCENT) * 100);
  const sign = isProfit ? '+' : isLoss ? '-' : '';
  const percentText = `${sign}${Math.abs(percent).toFixed(1)}%`;
  const label = translate(isProfit ? 'accounts.profit' : isLoss ? 'accounts.loss' : 'home.pnl');

  return (
    <div
      role="meter"
      aria-label={translate('home.pnl')}
      aria-valuemin={PNL_RING_MIN_PERCENT}
      aria-valuemax={PNL_RING_SCALE_PERCENT}
      aria-valuenow={clampedPercent}
      aria-valuetext={`${label} ${percentText}`}
      className={cx(
        'relative size-[76px] shrink-0 rounded-full',
        isProfit && 'shadow-[0_0_22px_-6px_color-mix(in_srgb,var(--success)_70%,transparent)]',
        isLoss && 'shadow-[0_0_22px_-6px_color-mix(in_srgb,var(--danger)_70%,transparent)]',
      )}
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="size-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
        {fill > 0 && (
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={isProfit ? 'var(--success)' : 'var(--danger)'}
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${fill} 100`}
            transform={isLoss ? 'translate(0 36) scale(1 -1)' : undefined}
            className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cx('text-[13px] font-semibold tabular-nums', isProfit ? 'text-success' : isLoss ? 'text-danger' : 'text-fg-muted')}>
          {percentText}
        </span>
        <span className="mt-1 text-[9px] tracking-[0.1em] text-fg-subtle uppercase">{label}</span>
      </span>
    </div>
  );
}

function AccountCard({ account, index }: { account: TradingAccount; index: number }) {
  const isLive = account.type === 'live';
  const pnl = floatingPnl(account);
  const pnlPercent = account.balance > 0 ? (pnl / account.balance) * 100 : 0;
  // Demo has no account API, so leverage and nickname changes live on the card until the page reloads.
  const [leverage, setLeverage] = useState(account.leverage);
  const [nickname, setNickname] = useState('');
  const [action, setAction] = useState<AccountAction | null>(null);
  const closeAction = () => setAction(null);
  const stats = [
    { label: translate('accounts.balance'), value: formatMoney(account.balance, account.currency) },
    { label: translate('accounts.credit'), value: formatMoney(account.credit, account.currency) },
    { label: translate('accounts.freeMargin'), value: formatMoney(account.freeMargin, account.currency) },
  ];

  return (
    <li
      className="group/card relative isolate flex animate-rise flex-col overflow-hidden rounded-[24px] border border-line bg-surface-2/40 p-5 transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-pop motion-reduce:animate-none motion-reduce:transition-none"
      style={{ animationDelay: `${index * CARD_STAGGER_MS}ms` }}
    >
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute -top-24 -right-20 -z-10 size-56 rounded-full blur-3xl transition-opacity duration-500 group-hover/card:opacity-100',
          isLive ? 'bg-primary/25 opacity-60' : 'bg-fg/10 opacity-40',
        )}
      />
      <span
        aria-hidden="true"
        className={cx('absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent to-transparent', isLive ? 'via-primary/80' : 'via-line-strong')}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-fg">
            {account.platform}
          </span>
          <Badge tone={isLive ? 'primary' : 'neutral'} dot>
            {translate(isLive ? 'accounts.live' : 'accounts.demo')}
          </Badge>
        </div>
        <Link
          href="/settings"
          aria-label={translate('home.accountSettings')}
          title={translate('home.accountSettings')}
          className="inline-flex size-8 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="settings" size={15} />
        </Link>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium tracking-[0.12em] text-fg-subtle uppercase">{translate('accounts.number')}</p>
          <p className="mt-1 truncate font-mono text-xl font-semibold text-fg">#{account.login}</p>
          {nickname && (
            <p key={nickname} className="mt-0.5 inline-flex max-w-full animate-rise items-center gap-1 truncate text-xs font-medium text-primary motion-reduce:animate-none">
              <Icon name="user" size={11} className="shrink-0" />
              <span className="truncate">{nickname}</span>
            </p>
          )}
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {account.group} · <span key={leverage} className="inline-block animate-rise motion-reduce:animate-none">1:{leverage}</span>
          </p>
        </div>
        <PnlRing pnl={pnl} percent={pnlPercent} />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">{translate('accounts.equity')}</p>
          <PnlPill pnl={pnl} percent={pnlPercent} currency={account.currency} />
        </div>
        <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">
          {formatMoney(account.equity, account.currency)}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="truncate text-[10.5px] tracking-[0.06em] text-fg-subtle uppercase">{stat.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-fg tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={cx('mt-5 grid gap-2', isLive ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]')}>
        {isLive && (
          <LinkButton href="/deposit" size="sm" variant="outline" leftIcon="deposit">
            {translate('home.addBalance')}
          </LinkButton>
        )}
        <LinkButton href="/platforms" size="sm" leftIcon="monitor">
          {translate('home.trade')}
        </LinkButton>
        <AccountActionsMenu onSelect={setAction} />
      </div>

      {action === 'leverage' && <LeverageModal account={account} current={leverage} onClose={closeAction} onSaved={setLeverage} />}
      {action === 'nickname' && <NicknameModal account={account} current={nickname} onClose={closeAction} onSaved={setNickname} />}
      {action === 'masterPassword' && <AccountPasswordModal account={account} kind="master" onClose={closeAction} />}
      {action === 'investorPassword' && <AccountPasswordModal account={account} kind="investor" onClose={closeAction} />}
    </li>
  );
}

// Totals cover live accounts only (demo money is not real) and assume they share one currency, as the dashboard does.
function AccountsOverview({ accounts }: { accounts: TradingAccount[] }) {
  const live = accounts.filter((account) => account.type === 'live');
  const currency = live[0]?.currency ?? accounts[0]?.currency ?? 'USD';
  const sum = (pick: (account: TradingAccount) => number) => live.reduce((total, account) => total + pick(account), 0);
  const totalPnl = sum(floatingPnl);
  const tileClass = 'glow-border min-w-0 rounded-2xl bg-surface/80 p-4 sm:p-5';
  // The P&L tile's edge follows the result: green for profit, red for loss, gold when flat.
  const pnlGlow = totalPnl > 0 ? '[--glow-color:var(--success)]' : totalPnl < 0 ? '[--glow-color:var(--danger)]' : undefined;

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className={tileClass}>
        <dt className="text-xs text-fg-muted">{translate('accounts.liveEquity')}</dt>
        <dd className="mt-1.5 truncate text-2xl font-light tracking-[-0.02em] text-fg tabular-nums sm:text-3xl">{formatMoney(sum((account) => account.equity), currency)}</dd>
      </div>
      <div className={cx(tileClass, pnlGlow)}>
        <dt className="text-xs text-fg-muted">{translate('accounts.floatingPnl')}</dt>
        <dd className="mt-2.5">
          <PnlPill pnl={totalPnl} currency={currency} />
        </dd>
      </div>
      <div className={tileClass}>
        <dt className="text-xs text-fg-muted">{translate('accounts.totalFreeMargin')}</dt>
        <dd className="mt-1.5 truncate text-xl font-medium text-fg tabular-nums">{formatMoney(sum((account) => account.freeMargin), currency)}</dd>
      </div>
      <div className={tileClass}>
        <dt className="text-xs text-fg-muted">{translate('accounts.accountsCount')}</dt>
        <dd className="mt-1.5 text-xl font-medium text-fg tabular-nums">
          {accounts.length}
          <span className="ml-2 text-xs font-normal text-fg-subtle">
            {translate('accounts.liveDemoSplit', { live: live.length, demo: accounts.length - live.length })}
          </span>
        </dd>
      </div>
    </dl>
  );
}

export default function AccountsPage() {
  const { data: accounts, isFetching, refetch } = useAccounts();
  const [filter, setFilter] = useState<AccountFilter>('all');

  const withCount = (label: string, type: AccountFilter) => {
    if (!accounts) return label;
    const count = accounts.filter((account) => type === 'all' || account.type === type).length;
    return `${label} (${count})`;
  };
  const filterItems: TabItem<AccountFilter>[] = [
    { value: 'all', label: withCount(translate('accounts.filterAll'), 'all') },
    { value: 'live', label: withCount(translate('accounts.liveAccounts'), 'live') },
    { value: 'demo', label: withCount(translate('accounts.demoAccounts'), 'demo') },
  ];
  const visibleAccounts = accounts?.filter((account) => filter === 'all' || account.type === filter);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section
        aria-label={translate('nav.accounts')}
        className="glass glass-strong relative isolate flex animate-rise flex-col gap-5 overflow-hidden rounded-[28px] p-5 motion-reduce:animate-none sm:p-6"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 -z-10 size-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-fg-muted">{translate('accounts.subtitle')}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" leftIcon="refresh" loading={Boolean(accounts) && isFetching} onClick={refetch}>
              {translate('home.refresh')}
            </Button>
            <LinkButton href="/accounts/new" size="sm" leftIcon="plus">
              {translate('accounts.createNew')}
            </LinkButton>
          </div>
        </div>
        {accounts ? <AccountsOverview accounts={accounts} /> : <Skeleton className="h-[104px] w-full rounded-2xl" />}
      </section>

      <Tabs items={filterItems} value={filter} onChange={setFilter} ariaLabel={translate('accounts.filterLabel')} className="self-start" />

      {!visibleAccounts ? (
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[380px] w-full rounded-[24px]" />
          ))}
        </div>
      ) : visibleAccounts.length === 0 ? (
        <div className="glass rounded-[28px] p-6">
          <EmptyState title={translate('accounts.emptyTitle')} description={translate('accounts.emptyText')} />
        </div>
      ) : (
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visibleAccounts.map((account, index) => (
            <AccountCard key={account.id} account={account} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
