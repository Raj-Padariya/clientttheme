'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useBonuses, type BonusCampaign, type BonusClaim, type BonusClaimStatus, type BonusType } from '@/core/pages/useBonuses';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Badge, Skeleton, type Tone } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { BonusDetailsModal } from './BonusDetailsModal';
import { useAnimatedNumber } from './ScratchExperience';
import './market.css';

type BonusTab = 'available' | 'history';

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const claimTone: Record<BonusClaimStatus, Tone> = { pending: 'info', approved: 'success', rejected: 'neutral' };
const claimDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const dayFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' });
const yearFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' });

function claimStatusLabel(status: BonusClaimStatus): string {
  switch (status) {
    case 'pending':
      return translate('bonus.statusPending');
    case 'approved':
      return translate('bonus.statusApproved');
    case 'rejected':
      return translate('bonus.statusRejected');
  }
}

function wholeMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function campaignTitle(campaign: BonusCampaign): string {
  return `${campaign.percent}% ${campaign.name}`;
}

function durationLabel(campaign: BonusCampaign): string {
  return campaign.durationDays === null ? translate('bonus.lifetime') : translate('bonus.days', { count: campaign.durationDays });
}

function bonusTypeLabel(type: BonusType): string {
  return type === 'tradable' ? translate('bonus.typeTradable') : translate('bonus.typeLosable');
}

// Candles in price units (0-100); the last one is the live bonus candle.
const HERO_CANDLES = [
  { open: 30, close: 42, high: 46, low: 26 },
  { open: 42, close: 36, high: 45, low: 32 },
  { open: 36, close: 50, high: 54, low: 34 },
  { open: 50, close: 46, high: 56, low: 42 },
  { open: 46, close: 60, high: 63, low: 44 },
  { open: 60, close: 55, high: 64, low: 52 },
  { open: 55, close: 70, high: 74, low: 53 },
  { open: 70, close: 66, high: 75, low: 62 },
  { open: 66, close: 92, high: 96, low: 64 },
];
const chartY = (value: number) => 112 - value;
const candleX = (index: number) => 12 + index * 15;

/** Live candle chart: candles print one by one, the close line draws over them, and the last candle keeps ticking under a +% tag. */
function MarketChart() {
  const lastIndex = HERO_CANDLES.length - 1;
  const lastY = chartY(HERO_CANDLES[lastIndex].close);
  const lastX = candleX(lastIndex);
  const closeLine = HERO_CANDLES.map((candle, index) => `${index === 0 ? 'M' : 'L'}${candleX(index)} ${chartY(candle.close)}`).join(' ');

  return (
    <svg aria-hidden="true" viewBox="0 0 160 120" className="h-28 w-40 shrink-0 overflow-visible sm:h-36 sm:w-52">
      {[30, 60, 90].map((y) => (
        <line key={y} x1={0} x2={160} y1={y} y2={y} strokeDasharray="2 4" className="stroke-fg/10" />
      ))}
      {HERO_CANDLES.map((candle, index) => {
        const isUp = candle.close >= candle.open;
        const tone = isUp ? 'fill-(--hero-buy) stroke-(--hero-buy)' : 'fill-(--aurora-cta-from) stroke-(--aurora-cta-from)';
        const x = candleX(index);
        return (
          <g key={x} className="mkt-candle" style={{ '--candle-delay': `${index * 0.12}s` } as CSSProperties}>
            <line x1={x} x2={x} y1={chartY(candle.high)} y2={chartY(candle.low)} strokeWidth={1.5} className={tone} />
            <rect
              x={x - 4.5}
              y={chartY(Math.max(candle.open, candle.close))}
              width={9}
              height={Math.max(Math.abs(candle.close - candle.open), 2)}
              rx={1.5}
              className={cx(tone, index === lastIndex && 'mkt-live')}
            />
          </g>
        );
      })}
      <path d={closeLine} pathLength={1} fill="none" strokeWidth={1.5} strokeLinejoin="round" className="mkt-draw stroke-fg/60" style={{ '--draw-delay': '1.2s' } as CSSProperties} />
      <line x1={0} x2={lastX} y1={lastY} y2={lastY} strokeDasharray="4 3" className="mkt-march stroke-(--hero-buy)/50" />
      <circle cx={lastX} cy={lastY} r={3.5} className="animate-ping-soft fill-(--hero-buy) [transform-box:fill-box] origin-center motion-reduce:hidden" />
      <circle cx={lastX} cy={lastY} r={3.5} className="fill-(--hero-buy)" />
      <g className="mkt-rise" style={{ '--rise-delay': '1.6s' } as CSSProperties}>
        <rect x={lastX + 8} y={lastY - 8} width={30} height={16} rx={4} className="fill-(--hero-buy)" />
        <text x={lastX + 23} y={lastY + 3.5} textAnchor="middle" className="fill-[#062520] text-[10px] font-black">
          ▲%
        </text>
      </g>
    </svg>
  );
}

