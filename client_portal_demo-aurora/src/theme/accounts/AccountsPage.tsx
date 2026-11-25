'use client';

import Link from 'next/link';
import { useState, type KeyboardEvent } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useAccounts } from '@/core/pages/useAccounts';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { AccountActionsMenu, AccountPasswordModal, LeverageModal, NicknameModal, type AccountAction } from './AccountActions';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { CountUpMoney } from '../dashboard/finflowParts';
import { boardCard, headerIconButton, HOLDING_COLORS, WAVE_PATHS } from '../dashboard/ZenithBoard';
import { WaveButton } from '../dashboard/ZenithDesk';

/*
 * Aurora accounts as a 3D card deck: an open title row and one glass summary rail, then the accounts fanned out in
 * perspective — the picked card springs to the front with a flip, the rest tilt away behind it — with a thumbnail
 * rail underneath, and beside the deck a detail panel for the picked card (liquid free-margin flask, equity, stats,
 * P&L track, actions) that slides in whenever the pick changes.
 */

type AccountFilter = 'all' | TradingAccount['type'];

interface AccountEdits {
  leverage?: TradingAccount['leverage'];
  nickname?: string;
}

const PNL_SCALE_PERCENT = 20;
const PNL_MIN_PERCENT = -PNL_SCALE_PERCENT;
/** Cards further than this from the picked one are faded out of the fan. */
const DECK_VISIBLE_DEPTH = 3;
const WAVE_TOP = 'M0,6 Q25,0 50,6 T100,6 T150,6 T200,6 V12 H0 Z';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

function floatingPnl(account: TradingAccount): number {
  return account.equity - account.balance;
}

