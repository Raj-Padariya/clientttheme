'use client';

import { useId, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useBonuses, type BonusCampaign, type BonusClaim, type BonusClaimStatus, type BonusType } from '@/core/pages/useBonuses';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Badge, Skeleton, type Tone } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { BonusDetailsModal } from './BonusDetailsModal';
import { useAnimatedNumber } from './ScratchExperience';

type BonusTab = 'available' | 'history';

const captionClass = 'text-[10.5px] tracking-[0.14em] uppercase';
const glassClass =
  'relative isolate overflow-hidden rounded-[28px] border border-fg/10 bg-surface/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_60px_-40px_rgba(0,0,0,0.85)] backdrop-blur-2xl';


// Keeps a sliver of liquid visible in the orb even for very small bonus percentages.
const ORB_MIN_FILL_PERCENT = 12;
// Two full wave periods across 240 units; the strip is twice the orb's width and slides by half, so the loop is seamless.
const WAVE_PATH = 'M0 10 Q30 0 60 10 T120 10 T180 10 T240 10 V20 H0 Z';
const SPARKLE_PATH = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z';

const ORB_STARS = [
  { top: 18, left: 30, delay: 0 },
  { top: 26, left: 68, delay: 900 },
  { top: 40, left: 20, delay: 1800 },
  { top: 34, left: 50, delay: 500 },
  { top: 22, left: 48, delay: 1300 },
];

const claimTone: Record<BonusClaimStatus, Tone> = { pending: 'info', approved: 'success', rejected: 'neutral' };
const claimDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

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

function Aurora() {
  return (
    <>
      {/* The page clips horizontally, so every blob keeps a margin wider than its 64px blur from the edges — otherwise the glow is cut in a hard line. */}
      <span aria-hidden="true" className="pointer-events-none absolute top-20 left-20 -z-10 size-[24rem] rounded-full bg-primary/15 blur-3xl animate-ring-breathe motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/3 right-20 -z-10 size-80 rounded-full bg-success/10 blur-3xl animate-ring-breathe [animation-delay:1.5s] motion-reduce:animate-none" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-20 left-1/3 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />
    </>
  );
}

function GiftOrb() {
  return (
    <span aria-hidden="true" className="relative flex size-16 shrink-0 items-center justify-center">
      <span className="absolute inset-0 rounded-full border border-primary/30 animate-ring-ripple motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-orbit motion-reduce:animate-none">
        <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
      </span>
      <span className="relative flex size-12 items-center justify-center rounded-full border border-fg/15 bg-fg/[0.06] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl">
        <Icon name="gift" size={22} />
      </span>
    </span>
  );
}

