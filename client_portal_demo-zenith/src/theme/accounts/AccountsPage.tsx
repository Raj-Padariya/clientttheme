'use client';

import Link from 'next/link';
import { useEffect, useState, type PointerEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useAccounts } from '@/core/pages/useAccounts';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { AccountActionsMenu, AccountPasswordModal, LeverageModal, NicknameModal, type AccountAction } from './AccountActions';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { CountUpMoney } from '../dashboard/finflowParts';
import { boardCard, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { WaveButton } from '../dashboard/ZenithDesk';

/*
 * Zenith accounts: an open equity header (no card) beside a capsule track that splits live equity per account,
 * a chip filter, then one wide ledger row per account — identity and equity on top, a dark inset strip of
 * balance / credit / free margin / P&L track underneath.
 */

type AccountFilter = 'all' | TradingAccount['type'];

const ROW_STAGGER_MS = 80;
const PNL_SCALE_PERCENT = 20;
const PNL_MIN_PERCENT = -PNL_SCALE_PERCENT;

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function floatingPnl(account: TradingAccount): number {
  return account.equity - account.balance;
}

// A soft white light follows the pointer across a row.
function trackSpot(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--sx', `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty('--sy', `${event.clientY - box.top}px`);
}

function PnlPill({ pnl, percent, currency }: { pnl: number; percent?: number; currency: string }) {
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  const sign = isProfit ? '+' : isLoss ? '-' : '';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ring-1',
        isProfit && 'bg-success/10 text-success ring-success/25',
        isLoss && 'bg-(--zenith-red)/10 text-(--zenith-red) ring-(--zenith-red)/25',
        !isProfit && !isLoss && 'bg-fg/[0.05] text-fg-muted ring-fg/10',
      )}
    >
      {(isProfit || isLoss) && <Icon name={isProfit ? 'trendUp' : 'trendDown'} size={12} />}
      {sign}
      {formatMoney(Math.abs(pnl), currency)}
      {percent !== undefined && <span className="opacity-75">({`${sign}${Math.abs(percent).toFixed(2)}%`})</span>}
    </span>
  );
}

/**
 * Floating P&L as a share of balance on a diverging track: zero sits in the middle, profit grows right in green,
 * loss grows left in red, and a move of PNL_SCALE_PERCENT or more reaches the end.
 */
function PnlTrack({ pnl, percent }: { pnl: number; percent: number }) {
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  const clampedPercent = Math.min(Math.max(percent, PNL_MIN_PERCENT), PNL_SCALE_PERCENT);
  const reach = (Math.abs(clampedPercent) / PNL_SCALE_PERCENT) * 50;
  const sign = isProfit ? '+' : isLoss ? '-' : '';
  const percentText = `${sign}${Math.abs(percent).toFixed(1)}%`;
  const label = translate(isProfit ? 'accounts.profit' : isLoss ? 'accounts.loss' : 'home.pnl');
  const tone = isProfit ? 'var(--success)' : isLoss ? 'var(--zenith-red)' : 'var(--color-fg-muted)';
  const tipLeft = isLoss ? 50 - reach : 50 + reach;

  return (
    <div
      role="meter"
      aria-label={translate('home.pnl')}
      aria-valuemin={PNL_MIN_PERCENT}
      aria-valuemax={PNL_SCALE_PERCENT}
      aria-valuenow={clampedPercent}
      aria-valuetext={`${label} ${percentText}`}
      className="min-w-0"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: tone }}>
          {percentText}
        </span>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-2 rounded-full bg-fg/[0.07]">
        {[0, 25, 75, 100].map((tick) => (
          <span key={tick} className="absolute top-1/2 h-1 w-px -translate-y-1/2 bg-fg/20" style={{ left: `${tick}%` }} />
        ))}
        <span className="absolute top-1/2 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-fg/40" />
        {reach > 0 && (
          <span
            className={cx('absolute top-0 h-full animate-grow rounded-full motion-reduce:animate-none', isLoss ? 'origin-right' : 'origin-left')}
            style={{ left: `${isLoss ? 50 - reach : 50}%`, width: `${reach}%`, background: tone, boxShadow: `0 0 10px -2px ${tone}` }}
          />
        )}
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-[3px] transition-[left] duration-700"
          style={{ left: `${tipLeft}%`, ['--tw-ring-color' as string]: tone }}
        />
      </div>
      <div aria-hidden="true" className="mt-2 flex justify-between text-[9px] text-fg-subtle tabular-nums">
        <span>-{PNL_SCALE_PERCENT}%</span>
        <span>0</span>
        <span>+{PNL_SCALE_PERCENT}%</span>
      </div>
    </div>
  );
}

