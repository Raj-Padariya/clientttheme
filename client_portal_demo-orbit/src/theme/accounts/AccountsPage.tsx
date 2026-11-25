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
      className="group/card relative isolate animate-rise overflow-hidden rounded-[26px] p-px transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-pop motion-reduce:animate-none motion-reduce:transition-none"
      style={{ animationDelay: `${index * CARD_STAGGER_MS}ms` }}
    >
      <span aria-hidden="true" className="absolute inset-0 -z-20 bg-line" />
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute inset-0 -z-10 animate-rim-spin transition-opacity duration-500 motion-reduce:animate-none',
          'bg-[conic-gradient(from_var(--wallet-rim),transparent_0%,var(--orbit-violet)_10%,transparent_24%,transparent_50%,color-mix(in_srgb,var(--orbit-violet)_55%,transparent)_62%,transparent_76%)]',
          isLive ? 'opacity-60 group-hover/card:opacity-100' : 'opacity-20 group-hover/card:opacity-70',
        )}
      />

      <div className="relative grid h-full overflow-hidden rounded-[25px] bg-surface md:grid-cols-[230px_minmax(0,1fr)]">
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute -top-28 -left-24 size-64 rounded-full blur-3xl transition-opacity duration-500 group-hover/card:opacity-100',
            isLive ? 'bg-(--orbit-violet)/20 opacity-60' : 'bg-fg/10 opacity-40',
          )}
        />

        <div className="relative flex flex-col gap-5 border-b border-dashed border-line bg-linear-to-b from-(--orbit-violet)/[0.08] to-transparent p-5 md:border-r md:border-b-0">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-line bg-surface-2/60 px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-fg">
              {account.platform}
            </span>
            <Badge tone={isLive ? 'primary' : 'neutral'} dot>
              {translate(isLive ? 'accounts.live' : 'accounts.demo')}
            </Badge>
          </div>

          <div className="min-w-0">
            <p className="text-[10.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('accounts.number')}</p>
            <p className="mt-1 truncate font-mono text-2xl font-semibold tracking-tight text-fg">#{account.login}</p>
            {nickname && (
              <p key={nickname} className="mt-1 inline-flex max-w-full animate-rise items-center gap-1 truncate text-xs font-medium text-primary motion-reduce:animate-none">
                <Icon name="user" size={11} className="shrink-0" />
                <span className="truncate">{nickname}</span>
              </p>
            )}
            <p className="mt-1 truncate text-xs text-fg-muted">
              {account.group} · <span key={leverage} className="inline-block animate-rise motion-reduce:animate-none">1:{leverage}</span>
            </p>
          </div>

          <div className="mt-auto">
            <PnlRing pnl={pnl} percent={pnlPercent} />
          </div>
        </div>

        <div className="relative flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">{translate('accounts.equity')}</p>
              <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums sm:text-4xl">
                {formatMoney(account.equity, account.currency)}
              </p>
              <div className="mt-2">
                <PnlPill pnl={pnl} percent={pnlPercent} currency={account.currency} />
              </div>
            </div>
            <Link
              href="/settings"
              aria-label={translate('home.accountSettings')}
              title={translate('home.accountSettings')}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Icon name="settings" size={15} />
            </Link>
          </div>

          <ul className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface-2/40">
            {stats.map((stat) => (
              <li key={stat.label} className="min-w-0 px-3 py-3">
                <p className="truncate text-[10px] tracking-[0.08em] text-fg-subtle uppercase">{stat.label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-fg tabular-nums">{stat.value}</p>
              </li>
            ))}
          </ul>

          <div className={cx('mt-5 grid gap-2 md:mt-auto md:pt-5', isLive ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]')}>
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
        </div>
      </div>

      {action === 'leverage' && <LeverageModal account={account} current={leverage} onClose={closeAction} onSaved={setLeverage} />}
      {action === 'nickname' && <NicknameModal account={account} current={nickname} onClose={closeAction} onSaved={setNickname} />}
      {action === 'masterPassword' && <AccountPasswordModal account={account} kind="master" onClose={closeAction} />}
      {action === 'investorPassword' && <AccountPasswordModal account={account} kind="investor" onClose={closeAction} />}
    </li>
  );
}

