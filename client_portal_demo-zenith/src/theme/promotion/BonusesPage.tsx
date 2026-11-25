'use client';

import { useId, useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { useBonuses, type BonusCampaign, type BonusClaim, type BonusClaimStatus, type BonusType } from '@/core/pages/useBonuses';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Badge, Skeleton, type Tone } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { BonusDetailsModal } from './BonusDetailsModal';
import { useAnimatedNumber } from './ScratchExperience';

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

// 7×7 dot-matrix gift: 1 = box, 2 = red ribbon and bow, 0 = unlit pixel.
const GIFT_MATRIX = ['0200020', '0020200', '1112111', '1112111', '0112110', '0112110', '0112110'];

/** Dot-matrix gift: pixels pop in row by row, then the red ribbon keeps twinkling. */
function PixelGift() {
  return (
    <span aria-hidden="true" className="grid shrink-0 grid-cols-7 gap-[3px]">
      {GIFT_MATRIX.flatMap((row, rowIndex) =>
        row.split('').map((cell, colIndex) => {
          const order = rowIndex * 7 + colIndex;
          return (
            <span
              key={order}
              style={{ animationDelay: cell === '2' ? `${order * 20}ms, ${600 + (order % 5) * 280}ms` : `${order * 20}ms` }}
              className={cx(
                'size-2.5 rounded-[3px] sm:size-3',
                cell === '0' && 'zenith-pixel bg-fg/8',
                cell === '1' && 'zenith-pixel bg-fg',
                cell === '2' && 'bg-[var(--zenith-red)] [animation:zenith-pixel_0.45s_cubic-bezier(0.2,0.9,0.25,1.3)_both,zenith-twinkle_1.6s_ease-in-out_infinite] motion-reduce:[animation:none]',
              )}
            />
          );
        }),
      )}
    </span>
  );
}

