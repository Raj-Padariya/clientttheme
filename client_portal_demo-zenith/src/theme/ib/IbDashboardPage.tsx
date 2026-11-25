'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbActivity, IbCommissionPeriod, IbDashboard, IbNetworkEvent, IbStats, IbTradeCommission } from '@/core/mock/ib';
import { useIbDashboard } from '@/core/pages/useIbDashboard';
import { cx } from '../lib/cx';
import { DotNumber } from '../ui/DotMatrix';
import { Icon, type IconName } from '../ui/Icon';

/*
 * Zenith IB dashboard (Vaulto language): an open partner header with a capsule dock, the rebate as a tick
 * track + withdrawn pixel block, clients as a pixel board, funds as capsule columns, the commission split as
 * one capsule track with a red VS knot, quick actions as capsule rows, and activity as a spotlight + story strip.
 */
const RED = 'var(--zenith-red)';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6';
const openClass = 'relative rounded-[32px] border border-dashed border-line-strong p-5 sm:p-6';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DAY_MS = 86_400_000;

// "2 months ago" style label; switches to days for anything under a month.
function formatAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days < 30) return relativeTime.format(-days, 'day');
  return relativeTime.format(-Math.round(days / 30), 'month');
}

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function useMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return isMounted;
}

function Eyebrow({ icon, children, inverted = false }: { icon: IconName; children: ReactNode; inverted?: boolean }) {
  return (
    <p className={cx('flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.16em] uppercase', inverted ? 'text-white/55' : 'text-fg-subtle')}>
      <span className={cx('relative grid size-7 shrink-0 place-items-center rounded-full', inverted ? 'bg-white text-[#0a1220]' : 'bg-fg text-app')}>
        <Icon name={icon} size={13} />
        <span aria-hidden="true" style={{ background: RED }} className="absolute -top-0.5 -right-0.5 size-2 rounded-[2px]" />
      </span>
      {children}
    </p>
  );
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

/* ───────────── Partner header (open, no card) + capsule dock ───────────── */

const dockLinks: { href: string; labelKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/network', labelKey: 'nav.ibMyNetwork', icon: 'user' },
  { href: '/ib/structure', labelKey: 'nav.ibSubIbStructure', icon: 'pieChart' },
  { href: '/ib/transfer-commission', labelKey: 'nav.ibTransferCommission', icon: 'transfer' },
  { href: '/ib/commission-history', labelKey: 'nav.ibCommissionHistory', icon: 'history' },
];

function PartnerCard() {
  return (
    <section className="zenith-tile flex flex-col gap-6 lg:col-span-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-fg py-1 pr-3 pl-1.5 text-[10.5px] font-black tracking-[0.16em] text-app uppercase">
            <span aria-hidden="true" className="relative flex size-2.5">
              <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
              <span style={{ background: RED }} className="relative size-2.5 rounded-full" />
            </span>
            {translate('ibDash.badge')}
          </span>
          <h2 className="mt-4 text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-6xl">{translate('ibDash.title')}</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-muted">{translate('ibDash.subtitle')}</p>
        </div>

        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
              <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
            </span>
            <span className="grid size-11 place-items-center rounded-full bg-fg text-sm font-black tracking-tight text-app">IB</span>
          </span>
          <button
            type="button"
            className="group/mp inline-flex h-12 items-center gap-3 rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none"
          >
            {translate('ibDash.managerPortal')}
            <span style={{ background: RED }} className="grid size-10 place-items-center rounded-full text-white">
              <Icon name="arrowUpRight" size={15} className="transition-transform duration-300 group-hover/mp:rotate-45 motion-reduce:transition-none" />
            </span>
          </button>
        </div>
      </div>

      <nav aria-label={translate('ibDash.title')}>
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {dockLinks.map((link, index) => (
            <li key={link.href} style={stagger(index, 80, 200)} className="zenith-tile">
              <Link
                href={link.href}
                className="group flex h-full items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-app transition-colors duration-300 group-hover:bg-[var(--zenith-red)] group-hover:text-white">
                  <Icon name={link.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{translate(link.labelKey)}</span>
                <span className="font-mono text-[11px] font-black opacity-40 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <RedRule />
    </section>
  );
}

/* ───────────── Client pixel board: one pixel per client ───────────── */

const MAX_BEADS = 24;
type BeadKind = 'healthy' | 'risk' | 'pending';

function ClientBeadBoard({ stats }: { stats: IbStats }) {
  const shownClients = Math.min(stats.totalClients, MAX_BEADS);
  const shownRisk = Math.min(stats.marginLevelBelow100, shownClients);
  const shownPending = Math.min(stats.pendingRequests, MAX_BEADS - shownClients);
  const hiddenCount = stats.totalClients - shownClients;
  const beads: BeadKind[] = [
    ...Array<BeadKind>(shownRisk).fill('risk'),
    ...Array<BeadKind>(shownClients - shownRisk).fill('healthy'),
    ...Array<BeadKind>(shownPending).fill('pending'),
  ];
  const isAlert = stats.marginLevelBelow100 > 0;
  const legend: { labelKey: MessageKey; value: number; swatch: string; isAlert?: boolean }[] = [
    { labelKey: 'ibDash.totalClients', value: stats.totalClients, swatch: 'bg-fg' },
    { labelKey: 'ibDash.marginBelow', value: stats.marginLevelBelow100, swatch: 'bg-danger', isAlert },
    { labelKey: 'ibDash.pendingRequests', value: stats.pendingRequests, swatch: 'border-2 border-dashed border-fg/45' },
  ];

  return (
    <section style={{ animationDelay: '100ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-5')}>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow icon="user">{translate('ibDash.groupNetwork')}</Eyebrow>
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span key={dot} style={{ animationDelay: `${dot * 0.3}s`, background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
          ))}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.totalClients')}</p>
        <p className="mt-1 font-mono text-7xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums">{stats.totalClients}</p>
      </div>

      {/* Pixel board: solid = healthy client, blinking red = margin below 100%, dashed = pending request. */}
      <ul aria-hidden="true" className="grid grid-cols-8 gap-1.5">
        {beads.map((kind, index) => (
          <li key={index} style={stagger(index, 35, 250)} className="zenith-pixel aspect-square">
            <span
              style={kind === 'risk' ? { animationDelay: `${index * 0.2}s` } : undefined}
              className={cx(
                'block size-full rounded-[5px]',
                kind === 'risk' && 'zenith-blink bg-danger',
                kind === 'healthy' && 'bg-fg',
                kind === 'pending' && 'border-2 border-dashed border-fg/40',
              )}
            />
          </li>
        ))}
        {hiddenCount > 0 && <li className="grid aspect-square place-items-center rounded-[5px] bg-fg/10 font-mono text-[10px] font-black text-fg">+{hiddenCount}</li>}
      </ul>

      <dl className="mt-auto flex flex-col gap-2">
        {legend.map((item, index) => (
          <div
            key={item.labelKey}
            style={stagger(index, 80, 400)}
            className={cx('flex animate-feed-in items-center gap-2.5 rounded-full py-2 pr-4 pl-3 ring-1 motion-reduce:animate-none', item.isAlert ? 'bg-danger/10 ring-danger/40' : 'bg-fg/[0.03] ring-line')}
          >
            <dt className="flex min-w-0 flex-1 items-center gap-2 text-xs text-fg-muted">
              <span aria-hidden="true" className={cx('size-3 shrink-0 rounded-[3px]', item.swatch, item.isAlert && 'zenith-blink')} />
              <span className="truncate">{translate(item.labelKey)}</span>
            </dt>
            <dd className={cx('font-mono text-base font-black tabular-nums', item.isAlert ? 'text-danger' : 'text-fg')}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Rebate: available share as a tick track, withdrawn share as a pixel block ───────────── */

const STRING_BEADS = 32;
const PIXEL_COLS = 7;
const PIXEL_ROWS = 4;

function WithdrawnPixels({ share, isMounted }: { share: number; isMounted: boolean }) {
  const total = PIXEL_COLS * PIXEL_ROWS;
  const lit = isMounted ? Math.round(share * total) : 0;
  return (
    <span aria-hidden="true" className="grid w-36 shrink-0 grid-cols-7 gap-1">
      {Array.from({ length: total }, (_, cell) => (
        <span
          key={cell}
          style={{ transitionDelay: `${300 + cell * 35}ms` }}
          className={cx('aspect-square rounded-[3px] transition-[background-color,scale] duration-300 motion-reduce:transition-none', cell < lit ? 'bg-fg' : 'scale-75 bg-fg/12')}
        />
      ))}
    </span>
  );
}

function RebateVault({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const generated = stats.totalRebateGenerated;
  const availableShare = generated > 0 ? Math.min(1, stats.availableRebate / generated) : 0;
  const withdrawnShare = generated > 0 ? Math.min(1, stats.totalWithdrawalRebate / generated) : 0;
  const litBeads = Math.round(availableShare * STRING_BEADS);
  const receipt: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibDash.totalRebateGen', value: money(generated) },
    { labelKey: 'ibDash.totalWithdrawalRebate', value: money(stats.totalWithdrawalRebate) },
    { labelKey: 'ibDash.totalLot', value: stats.totalLot.toFixed(2) },
  ];

  return (
    <section style={{ animationDelay: '160ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-6 motion-reduce:animate-none lg:col-span-7')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow icon="wallet">{translate('ibDash.availableRebate')}</Eyebrow>
        <span style={{ background: RED }} className="rounded-full px-2.5 py-0.5 font-mono text-xs font-black text-white tabular-nums">
          {Math.round(availableShare * 100)}%
        </span>
      </div>

      <p className="font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">{money(stats.availableRebate)}</p>

      {/* Tick track: lit ticks = share of generated rebate still available; the red head tick blinks. */}
      <span aria-hidden="true" className="flex h-14 items-end gap-[3px]">
        {Array.from({ length: STRING_BEADS }, (_, bead) => {
          const isHead = bead === litBeads - 1;
          const isLit = bead < litBeads;
          return (
            <span
              key={bead}
              style={{ animationDelay: `${bead * 28}ms`, ...(isHead ? { background: RED } : {}) }}
              className={cx('min-w-0 flex-1 rounded-full', isHead ? 'zenith-blink h-full' : isLit ? 'zenith-bar h-4/5 bg-fg' : 'zenith-bar h-1/4 bg-fg/12')}
            />
          );
        })}
      </span>

      <div className="grid gap-6 border-t border-line pt-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="flex items-center gap-4">
          <WithdrawnPixels share={withdrawnShare} isMounted={isMounted} />
          <div>
            <p className="font-mono text-3xl leading-none font-black tracking-tight text-fg tabular-nums">{Math.round(withdrawnShare * 100)}%</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.groupRebates')}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <dl className="flex flex-col gap-2.5">
            {receipt.map((row, index) => (
              <div key={row.labelKey} style={stagger(index, 80, 300)} className="flex animate-feed-in items-center gap-2 motion-reduce:animate-none">
                <dt className="shrink-0 text-xs text-fg-muted">{translate(row.labelKey)}</dt>
                <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-line" />
                <dd className="font-mono text-sm font-black text-fg tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="group/wd inline-flex h-11 items-center justify-between gap-2 rounded-full bg-fg py-1 pr-1 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none"
          >
            {translate('ibDash.withdraw')}
            <span style={{ background: RED }} className="grid size-9 place-items-center rounded-full text-white">
              <Icon name="withdrawal" size={15} className="transition-transform duration-300 group-hover/wd:-translate-y-0.5 motion-reduce:transition-none" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Client funds: capsule columns on one shared scale ───────────── */

function FundsMatrix({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const deposited = stats.totalDeposited;
  const scaleMax = Math.max(deposited, stats.totalWithdrawal, stats.totalAvailableEquity, 1);
  const shareOfDeposits = (amount: number) => (deposited > 0 ? amount / deposited : 0);
  const columns: { labelKey: MessageKey; amount: number; share: number | null; litClass: string; swatch: string }[] = [
    { labelKey: 'ibDash.totalDeposited', amount: deposited, share: null, litClass: 'bg-success', swatch: 'bg-success' },
    { labelKey: 'ibDash.totalWithdrawal', amount: stats.totalWithdrawal, share: shareOfDeposits(stats.totalWithdrawal), litClass: 'bg-danger', swatch: 'bg-danger' },
    { labelKey: 'ibDash.totalEquity', amount: stats.totalAvailableEquity, share: shareOfDeposits(stats.totalAvailableEquity), litClass: 'bg-fg', swatch: 'bg-fg' },
  ];

  return (
    <section style={{ animationDelay: '220ms' }} className={cx(openClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-7')}>
      <Eyebrow icon="bank">{translate('ibDash.groupMoney')}</Eyebrow>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        {/* Capsule columns: each fill rises from the floor to its share of the largest amount; fills are cut into ticks. */}
        <div aria-hidden="true" className="flex h-56 items-end justify-around gap-4">
          {columns.map((column, columnIndex) => {
            const fillPercent = Math.max(8, (column.amount / scaleMax) * 100);
            return (
              <div key={column.labelKey} className="flex h-full w-12 flex-col items-center gap-2">
                <span className="font-mono text-[10px] font-black text-fg-subtle tabular-nums">{Math.round((column.amount / scaleMax) * 100)}%</span>
                <span className="relative w-full flex-1 overflow-hidden rounded-full bg-fg/[0.05] ring-1 ring-line">
                  <span
                    style={{ height: isMounted ? `${fillPercent}%` : '0%', transitionDelay: `${200 + columnIndex * 180}ms` }}
                    className={cx(
                      'absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-1000 ease-[cubic-bezier(0.2,0.9,0.25,1.05)] motion-reduce:transition-none',
                      column.litClass,
                    )}
                  >
                    <span className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(0deg,transparent_0_9px,color-mix(in_oklab,var(--color-app)_40%,transparent)_9px_11px)]" />
                  </span>
                </span>
                <span className={cx('size-2 rounded-[2px]', column.swatch)} />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-fg-muted">{translate('ibDash.totalDeposited')}</p>
            <p className="mt-1 font-mono text-4xl leading-none font-black tracking-tighter text-fg tabular-nums">{formatMoney(deposited, stats.currency)}</p>
          </div>
          <RedRule />
          <dl className="flex flex-col gap-3">
            {columns.map((column, index) => (
              <div key={column.labelKey} style={stagger(index, 80, 300)} className="flex animate-feed-in items-center gap-2 motion-reduce:animate-none">
                <dt className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                  <span aria-hidden="true" className={cx('size-2.5 rounded-[3px]', column.swatch)} />
                  {translate(column.labelKey)}
                  {column.share !== null && <span className="font-mono text-fg-subtle">{Math.round(column.share * 100)}%</span>}
                </dt>
                <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-line" />
                <dd className="font-mono text-sm font-black text-fg tabular-nums">{formatMoney(column.amount, stats.currency)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Commission split: mine vs sub-IB on one capsule track with a red VS knot ───────────── */

const periods: { id: IbCommissionPeriod; labelKey: MessageKey }[] = [
  { id: 'thisMonth', labelKey: 'ibDash.thisMonth' },
  { id: 'lastMonth', labelKey: 'ibDash.lastMonth' },
  { id: 'thisYear', labelKey: 'ibDash.thisYear' },
];
const ROPE_BEADS = 24;

function CommissionRope({ data }: { data: IbDashboard }) {
  const [period, setPeriod] = useState<IbCommissionPeriod>('thisMonth');
  const commission = data.commission[period];
  const total = commission.mine + commission.subIb;
  const myShare = total > 0 ? (commission.mine / total) * 100 : 50;
  const mineBeads = Math.round((myShare / 100) * ROPE_BEADS);
  const periodIndex = periods.findIndex((item) => item.id === period);
  const periodLabel = translate(periods[periodIndex]?.labelKey ?? 'ibDash.thisMonth');
  const sides = [
    { labelKey: 'ibDash.myCommission' as const, amount: commission.mine, share: myShare, swatch: 'bg-fg', align: 'items-start text-left' },
    { labelKey: 'ibDash.subIbCommission' as const, amount: commission.subIb, share: 100 - myShare, swatch: 'bg-fg/30', align: 'items-end text-right' },
  ];

  return (
    <section style={{ animationDelay: '260ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-6 motion-reduce:animate-none lg:col-span-5')}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow icon="transfer">{translate('ibDash.commissionSummary')}</Eyebrow>
        <div role="radiogroup" aria-label={translate('ibDash.commissionSummary')} className="relative grid grid-cols-3 rounded-full bg-fg/[0.03] p-1 ring-1 ring-line">
          <span
            aria-hidden="true"
            style={{ transform: `translateX(${periodIndex * 100}%)` }}
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-fg transition-transform duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none"
          />
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
                  'relative z-10 h-7 rounded-full px-3 text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'text-app' : 'text-fg-muted hover:text-fg',
                )}
              >
                {translate(item.labelKey)}
              </button>
            );
          })}
        </div>
      </header>

      {/* Track: solid ticks pull for me, faint ticks for the sub-IBs; the red VS knot slides to where they meet. */}
      <div aria-hidden="true" className="relative pt-11">
        <span
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-700 ease-[cubic-bezier(0.3,1.2,0.5,1)] motion-reduce:transition-none"
          style={{ left: `${myShare}%` }}
        >
          <span style={{ background: RED }} className="grid size-8 animate-float place-items-center rounded-full text-[10px] font-black tracking-wider text-white motion-reduce:animate-none">
            VS
          </span>
          <span style={{ background: RED }} className="h-3 w-0.5" />
        </span>
        <span className="flex h-14 items-stretch gap-[3px] rounded-full bg-fg/[0.03] p-1.5 ring-1 ring-line">
          {Array.from({ length: ROPE_BEADS }, (_, bead) => {
            const isMine = total > 0 && bead < mineBeads;
            const isTheirs = total > 0 && bead >= mineBeads;
            return (
              <span
                key={`${period}-${bead}`}
                style={stagger(bead, 25)}
                className={cx('zenith-pixel min-w-0 flex-1 rounded-full', isMine && 'bg-fg', isTheirs && 'bg-fg/30', !isMine && !isTheirs && 'bg-fg/10')}
              />
            );
          })}
        </span>
      </div>

      <ul className="mt-auto grid grid-cols-2 gap-4">
        {sides.map((side) => (
          <li key={side.labelKey} className={cx('flex flex-col gap-1.5', side.align)}>
            <p className="flex items-center gap-2 text-xs text-fg-muted">
              <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-[3px]', side.swatch)} />
              <span>
                {translate(side.labelKey)} ({periodLabel})
              </span>
            </p>
            <p key={`${period}-${side.labelKey}`} className="animate-feed-in font-mono text-2xl leading-none font-black tracking-tight text-fg tabular-nums motion-reduce:animate-none">
              {formatMoney(side.amount, data.stats.currency)}
            </p>
            <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{total > 0 ? `${Math.round(side.share)}%` : '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Referral broadcast (open dashed panel + ink visits capsule) ───────────── */

function ReferralBroadcast({ link, visits }: { link: string; visits: number }) {
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
    <section style={{ animationDelay: '300ms' }} className={cx(openClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-5')}>
      <div className="flex items-start gap-4">
        <span className="relative grid size-12 shrink-0 place-items-center">
          {[0, 1.2].map((delay) => (
            <span key={delay} aria-hidden="true" style={{ animationDelay: `${delay}s`, borderColor: RED }} className="absolute inset-0 animate-ring-ripple rounded-full border-2 motion-reduce:hidden" />
          ))}
          <span style={{ background: RED }} className="relative grid size-12 place-items-center rounded-full text-white">
            <Icon name="globe" size={19} />
          </span>
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-black tracking-tight text-fg">{translate('ibDash.refTitle')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate('ibDash.refText')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[26px] bg-[#0b0b0c] px-5 py-4 text-white ring-1 ring-white/10">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/55 uppercase">{translate('ibDash.visitsOnLink')}</p>
          <span aria-hidden="true" className="mt-2 flex h-5 items-end gap-[3px]">
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75].map((delay, bar) => (
              <span
                key={delay}
                style={{ animationDelay: `${delay}s`, ...(bar === 5 ? { background: RED } : {}) }}
                className={cx('h-full w-1.5 origin-bottom animate-eq-bar rounded-full motion-reduce:animate-none', bar !== 5 && 'bg-white/75')}
              />
            ))}
          </span>
        </div>
        <DotNumber value={String(visits)} small />
      </div>

      <div className="mt-auto flex h-12 items-center gap-2 rounded-full bg-fg/[0.03] pr-1 pl-4 ring-1 ring-line">
        <span aria-hidden="true" style={{ background: RED }} className="size-2 shrink-0 rounded-[2px]" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg" title={link}>
          {link}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cx(
            'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97]',
            isCopied ? 'bg-success text-white' : 'bg-fg text-app hover:bg-fg/85',
          )}
        >
          <Icon name={isCopied ? 'checkCircle' : 'copy'} size={14} className={cx(isCopied && 'animate-dot-pop motion-reduce:animate-none')} />
          {translate(isCopied ? 'ibDash.copied' : 'ibDash.copy')}
        </button>
      </div>
    </section>
  );
}

/* ───────────── Quick actions as capsule rows ───────────── */

const quickActions: { href: string; titleKey: MessageKey; textKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/structure', titleKey: 'ibDash.myStructure', textKey: 'ibDash.myStructureText', icon: 'pieChart' },
  { href: '/ib/network', titleKey: 'nav.ibMyNetwork', textKey: 'ibDash.myNetworkText', icon: 'user' },
  { href: '/ib/sub-ib-approval', titleKey: 'nav.ibSubIbApproval', textKey: 'ibDash.subIbApprovalText', icon: 'clock' },
];

function QuickTiles() {
  return (
    <section style={{ animationDelay: '340ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-7')}>
      <header className="flex items-center justify-between gap-3">
        <Eyebrow icon="arrowUpRight">{translate('ibDash.quickActions')}</Eyebrow>
        <span className="font-mono text-xs font-black text-fg-subtle tabular-nums">{String(quickActions.length).padStart(2, '0')}</span>
      </header>
      <RedRule />

      <ul className="flex flex-1 flex-col gap-2.5">
        {quickActions.map((action, index) => (
          <li key={action.href} style={stagger(index, 90, 380)} className="animate-feed-in motion-reduce:animate-none">
            <Link
              href={action.href}
              className="group flex items-center gap-4 rounded-full bg-fg/[0.03] py-2 pr-2 pl-2 ring-1 ring-line transition-[background-color,color,box-shadow,translate] duration-300 hover:translate-x-1 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-fg text-app transition-colors duration-300 group-hover:bg-app group-hover:text-fg">
                <Icon name={action.icon} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">{translate(action.titleKey)}</span>
                <span className="block truncate text-xs text-fg-muted transition-colors group-hover:text-app/65" title={translate(action.textKey)}>
                  {translate(action.textKey)}
                </span>
              </span>
              <span className="hidden font-mono text-2xl font-black tracking-tighter opacity-15 tabular-nums sm:block">{String(index + 1).padStart(2, '0')}</span>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/10 transition-colors duration-300 group-hover:bg-[var(--zenith-red)] group-hover:text-white">
                <Icon name="arrowRight" size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Recent activity: spotlight + auto-playing story strip ───────────── */

const eventMeta: Record<IbNetworkEvent['kind'], { titleKey: MessageKey; icon: IconName; beadClass: string; frostBeadClass: string }> = {
  appApproved: { titleKey: 'ibDash.appApproved', icon: 'checkCircle', beadClass: 'bg-success text-white', frostBeadClass: 'bg-success text-white' },
  subIbAdded: { titleKey: 'ibDash.subIbAdded', icon: 'pieChart', beadClass: 'bg-fg text-app', frostBeadClass: 'bg-fg text-app' },
  newClient: { titleKey: 'ibDash.newClient', icon: 'user', beadClass: 'bg-fg/10 text-fg', frostBeadClass: 'bg-[var(--zenith-red)] text-white' },
};

const PRICE_TICKS = 18;

function isTrade(item: IbActivity): item is IbTradeCommission {
  return item.kind === 'commission';
}

function SideTag({ side }: { side: IbTradeCommission['side'] }) {
  const isBuy = side === 'buy';
  const tone = isBuy ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger';
  return <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase', tone)}>{translate(isBuy ? 'ibDash.buy' : 'ibDash.sell')}</span>;
}

// Entry → exit as a tick staircase that climbs (or falls) towards the blinking exit tick.
function PriceDots({ trade }: { trade: IbTradeCommission }) {
  const delta = trade.exit - trade.entry;
  const isUp = delta >= 0;
  const tone = isUp ? 'bg-success' : 'bg-danger';
  return (
    <div className="flex flex-col gap-3 rounded-[26px] bg-fg/[0.03] p-4 ring-1 ring-line">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.entry')}</p>
          <p className="mt-0.5 font-mono text-base font-black text-fg tabular-nums">{trade.entry.toFixed(2)}</p>
        </div>
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-black text-white tabular-nums', tone)}>
          <Icon name={isUp ? 'trendUp' : 'trendDown'} size={12} />
          {isUp ? '+' : ''}
          {delta.toFixed(2)}
        </span>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.exit')}</p>
          <p className="mt-0.5 font-mono text-base font-black text-fg tabular-nums">{trade.exit.toFixed(2)}</p>
        </div>
      </div>
      <span aria-hidden="true" className="flex h-10 items-end gap-[3px]">
        <span className="h-full w-1.5 shrink-0 rounded-full bg-fg" />
        {Array.from({ length: PRICE_TICKS }, (_, tick) => {
          const progress = (tick + 1) / PRICE_TICKS;
          const heightPercent = 25 + (isUp ? progress : 1 - progress) * 75;
          const isExit = tick === PRICE_TICKS - 1;
          return (
            <span
              key={tick}
              style={{ ...stagger(tick, 40, 200), height: `${heightPercent}%` }}
              className={cx('min-w-0 flex-1 rounded-full', tone, isExit ? 'zenith-blink' : 'zenith-bar opacity-70')}
            />
          );
        })}
      </span>
    </div>
  );
}

function TradeSpotlight({ trade, currency }: { trade: IbTradeCommission; currency: string }) {
  const fields = [
    { labelKey: 'ibDash.client' as const, value: trade.client, icon: 'user' as const },
    { labelKey: 'ibDash.lotSize' as const, value: String(trade.lotSize), icon: 'arrowsUpDown' as const },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.commissionEarned')}</span>
          <SideTag side={trade.side} />
          <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[10.5px] text-fg-muted">{formatAgo(trade.occurredAt)}</span>
        </div>
        <p className="font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums sm:text-6xl">+{formatMoney(trade.amount, currency)}</p>
        <p className="border-l-2 border-[var(--zenith-red)] pl-3 text-sm text-fg-muted">
          {translate('ibDash.from')} <span className="font-bold text-fg">{trade.symbol}</span> ({translate('ibDash.account')}: {trade.account})
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <PriceDots trade={trade} />
        <dl className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.labelKey} className="flex items-center gap-3 rounded-full bg-fg/[0.03] py-1.5 pr-4 pl-1.5 ring-1 ring-line">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-app">
                <Icon name={field.icon} size={14} />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] tracking-[0.14em] text-fg-subtle uppercase">{translate(field.labelKey)}</dt>
                <dd className="truncate font-mono text-sm font-black text-fg">{field.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function MilestoneSpotlight({ event }: { event: IbNetworkEvent }) {
  const meta = eventMeta[event.kind];
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center sm:flex-row sm:text-left">
      <span className="relative grid size-28 shrink-0 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 grid grid-cols-7 gap-1 p-1">
          {Array.from({ length: 49 }, (_, cell) => (
            <span key={cell} style={{ animationDelay: `${((cell * 7) % 49) * 60}ms` }} className="zenith-twinkle rounded-[2px] bg-fg/15" />
          ))}
        </span>
        <span className={cx('relative grid size-16 place-items-center rounded-full ring-4 ring-app', meta.frostBeadClass)}>
          <Icon name={meta.icon} size={26} />
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-black tracking-[-0.02em] text-fg">{translate(meta.titleKey)}</p>
        <p className="mt-2 text-sm text-fg-muted">{event.detail}</p>
        <p className="mt-4 inline-flex rounded-full bg-fg/[0.04] px-3 py-1 text-[11px] text-fg-muted ring-1 ring-line">{formatAgo(event.occurredAt)}</p>
      </div>
    </div>
  );
}

interface StoryTileProps {
  item: IbActivity;
  currency: string;
  isActive: boolean;
  onSelect: () => void;
  onAdvance: () => void;
}

function StoryTile({ item, currency, isActive, onSelect, onAdvance }: StoryTileProps) {
  const trade = isTrade(item) ? item : null;
  const meta = trade ? null : eventMeta[(item as IbNetworkEvent).kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cx(
        'group/tile relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-[28px] p-4 pb-5 text-left transition-[translate,background-color,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-fg text-app' : 'bg-fg/[0.02] ring-1 ring-line hover:ring-line-strong',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cx(
            'grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/tile:scale-110 motion-reduce:transition-none',
            isActive ? 'bg-[var(--zenith-red)] text-white' : trade ? 'bg-success text-white' : meta?.beadClass,
          )}
        >
          <Icon name={trade ? 'trendUp' : (meta?.icon ?? 'user')} size={14} />
        </span>
        <span className={cx('text-[10px]', isActive ? 'text-app/60' : 'text-fg-subtle')}>{formatAgo(item.occurredAt)}</span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold">{translate(trade ? 'ibDash.commissionEarned' : (meta?.titleKey ?? 'ibDash.newClient'))}</span>
          {trade && <SideTag side={trade.side} />}
        </span>
        <span className={cx('mt-0.5 block truncate text-xs', isActive ? 'text-app/65' : 'text-fg-muted')}>
          {trade ? `${translate('ibDash.from')} ${trade.symbol} (${translate('ibDash.account')}: ${trade.account})` : (item as IbNetworkEvent).detail}
        </span>
      </span>
      {trade && <span className={cx('font-mono text-lg font-black tracking-tight tabular-nums', isActive ? 'text-app' : 'text-success')}>+{formatMoney(trade.amount, currency)}</span>}

      {/* Story progress: when it fills the strip moves on. Paused while the pointer or focus is inside the section. */}
      {isActive && (
        <span aria-hidden="true" className="absolute inset-x-4 bottom-2 h-1 rounded-full bg-app/15">
          <span
            onAnimationEnd={onAdvance}
            style={{ background: RED }}
            className="absolute inset-0 origin-left animate-story rounded-full group-hover/feed:[animation-play-state:paused] group-focus-within/feed:[animation-play-state:paused] motion-reduce:hidden"
          />
        </span>
      )}
    </button>
  );
}

function ActivityStage({ data, isFetching, onRefresh }: { data: IbDashboard; isFetching: boolean; onRefresh: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = data.activity;
  const activeIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  const active = items[activeIndex];

  return (
    <section style={{ animationDelay: '380ms' }} className={cx(panelClass, 'group/feed flex min-w-0 animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-12')}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Eyebrow icon="history">{translate('ibDash.recentActivity')}</Eyebrow>
          {items.length > 0 && (
            <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 font-mono text-xs text-fg-subtle tabular-nums">
              <span className="font-black text-fg">{String(activeIndex + 1).padStart(2, '0')}</span> / {String(items.length).padStart(2, '0')}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={translate('ibDash.refresh')}
          title={translate('ibDash.refresh')}
          className="grid size-10 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="refresh" size={15} className={cx(isFetching && 'animate-spin motion-reduce:animate-none')} />
        </button>
      </header>

      {active && (
        <>
          <div className="relative overflow-hidden rounded-[28px] border border-dashed border-line-strong p-5 sm:p-7">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--color-fg)_9%,transparent)_1.2px,transparent_1.4px)] bg-[size:14px_14px] [mask-image:linear-gradient(90deg,transparent,#000_70%)]" />
            <div key={active.id} className="zenith-reveal relative">
              {isTrade(active) ? <TradeSpotlight trade={active} currency={data.stats.currency} /> : <MilestoneSpotlight event={active} />}
            </div>
          </div>

          <span aria-hidden="true" className="flex h-2 gap-1">
            {items.map((item, index) => (
              <span
                key={item.id}
                style={index === activeIndex ? { background: RED } : undefined}
                className={cx('min-w-0 rounded-full transition-[flex-grow,background-color] duration-300', index === activeIndex ? 'flex-[4]' : cx('flex-1', index < activeIndex ? 'bg-fg' : 'bg-fg/15'))}
              />
            ))}
          </span>

          <ol className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {items.map((item, index) => (
              <li key={item.id} style={stagger(index, 60, 200)} className="w-60 shrink-0 animate-feed-in snap-start motion-reduce:animate-none">
                <StoryTile
                  item={item}
                  currency={data.stats.currency}
                  isActive={index === activeIndex}
                  onSelect={() => setSelectedIndex(index)}
                  onAdvance={() => setSelectedIndex((index + 1) % items.length)}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-busy="true">
      <div className="h-56 animate-pulse rounded-[32px] bg-surface-2 lg:col-span-12" />
      <div className="h-96 animate-pulse rounded-[32px] bg-surface-2 lg:col-span-7" />
      <div className="h-96 animate-pulse rounded-[32px] bg-surface-2 lg:col-span-5" />
      <div className="h-72 animate-pulse rounded-[32px] bg-surface-2 lg:col-span-5" />
      <div className="h-72 animate-pulse rounded-[32px] bg-surface-2 lg:col-span-7" />
    </div>
  );
}

// Skeleton: open partner header + dock → rebate | clients → commission | funds → quick actions | referral → activity.
export default function IbDashboardPage() {
  const { data, isFetching, refetch } = useIbDashboard();

  if (!data) return <PageSkeleton />;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <PartnerCard />
      <RebateVault stats={data.stats} />
      <ClientBeadBoard stats={data.stats} />
      <CommissionRope data={data} />
      <FundsMatrix stats={data.stats} />
      <QuickTiles />
      <ReferralBroadcast link={data.referralLink} visits={data.referralVisits} />
      <ActivityStage data={data} isFetching={isFetching} onRefresh={refetch} />
    </div>
  );
}