function AccountRow({ account, index }: { account: TradingAccount; index: number }) {
  const isLive = account.type === 'live';
  const pnl = floatingPnl(account);
  const pnlPercent = account.balance > 0 ? (pnl / account.balance) * 100 : 0;
  // Demo has no account API, so leverage and nickname changes live on the row until the page reloads.
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
    <li className="zenith-tile" style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}>
      <article
        onPointerMove={trackSpot}
        aria-label={`${translate('accounts.number')} #${account.login}`}
        className={cx(
          boardCard,
          'group/row relative isolate flex flex-col gap-5 overflow-hidden p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 motion-reduce:transition-none sm:p-6',
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/row:opacity-100"
          style={{ background: 'radial-gradient(320px circle at var(--sx, 50%) var(--sy, 0%), rgb(255 255 255 / 0.06), transparent 70%)' }}
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
          <div className="flex min-w-0 flex-1 basis-[260px] items-center gap-4">
            <span
              className={cx(
                'relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl font-mono text-xs font-bold tracking-wider',
                isLive ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.08] text-fg ring-1 ring-fg/10',
              )}
            >
              {isLive && (
                <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift absolute inset-y-0 left-0 h-full w-[200%] opacity-50">
                  {WAVE_PATHS.map((path) => (
                    <path key={path} d={path} fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              )}
              <span className="relative">{account.platform}</span>
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-mono text-xl font-semibold tracking-tight text-fg">#{account.login}</p>
                <span
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase ring-1',
                    isLive ? 'text-(--hero-buy) ring-(--hero-buy)/35' : 'text-fg-muted ring-fg/15',
                  )}
                >
                  <span aria-hidden="true" className="relative flex size-1.5">
                    {isLive && <span className="absolute inset-0 animate-ping rounded-full bg-(--hero-buy) motion-reduce:hidden" />}
                    <span className={cx('relative size-1.5 rounded-full', isLive ? 'bg-(--hero-buy)' : 'bg-fg-muted')} />
                  </span>
                  {translate(isLive ? 'accounts.live' : 'accounts.demo')}
                </span>
              </div>
              <p className="sr-only">{translate('accounts.number')}</p>
              {nickname && (
                <p key={nickname} className="mt-1 inline-flex max-w-full animate-rise items-center gap-1 truncate text-xs font-medium text-(--hero-buy) motion-reduce:animate-none">
                  <Icon name="user" size={11} className="shrink-0" />
                  <span className="truncate">{nickname}</span>
                </p>
              )}
              <p className="mt-1 truncate text-xs text-fg-muted">
                {account.group} · <span key={leverage} className="inline-block animate-rise motion-reduce:animate-none">1:{leverage}</span>
              </p>
            </div>
          </div>

          <div className="min-w-0 basis-[200px]">
            <p className="text-xs text-fg-muted">{translate('accounts.equity')}</p>
            <p className="mt-1 truncate text-3xl leading-none font-light tracking-[-0.03em] text-fg tabular-nums">
              <CountUpMoney value={account.equity} currency={account.currency} />
            </p>
            <div className="mt-2.5">
              <PnlPill pnl={pnl} percent={pnlPercent} currency={account.currency} />
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            {isLive && (
              <Link
                href="/deposit"
                className={cx(
                  'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-fg ring-1 ring-fg/15 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-fg/[0.06] motion-reduce:transition-none sm:flex-none',
                  focusRing,
                )}
              >
                <Icon name="deposit" size={14} />
                {translate('home.addBalance')}
              </Link>
            )}
            <WaveButton href="/platforms" icon="monitor" label={translate('home.trade')} className="h-11 flex-1 px-5 text-xs sm:flex-none" />
            <AccountActionsMenu onSelect={setAction} />
            <Link
              href="/settings"
              aria-label={translate('home.accountSettings')}
              title={translate('home.accountSettings')}
              className={cx(
                'grid size-11 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-fg/10 transition-[color,transform,background-color] duration-300 hover:rotate-45 hover:bg-fg/[0.06] hover:text-fg motion-reduce:transition-none',
                focusRing,
              )}
            >
              <Icon name="settings" size={16} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-fg/[0.07] ring-1 ring-fg/[0.07] md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.6fr)]">
          {stats.map((stat) => (
            <dl key={stat.label} className="min-w-0 bg-app/70 px-3 py-3.5 sm:px-4">
              <dt className="truncate text-[10px] tracking-[0.1em] text-fg-subtle uppercase">{stat.label}</dt>
              <dd className="mt-1.5 truncate text-sm font-semibold text-fg tabular-nums sm:text-base">{stat.value}</dd>
            </dl>
          ))}
          <div className="col-span-3 bg-app/70 px-4 py-3.5 md:col-span-1">
            <PnlTrack pnl={pnl} percent={pnlPercent} />
          </div>
        </div>
      </article>

      {action === 'leverage' && <LeverageModal account={account} current={leverage} onClose={closeAction} onSaved={setLeverage} />}
      {action === 'nickname' && <NicknameModal account={account} current={nickname} onClose={closeAction} onSaved={setNickname} />}
      {action === 'masterPassword' && <AccountPasswordModal account={account} kind="master" onClose={closeAction} />}
      {action === 'investorPassword' && <AccountPasswordModal account={account} kind="investor" onClose={closeAction} />}
    </li>
  );
}

