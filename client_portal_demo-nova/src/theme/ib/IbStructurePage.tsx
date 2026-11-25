'use client';

import { useId, useState, type CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbRebateCategory, IbStructure, IbTierTarget, IbTierTargetKind } from '@/core/mock/ibStructure';
import { useIbStructure } from '@/core/pages/useIbStructure';
import { cx } from '../lib/cx';
import { useAnimatedNumber } from '../promotion/ScratchExperience';
import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const cardClass = 'orbit-card';
// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const COUNT_MS = 1400;
const TRACK_CELLS = 32;

const targetMeta: Record<IbTierTargetKind, { labelKey: MessageKey; icon: IconName }> = {
  activeClients: { labelKey: 'ibStruct.reqActiveClients', icon: 'user' },
  netDeposit: { labelKey: 'ibStruct.reqNetDeposit', icon: 'wallet' },
};

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 90}ms` };
}

function percentOf(current: number, total: number): number {
  return total > 0 ? Math.min(100, (current / total) * 100) : 0;
}

/* ───────────── Tier journey: identity + unlock goals in one dark hero ───────────── */

function TargetTrack({ target, currency, index }: { target: IbTierTarget; currency: string; index: number }) {
  const { labelKey, icon } = targetMeta[target.kind];
  const percent = percentOf(target.current, target.target);
  const shown = useAnimatedNumber(percent, 1600);
  const isReached = target.current >= target.target;
  const format = (value: number) => (target.kind === 'netDeposit' ? formatMoney(value, currency) : String(value));
  const litCells = Math.round((shown / 100) * TRACK_CELLS);

  return (
    <div
      style={riseDelay(index + 2)}
      className={cx(
        'group relative animate-rise rounded-2xl p-4 ring-1 transition-[box-shadow,background-color] duration-300 motion-reduce:animate-none',
        isReached ? 'bg-primary/[0.10] shadow-[0_20px_40px_-28px_var(--brand-primary)] ring-primary/50' : 'bg-white/[0.04] ring-white/10 hover:ring-primary/40',
      )}
    >
      {isReached && (
        <>
          <Icon name="bolt" size={11} className="absolute top-3 right-4 animate-twinkle text-primary motion-reduce:animate-none" />
          <Icon name="bolt" size={8} className="absolute top-8 right-9 animate-twinkle text-primary [animation-delay:-1.2s] motion-reduce:animate-none" />
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-(--brand-gleam) ring-1 ring-primary/40">
          <Icon name={icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{translate(labelKey)}</p>
          <p className="font-mono text-xs text-white/50 tabular-nums">
            <span className="text-base font-semibold text-white">{format(target.current)}</span> / {format(target.target)}
          </p>
        </div>
        {isReached ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
            <Icon name="checkCircle" size={13} />
            {translate('ibStruct.goalReached')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 font-mono text-xs text-white/65 ring-1 ring-white/10 tabular-nums">
            <Icon name="clock" size={12} />
            {translate('ibStruct.remaining', { amount: format(target.target - target.current) })}
          </span>
        )}
      </div>

      {/* Segmented fuel track: each lit cell is 1/32 of the way to this goal. */}
      <div aria-hidden="true" className="mt-4 flex gap-[3px]">
        {Array.from({ length: TRACK_CELLS }, (_, cell) => (
          <span
            key={cell}
            className={cx(
              'h-3 flex-1 rounded-[2px] transition-colors duration-300',
              cell < litCells ? (cell === litCells - 1 ? cx(goldFill, 'shadow-[0_0_10px_var(--brand-primary)]') : 'bg-primary/80') : 'bg-white/[0.08]',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-right font-mono text-[10px] text-white/45 tabular-nums">{Math.round(shown)}%</p>
    </div>
  );
}

function TierJourney({ structure }: { structure: IbStructure }) {
  const { stats, currency, nextTier, targets } = structure;
  const rebate = useAnimatedNumber(stats.currentTierRebate, COUNT_MS);
  const earned = useAnimatedNumber(stats.totalEarned, COUNT_MS);
  // Any single goal unlocks the next tier, so the rail follows the furthest one.
  const railProgress = Math.max(0, ...targets.map((target) => percentOf(target.current, target.target)));
  const [first, ...rest] = targets;

  return (
    <section
      style={riseDelay(1)}
      className={cx(
        'orbit-card relative isolate grid animate-rise gap-6 overflow-hidden p-6 text-white motion-reduce:animate-none lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:p-8',
        graphite,
      )}
    >
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -bottom-48 -left-40 -z-10 size-[30rem] animate-orbit-spin-rev motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-56 right-1/4 -z-10 size-[28rem] animate-orbit-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute top-10 left-1/3 -z-10 size-1 animate-twinkle rounded-full bg-(--orbit-violet) motion-reduce:animate-none" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 -z-10 size-72 animate-orbit rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,color-mix(in_oklab,var(--brand-primary)_45%,transparent)_70deg,transparent_140deg)] opacity-60 [animation-duration:14s] [mask-image:radial-gradient(circle,transparent_54%,var(--hero-panel)_56%,var(--hero-panel)_64%,transparent_66%)] motion-reduce:animate-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-32 -z-10 size-96 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_22%,transparent),transparent_68%)] motion-reduce:animate-none"
      />

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 text-white/55">
          <Icon name="checkCircle" size={14} className="text-(--brand-gleam)" />
          <span className={eyebrow}>{translate('ibStruct.currentTier')}</span>
        </div>
        <p className={cx('mt-2 text-5xl font-semibold tracking-tight break-words sm:text-6xl', goldText)}>{stats.currentTier}</p>

        <dl className="mt-8 flex flex-col gap-3 lg:mt-auto">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/70 ring-1 ring-white/10">
              <Icon name="gift" size={16} />
            </span>
            <div className="min-w-0">
              <dt className={cx(eyebrow, 'truncate text-white/50')}>{translate('ibStruct.currentTierRebate')}</dt>
              <dd className="mt-0.5 truncate font-mono text-2xl font-semibold tabular-nums">{formatMoney(rebate, currency)}</dd>
            </div>
          </div>
          <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white/[0.05] p-4 ring-1 ring-primary/40">
            <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-primary/15 to-transparent motion-reduce:hidden" />
            <span className={cx('relative grid size-10 shrink-0 place-items-center rounded-xl text-(--brand-on-primary)', goldFill)}>
              <Icon name="trophy" size={16} />
            </span>
            <div className="relative min-w-0">
              <dt className={cx(eyebrow, 'truncate text-white/50')}>{translate('ibStruct.totalEarned')}</dt>
              <dd className={cx('mt-0.5 truncate font-mono text-2xl font-semibold tabular-nums', goldText)}>{formatMoney(earned, currency)}</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="flex min-w-0 flex-col gap-4 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10 backdrop-blur">
        <header className="flex items-center gap-4">
          <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-(--brand-gleam) ring-1 ring-primary/50">
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />
            <Icon name="trophy" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{translate('ibStruct.unlock', { tier: nextTier })}</h2>
            <p className="text-sm text-white/55">{translate('ibStruct.unlockHint')}</p>
          </div>
        </header>

        {/* Tier rail: current tier lit, next tier waiting behind a lock. */}
        <div>
          <div className="flex items-center gap-3">
            <span className={cx('grid size-9 shrink-0 place-items-center rounded-full text-(--brand-on-primary) shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-primary)_22%,transparent)]', goldFill)}>
              <Icon name="check" size={15} />
            </span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span style={{ width: `${railProgress}%` }} className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none', goldFill)} />
              <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/50 to-transparent motion-reduce:hidden" />
            </span>
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-primary/50">
              <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-primary motion-reduce:hidden" />
              <Icon name="lock" size={14} />
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-white/50">
            <span>{stats.currentTier}</span>
            <span>{nextTier}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {first && <TargetTrack target={first} currency={currency} index={0} />}
          {rest.map((target, index) => (
            <div key={target.kind} className="contents">
              <span className="relative flex items-center justify-center">
                <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                <span className={cx('relative grid h-7 place-items-center rounded-full px-3 text-[10px] font-bold tracking-widest text-(--brand-on-primary) uppercase', goldFill)}>
                  {translate('ibStruct.or')}
                </span>
              </span>
              <TargetTrack target={target} currency={currency} index={index + 1} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Capital ledger: deposit − withdrawal = net, as a horizontal waterfall ───────────── */

function Operator({ symbol }: { symbol: string }) {
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 font-mono text-base font-semibold text-fg-muted ring-1 ring-line">
      {symbol}
    </span>
  );
}

interface LedgerRow {
  key: 'deposit' | 'withdrawal' | 'net';
  labelKey: MessageKey;
  icon: IconName;
  value: string;
  left: number;
  width: number;
  bar: string;
  tone: string;
}

function CapitalWaterfall({ structure }: { structure: IbStructure }) {
  const { stats, currency } = structure;
  const deposit = useAnimatedNumber(stats.totalDeposit, COUNT_MS);
  const withdrawal = useAnimatedNumber(stats.totalWithdrawal, COUNT_MS);
  const net = useAnimatedNumber(stats.netDepositVolume, COUNT_MS);
  const lots = useAnimatedNumber(stats.totalLots, COUNT_MS);

  const scale = Math.max(stats.totalDeposit, stats.netDepositVolume, 1);
  const depositWidth = percentOf(stats.totalDeposit, scale);
  const netWidth = percentOf(Math.max(stats.netDepositVolume, 0), scale);
  // The withdrawal is carved off the end of the deposit, so it starts where the net bar stops.
  const withdrawalLeft = Math.max(0, depositWidth - percentOf(stats.totalWithdrawal, scale));

  const rows: LedgerRow[] = [
    {
      key: 'deposit',
      labelKey: 'ibStruct.totalDeposit',
      icon: 'trendUp',
      value: formatMoney(deposit, currency),
      left: 0,
      width: depositWidth,
      bar: 'bg-primary/30 ring-1 ring-primary/45',
      tone: 'text-fg',
    },
    {
      key: 'withdrawal',
      labelKey: 'ibStruct.totalWithdrawal',
      icon: 'trendDown',
      value: formatMoney(withdrawal, currency),
      left: withdrawalLeft,
      width: depositWidth - withdrawalLeft,
      bar: 'bg-danger/30 ring-1 ring-danger/50 [background-image:repeating-linear-gradient(135deg,transparent_0_5px,rgb(255_255_255/0.12)_5px_7px)]',
      tone: 'text-fg-muted',
    },
    {
      key: 'net',
      labelKey: 'ibStruct.netDepositVolume',
      icon: 'wallet',
      value: formatMoney(net, currency),
      left: 0,
      width: netWidth,
      bar: 'bg-linear-to-r from-primary/35 to-primary/75 ring-1 ring-primary/60 shadow-[0_0_18px_-6px_var(--brand-primary)]',
      tone: goldText,
    },
  ];

  return (
    <section style={riseDelay(3)} className={cx(cardClass, 'relative flex animate-rise flex-col overflow-hidden p-6 motion-reduce:animate-none lg:col-span-7')}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-10 size-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_12%,transparent),transparent_70%)]"
      />

      <ol className="relative flex flex-1 flex-col justify-center gap-5">
        {rows.map((row, index) => (
          <li
            key={row.key}
            style={riseDelay(index + 4)}
            className={cx(
              'grid animate-rise grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-4 motion-reduce:animate-none',
              row.key === 'net' && 'border-t border-dashed border-line pt-5',
            )}
          >
            {index === 0 ? (
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
                <Icon name="deposit" size={16} />
              </span>
            ) : (
              <Operator symbol={row.key === 'withdrawal' ? '−' : '='} />
            )}
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cx(eyebrow, 'flex min-w-0 items-center gap-1.5 text-fg-subtle')}>
                  <Icon name={row.icon} size={12} className={cx('shrink-0', row.key === 'net' && 'text-primary')} />
                  <span className="truncate">{translate(row.labelKey)}</span>
                </p>
                <p className={cx('shrink-0 font-mono font-semibold tabular-nums', row.key === 'net' ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl', row.tone)}>{row.value}</p>
              </div>
              <div className="relative mt-2.5 h-3 rounded-full bg-surface-2 ring-1 ring-line">
                {/* Ghost of what stays, so the withdrawal reads as a slice cut off the deposit. */}
                {row.key === 'withdrawal' && (
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-full bg-primary/10" style={{ width: `${row.left}%` }} />
                )}
                <span
                  style={{ left: `${row.left}%`, width: `${Math.max(row.width, 1.5)}%` }}
                  className={cx('absolute inset-y-0 overflow-hidden rounded-full transition-[left,width] duration-1000 ease-out motion-reduce:transition-none', row.bar)}
                >
                  {row.key === 'net' && (
                    <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/35 to-transparent motion-reduce:hidden" />
                  )}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="relative grid grid-cols-2 gap-3 pt-6">
        <div className="group flex items-center gap-3 rounded-2xl bg-surface-2/60 p-4 ring-1 ring-line transition-colors hover:ring-primary/40">
          <span className="flex -space-x-2">
            {Array.from({ length: Math.min(stats.activeClients, 4) }, (_, index) => (
              <span
                key={index}
                style={riseDelay(index + 4)}
                className="grid size-9 animate-rise place-items-center rounded-full bg-primary/15 text-primary ring-2 ring-surface transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:animate-none"
              >
                <Icon name="user" size={15} />
              </span>
            ))}
          </span>
          <div className="min-w-0">
            <p className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate('ibStruct.activeClients')}</p>
            <p className="font-mono text-2xl font-semibold text-fg tabular-nums">{stats.activeClients}</p>
          </div>
        </div>
        <div className="group flex items-center gap-3 rounded-2xl bg-surface-2/60 p-4 ring-1 ring-line transition-colors hover:ring-primary/40">
          <span className="flex h-9 items-end gap-1" aria-hidden="true">
            {[40, 65, 50, 85, 100].map((height, index) => (
              <span
                key={height}
                style={{ height: `${height}%`, animationDelay: `${index * 160}ms` }}
                className={cx('w-1.5 origin-bottom animate-bar-sway rounded-full motion-reduce:animate-none', index === 4 ? goldFill : 'bg-primary/35')}
              />
            ))}
          </span>
          <div className="min-w-0">
            <p className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate('ibStruct.totalLots')}</p>
            <p className="font-mono text-2xl font-semibold text-fg tabular-nums">{lots.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Rebate ladder: one horizontal bar per level ───────────── */

function RebateLadder({ categories, currency }: { categories: IbRebateCategory[]; currency: string }) {
  const tabsId = useId();
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const active = categories.find((category) => category.id === activeId) ?? categories[0];
  if (!active) return null;
  const maxRate = Math.max(...active.rates, 1);

  return (
    <section style={riseDelay(4)} className={cx(cardClass, 'flex animate-rise flex-col overflow-hidden motion-reduce:animate-none lg:col-span-5')}>
      <header className="flex items-center gap-3 border-b border-line px-6 py-5">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon name="barChart" size={17} />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-fg">{translate('ibStruct.activeRebates')}</h2>
      </header>

      <div className="flex flex-1 flex-col p-6">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibStruct.category')}</p>
        <div role="tablist" aria-label={translate('ibStruct.category')} className="mt-2 inline-flex w-full rounded-full bg-surface-2 p-1 ring-1 ring-line">
          {categories.map((category) => {
            const isActive = category.id === active.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                id={`${tabsId}-${category.id}`}
                aria-selected={isActive}
                aria-controls={`${tabsId}-panel`}
                onClick={() => setActiveId(category.id)}
                className={cx(
                  'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                  isActive ? cx('text-(--brand-on-primary) shadow-[0_8px_18px_-10px_var(--brand-primary)]', goldFill) : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon name="bank" size={13} />
                {category.name}
              </button>
            );
          })}
        </div>

        <p className={cx(eyebrow, 'mt-6 text-fg-subtle')}>{translate('ibStruct.payoutRates')}</p>
        <ol role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${active.id}`} className="mt-3 flex flex-1 flex-col justify-center gap-3">
          {active.rates.map((rate, index) => {
            const isTop = index === 0;
            return (
              <li
                key={`${active.id}-${index}`}
                style={riseDelay(index)}
                className="group grid animate-rise grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 motion-reduce:animate-none"
              >
                <span
                  className={cx(
                    'grid h-8 place-items-center rounded-lg font-mono text-[11px] font-bold',
                    isTop ? cx(goldFill, 'text-(--brand-on-primary)') : 'bg-surface-2 text-fg-subtle ring-1 ring-line',
                  )}
                >
                  L{index + 1}
                </span>
                <span className="relative h-3.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                  <span
                    style={{ width: `${Math.max(6, (rate / maxRate) * 100)}%` }}
                    className={cx(
                      'absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[filter] duration-300 group-hover:brightness-125',
                      isTop ? cx(goldFill, 'shadow-[0_0_14px_-2px_var(--brand-primary)]') : 'bg-primary/40',
                    )}
                  >
                    {isTop && <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />}
                  </span>
                </span>
                <span className={cx('font-mono text-sm font-semibold tabular-nums transition-transform duration-300 group-hover:-translate-x-0.5', isTop ? 'text-primary' : 'text-fg')}>
                  {formatMoney(rate, currency)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Page ───────────── */

export default function IbStructurePage() {
  const { data } = useIbStructure();

  if (!data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[420px] rounded-[28px]" />
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-[28px] lg:col-span-7" />
          <Skeleton className="h-96 rounded-[28px] lg:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="animate-rise motion-reduce:animate-none">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{translate('ibStruct.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{translate('ibStruct.subtitle')}</p>
      </div>

      <TierJourney structure={data} />

      <div className="grid gap-5 lg:grid-cols-12">
        <CapitalWaterfall structure={data} />
        <RebateLadder categories={data.rebates} currency={data.currency} />
      </div>
    </div>
  );
}
