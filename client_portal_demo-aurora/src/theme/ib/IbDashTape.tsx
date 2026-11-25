'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbActivity, IbNetworkEvent, IbTradeCommission } from '@/core/mock/ib';
import { cx } from '../lib/cx';
import { DotNumber } from '../ui/DotMatrix';
import { Icon, type IconName } from '../ui/Icon';
import { ACCENT, DeskHead, deskClass, formatAgo, stagger } from './ibDashboardKit';

/* ───────────── Time & sales: activity prints as a tape; the active print auto-advances and opens in the ticket ───────────── */

const eventMeta: Record<IbNetworkEvent['kind'], { titleKey: MessageKey; icon: IconName; tone: string }> = {
  appApproved: { titleKey: 'ibDash.appApproved', icon: 'checkCircle', tone: 'bg-success/15 text-success' },
  subIbAdded: { titleKey: 'ibDash.subIbAdded', icon: 'pieChart', tone: 'bg-fg/10 text-fg' },
  newClient: { titleKey: 'ibDash.newClient', icon: 'user', tone: 'bg-[var(--zenith-red)]/15 text-[var(--zenith-red)]' },
};

function isTrade(item: IbActivity): item is IbTradeCommission {
  return item.kind === 'commission';
}

function SideTag({ side }: { side: IbTradeCommission['side'] }) {
  const isBuy = side === 'buy';
  return (
    <span className={cx('rounded px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wide uppercase', isBuy ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
      {translate(isBuy ? 'ibDash.buy' : 'ibDash.sell')}
    </span>
  );
}

function TradeTicket({ trade, currency }: { trade: IbTradeCommission; currency: string }) {
  const delta = trade.exit - trade.entry;
  const isUp = delta >= 0;
  const fields: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibDash.entry', value: trade.entry.toFixed(2) },
    { labelKey: 'ibDash.exit', value: trade.exit.toFixed(2) },
    { labelKey: 'ibDash.client', value: trade.client },
    { labelKey: 'ibDash.lotSize', value: String(trade.lotSize) },
    { labelKey: 'ibDash.account', value: trade.account },
  ];
  return (
    <div key={trade.id} className="flex animate-feed-in flex-col gap-4 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-lg font-black tracking-tight text-fg">{trade.symbol}</span>
        <SideTag side={trade.side} />
        <span className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-black tabular-nums', isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>
          <Icon name={isUp ? 'trendUp' : 'trendDown'} size={11} />
          {isUp ? '+' : ''}
          {delta.toFixed(2)}
        </span>
      </div>
      <div>
        <p className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate('ibDash.commissionEarned')}</p>
        <p className="mt-1 font-mono text-4xl leading-none font-black tracking-tighter text-success tabular-nums">+{formatMoney(trade.amount, currency)}</p>
        <p className="mt-2 text-xs text-fg-muted">
          {translate('ibDash.from')} <span className="font-bold text-fg">{trade.symbol}</span> ({translate('ibDash.account')}: {trade.account}) · {formatAgo(trade.occurredAt)}
        </p>
      </div>
      <dl className="flex flex-col">
        {fields.map((field) => (
          <div key={field.labelKey} className="flex items-center gap-2 border-t border-dashed border-line py-1.5">
            <dt className="shrink-0 font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">{translate(field.labelKey)}</dt>
            <span aria-hidden="true" className="min-w-4 flex-1" />
            <dd className="truncate font-mono text-sm font-black text-fg tabular-nums">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EventTicket({ event }: { event: IbNetworkEvent }) {
  const meta = eventMeta[event.kind];
  return (
    <div key={event.id} className="flex animate-feed-in flex-col items-start gap-4 motion-reduce:animate-none">
      <span className={cx('grid size-14 place-items-center rounded-2xl', meta.tone)}>
        <Icon name={meta.icon} size={24} />
      </span>
      <div>
        <p className="text-2xl font-black tracking-[-0.02em] text-fg">{translate(meta.titleKey)}</p>
        <p className="mt-1.5 text-sm text-fg-muted">{event.detail}</p>
      </div>
      <span className="rounded-md bg-fg/[0.05] px-2 py-1 font-mono text-[11px] text-fg-muted ring-1 ring-line">{formatAgo(event.occurredAt)}</span>
    </div>
  );
}

export function TimeAndSales({ activity, currency, isFetching, onRefresh }: { activity: IbActivity[]; currency: string; isFetching: boolean; onRefresh: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = activity[activeIndex];
  const advance = () => setActiveIndex((index) => (index + 1) % Math.max(activity.length, 1));

  return (
    <section style={{ animationDelay: '300ms' }} className={cx(deskClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-8')}>
      <DeskHead icon="history" title={translate('ibDash.recentActivity')}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label={translate('pammMgr.refresh')}
          className="grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <Icon name="refresh" size={14} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
        </button>
      </DeskHead>

      <div className="grid flex-1 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ol className="flex flex-col py-1">
          {activity.map((item, index) => {
            const trade = isTrade(item) ? item : null;
            const meta = trade ? null : eventMeta[(item as IbNetworkEvent).kind];
            const isActive = index === activeIndex;
            return (
              <li key={item.id} style={stagger(index, 60, 350)} className="animate-feed-in motion-reduce:animate-none">
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-pressed={isActive}
                  className={cx(
                    'relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5',
                    isActive ? 'ibd-print bg-fg/[0.05]' : 'hover:bg-fg/[0.03]',
                  )}
                >
                  {isActive && <span aria-hidden="true" style={{ background: ACCENT }} className="absolute inset-y-0 left-0 w-0.5" />}
                  <span className={cx('grid size-8 place-items-center rounded-lg', trade ? 'bg-success/15 text-success' : meta?.tone)}>
                    <Icon name={trade ? 'trendUp' : (meta?.icon ?? 'user')} size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-fg">{trade ? trade.symbol : translate(meta?.titleKey ?? 'ibDash.newClient')}</span>
                      {trade && <SideTag side={trade.side} />}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-fg-muted">
                      {trade ? `${translate('ibDash.from')} ${trade.client} (${translate('ibDash.account')}: ${trade.account})` : (item as IbNetworkEvent).detail}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    {trade && <span className="font-mono text-sm font-black text-success tabular-nums">+{formatMoney(trade.amount, currency)}</span>}
                    <span className="font-mono text-[10px] text-fg-subtle">{formatAgo(item.occurredAt)}</span>
                  </span>
                  {isActive && activity.length > 1 && (
                    <span aria-hidden="true" key={`progress-${index}`} onAnimationEnd={advance} style={{ background: ACCENT }} className="ibd-progress absolute inset-x-0 bottom-0 h-0.5" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <aside aria-live="polite" className="border-t border-line bg-fg/[0.02] p-4 sm:p-5 md:border-t-0 md:border-l">
          {active && (isTrade(active) ? <TradeTicket trade={active} currency={currency} /> : <EventTicket event={active} />)}
        </aside>
      </div>
    </section>
  );
}

/* ───────────── Referral order ticket + visits counter ───────────── */

export function ReferralTicket({ link, visits }: { link: string; visits: number }) {
  const [isCopied, setIsCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(link).then(
      () => {
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 1800);
      },
      () => setIsCopied(false),
    );
  }

  return (
    <section style={{ animationDelay: '340ms' }} className={cx(deskClass, 'flex animate-rise flex-col motion-reduce:animate-none')}>
      <DeskHead icon="globe" title={translate('ibDash.refTitle')} />
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <p className="text-xs leading-relaxed text-fg-muted">{translate('ibDash.refText')}</p>

        <div className="flex items-center justify-between gap-4 rounded-[14px] bg-fg px-4 py-3 text-app">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-app/60 uppercase">{translate('ibDash.visitsOnLink')}</p>
            <span aria-hidden="true" className="mt-2 flex h-5 items-end gap-[3px]">
              {[0, 0.15, 0.3, 0.45, 0.6, 0.75].map((delay, bar) => (
                <span
                  key={delay}
                  style={{ animationDelay: `${delay}s`, ...(bar === 5 ? { background: ACCENT } : {}) }}
                  className={cx('h-full w-1.5 origin-bottom animate-eq-bar rounded-full motion-reduce:animate-none', bar !== 5 && 'bg-app/70')}
                />
              ))}
            </span>
          </div>
          <DotNumber value={String(visits)} small />
        </div>

        <div className="flex h-11 items-center gap-2 rounded-[12px] bg-fg/[0.04] pr-1 pl-3 ring-1 ring-line">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg" title={link}>
            {link}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={cx(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97]',
              isCopied ? 'bg-success text-white' : 'bg-fg text-app hover:bg-fg/85',
            )}
          >
            <Icon name={isCopied ? 'checkCircle' : 'copy'} size={14} className={cx(isCopied && 'animate-dot-pop motion-reduce:animate-none')} />
            {translate(isCopied ? 'ibDash.copied' : 'ibDash.copy')}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Quick actions as terminal hotkeys ───────────── */

const quickActions: { href: string; titleKey: MessageKey; textKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/structure', titleKey: 'ibDash.myStructure', textKey: 'ibDash.myStructureText', icon: 'pieChart' },
  { href: '/ib/network', titleKey: 'nav.ibMyNetwork', textKey: 'ibDash.myNetworkText', icon: 'user' },
  { href: '/ib/sub-ib-approval', titleKey: 'nav.ibSubIbApproval', textKey: 'ibDash.subIbApprovalText', icon: 'clock' },
];

export function QuickHotkeys() {
  return (
    <section style={{ animationDelay: '380ms' }} className={cx(deskClass, 'flex animate-rise flex-col motion-reduce:animate-none')}>
      <DeskHead icon="arrowUpRight" title={translate('ibDash.quickActions')} />
      <ul className="flex flex-col p-2">
        {quickActions.map((action, index) => (
          <li key={action.href} style={stagger(index, 80, 420)} className="animate-feed-in motion-reduce:animate-none">
            <Link
              href={action.href}
              className="group flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 transition-colors hover:bg-fg/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="grid h-9 w-10 shrink-0 place-items-center rounded-md border-b-2 border-line-strong bg-fg/[0.06] text-fg transition-[translate,border-color] duration-150 group-hover:translate-y-0.5 group-hover:border-b-0 motion-reduce:transition-none">
                <Icon name={action.icon} size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-fg">{translate(action.titleKey)}</span>
                <span className="block truncate text-xs text-fg-muted" title={translate(action.textKey)}>
                  {translate(action.textKey)}
                </span>
              </span>
              <Icon name="arrowRight" size={14} className="shrink-0 text-fg-subtle transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function IbDashSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4 lg:grid-cols-12">
      <div className="h-10 animate-pulse rounded-full bg-fg/[0.05] lg:col-span-12" />
      <div className="h-96 animate-pulse rounded-[22px] bg-fg/[0.05] lg:col-span-12" />
      <div className="h-72 animate-pulse rounded-[22px] bg-fg/[0.05] lg:col-span-5" />
      <div className="h-72 animate-pulse rounded-[22px] bg-fg/[0.05] lg:col-span-3" />
      <div className="h-72 animate-pulse rounded-[22px] bg-fg/[0.05] lg:col-span-4" />
    </div>
  );
}