// Each live account's slice of live equity; shades step down so neighbouring slices stay distinguishable.
function EquitySplit({ live, currency }: { live: TradingAccount[]; currency: string }) {
  const total = live.reduce((sum, account) => sum + account.equity, 0);
  if (total <= 0) return null;
  const slices = [...live]
    .sort((a, b) => b.equity - a.equity)
    .map((account, index) => ({ account, share: (account.equity / total) * 100, shade: Math.max(1 - index * 0.3, 0.3) }));

  return (
    <div className="mt-6">
      <div role="img" aria-label={translate('accounts.liveEquity')} className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-surface-2">
        {slices.map(({ account, share, shade }) => (
          <span key={account.id} className="h-full rounded-full bg-(--orbit-violet)" style={{ width: `${share}%`, opacity: shade }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {slices.map(({ account, share, shade }) => (
          <li key={account.id} className="flex items-center gap-2 text-xs">
            <span aria-hidden="true" className="size-2 rounded-full bg-(--orbit-violet)" style={{ opacity: shade }} />
            <span className="font-mono text-fg">#{account.login}</span>
            <span className="text-fg-muted tabular-nums">{formatMoney(account.equity, currency)}</span>
            <span className="text-fg-subtle tabular-nums">{share.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Totals cover live accounts only (demo money is not real) and assume they share one currency, as the dashboard does.
function AccountsOverview({ accounts }: { accounts: TradingAccount[] }) {
  const live = accounts.filter((account) => account.type === 'live');
  const currency = live[0]?.currency ?? accounts[0]?.currency ?? 'USD';
  const sum = (pick: (account: TradingAccount) => number) => live.reduce((total, account) => total + pick(account), 0);
  const rowClass = 'flex items-center justify-between gap-4 py-3.5';

  return (
    <>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.14em] text-fg-subtle uppercase">{translate('accounts.liveEquity')}</p>
        <p className="mt-2 truncate text-4xl font-light tracking-[-0.03em] text-fg tabular-nums sm:text-5xl">
          {formatMoney(sum((account) => account.equity), currency)}
        </p>
        <EquitySplit live={live} currency={currency} />
      </div>

      <ul className="divide-y divide-line">
        <li className={rowClass}>
          <span className="text-sm text-fg-muted">{translate('accounts.floatingPnl')}</span>
          <PnlPill pnl={sum(floatingPnl)} currency={currency} />
        </li>
        <li className={rowClass}>
          <span className="text-sm text-fg-muted">{translate('accounts.totalFreeMargin')}</span>
          <span className="text-base font-semibold text-fg tabular-nums">{formatMoney(sum((account) => account.freeMargin), currency)}</span>
        </li>
        <li className={rowClass}>
          <span className="text-sm text-fg-muted">{translate('accounts.accountsCount')}</span>
          <span className="text-base font-semibold text-fg tabular-nums">
            {accounts.length}
            <span className="ml-2 text-xs font-normal text-fg-subtle">
              {translate('accounts.liveDemoSplit', { live: live.length, demo: accounts.length - live.length })}
            </span>
          </span>
        </li>
      </ul>
    </>
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
        className="glass glass-strong relative isolate animate-rise overflow-hidden rounded-[28px] motion-reduce:animate-none"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-24 -z-10 size-96 rounded-full bg-(--orbit-violet)/15 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-32 -z-10 size-72 rounded-full bg-(--orbit-violet)/10 blur-3xl" />
        <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-(--orbit-violet)/70 to-transparent" />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
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

        {accounts ? (
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
            <AccountsOverview accounts={accounts} />
          </div>
        ) : (
          <div className="p-5 sm:p-7">
            <Skeleton className="h-[140px] w-full rounded-2xl" />
          </div>
        )}
      </section>

      <Tabs items={filterItems} value={filter} onChange={setFilter} ariaLabel={translate('accounts.filterLabel')} className="self-start" />

      {!visibleAccounts ? (
        <div className="grid gap-5 2xl:grid-cols-2" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-[300px] w-full rounded-[26px]" />
          ))}
        </div>
      ) : visibleAccounts.length === 0 ? (
        <div className="glass rounded-[28px] p-6">
          <EmptyState title={translate('accounts.emptyTitle')} description={translate('accounts.emptyText')} />
        </div>
      ) : (
        <ul className="grid gap-5 2xl:grid-cols-2">
          {visibleAccounts.map((account, index) => (
            <AccountCard key={account.id} account={account} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
