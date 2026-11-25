'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useBonuses, type BonusCampaign, type BonusClaim, type BonusClaimStatus, type BonusType } from '@/core/pages/useBonuses';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Badge, Skeleton, type Tone } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { BonusDetailsModal } from './BonusDetailsModal';
import { useAnimatedNumber, useMotion } from './ScratchExperience';

type BonusTab = 'available' | 'history';

const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase';
const panelClass = 'orbit-card nova-edge-light relative isolate overflow-hidden';
const beadClass = 'nova-gloss grid shrink-0 place-items-center rounded-full text-fg';
// Dark ink for text sitting on the frosted card, which stays light in both themes.
const inkClass = 'text-[#0a1220]';
const inkMutedClass = 'text-[#4b5a70]';
const inkCaptionClass = 'text-[10.5px] font-semibold tracking-[0.14em] text-[#4b5a70] uppercase';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';

const SPARKLE_PATH = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z';
// Wave crest on top of the tube liquid: two periods across a strip twice the tube's width, so sliding it by half loops seamlessly.
const WAVE_PATH = 'M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 V20 H0 Z';
const TUBE_MARKS = [25, 50, 75];
const tubeBubbles = [
  { left: '22%', size: 'size-1.5', delay: '0s', duration: '4.5s' },
  { left: '48%', size: 'size-1', delay: '1.4s', duration: '5.5s' },
  { left: '66%', size: 'size-2', delay: '2.6s', duration: '5s' },
];
const CONVEYOR_KEYFRAMES: Keyframe[] = [
  { top: '0%', opacity: 0 },
  { opacity: 1, offset: 0.2 },
  { opacity: 1, offset: 0.8 },
  { top: '100%', opacity: 0 },
];
const CONVEYOR_OPTIONS: KeyframeAnimationOptions = { duration: 1800, iterations: Infinity, easing: 'ease-in-out' };
const STATION_RADIUS = 25;
const STATION_LENGTH = 2 * Math.PI * STATION_RADIUS;

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

function Sparkle({ className, delayMs = 0 }: { className: string; delayMs?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx('animate-twinkle motion-reduce:animate-none', className)} style={{ animationDelay: `${delayMs}ms` }}>
      <path d={SPARKLE_PATH} fill="currentColor" />
    </svg>
  );
}

/** Glass gift orb: a glossy bead wrapped in a ribbon cross, a dashed halo turning around it and twinkling sparks. */
function GiftOrb() {
  return (
    <span aria-hidden="true" className="group/orb relative grid size-20 shrink-0 place-items-center">
      <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-orbit-spin motion-reduce:animate-none" style={{ animationDuration: '5s' }}>
        <span className="absolute top-1/2 -left-1 size-2 rounded-full bg-fg" />
      </span>
      <span className="nova-gloss relative grid size-14 place-items-center overflow-hidden rounded-full text-fg transition-transform duration-500 group-hover/orb:scale-110 group-hover/orb:-rotate-12 motion-reduce:transition-none">
        <span className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 bg-fg/15" />
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-fg/15" />
        <Icon name="gift" size={22} className="relative" />
      </span>
      <Sparkle className="absolute -top-1 right-0 size-3 text-fg" />
      <Sparkle className="absolute bottom-1 -left-1 size-2.5 text-fg-muted" delayMs={900} />
    </span>
  );
}

/** Page title on the left; the Available / History switch and the deposit link on the right. */
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
    <header className="flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-5">
        <GiftOrb />
        <div>
          <p className={captionClass}>{translate('nav.promotion')}</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-fg sm:text-5xl">{translate('bonus.campaignsTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('bonus.campaignsText')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Equal-width columns so the silver pill slides exactly one column over. */}
        <div role="tablist" aria-label={translate('bonus.tabs')} className="relative grid w-fit grid-cols-2 rounded-full border border-line bg-surface-2/40 p-1 backdrop-blur-xl">
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-fg shadow-[0_8px_18px_-10px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1.2)] motion-reduce:transition-none',
              tab === 'history' && 'translate-x-full',
            )}
          />
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
                'relative inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors duration-300 active:scale-95 motion-reduce:transition-none',
                tab === item.value ? 'text-app' : 'text-fg-muted hover:text-fg',
              )}
            >
              {item.label}
              <span className={cx('rounded-full px-1.5 text-[10px] tabular-nums', tab === item.value ? 'bg-app/15' : 'bg-fg/10')}>{item.count}</span>
            </button>
          ))}
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

