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

const captionClass = 'text-[10.5px] tracking-[0.14em] uppercase';
const glassClass = 'orbit-card overflow-hidden';

const SPARKLE_PATH = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z';

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

// A CSS gift box: ribboned body, a lid that lifts on hover, a bow on top and sparkles around it.
function GiftBox() {
  return (
    <span aria-hidden="true" className="group/gift relative flex size-16 shrink-0 items-end justify-center pb-1">
      <span className="absolute inset-1 rounded-full bg-primary/25 blur-xl animate-ring-breathe motion-reduce:animate-none" />
      <Sparkle className="absolute top-0 -right-1 size-3 text-primary drop-shadow-[0_0_6px_var(--brand-primary)]" />
      <Sparkle className="absolute bottom-3 -left-2 size-2.5 text-primary drop-shadow-[0_0_6px_var(--brand-primary)]" delayMs={900} />

      <span className="relative h-11 w-12">
        <span className="absolute inset-x-0 top-3 bottom-0 overflow-hidden rounded-b-lg border border-primary/35 bg-linear-to-b from-primary/30 to-primary/10 shadow-[0_10px_24px_-10px_var(--brand-primary)]">
          <span className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-primary/80" />
        </span>
        <span className="absolute -inset-x-1 top-0 h-3.5 rounded-md border border-primary/45 bg-linear-to-b from-primary/60 to-primary/30 transition-[translate,rotate] duration-500 group-hover/gift:-translate-y-1.5 group-hover/gift:-rotate-6 motion-reduce:transition-none">
          <span className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-primary" />
          <span className="absolute -top-3 left-1/2 h-3.5 w-5 -translate-x-[95%] -rotate-[28deg] rounded-[50%] border-2 border-primary" />
          <span className="absolute -top-3 left-1/2 h-3.5 w-5 -translate-x-[5%] rotate-[28deg] rounded-[50%] border-2 border-primary" />
        </span>
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
    <section className={cx(glassClass, 'p-6 sm:p-8')}>
      {/* Gift-wrap ribbons crossing the card's right edge. */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-24 -z-10 h-[150%] w-8 rotate-[18deg] bg-linear-to-b from-primary/0 via-primary/15 to-primary/0" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-36 -z-10 h-[150%] w-2 rotate-[18deg] bg-linear-to-b from-primary/0 via-primary/10 to-primary/0" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <GiftBox />
          <div>
            <p className={cx(captionClass, 'text-primary')}>{translate('nav.promotion')}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{translate('bonus.campaignsTitle')}</h1>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">{translate('bonus.campaignsText')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Equal-width columns so the selection pill slides exactly one column over. */}
          <div role="tablist" aria-label={translate('bonus.tabs')} className="relative grid w-fit grid-cols-2 rounded-full border border-fg/10 bg-fg/[0.04] p-1 backdrop-blur-xl">
            <span
              aria-hidden="true"
              className={cx(
                'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full border border-primary/40 bg-primary/25 shadow-[0_10px_24px_-14px_var(--brand-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none',
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
                  'relative inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-200 active:scale-95 motion-reduce:transition-none',
                  tab === item.value ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
                <span className={cx('rounded-full px-1.5 text-[10px] tabular-nums', tab === item.value ? 'bg-primary/30 text-fg' : 'bg-fg/10')}>{item.count}</span>
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

function Sparkle({ className, delayMs = 0 }: { className: string; delayMs?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx('animate-twinkle motion-reduce:animate-none', className)} style={{ animationDelay: `${delayMs}ms` }}>
      <path d={SPARKLE_PATH} fill="currentColor" />
    </svg>
  );
}

const claimStatusText: Record<BonusClaimStatus, string> = { pending: 'text-fg-muted', approved: 'text-success', rejected: 'text-fg-subtle' };

// One credited/awaited bonus as a stamp tile: type + status, the bonus value, its deposit, and the account · deposit ref.
function ClaimStamp({ claim, currency }: { claim: BonusClaim; currency: string }) {
  const isApproved = claim.status === 'approved';
  const isPending = claim.status === 'pending';

  let bonusValue: ReactNode;
  if (claim.amount !== null) {
    bonusValue = <span className="text-xl font-bold tracking-tight text-primary tabular-nums">+{formatMoney(claim.amount, currency)}</span>;
  } else if (isPending) {
    bonusValue = <span className="text-sm font-medium text-fg-muted animate-pulse motion-reduce:animate-none">{translate('bonus.awaitingAdmin')}</span>;
  } else {
    bonusValue = <span className="text-xl font-bold text-fg-subtle">—</span>;
  }

  return (
    <li
      className={cx(
        'relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 transition-colors duration-200 motion-reduce:transition-none',
        isPending ? 'border-dashed border-fg/20 bg-fg/[0.02] hover:border-fg/35' : 'border-fg/[0.08] bg-fg/[0.035] hover:border-primary/30',
      )}
    >
      {isApproved && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-primary to-transparent" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 -z-10 size-28 rounded-full bg-primary/15 blur-2xl" />
        </>
      )}

      <div className="flex items-center justify-between gap-2 whitespace-nowrap">
        <BonusTypeChip type={claim.bonusType} />
        <span className={cx('inline-flex items-center gap-1.5 text-[11px] font-medium', claimStatusText[claim.status])}>
          <span aria-hidden="true" className="relative flex size-1.5">
            {isPending && <span className="absolute inset-0 rounded-full bg-current animate-ping motion-reduce:animate-none" />}
            <span className="relative size-1.5 rounded-full bg-current" />
          </span>
          {claimStatusLabel(claim.status)}
        </span>
      </div>

      <p className="mt-4 min-h-7">{bonusValue}</p>
      <p className="mt-1 text-[11px] text-fg-subtle tabular-nums">
        {translate('bonus.fromDeposit')} {formatMoney(claim.depositAmount, currency)}
      </p>
      <p className="mt-3 truncate border-t border-dashed border-fg/10 pt-2.5 font-mono text-[10.5px] text-fg-subtle">
        {claim.account} · {claim.depositRef}
      </p>
    </li>
  );
}

function TermCell({ icon, label, value, isAccent = false }: { icon: IconName; label: string; value: string; isAccent?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-3.5">
      <span
        aria-hidden="true"
        className={cx(
          'flex size-9 shrink-0 items-center justify-center rounded-xl border',
          isAccent ? 'border-primary/35 bg-primary/15 text-primary' : 'border-fg/10 bg-surface-2/60 text-fg-muted',
        )}
      >
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <dt className="truncate text-[9.5px] tracking-[0.12em] text-fg-subtle uppercase">{label}</dt>
        <dd className={cx('truncate text-base font-semibold tabular-nums', isAccent ? 'text-primary' : 'text-fg')}>{value}</dd>
      </div>
    </div>
  );
}

// Punched hole on the voucher's tear line; sits on the card edge so the card's overflow clip cuts it into a half-moon.
const notchClass = 'size-6 shrink-0 rounded-full border border-fg/10 bg-surface-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]';

function BonusPass({ campaign, claims, currency, order }: { campaign: BonusCampaign; claims: BonusClaim[]; currency: string; order: number }) {
  const isRequest = campaign.claimMode === 'request';
  const groups = campaign.allowedGroups.length === 0 ? [translate('bonus.allGroups')] : campaign.allowedGroups;
  const duration = campaign.durationDays === null ? `∞ ${durationLabel(campaign)}` : durationLabel(campaign);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <article
      className={cx(glassClass, 'group relative grid animate-rise motion-reduce:animate-none lg:grid-cols-[minmax(0,22rem)_auto_minmax(0,1fr)]')}
      style={{ animationDelay: `${order * 90}ms` }}
    >
      {/* Voucher face: the offer itself, read at a glance. */}
      <div className="relative isolate flex flex-col overflow-hidden p-6 sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_oklab,var(--brand-primary)_26%,transparent),transparent_60%)]" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(color-mix(in_oklab,var(--color-fg)_14%,transparent)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(160deg,black,transparent_70%)]"
        />
        {/* Holographic sweep across the face on hover. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[450%] motion-reduce:hidden"
        />
        {/* Corner sash carrying the bonus duration. */}
        <span className="absolute top-7 -right-12 w-48 rotate-45 border-y border-primary/40 bg-primary/20 py-1 text-center text-[10px] font-semibold tracking-[0.14em] text-fg uppercase shadow-[0_6px_18px_-8px_var(--brand-primary)] backdrop-blur-md">
          {duration}
        </span>

        <Badge tone={isRequest ? 'info' : 'success'} dot className="w-fit">
          {translate(isRequest ? 'bonus.modeRequest' : 'bonus.modeAuto')}
        </Badge>

        {/* Layered outline copies behind the gradient figure give the percent a stacked 3D depth. */}
        <p aria-hidden="true" className="relative mt-5 w-fit text-[88px] leading-[0.9] font-black tracking-tighter tabular-nums select-none">
          <span className="absolute top-2.5 left-2.5 text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--brand-primary)_35%,transparent)] light:[-webkit-text-stroke:1px_color-mix(in_oklab,var(--brand-primary)_18%,transparent)]">{campaign.percent}%</span>
          <span className="absolute top-1.5 left-1.5 text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--brand-primary)_65%,transparent)] light:[-webkit-text-stroke:1px_color-mix(in_oklab,var(--brand-primary)_32%,transparent)]">{campaign.percent}%</span>
          {/* The white-topped gradient disappears on the light card, so light mode runs deep violet → brand violet. */}
          <span className="relative bg-clip-text text-transparent drop-shadow-[0_6px_18px_color-mix(in_oklab,var(--brand-primary)_45%,transparent)] [background-image:linear-gradient(180deg,#ffffff_0%,#e4dcff_45%,var(--brand-primary)_100%)] light:drop-shadow-[0_6px_14px_color-mix(in_oklab,var(--brand-primary)_22%,transparent)] light:[background-image:linear-gradient(180deg,color-mix(in_oklab,var(--brand-primary)_55%,#1e1036)_0%,var(--brand-primary)_100%)]">
            {campaign.percent}%
          </span>
        </p>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">{translate('bonus.matchLabel')}</p>

        <h2 className="mt-4 text-xl font-semibold tracking-tight text-fg">
          <span className="sr-only">{campaign.percent}% </span>
          {campaign.name}
        </h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {campaign.kind} <span className="text-fg-subtle">·</span> {campaign.category}
        </p>
        <p className="mt-1 text-[11px] text-fg-subtle">{translate(isRequest ? 'bonus.modeRequestHint' : 'bonus.modeAutoHint')}</p>

        <div className="mt-auto pt-6">
          <Button type="button" fullWidth aria-haspopup="dialog" onClick={() => setIsDetailsOpen(true)}>
            <Icon name="bolt" size={15} />
            {translate('bonus.depositToClaim')}
          </Button>
        </div>
      </div>

      {/* Tear line: horizontal on mobile, vertical beside the face on large screens, punched at both card edges. */}
      <div aria-hidden="true" className="flex items-center lg:flex-col">
        <span className={cx(notchClass, '-ml-3 lg:ml-0 lg:-mt-3')} />
        <span className="h-0 flex-1 border-t-2 border-dashed border-fg/15 lg:h-auto lg:w-0 lg:border-t-0 lg:border-l-2" />
        <span className={cx(notchClass, '-mr-3 lg:mr-0 lg:-mb-3')} />
      </div>

      <div className="flex min-w-0 flex-col gap-6 p-6 sm:p-7">
        {/* Terms read as an equation: an eligible deposit times the match, capped at the max bonus. */}
        <dl className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)]">
          <TermCell icon="deposit" label={translate('bonus.minDeposit')} value={wholeMoney(campaign.minDeposit, currency)} />
          <div aria-hidden="true" className="relative flex items-center justify-center sm:w-24">
            <span className="absolute inset-x-0 top-1/2 hidden h-px bg-linear-to-r from-fg/10 via-primary/60 to-fg/10 sm:block" />
            <span className="relative rounded-full border border-primary/40 bg-surface-2 px-3 py-1.5 text-sm font-bold text-primary tabular-nums shadow-[0_0_18px_-6px_var(--brand-primary)]">
              ×{campaign.percent}%
            </span>
          </div>
          <TermCell icon="gift" label={translate('bonus.maxCap')} value={wholeMoney(campaign.maxCap, currency)} isAccent />
          <TermCell icon="history" label={translate('bonus.duration')} value={duration} />
        </dl>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          <Icon name="wallet" size={13} className="text-success" />
          {translate('bonus.allowedGroups')}:
          {groups.map((group) => (
            <span key={group} className="rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
              {group}
            </span>
          ))}
        </p>

        {claims.length > 0 && (
          <div>
            <p className={cx(captionClass, 'mb-3 flex items-center gap-2 text-fg-subtle')}>
              {translate('bonus.myEyebrow')}
              <span className="rounded-full bg-fg/10 px-1.5 text-[10px] tracking-normal tabular-nums">{claims.length}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-fg/10" />
            </p>
            <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,13rem),1fr))]">
              {claims.map((claim) => (
                <ClaimStamp key={claim.id} claim={claim} currency={currency} />
              ))}
            </ul>
          </div>
        )}
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
        <dl className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-4 py-2.5">
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

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
// Round caps add half the 12-unit stroke to each arc end, so an 18-unit gap leaves ~6 units of visible space between arcs.
const RING_GAP = 18;

