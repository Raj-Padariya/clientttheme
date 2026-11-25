'use client';

import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { cx } from '../lib/cx';
import { CountUp, LiveDot, staggerStyle } from '../pamm/motion';
import { LinkButton } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

interface SnapshotStat {
  key: string;
  icon: IconName;
  labelKey: MessageKey;
  captionKey: MessageKey;
  value: number;
  format: (current: number) => string;
}

const LINK_DOTS = 5;
const LINK_DOT_DELAY_MS = 220;

const formatUsd = (amount: number) => formatMoney(amount, 'USD');
const formatCount = (current: number) => String(Math.round(current));

const snapshotStats: SnapshotStat[] = [
  { key: 'copied', icon: 'wallet', labelKey: 'copy.invest.totalCopied', captionKey: 'copy.invest.yourCapital', value: 0, format: formatUsd },
  { key: 'pnl', icon: 'trendUp', labelKey: 'copy.invest.totalPnl', captionKey: 'copy.invest.allTime', value: 0, format: formatUsd },
  { key: 'balance', icon: 'pieChart', labelKey: 'copy.invest.netBalance', captionKey: 'copy.invest.currentValue', value: 0, format: formatUsd },
  { key: 'masters', icon: 'copy', labelKey: 'copy.invest.activeCopies', captionKey: 'copy.invest.mastersFollowed', value: 0, format: formatCount },
];

function MirrorNode({ icon, labelKey, isSource }: { icon: IconName; labelKey: MessageKey; isSource: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="relative grid size-20 place-items-center">
        {isSource && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-2xl bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_50%,var(--brand-primary))] motion-reduce:animate-none"
          />
        )}
        <span
          className={cx(
            'relative grid size-[76px] place-items-center overflow-hidden rounded-2xl',
            isSource
              ? 'bg-primary text-on-primary shadow-[0_0_40px_-8px_var(--brand-primary)]'
              : 'border-2 border-dashed border-primary/50 bg-surface text-primary',
          )}
        >
          {isSource && <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />}
          <Icon name={icon} size={30} className="relative" />
        </span>
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">{translate(labelKey)}</span>
    </div>
  );
}

// Master → you: dots pulse one after another along the link so the trade looks like it is being mirrored across.
function MirrorStage() {
  return (
    <div aria-hidden="true" className="relative flex items-center gap-3 sm:gap-5">
      <span className="animate-float motion-reduce:animate-none">
        <MirrorNode icon="trophy" labelKey="copy.invest.masterNode" isSource />
      </span>

      <div className="relative mb-7 flex items-center gap-2 sm:gap-3">
        {Array.from({ length: LINK_DOTS }, (_, index) => (
          <span key={index} className="relative flex size-2.5">
            <span
              style={{ animationDelay: `${index * LINK_DOT_DELAY_MS}ms` }}
              className="absolute inset-0 animate-ping-soft rounded-full bg-primary motion-reduce:animate-none"
            />
            <span
              style={{ animationDelay: `${index * LINK_DOT_DELAY_MS}ms` }}
              className="relative size-2.5 animate-glow rounded-full bg-primary motion-reduce:animate-none"
            />
          </span>
        ))}
        <span className="absolute -top-9 left-1/2 grid size-8 -translate-x-1/2 animate-float place-items-center rounded-full bg-surface text-primary shadow-card ring-1 ring-primary/30 motion-reduce:animate-none">
          <Icon name="copy" size={15} />
        </span>
      </div>

      <span style={{ animationDelay: '-4s' }} className="animate-float motion-reduce:animate-none">
        <MirrorNode icon="user" labelKey="copy.invest.youNode" isSource={false} />
      </span>
    </div>
  );
}

function SnapshotStrip() {
  return (
    <ul className="relative grid border-t border-line sm:grid-cols-2 xl:grid-cols-4">
      {snapshotStats.map((stat, index) => (
        <li
          key={stat.key}
          style={staggerStyle(index, 350)}
          className="group relative flex animate-rise items-center gap-3 border-line p-5 transition-colors duration-300 hover:bg-hover motion-reduce:animate-none sm:[&:nth-child(odd)]:border-r xl:border-r xl:last:border-r-0"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/25 transition-[transform,background-color,color] duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary motion-reduce:transition-none">
            <Icon name={stat.icon} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-fg-muted">{translate(stat.labelKey)}</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight text-fg">
              <CountUp value={stat.value} format={stat.format} />
            </p>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{translate(stat.captionKey)}</span>
          <span
            aria-hidden="true"
            style={staggerStyle(index, 700)}
            className="absolute inset-x-5 bottom-0 h-0.5 origin-left animate-grow rounded-full bg-linear-to-r from-primary/70 to-transparent motion-reduce:animate-none"
          />
        </li>
      ))}
    </ul>
  );
}

export default function CopyInvestmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={translate('nav.copyInvestments')} />

      <section className="kpi-card relative animate-rise overflow-hidden rounded-xl motion-reduce:animate-none">
        <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-80 animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none"
        />

        <div className="relative flex flex-col items-center gap-10 p-6 sm:p-10 lg:flex-row-reverse lg:justify-between">
          <MirrorStage />

          <div className="flex max-w-lg flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
              <LiveDot />
              {translate('copy.invest.leaderboardLive')}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{translate('copy.invest.emptyTitle')}</h2>
            <p className="text-sm leading-relaxed text-fg-muted">{translate('copy.invest.emptyText')}</p>
            <LinkButton
              href="/copy-trading/masters"
              size="lg"
              className="group/explore relative mt-3 overflow-hidden shadow-[0_14px_30px_-14px_var(--brand-primary)]"
            >
              <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
              <span className="relative">{translate('copy.invest.explore')}</span>
              <Icon
                name="arrowRight"
                size={20}
                className="relative transition-transform duration-200 group-hover/explore:translate-x-1 motion-reduce:transition-none"
              />
            </LinkButton>
          </div>
        </div>

        <SnapshotStrip />
      </section>
    </div>
  );
}