/** Open header: title beside the dot-matrix gift, then a flush strip of tab capsules with their counts and the deposit link. */
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
  const tabs: { value: BonusTab; label: string; count: number; icon: IconName }[] = [
    { value: 'available', label: translate('bonus.available'), count: campaignCount, icon: 'gift' },
    { value: 'history', label: translate('bonus.history'), count: claimCount, icon: 'history' },
  ];

  return (
    <header className="zenith-tile flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className={cx(captionClass, 'inline-flex items-center gap-2')}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--zenith-red)]" />
            {translate('nav.promotion')}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-fg sm:text-6xl">{translate('bonus.campaignsTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('bonus.campaignsText')}</p>
        </div>
        <PixelGift />
      </div>

      <div className="flex flex-col gap-3 border-y border-line py-3 sm:flex-row sm:items-center sm:justify-between">
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
                  isActive ? 'border-fg bg-fg text-app' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                )}
              >
                {isActive && <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-10 bg-white/30" />}
                <Icon name={item.icon} size={15} className="relative" />
                <span className="relative">{item.label}</span>
                <span
                  className={cx(
                    'relative grid min-w-8 place-items-center rounded-full px-2 py-1 text-xs font-black tabular-nums',
                    isActive ? 'bg-[var(--zenith-red)] text-white' : 'bg-fg/10 text-fg',
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

// Tradable fills white, losable the Zenith red; diagonal hatching drifts through both so the fill reads as live.
const trackFill: Record<BonusType, { body: string; hatch: string; dot: string; text: string }> = {
  tradable: { body: 'bg-fg', hatch: 'rgb(0 0 0 / 0.16)', dot: 'bg-fg', text: 'text-app' },
  losable: { body: 'bg-[var(--zenith-red)]', hatch: 'rgb(255 255 255 / 0.22)', dot: 'bg-[var(--zenith-red)]', text: 'text-white' },
};
const TRACK_TICKS = [25, 50, 75];

/** Capsule track filled to the type's share of the credited total; the fill grows in from the left and its hatching keeps drifting. */
function CapsuleTrack({ type, amount, share, currency, order }: { type: BonusType; amount: number; share: number; currency: string; order: number }) {
  const level = useAnimatedNumber(share, 1600 + order * 300);
  const fill = trackFill[type];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className={cx(captionClass, 'inline-flex items-center gap-1.5')}>
          <span aria-hidden="true" className={cx('size-2 rounded-full', fill.dot)} />
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
        className="relative h-11 overflow-hidden rounded-full border border-line bg-fg/5 p-1"
      >
        {TRACK_TICKS.map((tick) => (
          <span key={tick} aria-hidden="true" style={{ left: `${tick}%` }} className="absolute inset-y-3 w-px bg-line-strong" />
        ))}
        {share > 0 && (
          <span
            aria-hidden="true"
            style={{ width: `max(${level}%, 3.25rem)` }}
            className={cx('relative flex h-full items-center justify-end overflow-hidden rounded-full pr-3', fill.body)}
          >
            <span
              className="zenith-drift absolute inset-y-0 left-0 w-[200%]"
              style={{ backgroundImage: `repeating-linear-gradient(-45deg, ${fill.hatch} 0 6px, transparent 6px 14px)` }}
            />
            <span className={cx('relative text-sm font-black tabular-nums', fill.text)}>{Math.round(level)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

const STATION_PIXELS = 10;

/** One stop of the review pipeline: its count and a 10-pixel strip lit to its share of all active claims. */
function Station({ label, hint, count, activeCount, isPending }: { label: string; hint: string; count: number; activeCount: number; isPending: boolean }) {
  const shown = useAnimatedNumber(count, 900);
  const lit = activeCount > 0 ? Math.round((count / activeCount) * STATION_PIXELS) : 0;

  return (
    <div className="min-w-0 flex-1 rounded-3xl border border-line bg-fg/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-fg">{label}</p>
          <p className="text-xs text-fg-muted">{hint}</p>
        </div>
        <span className={cx('text-3xl leading-none font-black tabular-nums', isPending ? 'text-[var(--zenith-red)]' : 'text-fg')}>{Math.round(shown)}</span>
      </div>
      <span aria-hidden="true" className="mt-4 grid grid-cols-10 gap-1">
        {Array.from({ length: STATION_PIXELS }, (_, index) => {
          const isLit = index < lit;
          return (
            <span
              key={index}
              style={{ animationDelay: isLit && isPending ? `${index * 40}ms, ${index * 160}ms` : `${index * 40}ms` }}
              className={cx(
                'h-3 rounded-[3px]',
                !isLit && 'zenith-pixel bg-fg/10',
                isLit && !isPending && 'zenith-pixel bg-fg',
                isLit && isPending && 'bg-[var(--zenith-red)] [animation:zenith-pixel_0.45s_cubic-bezier(0.2,0.9,0.25,1.3)_both,zenith-blink_1.8s_ease-in-out_infinite] motion-reduce:[animation:none]',
              )}
            />
          );
        })}
      </span>
    </div>
  );
}

/** Open vault: the credited total as a big open figure, the tradable / losable split on capsule tracks, and the review pipeline as a flow. */
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
          <CapsuleTrack type="tradable" amount={tradableTotal} share={tradableShare} currency={currency} order={0} />
          <CapsuleTrack type="losable" amount={losableTotal} share={losableShare} currency={currency} order={1} />
        </div>
      </div>

      {/* Pipeline: a request waits under review, then a bead carries it along the dashed route to credited. */}
      <div className="mt-7 flex flex-col items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
        <Station label={translate('bonus.pendingCount')} hint={translate('bonus.statusPending')} count={pendingCount} activeCount={activeCount} isPending />
        <span aria-hidden="true" className="relative mx-auto h-10 w-px border-l-2 border-dashed border-line-strong sm:mx-0 sm:h-px sm:w-24 sm:border-t-2 sm:border-l-0">
          <span className="zenith-route absolute top-1/2 hidden size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--zenith-red)] shadow-[0_0_12px_rgb(255_74_61/0.7)] sm:block" />
          <Icon name="chevronRight" size={14} className="absolute top-1/2 -right-2 hidden -translate-y-1/2 text-fg-muted sm:block" />
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
        {isPending && <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)]/40 motion-reduce:hidden" />}
        <span
          className={cx(
            'relative grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/claim:scale-110 motion-reduce:transition-none',
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

/**
 * One campaign as a compact Zenith ticket: mode and duration capsules, the counting-up match percent with a red sign,
 * a pixel perforation, then the terms as three capsule cells, the allowed groups and the claim button with a light sweep.
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
      <div className="relative overflow-hidden p-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1.5px)] [background-size:12px_12px]"
        />
        <div className="relative flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-[10.5px] font-bold tracking-[0.12em] text-fg uppercase">
            <span aria-hidden="true" className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)] motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-[var(--zenith-red)]" />
            </span>
            {translate(isRequest ? 'bonus.modeRequest' : 'bonus.modeAuto')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/10 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.1em] text-fg-muted uppercase">
            <Icon name="history" size={12} />
            {duration}
          </span>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-4">
          <p aria-hidden="true" className="flex items-start leading-none text-fg">
            <span className="text-[76px] font-black tracking-tighter tabular-nums">{Math.round(shownPercent)}</span>
            <span className="mt-2 text-4xl font-black text-[var(--zenith-red)]">%</span>
          </p>
          <p className={cx(captionClass, 'pb-2 text-right')}>{translate('bonus.matchLabel')}</p>
        </div>

        <h2 className="relative mt-4 text-lg font-black tracking-tight text-fg">
          <span className="sr-only">{campaign.percent}% </span>
          {campaign.name}
        </h2>
        <p className="relative mt-0.5 text-xs text-fg-muted">
          {campaign.kind} · {campaign.category}
        </p>
      </div>

      {/* Perforation: a row of pixels that light up one after another, like a ticket being torn. */}
      <span aria-hidden="true" className="flex justify-between px-4">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ animationDelay: `${index * 100}ms` }} className="zenith-blink size-1.5 rounded-[2px] bg-fg/40" />
        ))}
      </span>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <dl className="grid grid-cols-3 gap-2">
          {terms.map((term) => (
            <div key={term.key} className="group/term flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-fg/[0.03] px-3 py-2.5 transition-colors duration-300 hover:border-line-strong motion-reduce:transition-none">
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
            <span key={group} className="rounded-full bg-fg/10 px-2.5 py-0.5 text-[11px] font-semibold text-fg">
              {group}
            </span>
          ))}
        </p>
        <p className="text-[11px] text-fg-subtle">{translate(isRequest ? 'bonus.modeRequestHint' : 'bonus.modeAutoHint')}</p>

        <div className="mt-auto flex items-center gap-3">
          <Button type="button" className="relative flex-1 overflow-hidden rounded-full" aria-haspopup="dialog" onClick={() => setIsDetailsOpen(true)}>
            <span aria-hidden="true" className="zenith-scan-x absolute inset-y-0 left-0 w-12 bg-white/35" />
            <Icon name="bolt" size={15} className="relative" />
            <span className="relative">{translate('bonus.depositToClaim')}</span>
          </Button>
          {claimCount > 0 && (
            <p className="flex shrink-0 items-center gap-1.5 text-[11px] text-fg-subtle">
              {translate('bonus.myEyebrow')}
              <span className="rounded-full bg-[var(--zenith-red)] px-1.5 font-bold text-white tabular-nums">{claimCount}</span>
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
        <span className="grid min-w-8 place-items-center rounded-full bg-[var(--zenith-red)] px-2 py-0.5 text-xs font-black text-white tabular-nums">{claims.length}</span>
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
        <PixelGift />
      </span>
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Date stamp for the claim: a tall capsule with the month in red, the big day and the year underneath. */
function DateStamp({ iso }: { iso: string }) {
  const date = Date.parse(iso);
  return (
    <span aria-hidden="true" className="flex w-14 shrink-0 flex-col items-center rounded-full border border-line bg-fg/[0.03] py-2.5 text-center transition-colors duration-300 group-hover/entry:border-line-strong motion-reduce:transition-none">
      <span className="text-[10px] font-bold tracking-[0.16em] text-[var(--zenith-red)] uppercase">{monthFormatter.format(date)}</span>
      <span className="mt-0.5 text-2xl leading-none font-black text-fg tabular-nums">{dayFormatter.format(date)}</span>
      <span className="mt-1 font-mono text-[9.5px] text-fg-subtle">{yearFormatter.format(date)}</span>
    </span>
  );
}

const timelineNodeClass: Record<BonusClaimStatus, string> = {
  approved: 'bg-fg text-app',
  pending: 'bg-[var(--zenith-red)] text-white',
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
      {/* Timeline node on the dashed spine: pending pulses red, credited is solid white, rejected stays hollow. */}
      <span aria-hidden="true" className="absolute top-5 left-0 grid size-7 place-items-center">
        {isPending && <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)]/40 motion-reduce:hidden" />}
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

        {/* Deposit → bonus: a red bead runs along the dashed route once the bonus is credited. */}
        <dl className="flex items-center gap-3 rounded-full bg-fg/5 py-2 pr-4 pl-4 sm:col-span-2 lg:col-span-1">
          <div>
            <dt className="text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('bonus.fromDeposit')}</dt>
            <dd className="text-sm font-semibold text-fg tabular-nums">{formatMoney(claim.depositAmount, currency)}</dd>
          </div>
          <div aria-hidden="true" className="relative flex w-20 shrink-0 items-center justify-center">
            <span className="absolute inset-x-0 border-t-2 border-dashed border-line-strong" />
            {isApproved && (
              <span className="absolute inset-x-0 top-1/2">
                <span className="zenith-route absolute -top-[4px] size-2 -translate-x-1/2 rounded-full bg-[var(--zenith-red)] shadow-[0_0_10px_rgb(255_74_61/0.7)]" />
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
      </div>
    </li>
  );
}

const statusSegmentClass: Record<BonusClaimStatus, string> = {
  approved: 'bg-fg',
  pending: 'bg-[var(--zenith-red)]',
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
        <span aria-hidden="true" className="absolute top-6 bottom-6 left-[13px] border-l-2 border-dashed border-line" />
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
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--zenith-red)]" />
            {translate('bonus.available')}
            <span className="rounded-full bg-fg px-1.5 text-[10px] tracking-normal text-app tabular-nums">{data.campaigns.length}</span>
            <span aria-hidden="true" className="flex-1 border-t border-line" />
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
      <BonusHero tab={tab} onTabChange={setTab} tabsId={tabsId} campaignCount={data.campaigns.length} claimCount={data.claims.length} />
      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`}>
        {panel}
      </div>
    </div>
  );
}