// Split ring: tradable (green) and losable (violet) arcs of the credited total, with the total counting up in the centre.
function SplitRing({ tradableShare, hasTotal, children }: { tradableShare: number; hasTotal: boolean; children: ReactNode }) {
  const tradableArc = (RING_CIRCUMFERENCE * tradableShare) / 100;
  const losableArc = RING_CIRCUMFERENCE - tradableArc;
  const gap = tradableArc > 0 && losableArc > 0 ? RING_GAP : 0;

  return (
    <div className="relative mx-auto size-56 shrink-0">
      <span aria-hidden="true" className="absolute inset-6 rounded-full bg-primary/20 blur-2xl animate-ring-breathe light:bg-primary/[0.08] motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring absolute -inset-1 animate-orbit-spin motion-reduce:animate-none">
        <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--brand-primary)]" />
      </span>

      <svg viewBox="0 0 140 140" aria-hidden="true" className="relative size-full -rotate-90">
        <circle cx="70" cy="70" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="12" className="text-fg/[0.06]" />
        <circle cx="70" cy="70" r="38" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 4" className="text-fg/20" />
        {hasTotal && tradableArc > 0 && (
          <circle
            cx="70"
            cy="70"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(tradableArc - gap, 0.01)} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={-gap / 2}
            className="text-success drop-shadow-[0_0_6px_color-mix(in_oklab,var(--color-success)_60%,transparent)]"
          />
        )}
        {hasTotal && losableArc > 0 && (
          <circle
            cx="70"
            cy="70"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(losableArc - gap, 0.01)} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={-(tradableArc + gap / 2)}
            className="text-primary drop-shadow-[0_0_6px_var(--brand-primary)]"
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">{children}</div>
    </div>
  );
}