// Tradable is sapphire ice, losable a rose quartz — the blush that already drifts through the frosted card.
const tubeLiquid: Record<BonusType, { body: string; crest: string; dot: string }> = {
  tradable: { body: 'bg-linear-to-b from-[#bcd6f7] via-[#6f9de0] to-[#2c5aa3]', crest: '#bcd6f7', dot: 'bg-[#4f80c8]' },
  losable: { body: 'bg-linear-to-b from-[#f8d0dc] via-[#e58aa5] to-[#ad4670]', crest: '#f8d0dc', dot: 'bg-[#d0698d]' },
};

/** A glass test tube filled to its share of the credited total, with a rolling wave crest and rising bubbles. */
function LiquidTube({ type, amount, share, currency, order }: { type: BonusType; amount: number; share: number; currency: string; order: number }) {
  const level = useAnimatedNumber(share, 1600 + order * 300);
  const liquid = tubeLiquid[type];

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="meter"
        aria-label={bonusTypeLabel(type)}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-52 w-20 overflow-hidden rounded-full border-2 border-white/90 bg-white/35 shadow-[inset_0_6px_14px_rgb(10_18_32/0.18),0_14px_28px_-18px_rgb(10_18_32/0.6)] backdrop-blur-md"
      >
        {share > 0 && (
          <span aria-hidden="true" style={{ height: `${level}%` }} className="absolute inset-x-0 bottom-0">
            <span className={cx('absolute inset-0', liquid.body)} />
            <span className="absolute bottom-[calc(100%-1px)] left-0 flex h-3 w-[200%] animate-liquid-wave [animation-duration:2.6s] motion-reduce:animate-none">
              <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="size-full">
                <path d={WAVE_PATH} fill={liquid.crest} />
              </svg>
            </span>
            {tubeBubbles.map((bubble) => (
              <span
                key={bubble.left}
                className={cx('nova-frost-bubble absolute bottom-2 rounded-full bg-white/90', bubble.size)}
                style={{ left: bubble.left, animationDelay: bubble.delay, animationDuration: bubble.duration }}
              />
            ))}
          </span>
        )}
        {TUBE_MARKS.map((mark) => (
          <span key={mark} aria-hidden="true" style={{ bottom: `${mark}%` }} className="absolute right-2 h-px w-2.5 bg-[#0a1220]/25" />
        ))}
        <span aria-hidden="true" className="absolute top-5 bottom-5 left-2.5 w-1.5 rounded-full bg-white/70" />
        {/* Frosted pill keeps the percent readable whether the liquid is below or behind it. */}
        <span className={cx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-base font-black tabular-nums', frostChipClass)}>
          {Math.round(level)}%
        </span>
      </div>
      <div className="text-center">
        <p className={cx(inkCaptionClass, 'inline-flex items-center gap-1.5')}>
          <span aria-hidden="true" className={cx('size-2 rounded-full', liquid.dot)} />
          <Icon name={type === 'tradable' ? 'trendUp' : 'lock'} size={12} />
          {bonusTypeLabel(type)}
        </p>
        <p className={cx('mt-0.5 text-lg font-bold tabular-nums', inkClass)}>{formatMoney(amount, currency)}</p>
      </div>
    </div>
  );
}

