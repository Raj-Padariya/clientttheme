'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { IbActivity, IbCommissionPeriod, IbDashboard, IbNetworkEvent, IbStats, IbTradeCommission } from '@/core/mock/ib';
import { useIbDashboard } from '@/core/pages/useIbDashboard';
import { FrostCard } from '../dashboard/FrostCard';
import { cx } from '../lib/cx';
import { DotNumber } from '../ui/DotMatrix';
import { Icon, type IconName } from '../ui/Icon';

/*
 * Nova IB dashboard: a frosted partner card beside a dark client bead board, a rebate vault strung with beads,
 * funds as dot-matrix columns, the commission split as a rope with a VS knot, and activity as a spotlight
 * fed by a story strip. Every chart is drawn in dots or beads.
 */
const panelClass = 'orbit-card nova-edge-light relative overflow-hidden p-5 sm:p-6';
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] p-5 text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 sm:p-6';
const frostChipClass = 'bg-white/80 text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)] backdrop-blur-md';
const glossyWhiteBead = 'bg-[radial-gradient(circle_at_32%_28%,#ffffff,#9aa6b8_72%)]';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';

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
      <span className={cx('grid size-7 shrink-0 place-items-center rounded-full', inverted ? 'bg-white text-[#0a1220]' : 'bg-fg text-app')}>
        <Icon name={icon} size={13} />
      </span>
      {children}
    </p>
  );
}

/* ───────────── Partner card (frosted) ───────────── */

const dockLinks: { href: string; labelKey: MessageKey; icon: IconName }[] = [
  { href: '/ib/network', labelKey: 'nav.ibMyNetwork', icon: 'user' },
  { href: '/ib/structure', labelKey: 'nav.ibSubIbStructure', icon: 'pieChart' },
  { href: '/ib/transfer-commission', labelKey: 'nav.ibTransferCommission', icon: 'transfer' },
  { href: '/ib/commission-history', labelKey: 'nav.ibCommissionHistory', icon: 'history' },
];