function freeMarginRatio(account: TradingAccount): number {
  return account.equity > 0 ? Math.min(100, Math.max(0, (account.freeMargin / account.equity) * 100)) : 0;
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
        {reach > 0 && (
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 animate-ping-soft rounded-full [animation-duration:2.4s] motion-reduce:hidden"
            style={{ left: `${tipLeft}%`, background: tone }}
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

function StatusBadge({ isLive, onCard }: { isLive: boolean; onCard?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase ring-1',
        isLive ? 'text-(--hero-buy) ring-(--hero-buy)/35' : 'text-fg-muted ring-fg/15',
        onCard && 'bg-app/40 backdrop-blur-sm',
      )}
    >
      <span aria-hidden="true" className="relative flex size-1.5">
        {isLive && <span className="absolute inset-0 animate-ping rounded-full bg-(--hero-buy) motion-reduce:hidden" />}
        <span className={cx('relative size-1.5 rounded-full', isLive ? 'bg-(--hero-buy)' : 'bg-fg-muted')} />
      </span>
      {translate(isLive ? 'accounts.live' : 'accounts.demo')}
    </span>
  );
}

/* ───────────── Title row + summary rail ───────────── */

interface SummaryProps {
  accounts?: TradingAccount[];
  isFetching: boolean;
  onRefresh: () => void;
}

// Totals cover live accounts only (demo money is not real) and assume they share one currency, as the dashboard does.
function AccountsSummary({ accounts, isFetching, onRefresh }: SummaryProps) {
  const live = accounts?.filter((account) => account.type === 'live') ?? [];
  const currency = live[0]?.currency ?? accounts?.[0]?.currency ?? 'USD';
  const sum = (pick: (account: TradingAccount) => number) => live.reduce((total, account) => total + pick(account), 0);
  const demoCount = (accounts?.length ?? 0) - live.length;
  const railCell = 'flex min-w-0 flex-col justify-center gap-1.5 px-5 py-3.5';

  return (
    <section aria-labelledby="aurora-accounts-title" className="zenith-tile flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="aurora-accounts-title" className="font-display text-3xl font-semibold tracking-[-0.02em] text-fg sm:text-4xl">
            {translate('nav.accounts')}
          </h2>
          <p className="mt-1.5 max-w-[52ch] text-sm text-fg-muted">{translate('accounts.subtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            aria-busy={isFetching}
            aria-label={translate('home.refresh')}
            title={translate('home.refresh')}
            className={cx(headerIconButton, 'disabled:cursor-wait')}
          >
            <Icon name="refresh" size={16} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
          </button>
          <WaveButton href="/accounts/new" icon="plus" label={translate('accounts.createNew')} className="h-11 px-5 text-xs" />
        </div>
      </div>

      <div className="aurora-chip grid overflow-hidden rounded-[26px] sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr] [&>*+*]:border-fg/[0.07] max-sm:[&>*+*]:border-t sm:[&>*:nth-child(even)]:border-l xl:[&>*+*]:border-l">
        <div className={railCell}>
          <span className="text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('accounts.liveEquity')}</span>
          {accounts ? (
            <span className="truncate text-2xl leading-none font-semibold tracking-[-0.03em] text-fg tabular-nums">
              <CountUpMoney value={sum((account) => account.equity)} currency={currency} centsClassName="text-fg-subtle" />
            </span>
          ) : (
            <Skeleton className="h-6 w-36 rounded-lg" />
          )}
        </div>
        <div className={railCell}>
          <span className="text-[10px] tracking-[0.12em] text-fg-subtle uppercase">{translate('accounts.accountsCount')}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-2xl leading-none font-semibold text-fg tabular-nums">{accounts?.length ?? '—'}</span>
            {accounts && <span className="truncate text-xs text-fg-muted">{translate('accounts.liveDemoSplit', { live: live.length, demo: demoCount })}</span>}
          </span>
        </div>
        <div className={railCell}>
          <span className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] text-fg-subtle uppercase">
            <Icon name="trendUp" size={12} />
            {translate('accounts.floatingPnl')}
          </span>
          {accounts ? (
            <span>
              <PnlPill pnl={sum(floatingPnl)} currency={currency} />
            </span>
          ) : (
            <Skeleton className="h-6 w-24 rounded-full" />
          )}
        </div>
        <div className={railCell}>
          <span className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] text-fg-subtle uppercase">
            <Icon name="deposit" size={12} />
            {translate('accounts.totalFreeMargin')}
          </span>
          <span className="truncate text-lg leading-none font-semibold text-fg tabular-nums">
            {accounts ? formatMoney(sum((account) => account.freeMargin), currency) : '—'}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Deck ───────────── */

interface DeckEntry {
  account: TradingAccount;
  color: string;
  /** Share of live equity; demo accounts have none. */
  share?: number;
  nickname?: string;
  leverage: TradingAccount['leverage'];
}

/** One account as a tinted glass card: platform + status, login, then equity and leverage along the bottom. */
function DeckCard({ entry, isFront }: { entry: DeckEntry; isFront: boolean }) {
  const { account, color, share, nickname, leverage } = entry;
  const isLive = account.type === 'live';
  return (
    <span
      className="relative flex size-full flex-col justify-between overflow-hidden rounded-[26px] p-5 text-left text-fg ring-1 ring-white/15 shadow-[0_30px_60px_-28px_rgb(0_0_0/0.55)]"
      style={{ background: `linear-gradient(140deg, color-mix(in oklab, ${color} 46%, var(--color-app)) 0%, color-mix(in oklab, ${color} 14%, var(--color-app)) 70%)` }}
    >
      <svg aria-hidden="true" viewBox="0 0 200 64" preserveAspectRatio="none" className="zenith-drift pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-[200%] opacity-40">
        {WAVE_PATHS.map((path) => (
          <path key={path} d={path} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full opacity-40 blur-2xl" style={{ background: color }} />
      {isFront && <span aria-hidden="true" className="aurora-deck-sheen pointer-events-none absolute inset-0" />}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/60 to-transparent" />

      <span className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-app/40 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider backdrop-blur-sm">{account.platform}</span>
          <StatusBadge isLive={isLive} onCard />
        </span>
        {share !== undefined && <span className="text-xs font-semibold tabular-nums">{share.toFixed(1)}%</span>}
      </span>

      <span className="relative min-w-0">
        <span className="block truncate font-mono text-2xl font-semibold tracking-tight sm:text-[26px]">#{account.login}</span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">{nickname || account.group}</span>
      </span>

      <span className="relative flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[10px] tracking-[0.12em] text-fg-muted uppercase">{translate('accounts.equity')}</span>
          <span className="mt-1 block truncate text-xl leading-none font-semibold tabular-nums">
            {isFront ? <CountUpMoney value={account.equity} currency={account.currency} /> : formatMoney(account.equity, account.currency)}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-app/40 px-2.5 py-1 text-[11px] font-semibold tabular-nums backdrop-blur-sm">1:{leverage}</span>
      </span>
    </span>
  );
}

function AccountDeck({ entries, picked, onPick }: { entries: DeckEntry[]; picked: number; onPick: (index: number) => void }) {
  const step = (delta: number) => onPick((picked + delta + entries.length) % entries.length);

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
    else return;
    event.preventDefault();
  }

  return (
    <section aria-label={translate('nav.accounts')} className="flex min-w-0 flex-col gap-5">
      <div onKeyDown={handleKey} className="relative h-[270px] overflow-x-clip [perspective:1400px] sm:h-[320px]">
        <span aria-hidden="true" className="aurora-ring-glow absolute inset-x-[18%] bottom-1 h-12 rounded-[50%] bg-(--aurora-ribbon-a)/30 blur-2xl" />
        {entries.map((entry, index) => {
          const offset = index - picked;
          const depth = Math.abs(offset);
          const isFront = offset === 0;
          const isHidden = depth > DECK_VISIBLE_DEPTH;
          return (
            <button
              key={entry.account.id}
              type="button"
              aria-pressed={isFront}
              aria-label={`${translate('accounts.number')} #${entry.account.login}`}
              tabIndex={isHidden ? -1 : 0}
              onClick={() => onPick(index)}
              className={cx(
                'absolute top-1/2 left-1/2 aspect-[1.6] w-[min(340px,74%)] rounded-[26px] transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(.34,1.45,.64,1)] [transform-style:preserve-3d] motion-reduce:transition-none',
                focusRing,
                !isFront && 'cursor-pointer',
              )}
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 24}%) translateZ(${-depth * 90}px) rotateY(${-offset * 18}deg) rotateZ(${offset * 2.5}deg)`,
                zIndex: 50 - depth,
                opacity: isHidden ? 0 : 1 - depth * 0.2,
                filter: isFront ? undefined : `saturate(0.75) brightness(${1 - depth * 0.08})`,
                pointerEvents: isHidden ? 'none' : undefined,
              }}
            >
              <span className={cx('block size-full', isFront && 'aurora-deck-float')}>
                <span key={isFront ? 'front' : 'back'} className={cx('block size-full', isFront && 'aurora-deck-flip')}>
                  <DeckCard entry={entry} isFront={isFront} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => step(-1)} aria-label={translate('history.prev')} title={translate('history.prev')} className={headerIconButton}>
          <Icon name="chevronDown" size={16} className="rotate-90" />
        </button>
        <div aria-hidden="true" className="flex items-center gap-1.5">
          {entries.map((entry, index) => (
            <span
              key={entry.account.id}
              className={cx('h-1.5 rounded-full transition-[width,background-color] duration-500', index === picked ? 'w-6' : 'w-1.5 bg-fg/20')}
              style={index === picked ? { background: entry.color } : undefined}
            />
          ))}
        </div>
        <span className="min-w-12 text-center text-xs text-fg-subtle tabular-nums">
          {picked + 1} / {entries.length}
        </span>
        <button type="button" onClick={() => step(1)} aria-label={translate('history.next')} title={translate('history.next')} className={headerIconButton}>
          <Icon name="chevronDown" size={16} className="-rotate-90" />
        </button>
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1">
        {entries.map((entry, index) => {
          const isPicked = index === picked;
          return (
            <li key={entry.account.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={isPicked}
                onClick={() => onPick(index)}
                className={cx(
                  'flex w-40 flex-col gap-2 rounded-2xl px-3 py-2.5 text-left text-xs ring-1 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
                  focusRing,
                  isPicked ? 'bg-fg/[0.07] text-fg ring-fg/20' : 'text-fg-muted ring-fg/[0.08] hover:bg-fg/[0.04]',
                )}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: entry.color, boxShadow: `0 0 0 4px color-mix(in srgb, ${entry.color} 20%, transparent)` }} />
                  <span className="truncate font-mono text-fg">#{entry.account.login}</span>
                  <span className="ml-auto shrink-0 text-fg-subtle tabular-nums">{entry.share !== undefined ? `${entry.share.toFixed(1)}%` : translate('accounts.demo')}</span>
                </span>
                <span aria-hidden="true" className="relative h-1 overflow-hidden rounded-full bg-fg/[0.08]">
                  <span className="aurora-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${entry.share ?? 0}%`, background: entry.color, animationDelay: `${200 + index * 120}ms` }} />
                </span>
              </button>
            </li>
          );
        })}
        <li className="shrink-0">
          <Link
            href="/accounts/new"
            className={cx(
              'group flex h-full w-40 items-center gap-2 rounded-2xl border border-dashed border-fg/15 px-3 py-2.5 text-xs font-semibold text-fg-muted transition-colors hover:border-(--aurora-ribbon-a)/50 hover:text-fg',
              focusRing,
            )}
          >
            <span className="aurora-pill grid size-7 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none">
              <Icon name="plus" size={14} />
            </span>
            <span className="truncate">{translate('accounts.createNew')}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

/* ───────────── Detail panel ───────────── */

/** Free margin as a share of equity, poured into a glass flask: liquid rises in, then sloshes; a bead laps the rim. */
function LiquidFlask({ account, color }: { account: TradingAccount; color: string }) {
  const ratio = freeMarginRatio(account);
  const label = `${ratio.toFixed(0)}% ${translate('accounts.freeMargin')}`;
  return (
    <div role="img" aria-label={label} title={label} className="relative size-36 shrink-0 sm:size-40">
      <span aria-hidden="true" className="absolute -inset-2 rounded-full border border-dashed border-fg/15 [animation:orbit-spin_6s_linear_infinite] motion-reduce:[animation:none]">
        <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full" style={{ background: color, boxShadow: `0 0 12px 2px ${color}` }} />
      </span>
      <div className="aurora-chip absolute inset-0 overflow-hidden rounded-full">
        <div aria-hidden="true" className="aurora-liquid-rise absolute inset-x-0 bottom-0" style={{ height: `${Math.max(ratio, 6)}%` }}>
          <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="aurora-liquid-alt absolute -top-2.5 left-0 h-3 w-[200%]">
            <path d={WAVE_TOP} fill={color} fillOpacity={0.3} />
          </svg>
          <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="aurora-liquid absolute -top-1.5 left-0 h-3 w-[200%]">
            <path d={WAVE_TOP} fill={color} fillOpacity={0.55} />
          </svg>
          <span className="absolute inset-x-0 top-1.5 bottom-0" style={{ background: `color-mix(in oklab, ${color} 55%, transparent)` }} />
        </div>
        <span aria-hidden="true" className="aurora-disc-sheen pointer-events-none absolute -inset-1/2" />
        <span className="absolute inset-0 grid place-items-center text-center">
          <span>
            <span className="block text-3xl leading-none font-semibold text-fg tabular-nums">{Math.round(ratio)}%</span>
            <span className="mt-1 block text-[10px] tracking-[0.1em] text-fg-muted uppercase">{translate('accounts.freeMargin')}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

interface DetailProps {
  entry: DeckEntry;
  onEdit: (edits: AccountEdits) => void;
}

function AccountDetail({ entry, onEdit }: DetailProps) {
  const { account, color, nickname, leverage } = entry;
  const isLive = account.type === 'live';
  const pnl = floatingPnl(account);
  const pnlPercent = account.balance > 0 ? (pnl / account.balance) * 100 : 0;
  const [action, setAction] = useState<AccountAction | null>(null);
  const closeAction = () => setAction(null);
  const stats = [
    { label: translate('accounts.balance'), value: formatMoney(account.balance, account.currency) },
    { label: translate('accounts.credit'), value: formatMoney(account.credit, account.currency) },
    { label: translate('accounts.freeMargin'), value: formatMoney(account.freeMargin, account.currency) },
  ];

  return (
    <article aria-label={`${translate('accounts.number')} #${account.login}`} className={cx(boardCard, 'aurora-panel-in relative isolate flex min-w-0 flex-col gap-5 overflow-hidden p-5 sm:p-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 rounded-full opacity-[0.18] blur-[70px]" style={{ background: color }} />

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-mono text-xl font-semibold tracking-tight text-fg">#{account.login}</p>
            <StatusBadge isLive={isLive} />
          </div>
          <p className="sr-only">{translate('accounts.number')}</p>
          {nickname && (
            <p key={nickname} className="mt-1 inline-flex max-w-full animate-rise items-center gap-1 truncate text-xs font-medium text-(--hero-buy) motion-reduce:animate-none">
              <Icon name="user" size={11} className="shrink-0" />
              <span className="truncate">{nickname}</span>
            </p>
          )}
          <p className="mt-1 truncate text-xs text-fg-muted">
            {account.platform} · {account.group} · <span key={leverage} className="inline-block animate-rise motion-reduce:animate-none">1:{leverage}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <AccountActionsMenu onSelect={setAction} />
          <Link
            href="/settings"
            aria-label={translate('home.accountSettings')}
            title={translate('home.accountSettings')}
            className={cx(
              'grid size-10 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-fg/10 transition-[color,transform,background-color] duration-300 hover:rotate-45 hover:bg-fg/[0.06] hover:text-fg motion-reduce:transition-none',
              focusRing,
            )}
          >
            <Icon name="settings" size={16} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <LiquidFlask account={account} color={color} />
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs text-fg-muted">{translate('accounts.equity')}</p>
          <p className="mt-1.5 truncate text-4xl leading-none font-light tracking-[-0.03em] text-fg tabular-nums">
            <CountUpMoney value={account.equity} currency={account.currency} centsClassName="text-fg-subtle" />
          </p>
          <div className="mt-3">
            <PnlPill pnl={pnl} percent={pnlPercent} currency={account.currency} />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {stats.map((stat, index) => (
          <div key={stat.label} className="aurora-panel-in min-w-0 rounded-2xl bg-fg/[0.03] px-3 py-2.5 ring-1 ring-fg/[0.07]" style={{ animationDelay: `${120 + index * 80}ms` }}>
            <dt className="truncate text-[10px] tracking-[0.1em] text-fg-subtle uppercase">{stat.label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-fg tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-2xl bg-fg/[0.03] px-4 py-3.5 ring-1 ring-fg/[0.07]">
        <PnlTrack pnl={pnl} percent={pnlPercent} />
      </div>

      <div className="mt-auto flex items-center gap-2">
        {isLive && (
          <Link
            href="/deposit"
            className={cx(
              'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-fg ring-1 ring-fg/15 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-fg/[0.06] motion-reduce:transition-none',
              focusRing,
            )}
          >
            <Icon name="deposit" size={14} />
            {translate('home.addBalance')}
          </Link>
        )}
        <WaveButton href="/platforms" icon="monitor" label={translate('home.trade')} className="h-11 flex-1 px-5 text-xs" />
      </div>

      {action === 'leverage' && <LeverageModal account={account} current={leverage} onClose={closeAction} onSaved={(value) => onEdit({ leverage: value })} />}
      {action === 'nickname' && <NicknameModal account={account} current={nickname ?? ''} onClose={closeAction} onSaved={(value) => onEdit({ nickname: value })} />}
      {action === 'masterPassword' && <AccountPasswordModal account={account} kind="master" onClose={closeAction} />}
      {action === 'investorPassword' && <AccountPasswordModal account={account} kind="investor" onClose={closeAction} />}
    </article>
  );
}

/* ───────────── Filter + page ───────────── */

interface FilterOption {
  value: AccountFilter;
  label: string;
  count?: number;
}

function FilterChips({ items, value, onChange }: { items: FilterOption[]; value: AccountFilter; onChange: (value: AccountFilter) => void }) {
  return (
    <div role="tablist" aria-label={translate('accounts.filterLabel')} className="aurora-chip flex max-w-full gap-1 self-start overflow-x-auto rounded-full p-1">
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
              isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            {item.label}
            <span
              className={cx(
                'grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11px] tabular-nums',
                isActive ? 'bg-(--hero-buy) text-[#13201a]' : 'bg-fg/[0.08] text-fg-muted',
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
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Demo has no account API, so leverage and nickname changes are kept here until the page reloads.
  const [edits, setEdits] = useState<Record<string, AccountEdits>>({});

  const countOf = (type: AccountFilter) => accounts?.filter((account) => type === 'all' || account.type === type).length;
  const filterItems: FilterOption[] = [
    { value: 'all', label: translate('accounts.filterAll'), count: countOf('all') },
    { value: 'live', label: translate('accounts.liveAccounts'), count: countOf('live') },
    { value: 'demo', label: translate('accounts.demoAccounts'), count: countOf('demo') },
  ];

  const liveEquity = accounts?.filter((account) => account.type === 'live').reduce((total, account) => total + account.equity, 0) ?? 0;
  // Colours follow the full list, so a card keeps its colour whichever filter is on.
  const entries: DeckEntry[] | undefined = accounts
    ?.map((account, index) => ({
      account,
      color: HOLDING_COLORS[index % HOLDING_COLORS.length],
      share: account.type === 'live' && liveEquity > 0 ? (account.equity / liveEquity) * 100 : undefined,
      nickname: edits[account.id]?.nickname,
      leverage: edits[account.id]?.leverage ?? account.leverage,
    }))
    .filter((entry) => filter === 'all' || entry.account.type === filter);

  const pickedIndex = Math.max(0, entries?.findIndex((entry) => entry.account.id === pickedId) ?? 0);
  const pickedEntry = entries?.[pickedIndex];

  const editAccount = (id: string, change: AccountEdits) => setEdits((current) => ({ ...current, [id]: { ...current[id], ...change } }));

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <AccountsSummary accounts={accounts} isFetching={Boolean(accounts) && isFetching} onRefresh={() => void refetch()} />

      <div className="flex flex-col gap-5">
        <FilterChips items={filterItems} value={filter} onChange={setFilter} />

        {!entries ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-busy="true" aria-label={translate('common.loading')}>
            <Skeleton className="h-[380px] w-full rounded-[28px]" />
            <Skeleton className="h-[480px] w-full rounded-[28px]" />
          </div>
        ) : !pickedEntry ? (
          <div className={cx(boardCard, 'p-6')}>
            <EmptyState title={translate('accounts.emptyTitle')} description={translate('accounts.emptyText')} />
          </div>
        ) : (
          <div key={filter} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <AccountDeck entries={entries} picked={pickedIndex} onPick={(index) => setPickedId(entries[index].account.id)} />
            <AccountDetail key={pickedEntry.account.id} entry={pickedEntry} onEdit={(change) => editAccount(pickedEntry.account.id, change)} />
          </div>
        )}
      </div>
    </div>
  );
}
