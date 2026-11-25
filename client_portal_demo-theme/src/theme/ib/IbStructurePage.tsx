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

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const graphite = 'bg-[#18181b]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const COUNT_MS = 1400;
const TRACK_SEGMENTS = 24;

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

/* ───────────── Tier summit: title, current tier, the climb to the next tier and the two tier earnings ───────────── */

function TierSummit({ structure }: { structure: IbStructure }) {
  const { stats, currency, nextTier } = structure;
  const rebate = useAnimatedNumber(stats.currentTierRebate, COUNT_MS);
  const earned = useAnimatedNumber(stats.totalEarned, COUNT_MS);
  const plates: { labelKey: MessageKey; icon: IconName; value: string; isGold: boolean }[] = [
    { labelKey: 'ibStruct.currentTierRebate', icon: 'gift', value: formatMoney(rebate, currency), isGold: false },
    { labelKey: 'ibStruct.totalEarned', icon: 'trophy', value: formatMoney(earned, currency), isGold: true },
  ];

  return (
    <section className={cx('relative isolate animate-rise overflow-hidden rounded-[2rem] text-white ring-1 ring-primary/30 motion-reduce:animate-none', graphite)}>
      {/* Mountain ridge silhouette rising behind the tier name. */}
      <svg aria-hidden="true" viewBox="0 0 400 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 w-full">
        <path d="M0 120 L70 62 L118 88 L190 22 L250 74 L300 46 L400 100 L400 120 Z" className="fill-white/[0.03]" />
        <path d="M0 120 L90 86 L150 104 L230 58 L310 92 L400 70 L400 120 Z" className="fill-primary/[0.07]" />
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 -z-10 size-96 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_20%,transparent),transparent_66%)] motion-reduce:animate-none"
      />

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-white/70">{translate('ibStruct.title')}</h1>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-white/45">{translate('ibStruct.subtitle')}</p>

          <p className={cx(eyebrow, 'mt-8 flex items-center gap-1.5 text-white/55')}>
            <Icon name="checkCircle" size={13} className="text-(--brand-gleam)" />
            {translate('ibStruct.currentTier')}
          </p>
          <p className={cx('mt-2 text-5xl font-semibold tracking-tight break-words sm:text-6xl', goldText)}>{stats.currentTier}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Climb: the current tier is planted, the path rises to the locked next tier. */}
          <div className="relative h-28">
            <svg aria-hidden="true" viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <path d="M18 86 C110 86 150 20 282 16" fill="none" strokeWidth="2" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" className="stroke-white/20" />
              <path
                d="M18 86 C110 86 150 20 282 16"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pathLength={100}
                strokeDasharray="50 100"
                className="stroke-(--brand-gleam)"
              />
              <path
                d="M18 86 C110 86 150 20 282 16"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="2 12"
                vectorEffect="non-scaling-stroke"
                className="animate-ribbon-flow stroke-white/70 motion-reduce:hidden"
              />
            </svg>
            <span className="absolute bottom-0 left-0 flex flex-col items-start gap-1.5">
              <span className={cx('grid size-9 place-items-center rounded-full text-[#18181b] shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-primary)_22%,transparent)]', goldFill)}>
                <Icon name="check" size={15} />
              </span>
              <span className="text-[11px] font-semibold text-white/60">{stats.currentTier}</span>
            </span>
            <span className="absolute top-0 right-0 flex flex-col items-end gap-1.5">
              <span className="relative grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-primary/50">
                <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-primary motion-reduce:hidden" />
                <Icon name="lock" size={14} />
              </span>
              <span className="text-[11px] font-semibold text-white/60">{nextTier}</span>
            </span>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-white/10 rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            {plates.map((plate) => (
              <div key={plate.labelKey} className="relative overflow-hidden p-4">
                {plate.isGold && (
                  <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-primary/15 to-transparent motion-reduce:hidden" />
                )}
                <dt className={cx(eyebrow, 'relative flex items-center gap-1.5 text-white/50')}>
                  <Icon name={plate.icon} size={12} />
                  {translate(plate.labelKey)}
                </dt>
                <dd className={cx('relative mt-2 font-mono text-2xl font-semibold tabular-nums', plate.isGold && goldText)}>{plate.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Capital receipt: deposit minus withdrawal equals net, printed as a receipt with a level gauge ───────────── */

function CapitalReceipt({ structure }: { structure: IbStructure }) {
  const { stats, currency } = structure;
  const deposit = useAnimatedNumber(stats.totalDeposit, COUNT_MS);
  const withdrawal = useAnimatedNumber(stats.totalWithdrawal, COUNT_MS);
  const net = useAnimatedNumber(stats.netDepositVolume, COUNT_MS);
  const lots = useAnimatedNumber(stats.totalLots, COUNT_MS);
  const withdrawalShare = percentOf(stats.totalWithdrawal, stats.totalDeposit);
  const lines: { label: string; icon: IconName; value: string; symbol: string; tone: 'plain' | 'muted' }[] = [
    { label: translate('ibStruct.totalDeposit'), icon: 'trendUp', value: formatMoney(deposit, currency), symbol: '+', tone: 'plain' },
    { label: translate('ibStruct.totalWithdrawal'), icon: 'trendDown', value: formatMoney(withdrawal, currency), symbol: '−', tone: 'muted' },
  ];

  return (
    <section style={riseDelay(1)} className={cx(cardClass, 'flex animate-rise flex-col overflow-hidden motion-reduce:animate-none lg:col-span-5')}>
      <div className="flex flex-1 gap-5 p-6">
        {/* Vertical gauge: gold is what stayed in the network, graphite what left it. */}
        <div aria-hidden="true" className="relative flex w-4 shrink-0 flex-col overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
          <span style={{ height: `${withdrawalShare}%` }} className={cx('w-full border-b-2 border-surface', graphite)} />
          <span className={cx('relative w-full flex-1 overflow-hidden', goldFill)}>
            <span className="absolute inset-0 animate-wallet-shine bg-linear-to-b from-transparent via-white/50 to-transparent motion-reduce:hidden" />
          </span>
        </div>

        <dl className="flex min-w-0 flex-1 flex-col">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center gap-3 border-b border-dashed border-line py-3.5 first:pt-0">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 font-mono text-sm font-semibold text-fg-muted ring-1 ring-line">
                {line.symbol}
              </span>
              <dt className={cx(eyebrow, 'flex min-w-0 flex-1 items-center gap-1.5 truncate text-fg-subtle')}>
                <Icon name={line.icon} size={12} />
                {line.label}
              </dt>
              <dd className={cx('truncate font-mono text-lg font-semibold tabular-nums', line.tone === 'muted' ? 'text-fg-muted' : 'text-fg')}>{line.value}</dd>
            </div>
          ))}
          <div className="mt-auto flex items-end gap-3 border-t-2 border-fg/80 pt-4">
            <span aria-hidden="true" className={cx('grid size-7 shrink-0 place-items-center rounded-lg font-mono text-sm font-semibold text-[#18181b]', goldFill)}>
              =
            </span>
            <dt className={cx(eyebrow, 'flex min-w-0 flex-1 items-center gap-1.5 truncate text-fg-subtle')}>
              <Icon name="wallet" size={12} className="text-primary" />
              {translate('ibStruct.netDepositVolume')}
            </dt>
            <dd className={cx('truncate font-mono text-2xl font-semibold tabular-nums', goldText)}>{formatMoney(net, currency)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 divide-x divide-line border-t border-line bg-surface-2/50">
        <div className="group flex items-center gap-3 p-4">
          <span className="flex -space-x-2">
            {Array.from({ length: Math.min(stats.activeClients, 4) }, (_, index) => (
              <span
                key={index}
                style={riseDelay(index + 4)}
                className="grid size-8 animate-rise place-items-center rounded-lg bg-primary/15 text-primary ring-2 ring-surface transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:animate-none"
              >
                <Icon name="user" size={14} />
              </span>
            ))}
          </span>
          <div className="min-w-0">
            <p className={cx(eyebrow, 'truncate text-fg-subtle')}>{translate('ibStruct.activeClients')}</p>
            <p className="font-mono text-xl font-semibold text-fg tabular-nums">{stats.activeClients}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-8 items-end gap-1" aria-hidden="true">
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
            <p className="font-mono text-xl font-semibold text-fg tabular-nums">{lots.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Unlock requirements: each target as a segmented track ───────────── */

function TargetTrack({ target, currency, index }: { target: IbTierTarget; currency: string; index: number }) {
  const { labelKey, icon } = targetMeta[target.kind];
  const percent = percentOf(target.current, target.target);
  const shown = useAnimatedNumber(percent, 1600);
  const litSegments = Math.round((shown / 100) * TRACK_SEGMENTS);
  const isReached = target.current >= target.target;
  const format = (value: number) => (target.kind === 'netDeposit' ? formatMoney(value, currency) : String(value));

  return (
    <div
      style={riseDelay(index + 2)}
      className={cx(
        'relative animate-rise rounded-2xl border p-5 transition-[border-color,box-shadow] duration-300 motion-reduce:animate-none',
        isReached ? 'border-primary/50 bg-primary/[0.06] shadow-[0_24px_48px_-30px_var(--brand-primary)]' : 'border-line bg-surface-2/40 hover:border-primary/40',
      )}
    >
      {isReached && (
        <>
          <Icon name="bolt" size={12} className="absolute top-3 right-24 animate-twinkle text-primary motion-reduce:animate-none" />
          <Icon name="bolt" size={9} className="absolute right-40 bottom-3 animate-twinkle text-primary [animation-delay:-1.2s] motion-reduce:animate-none" />
          <Icon name="bolt" size={10} className="absolute top-6 left-1/2 animate-twinkle text-primary [animation-delay:-2s] motion-reduce:animate-none" />
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl text-(--brand-gleam)', graphite)}>
          <Icon name={icon} size={17} />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold text-fg">{translate(labelKey)}</p>
        <p className="font-mono text-sm tabular-nums">
          <span className="text-lg font-semibold text-fg">{format(target.current)}</span>
          <span className="text-fg-subtle"> / {format(target.target)}</span>
        </p>
      </div>

      <div aria-hidden="true" className="mt-4 flex h-3 gap-1">
        {Array.from({ length: TRACK_SEGMENTS }, (_, segment) => (
          <span
            key={segment}
            className={cx('flex-1 rounded-sm transition-colors duration-300', segment < litSegments ? goldFill : 'bg-surface-2 ring-1 ring-line ring-inset')}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold text-primary tabular-nums">{Math.round(shown)}%</span>
        {isReached ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 ring-1 ring-emerald-500/30">
            <Icon name="checkCircle" size={13} />
            {translate('ibStruct.goalReached')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-mono text-xs text-fg-muted ring-1 ring-line tabular-nums">
            <Icon name="clock" size={12} />
            {translate('ibStruct.remaining', { amount: formatMoney(target.target - target.current, currency) })}
          </span>
        )}
      </div>
    </div>
  );
}

function UnlockTracks({ structure }: { structure: IbStructure }) {
  const [first, ...rest] = structure.targets;

  return (
    <section style={riseDelay(2)} className={cx(cardClass, 'flex animate-rise flex-col p-6 motion-reduce:animate-none lg:col-span-7')}>
      <header className="flex items-center gap-4">
        <span className={cx('relative grid size-12 shrink-0 place-items-center rounded-2xl text-[#18181b]', goldFill)}>
          <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />
          <Icon name="trophy" size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-fg">{translate('ibStruct.unlock', { tier: structure.nextTier })}</h2>
          <p className="text-sm text-fg-muted">{translate('ibStruct.unlockHint')}</p>
        </div>
      </header>

      <div className="mt-6 flex flex-1 flex-col justify-center gap-3">
        {first && <TargetTrack target={first} currency={structure.currency} index={0} />}
        {rest.map((target, index) => (
          <div key={target.kind} className="contents">
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
              <span className={cx('rounded-full px-3 py-1 text-[11px] font-bold tracking-widest text-(--brand-gleam) uppercase', graphite)}>{translate('ibStruct.or')}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
            </span>
            <TargetTrack target={target} currency={structure.currency} index={index + 1} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Rebate rates: category rail on the left, level rows on the right ───────────── */

function RebateLevels({ categories, currency }: { categories: IbRebateCategory[]; currency: string }) {
  const tabsId = useId();
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const active = categories.find((category) => category.id === activeId) ?? categories[0];
  if (!active) return null;
  const maxRate = Math.max(...active.rates, 1);

  return (
    <section style={riseDelay(3)} className={cx(cardClass, 'grid animate-rise overflow-hidden motion-reduce:animate-none lg:col-span-12 lg:grid-cols-[17rem_minmax(0,1fr)]')}>
      <div className="flex flex-col gap-5 border-b border-line bg-surface-2/50 p-6 lg:border-r lg:border-b-0">
        <header className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon name="barChart" size={17} />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-fg">{translate('ibStruct.activeRebates')}</h2>
        </header>

        <div>
          <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibStruct.category')}</p>
          <div role="tablist" aria-orientation="vertical" aria-label={translate('ibStruct.category')} className="mt-2 flex flex-col gap-1.5">
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
                    'flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-left text-sm font-semibold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                    isActive ? cx('text-(--brand-gleam) shadow-[0_10px_22px_-14px_var(--brand-primary)]', graphite) : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-primary/40',
                  )}
                >
                  <Icon name="bank" size={14} />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  {isActive && <span aria-hidden="true" className="size-1.5 rounded-full bg-(--brand-gleam)" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibStruct.payoutRates')}</p>
        <ol role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${active.id}`} className="mt-4 flex flex-col gap-2.5">
          {active.rates.map((rate, index) => {
            const isTop = index === 0;
            return (
              <li key={`${active.id}-${index}`} style={riseDelay(index)} className="group grid animate-rise grid-cols-[2.5rem_minmax(0,1fr)_6.5rem] items-center gap-3 motion-reduce:animate-none">
                <span
                  className={cx(
                    'grid h-8 place-items-center rounded-lg font-mono text-[11px] font-bold',
                    isTop ? cx(goldFill, 'text-[#18181b]') : 'bg-surface-2 text-fg-subtle ring-1 ring-line',
                  )}
                >
                  L{index + 1}
                </span>
                <span className="relative h-8 overflow-hidden rounded-lg bg-surface-2/60">
                  <span
                    style={{ width: `${Math.max(6, (rate / maxRate) * 100)}%` }}
                    className={cx(
                      'absolute inset-y-0 left-0 origin-left animate-grow rounded-lg transition-[filter] duration-300 group-hover:brightness-125 motion-reduce:animate-none',
                      isTop ? goldFill : 'bg-primary/25 group-hover:bg-primary/40',
                    )}
                  >
                    {isTop && <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />}
                  </span>
                </span>
                <span className={cx('text-right font-mono text-sm font-semibold tabular-nums transition-transform duration-300 group-hover:-translate-x-1', isTop ? 'text-primary' : 'text-fg-muted')}>
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
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-[2rem] lg:col-span-12" />
        <Skeleton className="h-96 rounded-3xl lg:col-span-5" />
        <Skeleton className="h-96 rounded-3xl lg:col-span-7" />
        <Skeleton className="h-72 rounded-3xl lg:col-span-12" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TierSummit structure={data} />
      <div className="grid gap-5 lg:grid-cols-12">
        <CapitalReceipt structure={data} />
        <UnlockTracks structure={data} />
        <RebateLevels categories={data.rebates} currency={data.currency} />
      </div>
    </div>
  );
}