/**
 * Each live account's slice of live equity as one capsule split into segments that grow in; shades step down so
 * neighbouring segments stay distinguishable. Hovering or focusing a segment's legend row lifts it and shows its share.
 */
function EquityCapsule({ live, currency }: { live: TradingAccount[]; currency: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = live.reduce((sum, account) => sum + account.equity, 0);
  const slices =
    total > 0
      ? [...live]
          .sort((a, b) => b.equity - a.equity)
          .map((account, index) => ({ account, share: (account.equity / total) * 100, shade: Math.max(1 - index * 0.28, 0.3) }))
      : [];
  const active = slices.find((slice) => slice.account.id === activeId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div key={active?.account.id ?? 'all'} className="min-w-0 animate-rise motion-reduce:animate-none">
          {active ? (
            <>
              <p className="text-3xl leading-none font-semibold text-fg tabular-nums">{active.share.toFixed(1)}%</p>
              <p className="mt-1.5 font-mono text-[11px] text-fg-muted">#{active.account.login}</p>
            </>
          ) : (
            <>
              <p className="text-3xl leading-none font-semibold text-fg tabular-nums">{live.length}</p>
              <p className="mt-1.5 text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('accounts.liveAccounts')}</p>
            </>
          )}
        </div>
        <p className="text-right text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('accounts.liveEquity')}</p>
      </div>

      <div role="img" aria-label={translate('accounts.liveEquity')} className="flex h-16 gap-1.5">
        {slices.length === 0 ? (
          <span className="flex-1 rounded-full bg-fg/[0.06] ring-1 ring-fg/10" />
        ) : (
          slices.map(({ account, share, shade }) => {
            const isActive = active?.account.id === account.id;
            return (
              <span
                key={account.id}
                className="relative min-w-3 overflow-hidden rounded-full transition-[flex-grow,opacity,transform] duration-1000 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
                style={{
                  flex: `${drawn ? share : 0.001} 1 0%`,
                  background: 'var(--hero-buy)',
                  opacity: active && !isActive ? 0.25 : shade,
                  transform: isActive ? 'scaleY(1.08)' : undefined,
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift absolute inset-y-0 left-0 h-full w-[200%] opacity-60">
                  {WAVE_PATHS.map((path) => (
                    <path key={path} d={path} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              </span>
            );
          })
        )}
      </div>

      <ul className="flex min-w-0 flex-col">
        {slices.map(({ account, share, shade }) => {
          const isActive = active?.account.id === account.id;
          return (
            <li key={account.id}>
              <button
                type="button"
                aria-pressed={isActive}
                onPointerEnter={() => setActiveId(account.id)}
                onPointerLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(account.id)}
                onBlur={() => setActiveId(null)}
                className={cx(
                  'flex w-full items-center gap-2.5 border-t border-fg/[0.07] px-1 py-2.5 text-left text-xs transition-colors duration-200',
                  focusRing,
                  isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                <span aria-hidden="true" className="h-2 w-5 shrink-0 rounded-full bg-(--hero-buy)" style={{ opacity: shade }} />
                <span className="font-mono text-fg">#{account.login}</span>
                <span className="ml-auto tabular-nums">{formatMoney(account.equity, currency)}</span>
                <span className="w-12 text-right text-fg-subtle tabular-nums">{share.toFixed(1)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface AccountsHeroProps {
  accounts?: TradingAccount[];
  isFetching: boolean;
  onRefresh: () => void;
}

// Totals cover live accounts only (demo money is not real) and assume they share one currency, as the dashboard does.
function AccountsHero({ accounts, isFetching, onRefresh }: AccountsHeroProps) {
  const live = accounts?.filter((account) => account.type === 'live') ?? [];
  const currency = live[0]?.currency ?? accounts?.[0]?.currency ?? 'USD';
  const sum = (pick: (account: TradingAccount) => number) => live.reduce((total, account) => total + pick(account), 0);
  const demoCount = (accounts?.length ?? 0) - live.length;

  return (
    <section aria-labelledby="zenith-accounts-title" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch">
      <div className="flex min-w-0 flex-col py-1">
        <div className="flex items-center justify-between gap-3">
          <h2 id="zenith-accounts-title" className="text-sm font-semibold text-fg">
            {translate('nav.accounts')}
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            aria-busy={isFetching}
            aria-label={translate('home.refresh')}
            title={translate('home.refresh')}
            className={cx(
              'grid size-10 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-fg/10 transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:cursor-wait',
              focusRing,
            )}
          >
            <Icon name="refresh" size={16} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
          </button>
        </div>
        <p className="mt-1 max-w-[42ch] text-xs text-fg-muted">{translate('accounts.subtitle')}</p>

        <p className="mt-8 text-xs text-fg-muted">{translate('accounts.liveEquity')}</p>
        {accounts ? (
          <p className="mt-2 truncate text-5xl leading-none font-light tracking-[-0.04em] text-fg tabular-nums sm:text-6xl">
            <CountUpMoney value={sum((account) => account.equity)} currency={currency} centsClassName="text-fg-subtle" />
          </p>
        ) : (
          <Skeleton className="mt-2 h-14 w-64 rounded-xl" />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-fg-muted">{translate('accounts.accountsCount')}</span>
          <span className="rounded-full bg-fg/[0.06] px-2.5 py-1 font-semibold text-fg tabular-nums ring-1 ring-fg/10">
            {accounts?.length ?? '—'}
            {accounts && <span className="ml-1.5 font-normal text-fg-muted">{translate('accounts.liveDemoSplit', { live: live.length, demo: demoCount })}</span>}
          </span>
        </div>

        {accounts && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-fg/[0.04] px-4 py-3 ring-1 ring-fg/[0.07]">
              <span className="flex items-center gap-2 text-xs text-fg-muted">
                <Icon name="trendUp" size={14} />
                {translate('accounts.floatingPnl')}
              </span>
              <PnlPill pnl={sum(floatingPnl)} currency={currency} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-fg/[0.04] px-4 py-3 ring-1 ring-fg/[0.07]">
              <span className="flex items-center gap-2 text-xs text-fg-muted">
                <Icon name="deposit" size={14} />
                {translate('accounts.totalFreeMargin')}
              </span>
              <span className="truncate text-sm font-semibold text-fg tabular-nums">{formatMoney(sum((account) => account.freeMargin), currency)}</span>
            </div>
          </div>
        )}

        <div aria-hidden="true" className="min-h-5 flex-1" />
        <WaveButton href="/accounts/new" icon="plus" label={translate('accounts.createNew')} className="w-full sm:w-72" />
      </div>

      <div className={cx(boardCard, 'zenith-tile min-w-0 p-5 sm:p-6')} style={{ animationDelay: '120ms' }}>
        {accounts ? <EquityCapsule live={live} currency={currency} /> : <Skeleton className="h-[220px] w-full rounded-2xl" />}
      </div>
    </section>
  );
}

interface FilterOption {
  value: AccountFilter;
  label: string;
  count?: number;
}

function FilterChips({ items, value, onChange }: { items: FilterOption[]; value: AccountFilter; onChange: (value: AccountFilter) => void }) {
  return (
    <div role="tablist" aria-label={translate('accounts.filterLabel')} className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cx(
              'flex h-10 shrink-0 items-center gap-2 rounded-full pr-1.5 pl-4 text-xs font-semibold transition-[background-color,color] duration-300 sm:text-sm',
              focusRing,
              isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-fg/10 hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            {item.label}
            <span
              className={cx(
                'grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11px] tabular-nums',
                isActive ? 'bg-(--hero-buy) text-[#160904]' : 'bg-fg/[0.08] text-fg-muted',
              )}
            >
              {item.count ?? '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function AccountsPage() {
  const { data: accounts, isFetching, refetch } = useAccounts();
  const [filter, setFilter] = useState<AccountFilter>('all');

  const countOf = (type: AccountFilter) => accounts?.filter((account) => type === 'all' || account.type === type).length;
  const filterItems: FilterOption[] = [
    { value: 'all', label: translate('accounts.filterAll'), count: countOf('all') },
    { value: 'live', label: translate('accounts.liveAccounts'), count: countOf('live') },
    { value: 'demo', label: translate('accounts.demoAccounts'), count: countOf('demo') },
  ];
  const visibleAccounts = accounts?.filter((account) => filter === 'all' || account.type === filter);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <AccountsHero accounts={accounts} isFetching={Boolean(accounts) && isFetching} onRefresh={() => void refetch()} />

      <div className="flex flex-col gap-4">
        <FilterChips items={filterItems} value={filter} onChange={setFilter} />

        {!visibleAccounts ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label={translate('common.loading')}>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[200px] w-full rounded-[28px]" />
            ))}
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div className={cx(boardCard, 'p-6')}>
            <EmptyState title={translate('accounts.emptyTitle')} description={translate('accounts.emptyText')} />
          </div>
        ) : (
          <ul key={filter} className="grid gap-4 2xl:grid-cols-2">
            {visibleAccounts.map((account, index) => (
              <AccountRow key={account.id} account={account} index={index} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