/** Trading-desk header: title beside a live candle chart, a ticker tape of the running campaigns, then the tab capsules and the deposit link. */
function BonusHero({
  tab,
  onTabChange,
  tabsId,
  campaigns,
  claimCount,
  currency,
}: {
  tab: BonusTab;
  onTabChange: (next: BonusTab) => void;
  tabsId: string;
  campaigns: BonusCampaign[];
  claimCount: number;
  currency: string;
}) {
  const tabs: { value: BonusTab; label: string; count: number; icon: IconName }[] = [
    { value: 'available', label: translate('bonus.available'), count: campaigns.length, icon: 'gift' },
    { value: 'history', label: translate('bonus.history'), count: claimCount, icon: 'history' },
  ];

  return (
    <header className="zenith-tile flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[28px] border border-(--hero-buy)/20 bg-linear-to-br from-(--hero-buy)/[0.08] via-transparent to-(--aurora-cta-from)/[0.06]">
        {/* Chart-screen grid with a glare sweeping across. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--hero-buy)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--hero-buy)_10%,transparent)_1px,transparent_1px)] [background-size:48px_48px]" />
        <span aria-hidden="true" className="mkt-sweep pointer-events-none absolute inset-y-0 w-24 -skew-x-12 bg-white/[0.05]" />
        <div className="relative flex items-end justify-between gap-6 px-5 pt-5 pb-5 sm:px-7">
          <div className="min-w-0">
            <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy) motion-reduce:hidden" />
                <span className="relative size-1.5 rounded-full bg-(--hero-buy)" />
              </span>
              {translate('nav.promotion')}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-6xl">{translate('bonus.campaignsTitle')}</h1>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('bonus.campaignsText')}</p>
          </div>
          <MarketChart />
        </div>

        {/* Ticker tape of the running campaigns; rendered twice so the scroll loops without a gap. */}
        {campaigns.length > 0 && (
          <div aria-hidden="true" className="relative overflow-hidden border-t border-(--hero-buy)/15 bg-black/25 py-2 light:bg-fg/5">
            <div className="mkt-tape flex w-max" style={{ '--tape-duration': `${Math.max(16, campaigns.length * 8)}s` } as CSSProperties}>
              {[...campaigns, ...campaigns].map((campaign, index) => (
                <span key={`${campaign.id}-${index}`} className="inline-flex items-center gap-2 pr-10 font-mono text-xs whitespace-nowrap">
                  <span className="font-bold text-fg uppercase">{campaign.name}</span>
                  <span className="font-bold text-(--hero-buy)">▲ +{campaign.percent}%</span>
                  <span className="text-fg-subtle">
                    {translate('bonus.maxCap')} {wholeMoney(campaign.maxCap, currency)}
                  </span>
                  <span className="text-(--aurora-cta-from)">◆</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={translate('bonus.tabs')} className="flex gap-2">
          {tabs.map((item) => {
            const isActive = tab === item.value;
            return (
              <button
                key={item.value}
                id={`${tabsId}-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tabsId}-panel`}
                onClick={() => onTabChange(item.value)}
                className={cx(
                  'relative inline-flex min-h-11 items-center gap-3 overflow-hidden rounded-full border py-1.5 pr-1.5 pl-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg active:scale-95 motion-reduce:transition-none',
                  isActive ? 'border-(--hero-buy) bg-(--hero-buy) text-[#062520]' : 'border-line text-fg-muted hover:border-(--hero-buy)/50 hover:text-fg',
                )}
              >
                {isActive && <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-10 -skew-x-12 bg-white/35" />}
                <Icon name={item.icon} size={15} className="relative" />
                <span className="relative">{item.label}</span>
                <span
                  className={cx(
                    'relative grid min-w-8 place-items-center rounded-full px-2 py-1 text-xs font-black tabular-nums',
                    isActive ? 'bg-(--aurora-cta-from) text-[#062520]' : 'bg-fg/10 text-fg',
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
        <LinkButton href="/deposit" className="rounded-full">
          <Icon name="deposit" size={16} />
          {translate('bonus.makeDeposit')}
        </LinkButton>
      </div>
    </header>
  );
}

function BonusTypeChip({ type }: { type: BonusType }) {
  const isTradable = type === 'tradable';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        isTradable ? 'border-success/30 bg-success/10 text-success' : 'border-[#e58aa5]/35 bg-[#e58aa5]/10 text-[#eea0b8] light:text-[#a8436a]',
      )}
    >
      <Icon name={isTradable ? 'trendUp' : 'lock'} size={11} />
      {bonusTypeLabel(type)}
    </span>
  );
}

// Tradable reads sage, losable clay.
const trackTone: Record<BonusType, { solid: string; soft: string }> = {
  tradable: { solid: 'bg-(--hero-buy)', soft: 'bg-(--hero-buy)/15' },
  losable: { solid: 'bg-(--aurora-cta-from)', soft: 'bg-(--aurora-cta-from)/15' },
};
const TRACK_TICKS = [25, 50, 75];
// Depth bars along the track: position (percent) and height (px).
const DEPTH_BARS = Array.from({ length: 22 }, (_, index) => ({ position: 3 + index * 4.2, height: 8 + ((index * 7) % 22) }));

/** Order-depth meter: the fill grows to the type's share of the credited total with depth bars pumping inside it. */
function DepthTrack({ type, amount, share, currency, order }: { type: BonusType; amount: number; share: number; currency: string; order: number }) {
  const level = useAnimatedNumber(share, 1600 + order * 300);
  const tone = trackTone[type];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className={cx(captionClass, 'inline-flex items-center gap-1.5')}>
          <span aria-hidden="true" className={cx('size-2 rounded-full', tone.solid)} />
          <Icon name={type === 'tradable' ? 'trendUp' : 'lock'} size={12} />
          {bonusTypeLabel(type)}
        </p>
        <p className="text-lg font-bold text-fg tabular-nums">{formatMoney(amount, currency)}</p>
      </div>
      <div
        role="meter"
        aria-label={bonusTypeLabel(type)}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-12 overflow-hidden rounded-2xl border border-line bg-fg/5"
      >
        {TRACK_TICKS.map((tick) => (
          <span key={tick} aria-hidden="true" style={{ left: `${tick}%` }} className="absolute inset-y-0 w-px border-l border-dashed border-line-strong" />
        ))}
        {share > 0 && <span aria-hidden="true" style={{ width: `max(${level}%, 3.5rem)` }} className={cx('absolute inset-y-0 left-0 border-r-2 border-current', tone.soft)} />}
        {DEPTH_BARS.filter((bar) => bar.position < level - 9).map((bar, index) => (
          <span
            key={bar.position}
            aria-hidden="true"
            style={{ left: `${bar.position}%`, height: bar.height, '--vol-delay': `${(index % 6) * 0.12}s` } as CSSProperties}
            className={cx('mkt-vol absolute bottom-1.5 w-1.5 rounded-sm', tone.solid)}
          />
        ))}
        {share > 0 && (
          <span
            aria-hidden="true"
            style={{ left: `max(calc(${level}% - 3.25rem), 0.25rem)` }}
            className={cx('absolute top-1/2 -translate-y-1/2 rounded-lg px-2 py-0.5 text-sm font-black text-[#062520] tabular-nums', tone.solid)}
          >
            {Math.round(level)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Volume bar heights (percent) for a station's share meter.
const STATION_VOLUME = [45, 70, 55, 90, 60, 80, 50, 100, 65, 85];

/** Order glyph: a pending order is a hollow dashed candle under a blinking limit line; a filled one is a solid live candle. */
function OrderGlyph({ isFilled }: { isFilled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="size-11 shrink-0">
      <rect x={1} y={1} width={38} height={38} rx={10} className="fill-fg/5 stroke-fg/10" />
      {isFilled ? (
        <g className="mkt-candle">
          <line x1={20} x2={20} y1={7} y2={33} strokeWidth={1.5} className="stroke-(--hero-buy)" />
          <rect x={14} y={11} width={12} height={18} rx={2} className="mkt-live fill-(--hero-buy)" />
        </g>
      ) : (
        <>
          <line x1={20} x2={20} y1={9} y2={33} strokeWidth={1.5} className="stroke-(--aurora-cta-from)/50" />
          <rect x={14} y={15} width={12} height={14} rx={2} fill="none" strokeWidth={1.5} strokeDasharray="3 2" className="mkt-march stroke-(--aurora-cta-from)" />
          <line x1={5} x2={35} y1={15} y2={15} strokeWidth={1.5} strokeDasharray="2 2" className="mkt-blink stroke-(--aurora-cta-from)" />
        </>
      )}
    </svg>
  );
}

/** One stop of the review pipeline: its order glyph, its count and a row of 10 volume bars lit to its share of all active claims. */
function Station({ label, hint, count, activeCount, isPending }: { label: string; hint: string; count: number; activeCount: number; isPending: boolean }) {
  const shown = useAnimatedNumber(count, 900);
  const lit = activeCount > 0 ? Math.round((count / activeCount) * STATION_VOLUME.length) : 0;

  return (
    <div className="min-w-0 flex-1 rounded-3xl border border-line bg-fg/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <OrderGlyph isFilled={!isPending} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{label}</p>
            <p className="text-xs text-fg-muted">{hint}</p>
          </div>
        </div>
        <span className={cx('text-3xl leading-none font-black tabular-nums', isPending ? 'text-(--aurora-cta-from)' : 'text-(--hero-buy)')}>{Math.round(shown)}</span>
      </div>
      <span aria-hidden="true" className="mt-4 grid h-6 grid-cols-10 items-end gap-1">
        {STATION_VOLUME.map((height, index) => {
          const isLit = index < lit;
          return (
            <span
              key={index}
              style={{ height: `${height}%`, '--vol-delay': `${index * 0.09}s` } as CSSProperties}
              className={cx('rounded-[3px]', isLit ? cx('mkt-vol', isPending ? 'bg-(--aurora-cta-from)' : 'bg-(--hero-buy)') : 'bg-fg/10')}
            />
          );
        })}
      </span>
    </div>
  );
}

/** Bonus book: the credited total as a big open figure, the tradable / losable split on depth meters, and the review pipeline from open order to filled. */
function BonusVault({ claims, currency }: { claims: BonusClaim[]; currency: string }) {
  const credited = claims.filter((claim) => claim.status === 'approved');
  const pendingCount = claims.filter((claim) => claim.status === 'pending').length;
  const activeCount = credited.length + pendingCount;
  const tradableTotal = credited.reduce((sum, claim) => sum + (claim.bonusType === 'tradable' ? (claim.amount ?? 0) : 0), 0);
  const losableTotal = credited.reduce((sum, claim) => sum + (claim.bonusType === 'losable' ? (claim.amount ?? 0) : 0), 0);
  const total = tradableTotal + losableTotal;
  const tradableShare = total > 0 ? (tradableTotal / total) * 100 : 0;
  const losableShare = total > 0 ? 100 - tradableShare : 0;
  const shownTotal = useAnimatedNumber(total, 1400);

  return (
    <section className={cx(panelClass, 'zenith-tile p-5 [animation-delay:120ms] sm:p-7')}>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-end xl:grid-cols-1 2xl:grid-cols-2">
        <div className="min-w-0">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <Icon name="wallet" size={13} />
            {translate('bonus.myEyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-fg">{translate('bonus.myTitle')}</h2>
          <p className="mt-1 max-w-md text-sm text-fg-muted">{translate('bonus.myText')}</p>
          <p className={cx(captionClass, 'mt-6')}>{translate('bonus.totalCredited')}</p>
          <p className="mt-1 text-5xl font-black tracking-tight text-fg tabular-nums sm:text-6xl">{formatMoney(shownTotal, currency)}</p>
        </div>

        <div className="flex flex-col gap-5">
          <DepthTrack type="tradable" amount={tradableTotal} share={tradableShare} currency={currency} order={0} />
          <DepthTrack type="losable" amount={losableTotal} share={losableShare} currency={currency} order={1} />
        </div>
      </div>

      {/* Pipeline: a request waits as an open order, then order dots run along the route until it is filled as credited. */}
      <div className="mt-7 flex flex-col items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
        <Station label={translate('bonus.pendingCount')} hint={translate('bonus.statusPending')} count={pendingCount} activeCount={activeCount} isPending />
        <span aria-hidden="true" className="relative mx-auto h-10 w-px border-l-2 border-dashed border-(--hero-buy)/40 sm:mx-0 sm:h-px sm:w-24 sm:border-t-2 sm:border-l-0">
          {[0, 0.7, 1.4].map((delay) => (
            <span key={delay} style={{ animationDelay: `${delay}s` }} className="mkt-flow absolute top-1/2 hidden size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--hero-buy) shadow-[0_0_0_3px_color-mix(in_oklab,var(--hero-buy)_25%,transparent)] sm:block" />
          ))}
          <Icon name="chevronRight" size={14} className="absolute top-1/2 -right-2 hidden -translate-y-1/2 text-(--hero-buy) sm:block" />
        </span>
        <Station label={translate('bonus.creditedCount')} hint={translate('bonus.statusApproved')} count={credited.length} activeCount={activeCount} isPending={false} />
      </div>
    </section>
  );
}

const claimBeadIcon: Record<BonusClaimStatus, IconName> = { approved: 'check', pending: 'clock', rejected: 'close' };

/** One credited or awaited bonus as a slim row: status bead, type and status, account · deposit ref, and its value. */
function ClaimRow({ claim, currency, order }: { claim: BonusClaim; currency: string; order: number }) {
  const isPending = claim.status === 'pending';

  let bonusValue: ReactNode;
  if (claim.amount !== null) {
    bonusValue = <span className="text-lg font-black text-success tabular-nums">+{formatMoney(claim.amount, currency)}</span>;
  } else if (isPending) {
    bonusValue = <span className="text-xs font-medium text-fg-muted animate-pulse motion-reduce:animate-none">{translate('bonus.awaitingAdmin')}</span>;
  } else {
    bonusValue = <span className="text-lg font-bold text-fg-subtle">—</span>;
  }

  return (
    <li style={{ animationDelay: `${300 + order * 90}ms` }} className="group/claim zenith-tile grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2 py-3 transition-colors duration-300 hover:bg-fg/[0.04] motion-reduce:transition-none">
      <span aria-hidden="true" className="relative grid size-9 place-items-center">
        {isPending && <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from)/40 motion-reduce:hidden" />}
        <span
          className={cx(
            'relative grid size-9 place-items-center rounded-lg transition-transform duration-300 group-hover/claim:scale-110 motion-reduce:transition-none',
            timelineNodeClass[claim.status],
          )}
        >
          <Icon name={claimBeadIcon[claim.status]} size={14} />
        </span>
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <BonusTypeChip type={claim.bonusType} />
          <span className={cx('text-[11px] font-semibold', claim.status === 'approved' ? 'text-success' : 'text-fg-muted')}>{claimStatusLabel(claim.status)}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[10.5px] text-fg-subtle">
          {claim.account} · {claim.depositRef}
        </p>
      </div>
      <div className="text-right">
        <p className="min-h-6">{bonusValue}</p>
        <p className="text-[11px] text-fg-subtle tabular-nums">
          {translate('bonus.fromDeposit')} {formatMoney(claim.depositAmount, currency)}
        </p>
      </div>
    </li>
  );
}

// Heights (percent) of the volume ticks pumping along the top edge of each campaign card.
const EDGE_TICKS = Array.from({ length: 36 }, (_, index) => 30 + ((index * 37) % 70));
const BOOST_VOLUME = [40, 75, 55, 90, 65, 100];

/** Deposit vs. deposit + bonus as two candles: the bonus block rises onto the deposit while the limit line marches over it. */
function BoostChart({ percent, order }: { percent: number; order: number }) {
  const base = 34;
  const boost = Math.round((Math.min(percent, 150) / 150) * 50) + 8;
  const boostTop = 96 - base - boost;
  const delay = 0.3 + order * 0.15;

  return (
    <svg aria-hidden="true" viewBox="0 0 96 112" className="h-28 w-24 overflow-visible">
      {[24, 48, 72].map((y) => (
        <line key={y} x1={0} x2={96} y1={y} y2={y} strokeDasharray="2 4" className="stroke-fg/10" />
      ))}
      <line x1={0} x2={96} y1={96} y2={96} className="stroke-fg/25" />
      {BOOST_VOLUME.map((height, index) => (
        <rect
          key={index}
          x={8 + index * 14}
          y={112 - height * 0.12}
          width={8}
          height={height * 0.12}
          rx={1}
          className="mkt-vol fill-fg/20"
          style={{ '--vol-delay': `${index * 0.15}s` } as CSSProperties}
        />
      ))}
      <rect x={12} y={96 - base} width={22} height={base} rx={3} className="mkt-candle fill-fg/25" style={{ '--candle-delay': `${delay}s` } as CSSProperties} />
      <rect x={60} y={96 - base} width={22} height={base} rx={3} className="mkt-candle fill-(--hero-buy)/35" style={{ '--candle-delay': `${delay + 0.15}s` } as CSSProperties} />
      <rect x={60} y={boostTop} width={22} height={boost} rx={3} className="mkt-rise fill-(--hero-buy)" style={{ '--rise-delay': `${delay + 0.6}s` } as CSSProperties} />
      <path d={`M23 ${90 - base} Q 40 ${boostTop - 16} 56 ${boostTop - 4}`} fill="none" strokeWidth={1.5} strokeDasharray="3 3" className="mkt-march stroke-(--aurora-cta-from)" />
      <path d={`M51 ${boostTop - 9} L57 ${boostTop - 4} L50 ${boostTop - 1}`} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-(--aurora-cta-from)" />
      <line x1={0} x2={96} y1={boostTop} y2={boostTop} strokeDasharray="4 3" className="mkt-march stroke-(--hero-buy)/70" />
      <circle cx={71} cy={boostTop} r={3} className="animate-ping-soft fill-(--hero-buy) [transform-box:fill-box] origin-center motion-reduce:hidden" />
      <circle cx={71} cy={boostTop} r={3} className="fill-(--hero-buy)" />
    </svg>
  );
}

/**
 * One campaign as a compact bonus contract: a strip of pumping volume ticks on top, mode and duration chips, the
 * counting-up match percent beside a chart where the bonus block rises onto the deposit, a dashed settlement line with
 * an order dot running along it, then the terms, the allowed groups and the claim button with a glare sweeping across.
 */
function BonusVoucher({ campaign, claimCount, currency, order }: { campaign: BonusCampaign; claimCount: number; currency: string; order: number }) {
  const isRequest = campaign.claimMode === 'request';
  const groups = campaign.allowedGroups.length === 0 ? [translate('bonus.allGroups')] : campaign.allowedGroups;
  const duration = campaign.durationDays === null ? `∞ ${durationLabel(campaign)}` : durationLabel(campaign);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const shownPercent = useAnimatedNumber(campaign.percent, 1200);

  const terms: { key: string; icon: IconName; label: string; value: string }[] = [
    { key: 'min', icon: 'deposit', label: translate('bonus.minDeposit'), value: wholeMoney(campaign.minDeposit, currency) },
    { key: 'cap', icon: 'gift', label: translate('bonus.maxCap'), value: wholeMoney(campaign.maxCap, currency) },
    { key: 'duration', icon: 'history', label: translate('bonus.duration'), value: duration },
  ];

  return (
    <article
      style={{ animationDelay: `${200 + order * 110}ms` }}
      className={cx(panelClass, 'zenith-tile flex flex-col transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none')}
    >
      {/* Volume ticks pumping along the top edge. */}
      <span aria-hidden="true" className="flex h-2.5 items-end gap-[3px] overflow-hidden px-4 pt-1">
        {EDGE_TICKS.map((height, index) => (
          <span
            key={index}
            style={{ height: `${height}%`, '--vol-delay': `${(index % 9) * 0.1}s` } as CSSProperties}
            className={cx('mkt-vol w-1 flex-1 rounded-full', index % 4 === 3 ? 'bg-(--aurora-cta-from)/60' : 'bg-(--hero-buy)/45')}
          />
        ))}
      </span>

      <div className="relative overflow-hidden p-5 pt-4">
        <div className="relative flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--hero-buy)/35 bg-(--hero-buy)/10 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.12em] text-fg uppercase">
            <span aria-hidden="true" className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--hero-buy) motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-(--hero-buy)" />
            </span>
            {translate(isRequest ? 'bonus.modeRequest' : 'bonus.modeAuto')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/10 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.1em] text-fg-muted uppercase">
            <Icon name="history" size={12} />
            {duration}
          </span>
        </div>

        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={captionClass}>{translate('bonus.matchLabel')}</p>
            <p aria-hidden="true" className="mt-1 flex items-start leading-none text-fg">
              <span className="text-(--hero-buy) mt-3 mr-1 text-2xl font-black">▲</span>
              <span className="text-[64px] font-black tracking-tighter tabular-nums">{Math.round(shownPercent)}</span>
              <span className="mt-2 text-3xl font-black text-(--aurora-cta-from)">%</span>
            </p>
          </div>
          {/* Chart screen: deposit candle, the bonus block rising onto it, and a glare passing over the glass. */}
          <span className="relative grid h-32 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-(--hero-buy)/25 bg-[#0b1311]/70 light:bg-surface-2">
            <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-8 -skew-x-12 bg-white/[0.07]" />
            <BoostChart percent={campaign.percent} order={order} />
          </span>
        </div>

        <h2 className="relative mt-4 text-lg font-black tracking-tight text-fg">
          <span className="sr-only">{campaign.percent}% </span>
          {campaign.name}
        </h2>
        <p className="relative mt-0.5 text-xs text-fg-muted">
          {campaign.kind} · {campaign.category}
        </p>
      </div>

      {/* Settlement line: an order dot keeps running along the dashed rule. */}
      <span aria-hidden="true" className="relative mx-5 block border-t border-dashed border-(--hero-buy)/30">
        <span style={{ animationDelay: `${order * 0.3}s` }} className="mkt-flow absolute -top-[3.5px] size-1.5 -translate-x-1/2 rounded-full bg-(--hero-buy)" />
      </span>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <dl className="grid grid-cols-3 gap-2">
          {terms.map((term) => (
            <div key={term.key} className="group/term flex min-w-0 flex-col gap-1 rounded-[6px_18px_6px_18px] border border-line bg-fg/[0.03] px-3 py-2.5 transition-colors duration-300 hover:border-(--hero-buy)/50 motion-reduce:transition-none">
              <dt className="flex items-center gap-1 truncate text-[10px] tracking-[0.08em] text-fg-subtle uppercase">
                <Icon name={term.icon} size={11} className="shrink-0" />
                <span className="truncate">{term.label}</span>
              </dt>
              <dd className="truncate text-sm font-bold text-fg tabular-nums">{term.value}</dd>
            </div>
          ))}
        </dl>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          <Icon name="wallet" size={13} />
          {translate('bonus.allowedGroups')}:
          {groups.map((group) => (
            <span key={group} className="rounded-full bg-(--hero-buy)/12 px-2.5 py-0.5 text-[11px] font-semibold text-fg">
              {group}
            </span>
          ))}
        </p>
        <p className="text-[11px] text-fg-subtle">{translate(isRequest ? 'bonus.modeRequestHint' : 'bonus.modeAutoHint')}</p>

        <div className="mt-auto flex items-center gap-3">
          <Button type="button" className="relative flex-1 overflow-hidden rounded-full" aria-haspopup="dialog" onClick={() => setIsDetailsOpen(true)}>
            <span aria-hidden="true" className="mkt-sweep absolute inset-y-0 w-12 -skew-x-12 bg-white/35" />
            <Icon name="bolt" size={15} className="relative" />
            <span className="relative">{translate('bonus.depositToClaim')}</span>
          </Button>
          {claimCount > 0 && (
            <p className="flex shrink-0 items-center gap-1.5 text-[11px] text-fg-subtle">
              {translate('bonus.myEyebrow')}
              <span className="rounded-full bg-(--aurora-cta-from) px-1.5 font-bold text-[#062520] tabular-nums">{claimCount}</span>
            </p>
          )}
        </div>
      </div>
      {isDetailsOpen && <BonusDetailsModal campaign={campaign} onClose={() => setIsDetailsOpen(false)} />}
    </article>
  );
}

/** The client's held and awaited bonuses, grouped under the campaign each came from. */
function MyBonusesPanel({ campaigns, claims, currency }: { campaigns: BonusCampaign[]; claims: BonusClaim[]; currency: string }) {
  const groups = campaigns
    .map((campaign) => ({ campaign, claims: claims.filter((claim) => claim.campaignId === campaign.id) }))
    .filter((group) => group.claims.length > 0);

  return (
    <section className={cx(panelClass, 'zenith-tile p-5 [animation-delay:220ms] sm:p-6')}>
      <header className="flex items-center justify-between gap-3 pb-4">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <Icon name="wallet" size={13} />
          {translate('bonus.myEyebrow')}
        </p>
        <span className="grid min-w-8 place-items-center rounded-full bg-(--aurora-cta-from) px-2 py-0.5 text-xs font-black text-[#062520] tabular-nums">{claims.length}</span>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line py-10 text-center text-sm text-fg-muted">{translate('bonus.noClaims')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.campaign.id} className="rounded-3xl border border-line bg-fg/[0.02] p-2">
              <p className="flex items-center gap-2 px-2 pt-1 text-sm font-bold text-fg">
                {campaignTitle(group.campaign)}
                <span className="rounded-full bg-fg/10 px-1.5 text-[10px] font-semibold tabular-nums">{group.claims.length}</span>
              </p>
              <ul className="mt-1 flex flex-col">
                {group.claims.map((claim, index) => (
                  <ClaimRow key={claim.id} claim={claim} currency={currency} order={index} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GlassEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className={cx(panelClass, 'zenith-tile flex flex-col items-center px-6 py-16 text-center')}>
      <span className="mb-6">
        <MarketChart />
      </span>
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Date stamp for the claim: a trade-slip with the month on a sage header bar, the big day and the year underneath. */
function DateStamp({ iso }: { iso: string }) {
  const date = Date.parse(iso);
  return (
    <span aria-hidden="true" className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-lg border border-line bg-fg/[0.03] pb-2 text-center transition-colors duration-300 group-hover/entry:border-(--hero-buy)/50 motion-reduce:transition-none">
      <span className="w-full bg-(--hero-buy)/15 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-(--hero-buy) uppercase">{monthFormatter.format(date)}</span>
      <span className="mt-1.5 text-2xl leading-none font-black text-fg tabular-nums">{dayFormatter.format(date)}</span>
      <span className="mt-1 font-mono text-[9.5px] text-fg-subtle">{yearFormatter.format(date)}</span>
    </span>
  );
}

const timelineNodeClass: Record<BonusClaimStatus, string> = {
  approved: 'bg-(--hero-buy) text-[#062520]',
  pending: 'bg-(--aurora-cta-from) text-[#062520]',
  rejected: 'border border-line-strong bg-app text-fg-subtle',
};

function ClaimEntry({ claim, campaign, currency, order }: { claim: BonusClaim; campaign: BonusCampaign | undefined; currency: string; order: number }) {
  const isApproved = claim.status === 'approved';
  const isPending = claim.status === 'pending';
  const isRejected = claim.status === 'rejected';
  const dateLabel = claim.creditedAt
    ? translate('bonus.creditedOn', { date: claimDateFormatter.format(Date.parse(claim.creditedAt)) })
    : translate('bonus.requestedOn', { date: claimDateFormatter.format(Date.parse(claim.claimedAt)) });

  let bonusValue: ReactNode;
  if (claim.amount !== null) {
    bonusValue = <span className="text-base font-black text-success tabular-nums">+{formatMoney(claim.amount, currency)}</span>;
  } else if (isPending) {
    bonusValue = <span className="zenith-blink text-xs font-medium text-fg-muted">{translate('bonus.awaitingAdmin')}</span>;
  } else {
    bonusValue = <span className="text-base font-semibold text-fg-subtle">—</span>;
  }

  return (
    <li style={{ animationDelay: `${order * 90}ms` }} className="group/entry zenith-tile relative pb-5 pl-10 last:pb-0">
      {/* Fill marker on the price line: pending pulses clay, credited is sage with an up-tick rising beside it, rejected stays hollow. */}
      <span aria-hidden="true" className="absolute top-5 left-0 grid size-7 place-items-center">
        {isPending && <span className="absolute inset-0 animate-ping-soft rounded-full bg-(--aurora-cta-from)/40 motion-reduce:hidden" />}
        {isApproved && (
          <span className="mkt-rise absolute -top-2 left-5 grid size-4 place-items-center rounded bg-(--hero-buy) text-[#062520]" style={{ '--rise-delay': `${0.6 + order * 0.15}s` } as CSSProperties}>
            <Icon name="trendUp" size={10} />
          </span>
        )}
        <span className={cx('relative grid size-7 place-items-center rounded-full', timelineNodeClass[claim.status])}>
          <Icon name={claimBeadIcon[claim.status]} size={13} />
        </span>
      </span>

      <div
        className={cx(
          'grid items-center gap-4 rounded-3xl border border-line bg-fg/[0.02] p-4 transition-colors duration-300 group-hover/entry:border-line-strong motion-reduce:transition-none sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto]',
          isRejected && 'opacity-60',
        )}
      >
        <DateStamp iso={claim.creditedAt ?? claim.claimedAt} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-fg">{campaign ? campaignTitle(campaign) : claim.campaignId}</p>
            <BonusTypeChip type={claim.bonusType} />
            <Badge tone={claimTone[claim.status]} dot>
              {claimStatusLabel(claim.status)}
            </Badge>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="wallet" size={12} />
              {claim.account}
            </span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span className="font-mono text-fg-subtle">{claim.depositRef}</span>
            <span aria-hidden="true" className="text-fg-subtle">·</span>
            <span>{dateLabel}</span>
          </p>
        </div>

        {/* Deposit → bonus: an order dot runs along the dashed route once the bonus is credited. */}
        <dl className="flex items-center gap-3 rounded-full bg-fg/5 py-2 pr-4 pl-4 sm:col-span-2 lg:col-span-1">
          <div>
            <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.fromDeposit')}</dt>
            <dd className="text-sm font-semibold text-fg tabular-nums">{formatMoney(claim.depositAmount, currency)}</dd>
          </div>
          <div aria-hidden="true" className="relative flex w-20 shrink-0 items-center justify-center">
            <span className="absolute inset-x-0 border-t-2 border-dashed border-line-strong" />
            {isApproved && (
              <span className="absolute inset-x-0 top-1/2">
                <span className="mkt-flow absolute -top-[4px] size-2 -translate-x-1/2 rounded-full bg-(--hero-buy)" />
              </span>
            )}
            {campaign && (
              <span className={cx('relative rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums', isApproved ? 'bg-(--hero-buy) text-[#062520]' : 'bg-surface-2 text-fg-muted ring-1 ring-line')}>
                {campaign.percent}%
              </span>
            )}
          </div>
          <div className="text-right">
            <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.bonusAmount')}</dt>
            <dd>{bonusValue}</dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

const statusSegmentClass: Record<BonusClaimStatus, string> = {
  approved: 'bg-(--hero-buy)',
  pending: 'bg-(--aurora-cta-from)',
  rejected: 'bg-fg/20',
};

function ClaimHistory({ claims, campaigns, currency }: { claims: BonusClaim[]; campaigns: BonusCampaign[]; currency: string }) {
  const creditedTotal = claims.reduce((sum, claim) => sum + (claim.status === 'approved' ? (claim.amount ?? 0) : 0), 0);
  const shownTotal = useAnimatedNumber(creditedTotal, 1400);

  if (claims.length === 0) {
    return (
      <GlassEmpty
        title={translate('bonus.noClaims')}
        text={translate('bonus.noClaimsText')}
        action={
          <LinkButton href="/deposit" variant="outline" className="rounded-full">
            <Icon name="deposit" size={16} />
            {translate('bonus.makeDeposit')}
          </LinkButton>
        }
      />
    );
  }

  const summary = (
    [
      { status: 'approved', label: translate('bonus.creditedCount') },
      { status: 'pending', label: translate('bonus.pendingCount') },
      { status: 'rejected', label: translate('bonus.statusRejected') },
    ] satisfies { status: BonusClaimStatus; label: string }[]
  ).map((item) => ({ ...item, count: claims.filter((claim) => claim.status === item.status).length }));

  return (
    <div className="flex flex-col gap-6">
      {/* Open summary: credited total as a big figure, then one capsule track split by status with its legend. */}
      <section className={cx(panelClass, 'zenith-tile p-5 sm:p-7')}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className={captionClass}>{translate('bonus.totalCredited')}</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-fg tabular-nums sm:text-5xl">{formatMoney(shownTotal, currency)}</p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-3">
            {summary.map((item) => (
              <div key={item.status} className="flex items-center gap-2.5">
                <span aria-hidden="true" className={cx('size-2.5 rounded-full', statusSegmentClass[item.status])} />
                <dt className="text-xs font-semibold text-fg-muted">{item.label}</dt>
                <dd className="text-lg font-black text-fg tabular-nums">{item.count}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div aria-hidden="true" className="mt-5 flex h-4 gap-1 overflow-hidden rounded-full border border-line bg-fg/5 p-0.5">
          {summary
            .filter((item) => item.count > 0)
            .map((item, index) => (
              <span
                key={item.status}
                style={{ flexGrow: item.count, animationDelay: `${300 + index * 150}ms` }}
                className={cx('zenith-reveal relative basis-0 overflow-hidden rounded-full', statusSegmentClass[item.status])}
              >
                {item.status === 'pending' && <span className="zenith-scan-x absolute inset-y-0 left-0 w-6 bg-white/40" />}
              </span>
            ))}
        </div>
      </section>

      <ol className="relative">
        {/* The price line the claims sit on: it draws down from the top when the history opens. */}
        <span aria-hidden="true" className="mkt-grow-down absolute top-6 bottom-6 left-[12px] w-1 rounded-full bg-linear-to-b from-(--hero-buy) via-(--hero-buy)/50 to-(--hero-buy)/10" />
        {claims.map((claim, index) => (
          <ClaimEntry key={claim.id} claim={claim} campaign={campaigns.find((item) => item.id === claim.campaignId)} currency={currency} order={index} />
        ))}
      </ol>
    </div>
  );
}

export default function BonusesPage() {
  const { data, isLoading } = useBonuses();
  const tabsId = useId();
  const [tab, setTab] = useState<BonusTab>('available');

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
          <Skeleton className="h-96 rounded-[28px]" />
          <Skeleton className="h-96 rounded-[28px]" />
        </div>
        <Skeleton className="h-72 rounded-[28px]" />
      </div>
    );
  }

  let panel: ReactNode;
  if (tab === 'history') {
    panel = <ClaimHistory claims={data.claims} campaigns={data.campaigns} currency={data.currency} />;
  } else if (data.campaigns.length === 0) {
    panel = <GlassEmpty title={translate('bonus.noCampaigns')} text={translate('bonus.noCampaignsText')} />;
  } else {
    panel = (
      <div className="flex flex-col gap-8">
        {/* Offers lead as a ticket grid that wraps to any number of campaigns. */}
        <section aria-label={translate('bonus.available')} className="flex flex-col gap-4">
          <p className={cx(captionClass, 'flex items-center gap-2')}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-(--hero-buy)" />
            {translate('bonus.available')}
            <span className="rounded-full bg-(--hero-buy) px-1.5 text-[10px] tracking-normal text-[#062520] tabular-nums">{data.campaigns.length}</span>
            <span aria-hidden="true" className="flex-1 border-t border-dashed border-(--hero-buy)/30" />
          </p>
          <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
            {data.campaigns.map((campaign, index) => (
              <BonusVoucher
                key={campaign.id}
                campaign={campaign}
                claimCount={data.claims.filter((claim) => claim.campaignId === campaign.id && claim.status !== 'rejected').length}
                currency={data.currency}
                order={index}
              />
            ))}
          </div>
        </section>
        {/* The credited vault sits beside the held / awaited list; rejected requests stay in Claim History. */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <BonusVault claims={data.claims} currency={data.currency} />
          <MyBonusesPanel campaigns={data.campaigns} claims={data.claims.filter((claim) => claim.status !== 'rejected')} currency={data.currency} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BonusHero tab={tab} onTabChange={setTab} tabsId={tabsId} campaigns={data.campaigns} claimCount={data.claims.length} currency={data.currency} />
      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`}>
        {panel}
      </div>
    </div>
  );
}