function PipelineStep({ label, hint, count, activeCount, isPending }: { label: string; hint: string; count: number; activeCount: number; isPending: boolean }) {
  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-3.5 backdrop-blur-xl">
      <span aria-hidden="true" className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-fg/10 bg-surface-2/60">
        {isPending && count > 0 && <span className="absolute inset-0 rounded-full border border-fg/30 animate-ping motion-reduce:animate-none" />}
        <span className={cx('text-lg font-semibold tabular-nums', isPending ? 'text-fg' : 'text-primary')}>{count}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{label}</p>
        <p className="text-xs text-fg-muted">{hint}</p>
        <div aria-hidden="true" className="mt-2 flex gap-1">
          {Array.from({ length: activeCount }, (_, index) => (
            <span
              key={index}
              className={cx(
                'h-1 flex-1 rounded-full',
                index < count ? (isPending ? 'bg-fg/70' : 'bg-primary shadow-[0_0_8px_var(--brand-primary)]') : 'bg-fg/10',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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

  const legend: { type: BonusType; amount: number; share: number; barClass: string; textClass: string }[] = [
    { type: 'tradable', amount: tradableTotal, share: tradableShare, barClass: 'bg-success shadow-[0_0_10px_var(--color-success)]', textClass: 'text-success' },
    { type: 'losable', amount: losableTotal, share: losableShare, barClass: 'bg-primary shadow-[0_0_10px_var(--brand-primary)]', textClass: 'text-primary' },
  ];

  return (
    <section className={cx(glassClass, 'animate-rise p-5 motion-reduce:animate-none sm:p-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/3 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />

      <header className="mb-6">
        <p className={cx(captionClass, 'inline-flex items-center gap-1.5 text-fg-muted')}>
          <Icon name="wallet" size={12} />
          {translate('bonus.myEyebrow')}
        </p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{translate('bonus.myTitle')}</h2>
        <p className="mt-1 max-w-xl text-sm text-fg-muted">{translate('bonus.myText')}</p>
      </header>

      <div className="grid items-center gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,16rem)] lg:gap-8">
        <SplitRing tradableShare={tradableShare} hasTotal={total > 0}>
          <p className="text-[9.5px] tracking-[0.14em] text-fg-subtle uppercase">{translate('bonus.totalCredited')}</p>
          <p className="mt-1 max-w-full truncate bg-clip-text text-xl font-bold tracking-tight text-transparent tabular-nums [background-image:linear-gradient(100deg,var(--brand-primary)_0%,#e9e2ff_40%,#ffffff_50%,#e9e2ff_60%,var(--brand-primary)_100%)] [background-size:250%_100%] animate-gold-sheen light:[background-image:linear-gradient(100deg,var(--brand-primary)_0%,color-mix(in_oklab,var(--brand-primary)_55%,#1e1036)_50%,var(--brand-primary)_100%)] motion-reduce:animate-none sm:text-[22px]">
            {formatMoney(shownTotal, currency)}
          </p>
        </SplitRing>

        <dl className="flex flex-col gap-3">
          {legend.map((item) => (
            <div key={item.type} className="rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-xs text-fg-muted">
                  <Icon name={item.type === 'tradable' ? 'trendUp' : 'lock'} size={13} className={item.textClass} />
                  {bonusTypeLabel(item.type)}
                </dt>
                <span className={cx('text-xs font-semibold tabular-nums', item.textClass)}>{Math.round(item.share)}%</span>
              </div>
              <dd className="mt-1.5 text-lg font-semibold text-fg tabular-nums">{formatMoney(item.amount, currency)}</dd>
              <div aria-hidden="true" className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                <span className={cx('block h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none', item.barClass)} style={{ width: `${item.share}%` }} />
              </div>
            </div>
          ))}
        </dl>

        {/* Pipeline: a request waits under review, then the admin credits it. */}
        <div className="relative flex flex-col gap-3">
          <PipelineStep label={translate('bonus.pendingCount')} hint={translate('bonus.statusPending')} count={pendingCount} activeCount={activeCount} isPending />
          <span aria-hidden="true" className="relative mx-auto h-5 w-px bg-linear-to-b from-fg/30 to-primary/70">
            <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--brand-primary)] animate-pulse motion-reduce:animate-none" />
          </span>
          <PipelineStep label={translate('bonus.creditedCount')} hint={translate('bonus.statusApproved')} count={credited.length} activeCount={activeCount} isPending={false} />
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
        <span className="orbit-ring absolute inset-0 animate-orbit-spin motion-reduce:animate-none" />
        <span className="relative flex size-12 items-center justify-center rounded-full border border-line bg-surface/70 text-primary shadow-[0_0_20px_-6px_var(--brand-primary)]">
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
        {/* Each campaign is a full-width horizontal voucher, stacked one below the other. */}
        <div className="flex flex-col gap-6">
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
