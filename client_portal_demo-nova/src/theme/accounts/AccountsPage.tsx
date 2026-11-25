'use client';

import Link from 'next/link';
import { useEffect, useState, type PointerEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useAccounts } from '@/core/pages/useAccounts';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { AccountActionsMenu, AccountPasswordModal, LeverageModal, NicknameModal, type AccountAction } from './AccountActions';
import { LinkButton } from '../ui/Button';
import { Badge, EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { CountUpMoney } from '../dashboard/finflowParts';
import { FrostCard, frostButton } from '../dashboard/FrostCard';

type AccountFilter = 'all' | TradingAccount['type'];

const CARD_STAGGER_MS = 70;
const PNL_SCALE_PERCENT = 20;
const PNL_MIN_PERCENT = -PNL_SCALE_PERCENT;
const ARC_RADIUS = 46;
const ARC_CX = 60;
const ARC_CY = 56;
const ARC_TICKS = [-20, -10, 10, 20];
const DONUT_GAP = 1.6;

const frostInk = 'text-[#0a1220]';
const frostMuted = 'text-[#4b5a70]';

function floatingPnl(account: TradingAccount): number {
  return account.equity - account.balance;
}

// A soft white light follows the pointer across a card.
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

// Point on the gauge's half circle: 0% sits at the top, +PNL_SCALE_PERCENT at the right end, the negative scale at the left.
function arcPoint(percent: number, radius = ARC_RADIUS) {
  const angle = ((90 - (percent / PNL_SCALE_PERCENT) * 90) * Math.PI) / 180;
  return { x: ARC_CX + radius * Math.cos(angle), y: ARC_CY - radius * Math.sin(angle) };
}

/**
 * Floating P&L as a share of balance on a diverging half gauge: the arc grows from the top centre, right in green
 * for profit and left in red for loss, and a move of PNL_SCALE_PERCENT or more reaches the end.
 */
function PnlArc({ pnl, percent }: { pnl: number; percent: number }) {
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  const clampedPercent = Math.min(Math.max(percent, PNL_MIN_PERCENT), PNL_SCALE_PERCENT);
  const sign = isProfit ? '+' : isLoss ? '-' : '';
  const percentText = `${sign}${Math.abs(percent).toFixed(1)}%`;
  const label = translate(isProfit ? 'accounts.profit' : isLoss ? 'accounts.loss' : 'home.pnl');
  const tone = isProfit ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--border-strong)';
  const top = arcPoint(0);
  const tip = arcPoint(clampedPercent);
  const track = `M${ARC_CX - ARC_RADIUS},${ARC_CY} A${ARC_RADIUS},${ARC_RADIUS} 0 0 1 ${ARC_CX + ARC_RADIUS},${ARC_CY}`;
  const valuePath = `M${top.x},${top.y} A${ARC_RADIUS},${ARC_RADIUS} 0 0 ${isLoss ? 0 : 1} ${tip.x},${tip.y}`;

  return (
    <div
      role="meter"
      aria-label={translate('home.pnl')}
      aria-valuemin={PNL_MIN_PERCENT}
      aria-valuemax={PNL_SCALE_PERCENT}
      aria-valuenow={clampedPercent}
      aria-valuetext={`${label} ${percentText}`}
      className="relative w-[136px] shrink-0"
    >
      <svg viewBox="0 0 120 64" aria-hidden="true" className="block w-full overflow-visible">
        <path d={track} fill="none" strokeWidth="7" strokeLinecap="round" style={{ stroke: 'var(--border)' }} />
        {ARC_TICKS.map((tick) => {
          const point = arcPoint(tick, ARC_RADIUS + 9);
          return <circle key={tick} cx={point.x} cy={point.y} r="1.2" style={{ fill: 'var(--border-strong)' }} />;
        })}
        <line x1={ARC_CX} x2={ARC_CX} y1={ARC_CY - ARC_RADIUS - 11} y2={ARC_CY - ARC_RADIUS - 6} strokeWidth="1.5" strokeLinecap="round" style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.5 }} />
        {clampedPercent !== 0 && <path d={valuePath} fill="none" strokeWidth="7" strokeLinecap="round" pathLength={1} className="nova-draw" style={{ stroke: tone }} />}
        {clampedPercent !== 0 && (
          <circle
            cx={tip.x}
            cy={tip.y}
            r="6"
            className="animate-ping motion-reduce:hidden"
            style={{ fill: tone, fillOpacity: 0.35, transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )}
        <circle cx={tip.x} cy={tip.y} r="5" strokeWidth="2.5" className="nova-fade" style={{ fill: 'var(--bg-surface)', stroke: tone }} />
      </svg>
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-center leading-none">
        <span className={cx('text-[15px] font-semibold tabular-nums', isProfit ? 'text-success' : isLoss ? 'text-danger' : 'text-fg-muted')}>{percentText}</span>
        <span className="mt-1 text-[9px] tracking-[0.12em] text-fg-subtle uppercase">{label}</span>
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
      className="group/card relative isolate animate-rise overflow-hidden rounded-[26px] p-px transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-pop motion-reduce:animate-none motion-reduce:transition-none"
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

      <div onPointerMove={trackSpot} className="nova-edge-light relative isolate flex h-full flex-col gap-5 overflow-hidden rounded-[25px] bg-surface p-5">
        <span aria-hidden="true" className="pointer-events-none absolute -inset-px -z-10">
          <span
            className={cx(
              'absolute -top-24 -right-20 size-60 animate-drift rounded-full blur-3xl motion-reduce:animate-none',
              isLive ? 'bg-(--orbit-violet)/15' : 'bg-fg/5',
            )}
          />
          <span
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
            style={{ background: 'radial-gradient(240px circle at var(--sx, 50%) var(--sy, 0%), rgb(255 255 255 / 0.07), transparent 70%)' }}
          />
          <span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100">
            <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
          </span>
        </span>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-surface-2/60 px-2 py-1 font-mono text-[11px] font-semibold tracking-wider text-fg">{account.platform}</span>
          <Badge tone={isLive ? 'primary' : 'neutral'} dot>
            {translate(isLive ? 'accounts.live' : 'accounts.demo')}
          </Badge>
          <Link
            href="/settings"
            aria-label={translate('home.accountSettings')}
            title={translate('home.accountSettings')}
            className="nova-gloss ml-auto grid size-9 shrink-0 place-items-center rounded-full text-fg-muted transition-[color,transform] duration-300 hover:rotate-45 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Icon name="settings" size={15} />
          </Link>
        </div>

        <div className="flex items-end justify-between gap-3">
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
          <PnlArc pnl={pnl} percent={pnlPercent} />
        </div>

        <div className="rounded-2xl bg-linear-to-br from-(--orbit-violet)/[0.10] to-transparent p-4 ring-1 ring-line">
          <p className="text-xs text-fg-muted">{translate('accounts.equity')}</p>
          <p className="mt-1 truncate text-3xl font-light tracking-[-0.02em] text-fg tabular-nums">
            <CountUpMoney value={account.equity} currency={account.currency} />
          </p>
          <div className="mt-2">
            <PnlPill pnl={pnl} percent={pnlPercent} currency={account.currency} />
          </div>
        </div>

        <dl className="flex flex-col gap-2.5 px-1">
          {stats.map((stat, statIndex) => (
            <div
              key={stat.label}
              className="flex animate-rise items-baseline gap-2 motion-reduce:animate-none"
              style={{ animationDelay: `${index * CARD_STAGGER_MS + 200 + statIndex * 80}ms` }}
            >
              <dt className="shrink-0 text-[10px] tracking-[0.1em] text-fg-subtle uppercase">{stat.label}</dt>
              <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-line-strong" />
              <dd className="shrink-0 text-sm font-semibold text-fg tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className={cx('mt-auto grid gap-2', isLive ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]')}>
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

      {action === 'leverage' && <LeverageModal account={account} current={leverage} onClose={closeAction} onSaved={setLeverage} />}
      {action === 'nickname' && <NicknameModal account={account} current={nickname} onClose={closeAction} onSaved={setNickname} />}
      {action === 'masterPassword' && <AccountPasswordModal account={account} kind="master" onClose={closeAction} />}
      {action === 'investorPassword' && <AccountPasswordModal account={account} kind="investor" onClose={closeAction} />}
    </li>
  );
}

/**
 * Each live account's slice of live equity as a donut that draws itself in; shades step down so neighbouring
 * slices stay distinguishable. Hovering or focusing a legend row lifts its slice and shows its share in the centre.
 */
function EquityDonut({ live, currency }: { live: TradingAccount[]; currency: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = live.reduce((sum, account) => sum + account.equity, 0);
  let start = 0;
  const slices =
    total > 0
      ? [...live]
          .sort((a, b) => b.equity - a.equity)
          .map((account, index) => {
            const share = (account.equity / total) * 100;
            const slice = { account, share, start, shade: Math.max(1 - index * 0.3, 0.3) };
            start += share;
            return slice;
          })
      : [];
  const gap = slices.length > 1 ? DONUT_GAP : 0;
  const active = slices.find((slice) => slice.account.id === activeId);

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[184px_minmax(0,1fr)]">
      <div role="img" aria-label={translate('accounts.liveEquity')} className="relative mx-auto size-[168px]">
        <span aria-hidden="true" className="absolute -inset-2 rounded-full border border-dashed border-line" />
        <span aria-hidden="true" className="absolute -inset-2 animate-orbit-spin motion-reduce:animate-none" style={{ animationDuration: '9s' }}>
          <span className="absolute top-1/2 -left-1 size-2 rounded-full bg-primary" />
        </span>
        <svg viewBox="0 0 36 36" aria-hidden="true" className="size-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.4" style={{ stroke: 'var(--border)' }} />
          {slices.map(({ account, share, start: offset, shade }) => {
            const isActive = active?.account.id === account.id;
            const length = Math.max(share - gap, 0.5);
            return (
              <circle
                key={account.id}
                cx="18"
                cy="18"
                r="15"
                fill="none"
                pathLength={100}
                strokeWidth={isActive ? 4.6 : 3.4}
                strokeDasharray={drawn ? `${length} ${100 - length}` : '0 100'}
                strokeDashoffset={-offset}
                style={{
                  stroke: 'var(--orbit-violet)',
                  opacity: active && !isActive ? 0.22 : shade,
                  transition: 'stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1), opacity 250ms, stroke-width 250ms',
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div key={active?.account.id ?? 'all'} className="animate-rise motion-reduce:animate-none">
            {active ? (
              <>
                <p className="text-2xl font-semibold text-fg tabular-nums">{active.share.toFixed(1)}%</p>
                <p className="mt-1 font-mono text-[11px] text-fg-muted">#{active.account.login}</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-semibold text-fg tabular-nums">{live.length}</p>
                <p className="mt-1 text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('accounts.liveAccounts')}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <ul className="flex min-w-0 flex-col gap-1">
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
                  'w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isActive ? 'bg-hover' : 'hover:bg-hover',
                )}
              >
                <span className="flex items-center gap-2 text-xs">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-(--orbit-violet)" style={{ opacity: shade }} />
                  <span className="font-mono text-fg">#{account.login}</span>
                  <span className="ml-auto text-fg-muted tabular-nums">{formatMoney(account.equity, currency)}</span>
                  <span className="w-12 text-right text-fg-subtle tabular-nums">{share.toFixed(1)}%</span>
                </span>
                <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-(--orbit-violet) transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                    style={{ width: drawn ? `${share}%` : '0%', opacity: shade }}
                  />
                </span>
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
    <section aria-label={translate('nav.accounts')} className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <FrostCard className="h-full [&>div]:flex [&>div]:h-full [&>div]:flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cx('text-sm font-semibold', frostInk)}>{translate('nav.accounts')}</p>
            <p className={cx('mt-1 max-w-[230px] text-xs', frostMuted)}>{translate('accounts.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            aria-busy={isFetching}
            aria-label={translate('home.refresh')}
            title={translate('home.refresh')}
            className={cx(frostButton, 'shrink-0 disabled:cursor-wait')}
          >
            <Icon name="refresh" size={16} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
          </button>
        </div>

        <p className={cx('mt-7 text-[11px] font-medium tracking-[0.14em] uppercase', frostMuted)}>{translate('accounts.liveEquity')}</p>
        {accounts ? (
          <p className={cx('mt-1 truncate text-[40px] leading-tight font-bold tracking-tight tabular-nums', frostInk)}>
            <CountUpMoney value={sum((account) => account.equity)} currency={currency} />
          </p>
        ) : (
          <span className="mt-2 block h-10 w-48 animate-pulse rounded-xl bg-white/60" />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={cx('text-xs', frostMuted)}>{translate('accounts.accountsCount')}</span>
          <span className={cx('rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold tabular-nums ring-1 ring-white', frostInk)}>
            {accounts?.length ?? '—'}
            {accounts && (
              <span className={cx('ml-1.5 font-normal', frostMuted)}>{translate('accounts.liveDemoSplit', { live: live.length, demo: demoCount })}</span>
            )}
          </span>
        </div>

        <div aria-hidden="true" className="min-h-6 flex-1" />

        <Link
          href="/accounts/new"
          className="group/cta relative isolate inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0a1220] text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgb(10_18_32/0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="wallet-sheen absolute inset-0 -z-10 animate-sheen motion-reduce:animate-none" />
          <span className="grid size-6 place-items-center rounded-full bg-white/15 transition-transform duration-300 group-hover/cta:rotate-90 motion-reduce:transition-none">
            <Icon name="plus" size={14} />
          </span>
          {translate('accounts.createNew')}
        </Link>
      </FrostCard>

      <div className="orbit-card nova-edge-light relative isolate flex animate-rise flex-col gap-6 overflow-hidden p-5 [animation-delay:90ms] motion-reduce:animate-none sm:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-16 -z-10 size-72 animate-drift rounded-full bg-(--orbit-violet)/10 blur-3xl motion-reduce:animate-none" />

        {accounts ? (
          <>
            <EquityDonut live={live} currency={currency} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/50 px-4 py-3.5 ring-1 ring-line">
                <span className="flex items-center gap-2.5 text-sm text-fg-muted">
                  <span aria-hidden="true" className="nova-gloss grid size-8 place-items-center rounded-full">
                    <Icon name="trendUp" size={14} />
                  </span>
                  {translate('accounts.floatingPnl')}
                </span>
                <PnlPill pnl={sum(floatingPnl)} currency={currency} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/50 px-4 py-3.5 ring-1 ring-line">
                <span className="flex items-center gap-2.5 text-sm text-fg-muted">
                  <span aria-hidden="true" className="nova-gloss grid size-8 place-items-center rounded-full">
                    <Icon name="deposit" size={14} />
                  </span>
                  {translate('accounts.totalFreeMargin')}
                </span>
                <span className="text-base font-semibold text-fg tabular-nums">{formatMoney(sum((account) => account.freeMargin), currency)}</span>
              </div>
            </div>
          </>
        ) : (
          <Skeleton className="h-[240px] w-full rounded-2xl" />
        )}
      </div>
    </section>
  );
}

interface FilterOption {
  value: AccountFilter;
  label: string;
  count?: number;
}

function FilterRail({ items, value, onChange }: { items: FilterOption[]; value: AccountFilter; onChange: (value: AccountFilter) => void }) {
  const activeIndex = Math.max(
    items.findIndex((item) => item.value === value),
    0,
  );

  return (
    <div role="tablist" aria-label={translate('accounts.filterLabel')} className="relative grid w-full grid-cols-3 rounded-full border border-line bg-surface/70 p-1 sm:w-[460px]">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] overflow-hidden rounded-full bg-primary transition-transform duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)] motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      >
        <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
      </span>
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
              'relative z-10 flex h-9 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-xs font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm',
              isActive ? 'text-on-primary' : 'text-fg-muted hover:text-fg',
            )}
          >
            <span className="truncate">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cx(
                  'grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] tabular-nums transition-colors duration-300',
                  isActive ? 'bg-black/15' : 'bg-surface-2 text-fg-subtle',
                )}
              >
                {item.count}
              </span>
            )}
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
    <div className="flex flex-col gap-5 sm:gap-6">
      <AccountsHero accounts={accounts} isFetching={Boolean(accounts) && isFetching} onRefresh={() => void refetch()} />

      <FilterRail items={filterItems} value={filter} onChange={setFilter} />

      {!visibleAccounts ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3" aria-busy="true" aria-label={translate('common.loading')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[440px] w-full rounded-[26px]" />
          ))}
        </div>
      ) : visibleAccounts.length === 0 ? (
        <div className="glass rounded-[28px] p-6">
          <EmptyState title={translate('accounts.emptyTitle')} description={translate('accounts.emptyText')} />
        </div>
      ) : (
        <ul key={filter} className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visibleAccounts.map((account, index) => (
            <AccountCard key={account.id} account={account} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