/** One stop of the review pipeline: its count inside a ring filled to its share of all active claims. */
function Station({ label, hint, count, activeCount, isPending }: { label: string; hint: string; count: number; activeCount: number; isPending: boolean }) {
  const shown = useAnimatedNumber(count, 900);
  const share = activeCount > 0 ? count / activeCount : 0;
  const ring = useAnimatedNumber(share, 1400);

  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-14 shrink-0 place-items-center">
        {isPending && count > 0 && <span aria-hidden="true" className="absolute inset-1 animate-ping-soft rounded-full bg-[#0a1220]/10 motion-reduce:hidden" />}
        <svg viewBox="0 0 56 56" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="28" cy="28" r={STATION_RADIUS} fill="none" stroke="#0a1220" strokeOpacity="0.12" strokeWidth="3" />
          <circle
            cx="28"
            cy="28"
            r={STATION_RADIUS}
            fill="none"
            stroke="#0a1220"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={STATION_LENGTH}
            strokeDashoffset={STATION_LENGTH * (1 - ring)}
            strokeOpacity={isPending ? 0.5 : 1}
          />
        </svg>
        <span className={cx('relative grid size-10 place-items-center rounded-full text-lg font-black tabular-nums', frostChipClass)}>{Math.round(shown)}</span>
      </span>
      <div className="min-w-0">
        <p className={cx('truncate text-sm font-bold', inkClass)}>{label}</p>
        <p className={cx('text-xs', inkMutedClass)}>{hint}</p>
      </div>
    </div>
  );
}