function PartnerCard() {
  return (
    <FrostCard className="lg:col-span-7">
      <div className="flex h-full flex-col gap-6 text-[#0a1220]">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0a1220] py-1 pr-3 pl-1.5 text-[10.5px] font-black tracking-[0.16em] text-white uppercase">
            <span aria-hidden="true" className="relative flex size-2.5">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-white/60 motion-reduce:hidden" />
              <span className="relative size-2.5 rounded-full bg-white" />
            </span>
            {translate('ibDash.badge')}
          </span>
          <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/30 motion-reduce:animate-none" />
            <span className="absolute inset-1.5 animate-ring-ripple rounded-full ring-2 ring-[#0a1220]/15 motion-reduce:hidden" />
            <span className="grid size-12 animate-float place-items-center rounded-full bg-[#0a1220] text-base font-black tracking-tight text-white motion-reduce:animate-none">IB</span>
          </span>
        </div>

        <div>
          <h2 className="text-3xl leading-[1.05] font-black tracking-[-0.03em] sm:text-[44px]">{translate('ibDash.title')}</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#3b4658]">{translate('ibDash.subtitle')}</p>
        </div>

        <nav aria-label={translate('ibDash.title')} className="mt-auto flex flex-col gap-4">
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {dockLinks.map((link, index) => (
              <li key={link.href} style={stagger(index, 80, 200)} className="animate-dot-pop motion-reduce:animate-none">
                <Link
                  href={link.href}
                  className={cx(
                    'group flex h-full flex-col items-center gap-2.5 rounded-[22px] px-2 py-3.5 text-center transition-[translate] duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none',
                    frostChipClass,
                  )}
                >
                  <span className="relative grid size-12 place-items-center">
                    <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-[#0a1220]/25 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
                    <span className="grid size-9 place-items-center rounded-full bg-[#0a1220] text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                      <Icon name={link.icon} size={15} />
                    </span>
                    <span className="absolute -top-0.5 -right-0.5 grid size-4.5 place-items-center rounded-full bg-white font-mono text-[9px] font-black ring-1 ring-[#0a1220]/15">{index + 1}</span>
                  </span>
                  <span className="text-xs leading-tight font-semibold">{translate(link.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="group/mp relative inline-flex h-12 items-center gap-3 self-start overflow-hidden rounded-full bg-[#0a1220] py-1 pr-1 pl-5 text-sm font-semibold text-white transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1220] motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/mp:translate-x-full motion-reduce:hidden" />
            <span className="relative">{translate('ibDash.managerPortal')}</span>
            <span className="relative grid size-10 place-items-center rounded-full bg-white text-[#0a1220]">
              <Icon name="arrowUpRight" size={15} className="transition-transform duration-300 group-hover/mp:rotate-45 motion-reduce:transition-none" />
            </span>
          </button>
        </nav>
      </div>
    </FrostCard>
  );
}

/* ───────────── Client bead board (dark): one bead per client ───────────── */

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
    { labelKey: 'ibDash.totalClients', value: stats.totalClients, swatch: glossyWhiteBead },
    { labelKey: 'ibDash.marginBelow', value: stats.marginLevelBelow100, swatch: 'bg-danger', isAlert },
    { labelKey: 'ibDash.pendingRequests', value: stats.pendingRequests, swatch: 'border-2 border-dashed border-white/45' },
  ];

  return (
    <section style={{ animationDelay: '100ms' }} className={cx(inkClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-5')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(200deg,#000,transparent_70%)]')} />

      <div className="relative flex items-center justify-between gap-3">
        <Eyebrow icon="user" inverted>
          {translate('ibDash.groupNetwork')}
        </Eyebrow>
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span key={dot} style={{ animationDelay: `${dot * 0.25}s` }} className="size-1.5 animate-blink rounded-full bg-white/70 motion-reduce:animate-none" />
          ))}
        </span>
      </div>

      <div className="relative">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase">{translate('ibDash.totalClients')}</p>
        <p className="mt-1 font-mono text-6xl leading-none font-black tracking-tight tabular-nums">{stats.totalClients}</p>
      </div>

      {/* The board: a scan band sweeps over it like a refreshing LED panel. */}
      <div aria-hidden="true" className="relative overflow-hidden rounded-[22px] bg-black/35 p-4 ring-1 ring-white/5">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/4 animate-led-scan bg-linear-to-b from-transparent via-white/10 to-transparent motion-reduce:hidden" />
        <ul className="relative grid grid-cols-8 gap-2">
          {beads.map((kind, index) => (
            <li key={index} style={stagger(index, 40, 250)} className="relative grid aspect-square animate-dot-pop place-items-center motion-reduce:animate-none">
              {kind === 'risk' && <span className="absolute inset-0 animate-ping-soft rounded-full bg-danger/45 motion-reduce:hidden" />}
              <span
                className={cx(
                  'relative size-full rounded-full',
                  kind === 'risk' && 'bg-[radial-gradient(circle_at_32%_28%,#ffb4ab,var(--color-danger)_72%)]',
                  kind === 'healthy' && glossyWhiteBead,
                  kind === 'pending' && 'border-2 border-dashed border-white/40',
                )}
              />
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="grid aspect-square place-items-center rounded-full bg-white/10 font-mono text-[10px] font-black text-white/80">+{hiddenCount}</li>
          )}
        </ul>
      </div>

      <dl className="relative mt-auto grid grid-cols-3 gap-2">
        {legend.map((item, index) => (
          <div
            key={item.labelKey}
            style={stagger(index, 80, 400)}
            className={cx('flex animate-feed-in flex-col gap-1.5 rounded-[20px] p-3 ring-1 motion-reduce:animate-none', item.isAlert ? 'bg-danger/15 ring-danger/40' : 'bg-white/[0.04] ring-white/10')}
          >
            <dt className="flex items-center gap-1.5 text-[10px] leading-tight text-white/55">
              <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-full', item.swatch, item.isAlert && 'animate-ping-soft motion-reduce:animate-none')} />
              <span className="truncate">{translate(item.labelKey)}</span>
            </dt>
            <dd className={cx('font-mono text-lg font-black tabular-nums', item.isAlert ? 'text-[#ff8a80]' : 'text-white')}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Rebate vault: available share as a bead string, withdrawn share as a dot necklace ───────────── */

const STRING_BEADS = 32;
const NECKLACE_DOTS = 28;

function DotNecklace({ share, isMounted }: { share: number; isMounted: boolean }) {
  const lit = isMounted ? Math.round(share * NECKLACE_DOTS) : 0;
  return (
    <span aria-hidden="true" className="relative block size-36 shrink-0">
      {Array.from({ length: NECKLACE_DOTS }, (_, dot) => {
        const angle = (dot / NECKLACE_DOTS) * 2 * Math.PI - Math.PI / 2;
        const isLit = dot < lit;
        return (
          <span
            key={dot}
            style={{
              left: `${(50 + 44 * Math.cos(angle)).toFixed(2)}%`,
              top: `${(50 + 44 * Math.sin(angle)).toFixed(2)}%`,
              transitionDelay: `${300 + dot * 40}ms`,
            }}
            className={cx(
              'absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,scale] duration-300 motion-reduce:transition-none',
              isLit ? 'scale-110 bg-fg' : 'bg-fg/12',
            )}
          />
        );
      })}
      <span className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-2xl font-black text-fg tabular-nums">{Math.round(share * 100)}%</span>
      </span>
    </span>
  );
}

function RebateVault({ stats }: { stats: IbStats }) {
  const isMounted = useMounted();
  const money = (amount: number) => formatMoney(amount, stats.currency);
  const generated = stats.totalRebateGenerated;
  const availableShare = generated > 0 ? Math.min(1, stats.availableRebate / generated) : 0;
  const withdrawnShare = generated > 0 ? Math.min(1, stats.totalWithdrawalRebate / generated) : 0;
  const litBeads = isMounted ? Math.round(availableShare * STRING_BEADS) : 0;
  const receipt: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'ibDash.totalRebateGen', value: money(generated) },
    { labelKey: 'ibDash.totalWithdrawalRebate', value: money(stats.totalWithdrawalRebate) },
    { labelKey: 'ibDash.totalLot', value: stats.totalLot.toFixed(2) },
  ];

  return (
    <section style={{ animationDelay: '160ms' }} className={cx(panelClass, 'animate-rise motion-reduce:animate-none lg:col-span-12')}>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow icon="wallet">{translate('ibDash.availableRebate')}</Eyebrow>
            <span className="rounded-full bg-fg px-2.5 py-0.5 font-mono text-xs font-black text-app tabular-nums">{Math.round(availableShare * 100)}%</span>
          </div>
          <p className="font-mono text-4xl leading-none font-black tracking-tight text-fg tabular-nums sm:text-5xl">{money(stats.availableRebate)}</p>
          {/* Bead string: lit beads = share of generated rebate still available; the head bead ripples. */}
          <span aria-hidden="true" className="relative flex items-center justify-between gap-1 py-2">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-line-strong" />
            {Array.from({ length: STRING_BEADS }, (_, bead) => {
              const isLit = bead < litBeads;
              const isHead = bead === litBeads - 1;
              return (
                <span key={bead} className="relative grid place-items-center">
                  {isHead && <span className="absolute size-5 animate-ring-ripple rounded-full ring-2 ring-fg/40 motion-reduce:hidden" />}
                  <span
                    style={{ transitionDelay: `${bead * 30}ms` }}
                    className={cx(
                      'relative rounded-full transition-[background-color,width,height] duration-300 motion-reduce:transition-none',
                      isHead ? 'size-3.5' : 'size-2',
                      isLit ? 'bg-fg' : 'bg-surface ring-1 ring-line-strong',
                    )}
                  />
                </span>
              );
            })}
          </span>
        </div>

        <span aria-hidden="true" className="hidden h-36 border-l-2 border-dotted border-line-strong lg:block" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-2">
            <DotNecklace share={withdrawnShare} isMounted={isMounted} />
            <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{translate('ibDash.groupRebates')}</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <dl className="flex flex-col gap-2.5">
              {receipt.map((row, index) => (
                <div key={row.labelKey} style={stagger(index, 80, 300)} className="flex animate-feed-in items-end gap-2 motion-reduce:animate-none">
                  <dt className="shrink-0 text-xs text-fg-muted">{translate(row.labelKey)}</dt>
                  <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-line-strong" />
                  <dd className="font-mono text-sm font-black text-fg tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className="group/wd relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-fg px-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover/wd:translate-x-full motion-reduce:hidden" />
              <Icon name="withdrawal" size={16} className="relative transition-transform duration-300 group-hover/wd:-translate-y-0.5 motion-reduce:transition-none" />
              <span className="relative">{translate('ibDash.withdraw')}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Client funds: dot-matrix columns on one shared scale ───────────── */

const COLUMN_ROWS = 12;

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
    <section style={{ animationDelay: '220ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-7')}>
      <Eyebrow icon="bank">{translate('ibDash.groupMoney')}</Eyebrow>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div aria-hidden="true" className="grid grid-cols-3 gap-4 rounded-[22px] bg-fg/[0.03] p-4 ring-1 ring-line">
          {columns.map((column, columnIndex) => {
            const litRows = isMounted ? Math.max(1, Math.round((column.amount / scaleMax) * COLUMN_ROWS)) : 0;
            return (
              <div key={column.labelKey} className="flex flex-col items-center gap-2">
                <span className="grid grid-cols-3 gap-1">
                  {Array.from({ length: COLUMN_ROWS * 3 }, (_, cell) => {
                    // Cells are listed top-down, so the lit block grows from the bottom row upwards.
                    const rowFromBottom = COLUMN_ROWS - 1 - Math.floor(cell / 3);
                    const isLit = rowFromBottom < litRows;
                    return (
                      <span
                        key={cell}
                        style={{ transitionDelay: `${200 + columnIndex * 160 + rowFromBottom * 45}ms` }}
                        className={cx('size-2 rounded-full transition-[background-color,scale] duration-300 motion-reduce:transition-none', isLit ? column.litClass : 'scale-75 bg-fg/10')}
                      />
                    );
                  })}
                </span>
                <span className={cx('size-1.5 rounded-full', column.swatch)} />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-fg-muted">{translate('ibDash.totalDeposited')}</p>
            <p className="mt-1 font-mono text-4xl leading-none font-black tracking-tight text-fg tabular-nums">{formatMoney(deposited, stats.currency)}</p>
          </div>
          <dl className="flex flex-col gap-3 border-t-2 border-dotted border-line-strong pt-4">
            {columns.map((column, index) => (
              <div key={column.labelKey} style={stagger(index, 80, 300)} className="flex animate-feed-in items-end gap-2 motion-reduce:animate-none">
                <dt className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                  <span aria-hidden="true" className={cx('size-2.5 rounded-full', column.swatch)} />
                  {translate(column.labelKey)}
                  {column.share !== null && <span className="font-mono text-fg-subtle">{Math.round(column.share * 100)}%</span>}
                </dt>
                <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-line-strong" />
                <dd className="font-mono text-sm font-black text-fg tabular-nums">{formatMoney(column.amount, stats.currency)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Commission tug of war: mine vs sub-IB on one bead rope ───────────── */

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
    { labelKey: 'ibDash.subIbCommission' as const, amount: commission.subIb, share: 100 - myShare, swatch: 'border-2 border-fg/50', align: 'items-end text-right' },
  ];

  return (
    <section style={{ animationDelay: '260ms' }} className={cx(panelClass, 'flex animate-rise flex-col gap-6 motion-reduce:animate-none lg:col-span-5')}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow icon="transfer">{translate('ibDash.commissionSummary')}</Eyebrow>
        <div role="radiogroup" aria-label={translate('ibDash.commissionSummary')} className="relative grid grid-cols-3 rounded-full p-1 ring-1 ring-line">
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

      {/* Rope: ink beads pull for me, hollow beads for the sub-IBs; the VS knot sits where they meet. */}
      <div aria-hidden="true" className="relative pt-10 pb-2">
        <span
          className="absolute top-0 -translate-x-1/2 transition-[left] duration-700 ease-[cubic-bezier(0.3,1.2,0.5,1)] motion-reduce:transition-none"
          style={{ left: `${myShare}%` }}
        >
          <span className="relative grid size-8 animate-float place-items-center rounded-full bg-fg text-[10px] font-black tracking-wider text-app motion-reduce:animate-none">
            <span className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />
            VS
          </span>
        </span>
        <span className="relative flex items-center justify-between">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-line-strong" />
          {Array.from({ length: ROPE_BEADS }, (_, bead) => {
            const isMine = total > 0 && bead < mineBeads;
            const isTheirs = total > 0 && bead >= mineBeads;
            return (
              <span
                key={`${period}-${bead}`}
                style={stagger(bead, 25)}
                className={cx(
                  'relative size-3 animate-dot-pop rounded-full motion-reduce:animate-none',
                  isMine && 'bg-fg',
                  isTheirs && 'bg-surface ring-2 ring-fg/45',
                  !isMine && !isTheirs && 'bg-fg/10',
                )}
              />
            );
          })}
        </span>
      </div>

      <ul className="mt-auto grid grid-cols-2 gap-4">
        {sides.map((side) => (
          <li key={side.labelKey} className={cx('flex flex-col gap-1.5', side.align)}>
            <p className="flex items-center gap-2 text-xs text-fg-muted">
              <span aria-hidden="true" className={cx('size-2.5 shrink-0 rounded-full', side.swatch)} />
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

/* ───────────── Referral broadcast (dark) ───────────── */

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
    <section style={{ animationDelay: '300ms' }} className={cx(inkClass, 'flex animate-rise flex-col gap-5 motion-reduce:animate-none lg:col-span-5')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:radial-gradient(circle_at_85%_15%,#000,transparent_65%)]')} />

      <div className="relative flex items-start gap-4">
        <span className="relative grid size-12 shrink-0 place-items-center">
          {[0, 1.6].map((delay) => (
            <span key={delay} aria-hidden="true" style={{ animationDelay: `${delay}s` }} className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-white/35 motion-reduce:hidden" />
          ))}
          <span className="relative grid size-12 place-items-center rounded-full bg-white text-[#0a1220]">
            <Icon name="globe" size={19} />
          </span>
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-black tracking-tight">{translate('ibDash.refTitle')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">{translate('ibDash.refText')}</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-4 rounded-[22px] bg-black/35 px-4 py-3.5 ring-1 ring-white/5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/55 uppercase">{translate('ibDash.visitsOnLink')}</p>
          <span aria-hidden="true" className="mt-2 flex h-4 items-end gap-[3px]">
            {[0, 0.2, 0.4, 0.6, 0.8].map((delay) => (
              <span key={delay} style={{ animationDelay: `${delay}s` }} className="h-full w-1 origin-bottom animate-eq-bar rounded-full bg-white/70 motion-reduce:animate-none" />
            ))}
          </span>
        </div>
        <DotNumber value={String(visits)} small />
      </div>

      <div className="relative mt-auto flex h-12 items-center gap-2 rounded-full border-2 border-dotted border-white/20 pr-1 pl-4">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/85" title={link}>
          {link}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cx(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
            isCopied ? 'bg-success text-white' : 'bg-white text-[#0a1220] hover:bg-white/85',
          )}
        >
          <Icon name={isCopied ? 'checkCircle' : 'copy'} size={14} className={cx(isCopied && 'animate-dot-pop motion-reduce:animate-none')} />
          {translate(isCopied ? 'ibDash.copied' : 'ibDash.copy')}
        </button>
      </div>
    </section>
  );
}

/* ───────────── Quick actions as bead tiles ───────────── */

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
        <span aria-hidden="true" className="flex gap-1">
          {quickActions.map((action) => (
            <span key={action.href} className="size-1.5 rounded-full bg-fg/40" />
          ))}
        </span>
      </header>

      <ul className="grid flex-1 gap-3 sm:grid-cols-3">
        {quickActions.map((action, index) => (
          <li key={action.href} style={stagger(index, 90, 380)} className="animate-dot-pop motion-reduce:animate-none">
            <Link
              href={action.href}
              className="group relative flex h-full flex-col gap-4 rounded-[26px] p-4 ring-1 ring-line transition-[translate,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-fg/[0.03] hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <div className="flex items-start justify-between">
                <span className="relative grid size-12 place-items-center">
                  <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-fg/25 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
                  <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                    <Icon name={action.icon} size={16} />
                  </span>
                </span>
                <span className="font-mono text-[11px] font-black text-fg-subtle tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-fg">{translate(action.titleKey)}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{translate(action.textKey)}</p>
              </div>
              <span className="grid size-9 place-items-center self-end rounded-full bg-fg text-app transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
                <Icon name="arrowRight" size={15} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Recent activity: frosted spotlight + auto-playing story strip ───────────── */

const eventMeta: Record<IbNetworkEvent['kind'], { titleKey: MessageKey; icon: IconName; beadClass: string; frostBeadClass: string }> = {
  appApproved: { titleKey: 'ibDash.appApproved', icon: 'checkCircle', beadClass: 'bg-success text-white', frostBeadClass: 'bg-[#0f8a4f] text-white' },
  subIbAdded: { titleKey: 'ibDash.subIbAdded', icon: 'pieChart', beadClass: 'bg-fg text-app', frostBeadClass: 'bg-[#0a1220] text-white' },
  newClient: { titleKey: 'ibDash.newClient', icon: 'user', beadClass: 'nova-gloss text-fg', frostBeadClass: 'bg-white text-[#0a1220] ring-1 ring-[#0a1220]/20' },
};

const PRICE_DOTS = 18;

function isTrade(item: IbActivity): item is IbTradeCommission {
  return item.kind === 'commission';
}

function SideTag({ side, onFrost = false }: { side: IbTradeCommission['side']; onFrost?: boolean }) {
  const isBuy = side === 'buy';
  let tone = isBuy ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger';
  if (onFrost) tone = isBuy ? 'bg-[#0f8a4f]/12 text-[#0f8a4f]' : 'bg-[#c0362c]/12 text-[#c0362c]';
  return <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase', tone)}>{translate(isBuy ? 'ibDash.buy' : 'ibDash.sell')}</span>;
}

// Entry → exit as a dotted path that lights up towards the exit bead.
function PriceDots({ trade }: { trade: IbTradeCommission }) {
  const delta = trade.exit - trade.entry;
  const isUp = delta >= 0;
  const tone = isUp ? 'bg-[#0f8a4f]' : 'bg-[#c0362c]';
  return (
    <div className={cx('flex flex-col gap-3 rounded-[22px] p-4', frostChipClass)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.14em] text-[#3b4658] uppercase">{translate('ibDash.entry')}</p>
          <p className="mt-0.5 font-mono text-base font-black tabular-nums">{trade.entry.toFixed(2)}</p>
        </div>
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-black text-white tabular-nums', tone)}>
          <Icon name={isUp ? 'trendUp' : 'trendDown'} size={12} />
          {isUp ? '+' : ''}
          {delta.toFixed(2)}
        </span>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.14em] text-[#3b4658] uppercase">{translate('ibDash.exit')}</p>
          <p className="mt-0.5 font-mono text-base font-black tabular-nums">{trade.exit.toFixed(2)}</p>
        </div>
      </div>
      <span aria-hidden="true" className="flex items-center justify-between">
        <span className="size-3 rounded-full bg-[#0a1220]" />
        {Array.from({ length: PRICE_DOTS }, (_, dot) => (
          <span key={dot} style={stagger(dot, 45, 200)} className={cx('size-1.5 animate-dot-pop rounded-full motion-reduce:animate-none', tone)} />
        ))}
        <span className="relative grid place-items-center">
          <span className={cx('absolute size-5 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden', tone)} />
          <span className={cx('relative size-3.5 rounded-full', tone)} />
        </span>
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
          <span className="text-[10.5px] font-semibold tracking-[0.14em] text-[#3b4658] uppercase">{translate('ibDash.commissionEarned')}</span>
          <SideTag side={trade.side} onFrost />
          <span className="rounded-full bg-[#0a1220]/8 px-2 py-0.5 text-[10.5px] text-[#3b4658]">{formatAgo(trade.occurredAt)}</span>
        </div>
        <p className="font-mono text-5xl leading-none font-black tracking-tight tabular-nums sm:text-6xl">+{formatMoney(trade.amount, currency)}</p>
        <p className="text-sm text-[#3b4658]">
          {translate('ibDash.from')} <span className="font-bold text-[#0a1220]">{trade.symbol}</span> ({translate('ibDash.account')}: {trade.account})
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <PriceDots trade={trade} />
        <dl className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.labelKey} className={cx('flex items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5', frostChipClass)}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0a1220] text-white">
                <Icon name={field.icon} size={14} />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] tracking-[0.14em] text-[#3b4658] uppercase">{translate(field.labelKey)}</dt>
                <dd className="truncate font-mono text-sm font-black">{field.value}</dd>
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
        {[0, 1.4].map((delay) => (
          <span key={delay} aria-hidden="true" style={{ animationDelay: `${delay}s` }} className="absolute inset-2 animate-ring-ripple rounded-full ring-2 ring-[#0a1220]/20 motion-reduce:hidden" />
        ))}
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-[#0a1220]/25 motion-reduce:animate-none" />
        <span className={cx('relative grid size-20 place-items-center rounded-full', meta.frostBeadClass)}>
          <Icon name={meta.icon} size={30} />
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-black tracking-[-0.02em]">{translate(meta.titleKey)}</p>
        <p className="mt-2 text-sm text-[#3b4658]">{event.detail}</p>
        <p className={cx('mt-4 inline-flex rounded-full px-3 py-1 text-[11px]', frostChipClass)}>{formatAgo(event.occurredAt)}</p>
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
        'group/tile relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-[24px] p-4 text-left transition-[translate,background-color,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        isActive ? 'bg-fg text-app shadow-[0_18px_34px_-22px_rgb(0_0_0/0.9)]' : 'ring-1 ring-line hover:ring-line-strong',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cx(
            'grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/tile:scale-110 motion-reduce:transition-none',
            isActive ? 'bg-app text-fg' : trade ? 'bg-success text-white' : meta?.beadClass,
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
      {trade && <span className={cx('font-mono text-base font-black tabular-nums', isActive ? 'text-app' : 'text-success')}>+{formatMoney(trade.amount, currency)}</span>}

      {/* Story progress: when it fills the strip moves on. Paused while the pointer or focus is inside the section. */}
      {isActive && (
        <span
          aria-hidden="true"
          onAnimationEnd={onAdvance}
          className="absolute inset-x-4 bottom-2 h-1 origin-left animate-story rounded-full bg-app/70 group-hover/feed:[animation-play-state:paused] group-focus-within/feed:[animation-play-state:paused] motion-reduce:hidden"
        />
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
          <FrostCard>
            <div key={active.id} className="animate-feed-in text-[#0a1220] motion-reduce:animate-none">
              {isTrade(active) ? <TradeSpotlight trade={active} currency={data.stats.currency} /> : <MilestoneSpotlight event={active} />}
            </div>
          </FrostCard>

          <span aria-hidden="true" className="flex items-center justify-center gap-1.5">
            {items.map((item, index) => (
              <span key={item.id} className={cx('h-1.5 rounded-full transition-[width,background-color] duration-300', index === activeIndex ? 'w-6 bg-fg' : 'w-1.5 bg-fg/20')} />
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
      <div className="h-96 animate-pulse rounded-[28px] bg-surface-2 lg:col-span-7" />
      <div className="h-96 animate-pulse rounded-[30px] bg-surface-2 lg:col-span-5" />
      <div className="h-56 animate-pulse rounded-[28px] bg-surface-2 lg:col-span-12" />
      <div className="h-72 animate-pulse rounded-[28px] bg-surface-2 lg:col-span-7" />
      <div className="h-72 animate-pulse rounded-[28px] bg-surface-2 lg:col-span-5" />
    </div>
  );
}

export default function IbDashboardPage() {
  const { data, isFetching, refetch } = useIbDashboard();

  if (!data) return <PageSkeleton />;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <PartnerCard />
      <ClientBeadBoard stats={data.stats} />
      <RebateVault stats={data.stats} />
      <FundsMatrix stats={data.stats} />
      <CommissionRope data={data} />
      <ReferralBroadcast link={data.referralLink} visits={data.referralVisits} />
      <QuickTiles />
      <ActivityStage data={data} isFetching={isFetching} onRefresh={refetch} />
    </div>
  );
}
