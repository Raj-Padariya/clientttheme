'use client';

import type { BonusCampaign } from '@/core/pages/useBonuses';
import { cx } from '../lib/cx';
import { Button, LinkButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';

const detailsText = {
  title: 'Bonus Campaign Details',
  notice: (amount: string) => (
    <>
      Make an eligible deposit of at least <strong className="font-semibold text-fg">{amount}</strong> to claim this bonus.
    </>
  ),
  offerFor: 'Offer details for',
  bonus: 'bonus.',
  maxCap: 'MAX CAP',
  duration: 'DURATION',
  minDeposit: 'MIN DEPOSIT',
  unlimited: 'Unlimited',
  days: (count: number) => `${count} days`,
  allowedGroups: 'ALLOWED ACCOUNTS / GROUPS',
  allGroups: 'All Groups',
  cancel: 'Cancel',
  depositNow: 'Make a Deposit Now',
};

/** The reference prints amounts without separators ("$25000"). */
function plainMoney(amount: number) {
  return `$${Math.round(amount)}`;
}

/** "Tradable Bonus" → "tradable", matching the reference's "50% tradable bonus". */
function bonusFlavour(campaign: BonusCampaign) {
  return campaign.kind.replace(/\s*bonus$/i, '').toLowerCase();
}

export function BonusDetailsModal({ campaign, onClose }: { campaign: BonusCampaign; onClose: () => void }) {
  const groups = campaign.allowedGroups.length === 0 ? [detailsText.allGroups] : campaign.allowedGroups;
  const stats: { key: string; icon: IconName; label: string; value: string; tone: string }[] = [
    { key: 'cap', icon: 'trophy', label: detailsText.maxCap, value: plainMoney(campaign.maxCap), tone: 'text-primary' },
    { key: 'duration', icon: 'clock', label: detailsText.duration, value: campaign.durationDays === null ? detailsText.unlimited : detailsText.days(campaign.durationDays), tone: 'text-fg' },
    { key: 'min', icon: 'deposit', label: detailsText.minDeposit, value: plainMoney(campaign.minDeposit), tone: 'text-fg' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={detailsText.title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {detailsText.cancel}
          </Button>
          <LinkButton href="/deposit" leftIcon="wallet" className="group/dep relative overflow-hidden">
            <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/dep:translate-x-full motion-reduce:hidden" />
            <span className="relative">{detailsText.depositNow}</span>
          </LinkButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <section className="glow-border relative animate-rise overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-surface-2 to-surface-2 p-5 motion-reduce:animate-none">
          <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-10 size-40 animate-drift rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
          <div className="relative flex items-center gap-4">
            <span className="relative grid size-14 shrink-0 place-items-center">
              <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl ring-2 ring-primary/50 motion-reduce:hidden" />
              <span className="relative grid size-14 animate-float place-items-center rounded-2xl bg-primary text-on-primary shadow-[0_10px_24px_-10px_var(--brand-primary)] motion-reduce:animate-none">
                <Icon name="gift" size={24} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="bg-clip-text text-4xl leading-none font-black tracking-tighter text-transparent tabular-nums [background-image:linear-gradient(180deg,#fff8e6_0%,var(--brand-primary)_55%,#8a6a1c_100%)]">
                {campaign.percent}%
              </p>
              <p className="mt-1.5 text-sm text-fg-muted">
                {detailsText.offerFor}{' '}
                <span className="font-semibold text-fg">
                  {campaign.percent}% {bonusFlavour(campaign)}
                </span>{' '}
                {detailsText.bonus}
              </p>
            </div>
          </div>
        </section>

        <div style={{ animationDelay: '120ms' }} className="flex animate-rise items-center gap-3 rounded-xl bg-primary-soft/60 p-3 ring-1 ring-primary/25 motion-reduce:animate-none">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-primary ring-1 ring-primary/30">
            <Icon name="deposit" size={15} />
          </span>
          <svg aria-hidden="true" className="h-3 w-8 shrink-0 overflow-visible">
            <line x1="0" x2="100%" y1="50%" y2="50%" strokeWidth="2" strokeDasharray="3 3" className="stroke-primary/50" />
            <circle cy="50%" r="3" className="fill-primary motion-reduce:hidden">
              <animate attributeName="cx" values="0%;100%" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            <Icon name="gift" size={15} />
          </span>
          <p className="min-w-0 text-xs leading-relaxed text-fg-muted">{detailsText.notice(plainMoney(campaign.minDeposit))}</p>
        </div>

        <dl className="flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface-2/60 ring-1 ring-line">
          {stats.map((stat, index) => (
            <div
              key={stat.key}
              style={{ animationDelay: `${200 + index * 90}ms` }}
              className="group flex animate-feed-in items-center gap-3 px-4 py-3 transition-colors hover:bg-hover motion-reduce:animate-none"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform duration-300 group-hover:-rotate-12">
                <Icon name={stat.icon} size={15} />
              </span>
              <dt className="flex-1 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle">{stat.label}</dt>
              <dd className={cx('text-base font-semibold tabular-nums', stat.tone)}>{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div style={{ animationDelay: '480ms' }} className="animate-rise motion-reduce:animate-none">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-fg-subtle">
            <Icon name="user" size={13} />
            {detailsText.allowedGroups}
          </p>
          <ul className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <li key={group} className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/30">
                <span className="size-1.5 animate-blink rounded-full bg-success motion-reduce:animate-none" />
                {group}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