/** Frosted vault: total credited on the left, the tradable / losable split as two liquid tubes, and the review pipeline. */
function BonusVault({ claims, currency }: { claims: BonusClaim[]; currency: string }) {
  const beadRef = useRef<HTMLSpanElement>(null);
  const credited = claims.filter((claim) => claim.status === 'approved');
  const pendingCount = claims.filter((claim) => claim.status === 'pending').length;
  const activeCount = credited.length + pendingCount;
  const tradableTotal = credited.reduce((sum, claim) => sum + (claim.bonusType === 'tradable' ? (claim.amount ?? 0) : 0), 0);
  const losableTotal = credited.reduce((sum, claim) => sum + (claim.bonusType === 'losable' ? (claim.amount ?? 0) : 0), 0);
  const total = tradableTotal + losableTotal;
  const tradableShare = total > 0 ? (tradableTotal / total) * 100 : 0;
  const losableShare = total > 0 ? 100 - tradableShare : 0;
  const shownTotal = useAnimatedNumber(total, 1400);

  useMotion(beadRef, CONVEYOR_KEYFRAMES, CONVEYOR_OPTIONS);

  return (
    <FrostCard>
      <div className={cx('grid items-center gap-8 sm:p-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,15rem)]', inkClass)}>
        <div className="min-w-0">
          <p className={cx(inkCaptionClass, 'flex items-center gap-2')}>
            <span className={cx('grid size-8 place-items-center rounded-full', frostChipClass)}>
              <Icon name="wallet" size={14} />
            </span>
            {translate('bonus.myEyebrow')}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{translate('bonus.myTitle')}</h2>
          <p className={cx('mt-1 max-w-md text-sm', inkMutedClass)}>{translate('bonus.myText')}</p>
          <div className="mt-6 border-t border-dotted border-[#0a1220]/20 pt-4">
            <p className={inkCaptionClass}>{translate('bonus.totalCredited')}</p>
            <p className="mt-1 text-5xl font-black tracking-tight tabular-nums">{formatMoney(shownTotal, currency)}</p>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <LiquidTube type="tradable" amount={tradableTotal} share={tradableShare} currency={currency} order={0} />
          <LiquidTube type="losable" amount={losableTotal} share={losableShare} currency={currency} order={1} />
        </div>

        {/* Pipeline: a request waits under review, then a bead carries it down to credited. */}
        <div className="flex flex-col">
          <Station label={translate('bonus.pendingCount')} hint={translate('bonus.statusPending')} count={pendingCount} activeCount={activeCount} isPending />
          <span aria-hidden="true" className="relative ml-[27px] h-12 w-0 border-l-2 border-dotted border-[#0a1220]/30">
            <span ref={beadRef} className="absolute -left-[6px] size-2.5 -translate-y-1/2 rounded-full bg-[#0a1220] ring-2 ring-white" />
          </span>
          <Station label={translate('bonus.creditedCount')} hint={translate('bonus.statusApproved')} count={credited.length} activeCount={activeCount} isPending={false} />
        </div>
      </div>
    </FrostCard>
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
    <li style={{ animationDelay: `${300 + order * 90}ms` }} className="group/claim grid animate-rise grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 motion-reduce:animate-none">
      <span aria-hidden="true" className="relative grid size-9 place-items-center">
        {isPending && <span className="absolute inset-0 animate-ping-soft rounded-full bg-fg/15 motion-reduce:hidden" />}
        <span
          className={cx(
            'relative grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/claim:scale-110 motion-reduce:transition-none',
            claim.status === 'approved' ? 'nova-gloss text-fg' : 'border border-dashed border-line-strong text-fg-muted',
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

/**
 * One campaign as a tear-off voucher: a frosted face with the counting-up match percent, a perforated tear line,
 * then a stub with the terms on dotted leaders, the allowed groups and the claim button.
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
      style={{ animationDelay: `${order * 110}ms` }}
      className={cx(panelClass, 'flex animate-rise flex-col p-2 transition-transform duration-300 hover:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none')}
    >
      <FrostCard>
        <div className={cx('flex flex-col', inkClass)}>
          <div className="flex items-center justify-between gap-2">
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.12em] uppercase', frostChipClass)}>
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#0a1220]/60 motion-reduce:hidden" />
                <span className="relative size-1.5 rounded-full bg-[#0a1220]" />
              </span>
              {translate(isRequest ? 'bonus.modeRequest' : 'bonus.modeAuto')}
            </span>
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.1em] uppercase', frostChipClass)}>
              <Icon name="history" size={12} />
              {duration}
            </span>
          </div>

          <p aria-hidden="true" className="mt-6 flex items-start leading-none">
            <span className="text-[88px] font-black tracking-tighter tabular-nums">{Math.round(shownPercent)}</span>
            <span className="mt-2 text-4xl font-black">%</span>
          </p>
          <p className={cx(inkCaptionClass, 'mt-2')}>{translate('bonus.matchLabel')}</p>

          <h2 className="mt-5 text-xl font-black tracking-tight">
            <span className="sr-only">{campaign.percent}% </span>
            {campaign.name}
          </h2>
          <p className={cx('mt-0.5 text-xs', inkMutedClass)}>
            {campaign.kind} · {campaign.category}
          </p>
        </div>
      </FrostCard>

      {/* Tear line: the half-moon notches are cut by the card's overflow clip. */}
      <div aria-hidden="true" className="-mx-2 flex items-center py-3">
        <span className="size-5 shrink-0 -translate-x-1/2 rounded-full bg-app ring-1 ring-line" />
        <span className="flex-1 border-t-2 border-dashed border-line-strong" />
        <span className="size-5 shrink-0 translate-x-1/2 rounded-full bg-app ring-1 ring-line" />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-3 pb-3">
        <dl className="flex flex-col gap-2.5">
          {terms.map((term, index) => (
            <div key={term.key} style={{ animationDelay: `${250 + index * 100}ms` }} className="group/term flex animate-rise items-center gap-3 text-sm motion-reduce:animate-none">
              <span aria-hidden="true" className={cx(beadClass, 'size-8 transition-transform duration-300 group-hover/term:-rotate-12 motion-reduce:transition-none')}>
                <Icon name={term.icon} size={14} />
              </span>
              <dt className="text-fg-muted">{term.label}</dt>
              <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
              <dd className="font-bold text-fg tabular-nums">{term.value}</dd>
            </div>
          ))}
        </dl>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          <Icon name="wallet" size={13} />
          {translate('bonus.allowedGroups')}:
          {groups.map((group) => (
            <span key={group} className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[11px] font-semibold text-fg">
              {group}
            </span>
          ))}
        </p>
        <p className="text-[11px] text-fg-subtle">{translate(isRequest ? 'bonus.modeRequestHint' : 'bonus.modeAutoHint')}</p>

        <Button type="button" className="w-full rounded-full" aria-haspopup="dialog" onClick={() => setIsDetailsOpen(true)}>
          <Icon name="bolt" size={15} />
          {translate('bonus.depositToClaim')}
        </Button>
        {claimCount > 0 && (
          <p className="flex items-center justify-center gap-2 text-[11px] text-fg-subtle">
            {translate('bonus.myEyebrow')}
            <span className="rounded-full bg-fg/10 px-1.5 font-semibold text-fg tabular-nums">{claimCount}</span>
          </p>
        )}
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
    <section className={cx(panelClass, 'animate-rise p-5 [animation-delay:150ms] motion-reduce:animate-none sm:p-6')}>
      <header className="flex items-center justify-between gap-3 border-b border-dotted border-line-strong pb-4">
        <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
          <span aria-hidden="true" className={cx(beadClass, 'size-8')}>
            <Icon name="wallet" size={14} />
          </span>
          {translate('bonus.myEyebrow')}
        </p>
        <span className="rounded-full bg-fg px-2.5 py-0.5 text-xs font-bold text-app tabular-nums">{claims.length}</span>
      </header>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">{translate('bonus.noClaims')}</p>
      ) : (
        <div className="flex flex-col gap-5 pt-4">
          {groups.map((group) => (
            <div key={group.campaign.id}>
              <p className="flex items-center gap-2 text-sm font-bold text-fg">
                {campaignTitle(group.campaign)}
                <span className="rounded-full bg-fg/10 px-1.5 text-[10px] font-semibold tabular-nums">{group.claims.length}</span>
                <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
              </p>
              <ul className="mt-1 divide-y divide-dotted divide-line-strong">
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
    <div className={cx(panelClass, 'flex flex-col items-center px-6 py-16 text-center')}>
      <span aria-hidden="true" className="relative mb-5 grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ring-ripple rounded-full border border-line-strong motion-reduce:animate-none" />
        <span className="absolute inset-1 animate-rim-spin rounded-full border border-dashed border-line-strong motion-reduce:animate-none" />
        <span className={cx(beadClass, 'size-12 animate-float [animation-duration:3s] motion-reduce:animate-none')}>
          <Icon name="gift" size={22} />
        </span>
      </span>
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Tear-off calendar tile for the claim's date: month band on top, big day, year underneath. */
function CalendarTile({ iso }: { iso: string }) {
  const date = Date.parse(iso);
  return (
    <span aria-hidden="true" className="flex w-16 shrink-0 flex-col overflow-hidden rounded-2xl text-center ring-1 ring-line-strong transition-transform duration-300 group-hover/entry:-rotate-3 motion-reduce:transition-none">
      <span className="bg-fg py-0.5 text-[10px] font-bold tracking-[0.16em] text-app uppercase">{monthFormatter.format(date)}</span>
      <span className="bg-surface-2/60 pt-1 text-2xl leading-none font-black text-fg tabular-nums">{dayFormatter.format(date)}</span>
      <span className="bg-surface-2/60 pt-0.5 pb-1.5 font-mono text-[9.5px] text-fg-subtle">{yearFormatter.format(date)}</span>
    </span>
  );
}

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
    bonusValue = <span className="text-xs font-medium text-fg-muted animate-pulse motion-reduce:animate-none">{translate('bonus.awaitingAdmin')}</span>;
  } else {
    bonusValue = <span className="text-base font-semibold text-fg-subtle">—</span>;
  }

  return (
    <li
      style={{ animationDelay: `${order * 90}ms` }}
      className={cx(
        'group/entry grid animate-rise items-center gap-4 py-4 motion-reduce:animate-none sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto]',
        isRejected && 'opacity-60',
      )}
    >
      <CalendarTile iso={claim.creditedAt ?? claim.claimedAt} />

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

      {/* Deposit → bonus: a bead runs along the connector once the bonus is credited. */}
      <dl className="flex items-center gap-3 rounded-full border border-dashed border-line-strong py-2 pr-4 pl-4 sm:col-span-2 lg:col-span-1">
        <div>
          <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.fromDeposit')}</dt>
          <dd className="text-sm font-semibold text-fg tabular-nums">{formatMoney(claim.depositAmount, currency)}</dd>
        </div>
        <div aria-hidden="true" className="relative flex w-20 shrink-0 items-center justify-center">
          <span className="absolute inset-x-0 border-t-2 border-dotted border-line-strong" />
          {isApproved && (
            <span className="absolute inset-x-0 top-1/2">
              <span className="absolute -top-[4px] size-2 -translate-x-1/2 animate-route-dot rounded-full bg-fg motion-reduce:hidden" />
            </span>
          )}
          {campaign && (
            <span className={cx('relative rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums', isApproved ? 'bg-fg text-app' : 'bg-surface-2 text-fg-muted ring-1 ring-line')}>
              {campaign.percent}%
            </span>
          )}
        </div>
        <div className="text-right">
          <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.bonusAmount')}</dt>
          <dd>{bonusValue}</dd>
        </div>
      </dl>
    </li>
  );
}

const STATUS_RING_RADIUS = 20;
const STATUS_RING_LENGTH = 2 * Math.PI * STATUS_RING_RADIUS;

/** Status counter: the count inside a ring filled to its share of every claim. */
function StatusOrb({ status, label, count, total }: { status: BonusClaimStatus; label: string; count: number; total: number }) {
  const share = useAnimatedNumber(total > 0 ? count / total : 0, 1300);
  const ringClass: Record<BonusClaimStatus, string> = { approved: 'stroke-fg', pending: 'stroke-fg-muted', rejected: 'stroke-line-strong' };

  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-12 place-items-center">
        {status === 'pending' && count > 0 && <span aria-hidden="true" className="absolute inset-1 animate-ping-soft rounded-full bg-fg/10 motion-reduce:hidden" />}
        <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="24" cy="24" r={STATUS_RING_RADIUS} fill="none" strokeWidth="3" className="stroke-line" />
          <circle
            cx="24"
            cy="24"
            r={STATUS_RING_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={STATUS_RING_LENGTH}
            strokeDashoffset={STATUS_RING_LENGTH * (1 - share)}
            className={ringClass[status]}
          />
        </svg>
        <dd className="relative text-base font-black text-fg tabular-nums">{count}</dd>
      </span>
      <dt className="text-xs font-semibold text-fg-muted">{label}</dt>
    </div>
  );
}

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

  const summary: { status: BonusClaimStatus; label: string }[] = [
    { status: 'approved', label: translate('bonus.creditedCount') },
    { status: 'pending', label: translate('bonus.pendingCount') },
    { status: 'rejected', label: translate('bonus.statusRejected') },
  ];

  return (
    <section className={cx(panelClass, 'flex animate-rise flex-col gap-2 p-5 motion-reduce:animate-none sm:p-6')}>
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-dotted border-line-strong pb-5">
        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          {summary.map((item) => (
            <StatusOrb key={item.status} status={item.status} label={item.label} count={claims.filter((claim) => claim.status === item.status).length} total={claims.length} />
          ))}
        </dl>
        <div className="text-right">
          <p className={captionClass}>{translate('bonus.totalCredited')}</p>
          <p className="mt-0.5 text-3xl font-black tracking-tight text-fg tabular-nums">{formatMoney(shownTotal, currency)}</p>
        </div>
      </header>

      <ol className="divide-y divide-dotted divide-line-strong">
        {claims.map((claim, index) => (
          <ClaimEntry key={claim.id} claim={claim} campaign={campaigns.find((item) => item.id === claim.campaignId)} currency={currency} order={index} />
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
        <Skeleton className="h-28 rounded-[28px]" />
        <Skeleton className="h-72 rounded-[28px]" />
        <Skeleton className="h-[28rem] rounded-[28px]" />
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
        {/* The user's credited bonuses come first; the offers to claim more follow below. */}
        <BonusVault claims={data.claims} currency={data.currency} />
        {/* Offers are compact vouchers, so any number of campaigns stacks (or tiles on mid screens) beside the claims list. */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
          <section aria-label={translate('bonus.available')} className="flex flex-col gap-4">
            <p className={cx(captionClass, 'flex items-center gap-2')}>
              {translate('bonus.available')}
              <span className="rounded-full bg-fg px-1.5 text-[10px] tracking-normal text-app tabular-nums">{data.campaigns.length}</span>
              <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
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
          {/* Rejected requests stay in Claim History; this list shows what the client holds or awaits. */}
          <MyBonusesPanel campaigns={data.campaigns} claims={data.claims.filter((claim) => claim.status !== 'rejected')} currency={data.currency} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BonusHero tab={tab} onTabChange={setTab} tabsId={tabsId} campaignCount={data.campaigns.length} claimCount={data.claims.length} />
      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`}>
        {panel}
      </div>
    </div>
  );
}
