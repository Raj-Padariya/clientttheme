'use client';

import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbCommissionPeriod, IbDashboard, IbStats } from '@/core/mock/ib';
import { cx } from '../lib/cx';
import { ACCENT, DeskHead, deskClass, stagger, useMounted } from './ibDashboardKit';

/* ───────────── Client funds as an order book: deposits on the bid, withdrawals on the ask, equity as the mid ───────────── */

export function FundsOrderBook({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const deposited = stats.totalDeposited;
  const scaleMax = Math.max(deposited, stats.totalWithdrawal, stats.totalAvailableEquity, 1);
  const shareOfDeposits = (amount: number) => (deposited > 0 ? Math.round((amount / deposited) * 100) : 0);
  const levels: { labelKey: MessageKey; amount: number; share: number | null; bar: string; text: string }[] = [
    { labelKey: 'ibDash.totalDeposited', amount: deposited, share: null, bar: 'bg-success/20', text: 'text-success' },
    { labelKey: 'ibDash.totalEquity', amount: stats.totalAvailableEquity, share: shareOfDeposits(stats.totalAvailableEquity), bar: 'bg-fg/12', text: 'text-fg' },
    { labelKey: 'ibDash.totalWithdrawal', amount: stats.totalWithdrawal, share: shareOfDeposits(stats.totalWithdrawal), bar: 'bg-danger/20', text: 'text-danger' },
  ];

  return (
    <section style={{ animationDelay: '120ms' }} className={cx(deskClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-5')}>
      <DeskHead icon="bank" title={translate('ibDash.groupMoney')}>
        <span className="font-mono text-sm font-black text-fg tabular-nums">{formatMoney(deposited, stats.currency)}</span>
      </DeskHead>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 px-4 pt-3 pb-1 font-mono text-[10px] tracking-[0.12em] text-fg-subtle uppercase sm:px-5">
        <span>{translate('ibDash.groupMoney')}</span>
        <span className="text-right">%</span>
        <span className="w-24 text-right">{stats.currency}</span>
      </div>

      <ul className="flex flex-1 flex-col justify-center gap-1.5 px-2 pb-4 sm:px-3">
        {levels.map((level, index) => {
          const width = isMounted ? Math.max(6, (level.amount / scaleMax) * 100) : 0;
          return (
            <li key={level.labelKey} style={stagger(index, 90, 250)} className="animate-feed-in motion-reduce:animate-none">
              <div className="relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 overflow-hidden rounded-lg px-2 py-3 sm:px-3">
                <span aria-hidden="true" className="absolute inset-y-0 right-0 overflow-hidden">
                  <span
                    style={{ width: `${width}%`, animationDelay: `${index * 0.4}s`, transitionDelay: `${200 + index * 160}ms` }}
                    className={cx('ibd-depth absolute inset-y-0 right-0 block origin-right rounded-lg transition-[width] duration-1000 ease-out motion-reduce:transition-none', level.bar)}
                  />
                </span>
                <span className="relative flex min-w-0 items-center gap-2 text-xs text-fg-muted">
                  <span className={cx('size-2 shrink-0 rounded-[2px]', level.text === 'text-fg' ? 'bg-fg' : level.text === 'text-success' ? 'bg-success' : 'bg-danger')} />
                  <span className="truncate">{translate(level.labelKey)}</span>
                </span>
                <span className="relative text-right font-mono text-[11px] text-fg-subtle tabular-nums">{level.share === null ? '—' : `${level.share}%`}</span>
                <span className={cx('relative w-24 text-right font-mono text-sm font-black tabular-nums', level.text)}>{formatMoney(level.amount, stats.currency)}</span>
              </div>
              {index < levels.length - 1 && <span aria-hidden="true" className="mx-3 my-1 block border-t border-dashed border-line-strong" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────── Client margin monitor: one position bar per client; red bars blink when margin < 100% ───────────── */

const MAX_SLOTS = 16;
type SlotKind = 'healthy' | 'risk' | 'pending';

export function ClientMonitor({ stats }: { stats: IbStats }) {
  const shownClients = Math.min(stats.totalClients, MAX_SLOTS);
  const shownRisk = Math.min(stats.marginLevelBelow100, shownClients);
  const shownPending = Math.min(stats.pendingRequests, MAX_SLOTS - shownClients);
  const hiddenCount = stats.totalClients - shownClients;
  const slots: SlotKind[] = [
    ...Array<SlotKind>(shownRisk).fill('risk'),
    ...Array<SlotKind>(shownClients - shownRisk).fill('healthy'),
    ...Array<SlotKind>(shownPending).fill('pending'),
  ];
  const isAlert = stats.marginLevelBelow100 > 0;
  const readouts: { labelKey: MessageKey; value: number; tone: string; isAlert?: boolean }[] = [
    { labelKey: 'ibDash.totalClients', value: stats.totalClients, tone: 'text-fg' },
    { labelKey: 'ibDash.marginBelow', value: stats.marginLevelBelow100, tone: isAlert ? 'text-danger' : 'text-fg', isAlert },
    { labelKey: 'ibDash.pendingRequests', value: stats.pendingRequests, tone: 'text-fg' },
  ];

  return (
    <section style={{ animationDelay: '180ms' }} className={cx(deskClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-3')}>
      <DeskHead icon="user" title={translate('ibDash.groupNetwork')} />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-6xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums">{stats.totalClients}</p>
          {hiddenCount > 0 && <span className="rounded-md bg-fg/10 px-2 py-0.5 font-mono text-[11px] font-black text-fg">+{hiddenCount}</span>}
        </div>

        {/* Position bars: solid = healthy client, blinking red = margin below 100%, dashed = pending request. */}
        <div aria-hidden="true" className="flex h-24 items-end gap-1.5 border-b border-line pb-1">
          {slots.length === 0 && <span className="h-1 flex-1 rounded-full bg-fg/10" />}
          {slots.map((kind, index) => (
            <span
              key={index}
              style={{ ...stagger(index, 70, 300), height: kind === 'risk' ? '45%' : kind === 'pending' ? '60%' : '100%' }}
              className={cx(
                'ibd-candle max-w-6 min-w-0 flex-1 rounded-t-md',
                kind === 'risk' && 'zenith-blink bg-danger',
                kind === 'healthy' && 'bg-success',
                kind === 'pending' && 'border-2 border-b-0 border-dashed border-fg/40',
              )}
            />
          ))}
        </div>

        <dl className="mt-auto flex flex-col">
          {readouts.map((item, index) => (
            <div key={item.labelKey} style={stagger(index, 80, 400)} className={cx('flex animate-feed-in items-center gap-2 border-t border-line py-2 first:border-t-0 motion-reduce:animate-none', item.isAlert && 'text-danger')}>
              <dt className="min-w-0 flex-1 truncate text-xs text-fg-muted">{translate(item.labelKey)}</dt>
              <dd className={cx('font-mono text-base font-black tabular-nums', item.tone, item.isAlert && 'zenith-blink')}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────── Commission split as a bid/ask spread: mine on the bid, sub-IB on the ask, the marker sits on the split ───────────── */

const periods: { id: IbCommissionPeriod; labelKey: MessageKey }[] = [
  { id: 'thisMonth', labelKey: 'ibDash.thisMonth' },
  { id: 'lastMonth', labelKey: 'ibDash.lastMonth' },
  { id: 'thisYear', labelKey: 'ibDash.thisYear' },
];

export function CommissionSpread({ data }: { data: IbDashboard }) {
  const [period, setPeriod] = useState<IbCommissionPeriod>('thisMonth');
  const commission = data.commission[period];
  const total = commission.mine + commission.subIb;
  const myShare = total > 0 ? (commission.mine / total) * 100 : 50;
  const periodLabel = translate(periods.find((item) => item.id === period)?.labelKey ?? 'ibDash.thisMonth');
  const sides = [
    { labelKey: 'ibDash.myCommission' as const, amount: commission.mine, share: myShare, tone: 'text-success', align: 'items-start text-left' },
    { labelKey: 'ibDash.subIbCommission' as const, amount: commission.subIb, share: 100 - myShare, tone: 'text-[var(--zenith-red)]', align: 'items-end text-right' },
  ];

  return (
    <section style={{ animationDelay: '240ms' }} className={cx(deskClass, 'flex animate-rise flex-col motion-reduce:animate-none lg:col-span-4')}>
      <DeskHead icon="transfer" title={translate('ibDash.commissionSummary')} />

      <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
        <div role="radiogroup" aria-label={translate('ibDash.commissionSummary')} className="grid grid-cols-3 gap-1 rounded-lg bg-fg/[0.04] p-1">
          {periods.map((item) => {
            const isActive = item.id === period;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setPeriod(item.id)}
                className={cx(
                  'h-8 rounded-md px-2 font-mono text-[11px] font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'bg-fg text-app' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
                )}
              >
                {translate(item.labelKey)}
              </button>
            );
          })}
        </div>

        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-line ring-1 ring-line">
          {sides.map((side) => (
            <li key={side.labelKey} className={cx('flex flex-col gap-1 bg-app p-3', side.align)}>
              <span className="text-[11px] leading-tight text-fg-muted">
                {translate(side.labelKey)} ({periodLabel})
              </span>
              <span key={`${period}-${side.labelKey}`} className={cx('animate-feed-in font-mono text-xl leading-none font-black tracking-tight tabular-nums motion-reduce:animate-none', side.tone)}>
                {formatMoney(side.amount, data.stats.currency)}
              </span>
              <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{total > 0 ? `${Math.round(side.share)}%` : '—'}</span>
            </li>
          ))}
        </ul>

        {/* Spread bar: bid fill from the left, ask fill from the right; the accent marker slides to the split. */}
        <div aria-hidden="true" className="relative mt-auto pt-7">
          <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-700 ease-[cubic-bezier(0.3,1.2,0.5,1)] motion-reduce:transition-none" style={{ left: `${myShare}%` }}>
            <span style={{ background: ACCENT }} className="animate-float rounded px-1.5 py-0.5 font-mono text-[10px] font-black text-white tabular-nums motion-reduce:animate-none">
              {total > 0 ? `${Math.round(myShare)}/${Math.round(100 - myShare)}` : '50/50'}
            </span>
            <span style={{ background: ACCENT }} className="h-2 w-px" />
          </span>
          <span className="flex h-3 overflow-hidden rounded-full bg-fg/[0.06] ring-1 ring-line">
            <span style={{ width: `${myShare}%` }} className={cx('h-full transition-[width] duration-700 motion-reduce:transition-none', total > 0 ? 'bg-success' : 'bg-fg/15')} />
            <span style={{ background: total > 0 ? ACCENT : undefined }} className={cx('h-full flex-1', total === 0 && 'bg-fg/8')} />
          </span>
        </div>
      </div>
    </section>
  );
}