function BonusHero({
  tab,
  onTabChange,
  tabsId,
  campaignCount,
  claimCount,
}: {
  tab: BonusTab;
  onTabChange: (next: BonusTab) => void;
  tabsId: string;
  campaignCount: number;
  claimCount: number;
}) {
  const tabs: { value: BonusTab; label: string; count: number }[] = [
    { value: 'available', label: translate('bonus.available'), count: campaignCount },
    { value: 'history', label: translate('bonus.history'), count: claimCount },
  ];

  return (
    <section className={cx(glassClass, 'glow-border border-transparent p-6 sm:p-8')}>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <GiftOrb />
          <div>
            <p className={cx(captionClass, 'text-primary')}>{translate('nav.promotion')}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('bonus.campaignsTitle')}</h1>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('bonus.campaignsText')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="tablist" aria-label={translate('bonus.tabs')} className="flex w-fit gap-1 rounded-full border border-fg/10 bg-fg/[0.04] p-1 backdrop-blur-xl">
            {tabs.map((item) => (
              <button
                key={item.value}
                id={`${tabsId}-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                aria-controls={`${tabsId}-panel`}
                onClick={() => onTabChange(item.value)}
                className={cx(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-[background-color,color,transform] duration-200 active:scale-95 motion-reduce:transition-none',
                  tab === item.value
                    ? 'text-on-primary shadow-[0_10px_24px_-14px_var(--brand-primary)] [background-image:var(--brand-gradient)]'
                    : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
                <span className={cx('rounded-full px-1.5 text-[10px] tabular-nums', tab === item.value ? 'bg-black/20' : 'bg-fg/10')}>{item.count}</span>
              </button>
            ))}
          </div>
          <LinkButton href="/deposit">
            <Icon name="deposit" size={16} />
            {translate('bonus.makeDeposit')}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function OrbStat({ label, value, valueClass = 'text-fg' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0 px-2.5 py-2 text-center">
      <dt className="truncate text-[10px] tracking-[0.08em] text-fg-subtle uppercase">{label}</dt>
      <dd className={cx('mt-0.5 truncate text-sm font-semibold tabular-nums', valueClass)}>{value}</dd>
    </div>
  );
}

function Sparkle({ className, delayMs = 0 }: { className: string; delayMs?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx('animate-twinkle motion-reduce:animate-none', className)} style={{ animationDelay: `${delayMs}ms` }}>
      <path d={SPARKLE_PATH} fill="currentColor" />
    </svg>
  );
}

// 3D glass orb: a bevelled gold rim around a dark sphere filled with liquid up to the bonus percent.
function LiquidOrb({ percent }: { percent: number }) {
  const level = Math.min(Math.max(percent, ORB_MIN_FILL_PERCENT), 100);

  return (
    <div aria-hidden="true" className="relative size-28 shrink-0">
      <span className="absolute -inset-5 rounded-full bg-[radial-gradient(circle,var(--brand-primary)_0%,transparent_65%)] opacity-40 blur-lg animate-ring-breathe motion-reduce:animate-none" />

      {/* Bevelled rim: light from the top-left, shade towards the bottom-right, plus a drop shadow for depth. */}
      <div className="relative size-full rounded-full bg-[linear-gradient(145deg,#fff6d6_0%,var(--brand-primary)_30%,#4a380c_68%,var(--brand-primary)_100%)] p-[5px] shadow-[0_0_34px_-4px_var(--brand-primary),0_14px_28px_-8px_rgba(0,0,0,0.85)]">
        <div className="relative size-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_28%,#231b0f,#040302_72%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6)]">
          {ORB_STARS.map((star) => (
            <span
              key={`${star.top}-${star.left}`}
              className="absolute size-0.5 rounded-full bg-white animate-twinkle motion-reduce:animate-none"
              style={{ top: `${star.top}%`, left: `${star.left}%`, animationDelay: `${star.delay}ms` }}
            />
          ))}

          <div className="absolute inset-x-0 bottom-0 bg-linear-to-b from-primary via-primary/70 to-[#3a2b08]" style={{ height: `${level}%` }}>
            <svg viewBox="0 0 240 20" preserveAspectRatio="none" className="absolute bottom-[calc(100%-2px)] left-0 h-4 w-[200%] text-primary/45 animate-liquid-wave [animation-direction:reverse] [animation-duration:5s] motion-reduce:animate-none">
              <path d={WAVE_PATH} fill="currentColor" />
            </svg>
            <svg viewBox="0 0 240 20" preserveAspectRatio="none" className="absolute bottom-[calc(100%-2px)] left-0 h-3.5 w-[200%] text-primary animate-liquid-wave motion-reduce:animate-none">
              <path d={WAVE_PATH} fill="currentColor" />
            </svg>
            <span className="absolute inset-x-0 top-0 h-2 bg-linear-to-b from-[#fff4d6]/60 to-transparent" />
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(255,244,214,0.45),transparent_65%)]" />
          </div>

          {/* Glass depth: shaded lower edge, a broad soft reflection and a sharp glint near the top-left. */}
          <span className="absolute inset-0 rounded-full shadow-[inset_0_-14px_22px_rgba(0,0,0,0.6),inset_0_4px_10px_rgba(255,255,255,0.15)]" />
          <span className="absolute top-[8%] left-[18%] h-[30%] w-[52%] -rotate-12 rounded-[50%] bg-linear-to-b from-white/30 to-transparent" />
          <span className="absolute top-[16%] left-[24%] size-1.5 rounded-full bg-white/80 blur-[1px]" />
        </div>
      </div>
    </div>
  );
}

const claimStatusText: Record<BonusClaimStatus, string> = { pending: 'text-fg-muted', approved: 'text-success', rejected: 'text-fg-subtle' };

function ClaimLine({ claim, currency }: { claim: BonusClaim; currency: string }) {
  let bonusValue: ReactNode;
  if (claim.amount !== null) {
    bonusValue = <span className="text-sm font-semibold text-primary tabular-nums">+{formatMoney(claim.amount, currency)}</span>;
  } else if (claim.status === 'pending') {
    bonusValue = <span className="text-[11px] font-medium text-fg-muted animate-pulse motion-reduce:animate-none">{translate('bonus.awaitingAdmin')}</span>;
  } else {
    bonusValue = <span className="text-sm font-semibold text-fg-subtle">—</span>;
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BonusTypeChip type={claim.bonusType} />
          <span className={cx('inline-flex items-center gap-1 text-[11px] font-medium', claimStatusText[claim.status])}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {claimStatusLabel(claim.status)}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] text-fg-subtle">
          {claim.account} · <span className="font-mono">{claim.depositRef}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        {bonusValue}
        <span className="mt-0.5 text-[10px] text-fg-subtle tabular-nums">
          {translate('bonus.fromDeposit')} {formatMoney(claim.depositAmount, currency)}
        </span>
      </div>
    </li>
  );
}

function BonusPass({ campaign, claims, currency, order }: { campaign: BonusCampaign; claims: BonusClaim[]; currency: string; order: number }) {
  const isRequest = campaign.claimMode === 'request';
  const groups = campaign.allowedGroups.length === 0 ? [translate('bonus.allGroups')] : campaign.allowedGroups;
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <article
      className={cx(glassClass, 'group flex h-full animate-rise flex-col p-5 transition-[border-color] duration-300 hover:border-primary/35 motion-reduce:animate-none motion-reduce:transition-none')}
      style={{ animationDelay: `${order * 90}ms` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-10 -z-10 size-64 rounded-full bg-primary/15 blur-3xl" />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-fg">
            <span className="sr-only">{campaign.percent}% </span>
            {campaign.name}
          </h2>
          <p className="mt-0.5 text-[11px] text-fg-subtle">{translate(isRequest ? 'bonus.modeRequestHint' : 'bonus.modeAutoHint')}</p>
        </div>
        <Badge tone={isRequest ? 'info' : 'success'} dot>
          {translate(isRequest ? 'bonus.modeRequest' : 'bonus.modeAuto')}
        </Badge>
      </header>

      <div className="relative mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
        <LiquidOrb percent={campaign.percent} />

        <div className="relative min-w-0">
          <span aria-hidden="true" className="pointer-events-none absolute -top-3 right-0 h-12 w-14">
            <Sparkle className="absolute top-0 right-0 size-3.5 text-primary drop-shadow-[0_0_6px_var(--brand-primary)]" />
            <Sparkle className="absolute top-3 right-5 size-7 text-primary drop-shadow-[0_0_10px_var(--brand-primary)]" delayMs={700} />
            <Sparkle className="absolute right-0 bottom-0 size-3 text-primary drop-shadow-[0_0_6px_var(--brand-primary)]" delayMs={1400} />
          </span>

          <p className="pr-12 text-xs text-fg-muted">
            {campaign.kind} <span className="text-fg-subtle">·</span> {campaign.category}
          </p>
          <p aria-hidden="true" className="mt-1">
            <span className="bg-clip-text text-5xl leading-none font-black tracking-tighter text-transparent tabular-nums drop-shadow-[0_4px_14px_color-mix(in_srgb,var(--brand-primary)_45%,transparent)] [background-image:linear-gradient(180deg,#fff8e6_0%,var(--brand-primary)_55%,#8a6a1c_100%)]">
              {campaign.percent}%
            </span>
          </p>
          <p className="mt-1.5 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">{translate('bonus.matchLabel')}</p>
          <p className="mt-2 text-xs text-fg-muted">
            {translate('bonus.allowedGroups')}: <span className="font-semibold text-success">{groups.join(', ')}</span>
          </p>
        </div>
      </div>

      <div className="relative mt-5">

        <div className="relative isolate overflow-hidden rounded-[22px] border border-primary/25 bg-linear-to-br from-primary/[0.1] via-surface/60 to-surface/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_40px_-20px_var(--brand-primary)] backdrop-blur-xl">
          <span aria-hidden="true" className="pointer-events-none absolute top-0 left-14 -z-10 h-24 w-56 -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--brand-primary)_40%,transparent),transparent_70%)]" />

          <dl className="grid grid-cols-3 divide-x divide-fg/10 rounded-xl border border-fg/10 bg-black/20">
            <OrbStat label={translate('bonus.maxCap')} value={wholeMoney(campaign.maxCap, currency)} valueClass="text-primary" />
            <OrbStat label={translate('bonus.minDeposit')} value={wholeMoney(campaign.minDeposit, currency)} />
            <OrbStat label={translate('bonus.duration')} value={campaign.durationDays === null ? `∞ ${durationLabel(campaign)}` : durationLabel(campaign)} />
          </dl>

          {claims.length > 0 && (
            <div className="mt-4 border-t border-fg/10 pt-3">
              <p className={cx(captionClass, 'mb-2 text-fg-subtle')}>{translate('bonus.myEyebrow')}</p>
              <ul className="flex flex-col divide-y divide-fg/10">
                {claims.map((claim) => (
                  <ClaimLine key={claim.id} claim={claim} currency={currency} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button type="button" fullWidth aria-haspopup="dialog" onClick={() => setIsDetailsOpen(true)}>
          <Icon name="bolt" size={15} />
          {translate('bonus.depositToClaim')}
        </Button>
      </div>
      {isDetailsOpen && <BonusDetailsModal campaign={campaign} onClose={() => setIsDetailsOpen(false)} />}
    </article>
  );
}

function BonusTypeChip({ type }: { type: BonusType }) {
  const isTradable = type === 'tradable';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        isTradable ? 'border-success/30 bg-success/10 text-success' : 'border-primary/30 bg-primary-soft/50 text-primary',
      )}
    >
      <Icon name={isTradable ? 'trendUp' : 'lock'} size={11} />
      {bonusTypeLabel(type)}
    </span>
  );
}

const claimNodeClass: Record<BonusClaimStatus, string> = {
  approved: 'border-primary bg-primary shadow-[0_0_12px_var(--brand-primary)]',
  pending: 'border-fg/70 bg-surface',
  rejected: 'border-fg/25 bg-fg/10',
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
    bonusValue = <span className="text-base font-semibold text-primary tabular-nums">+{formatMoney(claim.amount, currency)}</span>;
  } else if (isPending) {
    bonusValue = <span className="text-xs font-medium text-fg-muted animate-pulse motion-reduce:animate-none">{translate('bonus.awaitingAdmin')}</span>;
  } else {
    bonusValue = <span className="text-base font-semibold text-fg-subtle">—</span>;
  }

  return (
    <li className="relative animate-rise pl-10 motion-reduce:animate-none" style={{ animationDelay: `${order * 80}ms` }}>
      {/* Node on the rail, level with the entry's title row. */}
      <span aria-hidden="true" className="absolute top-5 left-0 flex size-6 items-center justify-center">
        {isPending && <span className="absolute inset-0.5 rounded-full border border-fg/40 animate-ping motion-reduce:animate-none" />}
        <span className={cx('relative size-3 rounded-full border-2', claimNodeClass[claim.status])} />
      </span>

      <article
        className={cx(
          'relative isolate grid gap-4 overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-[border-color,translate] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center',
          isRejected ? 'border-fg/[0.06] bg-fg/[0.02] opacity-70' : 'border-fg/10 bg-fg/[0.035] hover:border-primary/30',
        )}
      >
        {isApproved && <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-8 -z-10 size-36 rounded-full bg-primary/15 blur-2xl" />}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-fg">{campaign ? campaignTitle(campaign) : claim.campaignId}</p>
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

        {/* Deposit → bonus flow: light runs along the connector once the bonus is credited. */}
        <dl className="flex items-center gap-3 rounded-xl border border-fg/10 bg-black/20 px-4 py-2.5">
          <div>
            <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.fromDeposit')}</dt>
            <dd className="text-sm font-semibold text-fg tabular-nums">{formatMoney(claim.depositAmount, currency)}</dd>
          </div>
          <div aria-hidden="true" className="relative flex w-20 shrink-0 items-center justify-center">
            <span className={cx('absolute inset-x-0 h-px', isApproved ? 'bg-primary/40' : 'bg-fg/15')} />
            {isApproved && (
              <span className="absolute inset-x-0 h-px bg-[linear-gradient(90deg,transparent_40%,#fffaf0_50%,transparent_60%)] [background-size:250%_100%] animate-gold-sheen [animation-direction:reverse] motion-reduce:hidden" />
            )}
            {campaign && (
              <span className={cx('relative rounded-full border px-1.5 py-px text-[10px] font-semibold tabular-nums', isApproved ? 'border-primary/40 bg-primary-soft/60 text-primary' : 'border-fg/15 bg-surface text-fg-muted')}>
                {campaign.percent}%
              </span>
            )}
          </div>
          <div className="text-right">
            <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.bonusAmount')}</dt>
            <dd>{bonusValue}</dd>
          </div>
        </dl>
      </article>
    </li>
  );
}

// Split meter: a waveform of thin bars, each 1/56 of the credited total — tradable bars first (green), then losable (gold).
const METER_BARS = 56;

function SplitMeter({ tradableShare, hasTotal }: { tradableShare: number; hasTotal: boolean }) {
  const tradableBars = Math.round((tradableShare / 100) * METER_BARS);

  return (
    <div aria-hidden="true" className="relative isolate">
      {/* Fixed 3px bars spread with justify-between, so the meter stays fine-grained at any card width. */}
      <div className="flex h-20 items-end justify-between">
        {Array.from({ length: METER_BARS }, (_, index) => {
          // Two overlapping waves give an audio-waveform silhouette instead of a flat bar.
          const wave = Math.sin(index * 0.35) * 0.5 + Math.sin(index * 0.11 + 1) * 0.5;
          const height = (30 + 70 * Math.abs(wave)).toFixed(1);
          let barClass = 'bg-fg/10';
          if (hasTotal && index < tradableBars) barClass = 'bg-success';
          else if (hasTotal) barClass = '[background-image:var(--brand-gradient)] shadow-[0_0_6px_var(--brand-primary)]';

          return (
            <span
              key={index}
              className="flex h-full w-[3px] origin-bottom items-end animate-tick-rise motion-reduce:animate-none"
              style={{ animationDelay: `${index * 18}ms` }}
            >
              <span
                className={cx('w-full origin-bottom rounded-full animate-bar-sway motion-reduce:animate-none', barClass)}
                style={{ height: `${height}%`, animationDelay: `${(index % 8) * 150}ms` }}
              />
            </span>
          );
        })}
      </div>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(100deg,transparent_40%,rgba(255,255,255,0.55)_50%,transparent_60%)] [background-size:250%_100%] mix-blend-overlay animate-gold-sheen motion-reduce:hidden" />

      <div className="mt-3 flex h-1 overflow-hidden rounded-full bg-fg/10">
        {hasTotal && (
          <>
            <span className="h-full bg-success" style={{ width: `${tradableShare}%` }} />
            <span className="h-full flex-1 [background-image:var(--brand-gradient)]" />
          </>
        )}
      </div>
    </div>
  );
}

function StatusTile({ label, hint, count, claimCount, isPending }: { label: string; hint: string; count: number; claimCount: number; isPending: boolean }) {
  const filledDotClass = isPending ? 'bg-fg animate-pulse motion-reduce:animate-none' : '[background-image:var(--brand-gradient)] shadow-[0_0_8px_var(--brand-primary)]';

  return (
    <div className="relative isolate flex flex-1 flex-col justify-between gap-3 overflow-hidden rounded-[22px] border border-fg/10 bg-fg/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {!isPending && <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 -z-10 size-28 rounded-full bg-primary/20 blur-2xl" />}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg">{label}</p>
        <span aria-hidden="true" className={cx('relative flex size-2.5', isPending ? 'text-fg' : 'text-primary')}>
          {isPending && <span className="absolute inset-0 rounded-full bg-current opacity-70 animate-ping motion-reduce:animate-none" />}
          <span className="relative size-full rounded-full bg-current shadow-[0_0_8px_currentColor]" />
        </span>
      </div>

      <p className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-fg tabular-nums">{count}</span>
        <span className="text-xs text-fg-muted">{hint}</span>
      </p>

      {/* One pill per claim; this tile's share of them is lit. */}
      <div aria-hidden="true" className="flex flex-wrap gap-1.5">
        {Array.from({ length: Math.max(claimCount, 1) }, (_, index) => (
          <span key={index} className={cx('h-1.5 w-6 rounded-full', index < count ? filledDotClass : 'bg-fg/10')} />
        ))}
      </div>
    </div>
  );
}

function BonusVault({ claims, currency }: { claims: BonusClaim[]; currency: string }) {
  const credited = claims.filter((claim) => claim.status === 'approved');
  const total = credited.reduce((sum, claim) => sum + (claim.amount ?? 0), 0);
  const tradableTotal = credited.filter((claim) => claim.bonusType === 'tradable').reduce((sum, claim) => sum + (claim.amount ?? 0), 0);
  const losableTotal = total - tradableTotal;
  const tradableShare = total > 0 ? (tradableTotal / total) * 100 : 0;
  const losableShare = total > 0 ? 100 - tradableShare : 0;
  const pendingCount = claims.filter((claim) => claim.status === 'pending').length;
  const claimCount = credited.length + pendingCount;
  const shownTotal = useAnimatedNumber(total, 900);
  // The symbol sits small beside the figure; the rest stays one string so the sheen sweeps across it unbroken.
  const totalParts = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(shownTotal);
  const currencySymbol = totalParts.find((part) => part.type === 'currency')?.value ?? '';
  const amountText = totalParts
    .filter((part) => part.type !== 'currency')
    .map((part) => part.value)
    .join('');

  return (
    <section className={cx(glassClass, 'flex animate-rise flex-col gap-6 p-6 motion-reduce:animate-none sm:p-7')}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" />

      <header>
        <p className={cx(captionClass, 'flex items-center gap-1.5 text-primary')}>
          <Icon name="wallet" size={13} />
          {translate('bonus.myEyebrow')}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{translate('bonus.myTitle')}</h2>
        <p className="mt-1 max-w-xl text-sm text-fg-muted">{translate('bonus.myText')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
        {/* Total: sheen-swept gold figure with the tradable/losable amounts, beside a waveform showing the split. */}
        <div className="relative isolate grid gap-8 overflow-hidden rounded-[24px] border border-primary/20 bg-[radial-gradient(ellipse_80%_90%_at_0%_100%,color-mix(in_srgb,var(--brand-primary)_20%,transparent),transparent_60%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-10">
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 -z-10 size-48 rounded-full bg-primary/20 blur-3xl animate-ring-breathe motion-reduce:animate-none" />

          <div>
            <p className={cx(captionClass, 'text-fg-muted')}>{translate('bonus.totalCredited')}</p>
            <p className="mt-2 flex items-start gap-1.5 tabular-nums">
              <span className="mt-2 text-xl font-medium text-primary/70">{currencySymbol}</span>
              <span className="bg-clip-text text-5xl leading-tight font-bold tracking-tight text-transparent [background-image:linear-gradient(100deg,var(--brand-primary)_0%,#f6e3b0_40%,#fffaf0_50%,#f6e3b0_60%,var(--brand-primary)_100%)] [background-size:250%_100%] animate-gold-sheen motion-reduce:animate-none sm:text-6xl">
                {amountText}
              </span>
            </p>

            <dl className="mt-5 flex items-stretch gap-5">
              <div>
                <dt className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                  <Icon name="trendUp" size={13} className="text-success" />
                  {translate('bonus.typeTradable')}
                </dt>
                <dd className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold text-fg tabular-nums">{formatMoney(tradableTotal, currency)}</span>
                  <span className="text-xs font-medium text-success tabular-nums">{Math.round(tradableShare)}%</span>
                </dd>
              </div>
              <span aria-hidden="true" className="w-px bg-fg/10" />
              <div>
                <dt className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                  <Icon name="lock" size={13} className="text-primary" />
                  {translate('bonus.typeLosable')}
                </dt>
                <dd className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold text-fg tabular-nums">{formatMoney(losableTotal, currency)}</span>
                  <span className="text-xs font-medium text-primary tabular-nums">{Math.round(losableShare)}%</span>
                </dd>
              </div>
            </dl>
          </div>

          <SplitMeter tradableShare={tradableShare} hasTotal={total > 0} />
        </div>

        <div className="flex flex-col gap-4">
          <StatusTile label={translate('bonus.creditedCount')} hint={translate('bonus.statusApproved')} count={credited.length} claimCount={claimCount} isPending={false} />
          <StatusTile label={translate('bonus.pendingCount')} hint={translate('bonus.statusPending')} count={pendingCount} claimCount={claimCount} isPending />
        </div>
      </div>
    </section>
  );
}

function GlassEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className={cx(glassClass, 'flex flex-col items-center px-6 py-16 text-center')}>
      <span aria-hidden="true" className="relative mb-5 flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-primary/30 animate-ring-ripple motion-reduce:animate-none" />
        <span className="absolute inset-3 rotate-12 rounded-2xl border border-fg/10 bg-fg/[0.04] backdrop-blur-xl" />
        <span className="relative flex size-12 items-center justify-center rounded-2xl border border-fg/15 bg-surface/70 text-primary backdrop-blur-xl">
          <Icon name="gift" size={22} />
        </span>
      </span>
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ClaimHistory({ claims, campaigns, currency }: { claims: BonusClaim[]; campaigns: BonusCampaign[]; currency: string }) {
  if (claims.length === 0) {
    return (
      <GlassEmpty
        title={translate('bonus.noClaims')}
        text={translate('bonus.noClaimsText')}
        action={
          <LinkButton href="/deposit" variant="outline">
            <Icon name="deposit" size={16} />
            {translate('bonus.makeDeposit')}
          </LinkButton>
        }
      />
    );
  }

  const creditedTotal = claims.reduce((sum, claim) => sum + (claim.status === 'approved' ? (claim.amount ?? 0) : 0), 0);
  const summary: { status: BonusClaimStatus; label: string; dotClass: string }[] = [
    { status: 'approved', label: translate('bonus.creditedCount'), dotClass: 'bg-primary shadow-[0_0_8px_var(--brand-primary)]' },
    { status: 'pending', label: translate('bonus.pendingCount'), dotClass: 'bg-fg animate-pulse motion-reduce:animate-none' },
    { status: 'rejected', label: translate('bonus.statusRejected'), dotClass: 'bg-fg/30' },
  ];

  return (
    <section className={cx(glassClass, 'flex animate-rise flex-col gap-5 p-5 motion-reduce:animate-none sm:p-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 right-10 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-fg/10 pb-5">
        <dl className="flex flex-wrap gap-2">
          {summary.map((item) => (
            <div key={item.status} className="inline-flex items-center gap-2 rounded-full border border-fg/10 bg-fg/[0.04] px-3 py-1.5 text-xs">
              <span aria-hidden="true" className={cx('size-1.5 rounded-full', item.dotClass)} />
              <dt className="text-fg-muted">{item.label}</dt>
              <dd className="font-semibold text-fg tabular-nums">{claims.filter((claim) => claim.status === item.status).length}</dd>
            </div>
          ))}
        </dl>
        <div className="text-right">
          <p className={cx(captionClass, 'text-fg-subtle')}>{translate('bonus.totalCredited')}</p>
          <p className="mt-0.5 bg-clip-text text-2xl font-bold tracking-tight text-transparent tabular-nums [background-image:linear-gradient(100deg,var(--brand-primary)_0%,#f6e3b0_40%,#fffaf0_50%,#f6e3b0_60%,var(--brand-primary)_100%)] [background-size:250%_100%] animate-gold-sheen motion-reduce:animate-none">
            {formatMoney(creditedTotal, currency)}
          </p>
        </div>
      </header>

      {/* Timeline: a rail runs through every claim's node, newest first. The rail is centred on the 1.5rem node column. */}
      <ol className="relative flex flex-col gap-3">
        <span aria-hidden="true" className="pointer-events-none absolute top-6 bottom-6 left-3 w-px -translate-x-1/2 bg-linear-to-b from-primary/60 via-fg/15 to-fg/5" />
        {claims.map((claim, index) => (
          <ClaimEntry
            key={claim.id}
            claim={claim}
            campaign={campaigns.find((item) => item.id === claim.campaignId)}
            currency={currency}
            order={index}
          />
        ))}
      </ol>
    </section>
  );
}

export default function BonusesPage() {
  const { data, isLoading } = useBonuses();
  const tabsId = useId();
  const [tab, setTab] = useState<BonusTab>('available');

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-44 rounded-[28px]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          <Skeleton className="h-[34rem] rounded-[28px]" />
          <Skeleton className="h-[34rem] rounded-[28px]" />
        </div>
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
      <div className="flex flex-col gap-6">
        {/* The user's credited bonuses come first; the campaign cards to claim more follow below. */}
        <BonusVault claims={data.claims} currency={data.currency} />
        {/* Auto-fill grid: however many campaigns arrive, each gets its own card side by side — no narrow stacked column. */}
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,21rem),1fr))]">
          {data.campaigns.map((campaign, index) => (
            <BonusPass
              key={campaign.id}
              campaign={campaign}
              // Rejected requests stay in Claim History; the card shows what the client holds or awaits.
              claims={data.claims.filter((claim) => claim.campaignId === campaign.id && claim.status !== 'rejected')}
              currency={data.currency}
              order={index}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex flex-col gap-6 overflow-x-clip">
      <Aurora />
      <BonusHero tab={tab} onTabChange={setTab} tabsId={tabsId} campaignCount={data.campaigns.length} claimCount={data.claims.length} />
      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`}>
        {panel}
      </div>
    </div>
  );
}
