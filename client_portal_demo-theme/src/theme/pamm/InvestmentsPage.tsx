'use client';

import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { LinkButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { CountUp, LiveDot, staggerStyle } from './motion';

interface PortfolioStat {
  key: string;
  icon: IconName;
  labelKey: MessageKey;
  captionKey: MessageKey;
  value: number;
  format: (current: number) => string;
}

const formatUsd = (amount: number) => formatMoney(amount, 'USD');

const portfolioStats: PortfolioStat[] = [
  { key: 'invested', icon: 'wallet', labelKey: 'pamm.invest.totalInvested', captionKey: 'pamm.invest.yourCapital', value: 0, format: formatUsd },
  { key: 'pnl', icon: 'trendUp', labelKey: 'pamm.invest.totalPnl', captionKey: 'pamm.invest.allTime', value: 0, format: formatUsd },
  { key: 'balance', icon: 'pieChart', labelKey: 'pamm.invest.netBalance', captionKey: 'pamm.invest.currentValue', value: 0, format: formatUsd },
  {
    key: 'plans',
    icon: 'checkCircle',
    labelKey: 'pamm.invest.activePlans',
    captionKey: 'pamm.invest.liveSubscriptions',
    value: 0,
    format: (current) => String(Math.round(current)),
  },
];

const floatingBadges: { icon: IconName; position: string; delayMs: number }[] = [
  { icon: 'wallet', position: 'top-4 right-2', delayMs: 0 },
  { icon: 'trendUp', position: 'bottom-6 left-0', delayMs: -2500 },
  { icon: 'checkCircle', position: 'top-10 left-2', delayMs: -5000 },
];

function OrbitStage() {
  return (
    <div aria-hidden="true" className="relative grid size-60 shrink-0 place-items-center">
      {['inset-0', 'inset-7', 'inset-14'].map((inset, index) => (
        <span
          key={inset}
          style={staggerStyle(index, 0)}
          className={`absolute ${inset} animate-ring-breathe rounded-full border border-primary/25 motion-reduce:animate-none`}
        />
      ))}

      <span className="absolute inset-0 animate-[spin_10s_linear_infinite] motion-reduce:animate-none">
        <span className="absolute top-0 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_2px_var(--brand-primary)]" />
      </span>
      <span className="absolute inset-7 animate-[spin_14s_linear_infinite_reverse] motion-reduce:animate-none">
        <span className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-success shadow-[0_0_10px_2px_var(--color-success)]" />
      </span>

      <span className="relative grid size-24 animate-float place-items-center overflow-hidden rounded-full bg-primary text-on-primary shadow-[0_0_48px_-6px_var(--brand-primary)] motion-reduce:animate-none">
        <span className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
        <Icon name="pieChart" size={36} className="relative" />
      </span>

      {floatingBadges.map((badge) => (
        <span
          key={badge.icon}
          style={{ animationDelay: `${badge.delayMs}ms` }}
          className={`glass absolute ${badge.position} grid size-10 animate-float place-items-center rounded-lg text-primary motion-reduce:animate-none`}
        >
          <Icon name={badge.icon} size={18} />
        </span>
      ))}
    </div>
  );
}

function EmptyStage() {
  return (
    <section className="kpi-card relative flex animate-rise flex-col items-center gap-8 overflow-hidden rounded-xl p-6 sm:p-10 lg:flex-row motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 size-72 animate-glow rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
      />

      <OrbitStage />

      <div className="relative flex max-w-md flex-col items-center gap-3 text-center lg:items-start lg:text-left">
        <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{translate('pamm.invest.emptyTitle')}</h2>
        <p className="text-sm leading-relaxed text-fg-muted">{translate('pamm.invest.emptyText')}</p>
        <LinkButton
          href="/pamm/fund-managers"
          size="lg"
          className="group/browse relative mt-3 overflow-hidden shadow-[0_14px_30px_-14px_var(--brand-primary)]"
        >
          <span
            aria-hidden="true"
            className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none"
          />
          <span className="relative">{translate('pamm.invest.browse')}</span>
          <Icon
            name="arrowRight"
            size={20}
            className="relative transition-transform duration-200 group-hover/browse:translate-x-1 motion-reduce:transition-none"
          />
        </LinkButton>
      </div>
    </section>
  );
}

function PortfolioSnapshot() {
  return (
    <section
      style={staggerStyle(1, 100)}
      className="glow-border flex animate-rise flex-col rounded-xl bg-surface p-5 shadow-card sm:p-6 motion-reduce:animate-none"
    >
      <h2 className="flex items-center justify-between gap-3 text-sm font-semibold text-fg">
        {translate('pamm.invest.snapshot')}
        <LiveDot />
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {portfolioStats.map((stat, index) => (
          <li
            key={stat.key}
            style={staggerStyle(index, 250)}
            className="group relative flex animate-rise items-center gap-4 overflow-hidden rounded-lg bg-surface-2 p-4 transition-[translate,background-color] duration-300 hover:translate-x-1 hover:bg-hover motion-reduce:animate-none motion-reduce:transition-none"
          >
            <span
              aria-hidden="true"
              className="wallet-sheen pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full motion-reduce:hidden"
            />
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-[0_8px_20px_-8px_var(--brand-primary)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none">
              <Icon name={stat.icon} size={20} />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="text-sm text-fg-muted">{translate(stat.labelKey)}</p>
              <p className="mt-0.5 inline-flex rounded-sm bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
                {translate(stat.captionKey)}
              </p>
            </div>
            <p className="relative text-xl font-semibold tabular-nums tracking-tight text-fg">
              <CountUp value={stat.value} format={stat.format} />
            </p>
            <span
              aria-hidden="true"
              style={staggerStyle(index, 600)}
              className="absolute inset-x-4 bottom-0 h-px origin-left animate-grow bg-linear-to-r from-primary/70 to-transparent motion-reduce:animate-none"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function InvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.pammInvestments')} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <EmptyStage />
        <PortfolioSnapshot />
      </div>
    </div>
  );
}
