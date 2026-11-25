'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { isInRange, type PeriodRange } from './DirectClientsDesk';
import {
  branchSummary,
  cascadeCopy as copy,
  cascadeStats,
  descendantsOf,
  filterCascade,
  type CascadeMember,
} from './ibCascadeData';
import { memberPageHref } from './ibMemberOverviewData';

const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

/*
 * Zenith network (Vaulto language): an orbit map (one ring per level, every member a marker on its ring, a red comet
 * running each ring) beside level capsule tracks and KPI figures, then the cascade as square-avatar rows hanging off
 * dashed wires, with a red open toggle and a solid root row.
 */
const RED = 'var(--zenith-red)';
const panelClass = 'relative rounded-[32px] bg-fg/[0.02] ring-1 ring-line';
const openClass = 'relative rounded-[32px] border border-dashed border-line-strong';
const ORBIT_SIZE = 260;
const ORBIT_CENTER = ORBIT_SIZE / 2;
const ORBIT_INNER = 38;
const ORBIT_OUTER = 120;

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function firstLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function branchIds(root: CascadeMember): string[] {
  return [root, ...descendantsOf(root)].filter((node) => node.children.length > 0).map((node) => node.id);
}

/* ───────────── Markers: shape tells the role (square = sub-IB, ring = own client, dashed ring = sub-IB's client) ───────────── */

type MarkerKind = 'subIb' | 'ownClient' | 'subIbClient';

function markerOf(member: CascadeMember): MarkerKind {
  if (member.kind === 'subIb') return 'subIb';
  return member.level === 1 || member.isDirectClient ? 'ownClient' : 'subIbClient';
}

function Marker({ kind, large = false }: { kind: MarkerKind; large?: boolean }) {
  const size = large ? 'size-3.5' : 'size-2.5';
  if (kind === 'subIb') return <span aria-hidden="true" className={cx(size, 'shrink-0 rounded-[3px] bg-fg')} />;
  if (kind === 'ownClient') return <span aria-hidden="true" className={cx(size, 'shrink-0 rounded-full ring-2 ring-fg')} />;
  return <span aria-hidden="true" className={cx(size, 'shrink-0 rounded-full border-2 border-dashed border-fg-subtle')} />;
}

function OrbitMarker({ kind, x, y }: { kind: MarkerKind; x: number; y: number }) {
  if (kind === 'subIb') return <rect x={x - 4} y={y - 4} width={8} height={8} rx={2} fill="currentColor" />;
  if (kind === 'ownClient') return <circle cx={x} cy={y} r={3.6} fill="none" stroke="currentColor" strokeWidth={2} />;
  return <circle cx={x} cy={y} r={3.6} fill="none" stroke="currentColor" strokeWidth={1.6} strokeDasharray="2 2" opacity={0.6} />;
}

/* ───────────── Orbit map: every member sits on its level's ring ───────────── */

function LevelOrbits({ members, levels }: { members: CascadeMember[]; levels: number[] }) {
  const step = levels.length > 0 ? (ORBIT_OUTER - ORBIT_INNER) / levels.length : 0;

  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[17rem]">
      <svg viewBox={`0 0 ${ORBIT_SIZE} ${ORBIT_SIZE}`} className="size-full overflow-visible text-fg">
        {levels.map((level, levelIndex) => {
          const radius = ORBIT_INNER + step * (levelIndex + 1);
          const row = members.filter((member) => member.level === level);
          return (
            <g key={level}>
              <circle cx={ORBIT_CENTER} cy={ORBIT_CENTER} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={1.5} strokeDasharray="2 5" />
              {row.map((member, index) => {
                const angle = (index / row.length) * Math.PI * 2 + levelIndex * 0.6 - Math.PI / 2;
                const x = ORBIT_CENTER + radius * Math.cos(angle);
                const y = ORBIT_CENTER + radius * Math.sin(angle);
                return (
                  <g key={member.id} style={{ ...stagger(index, 45, 200 + levelIndex * 180), transformOrigin: `${x}px ${y}px` }} className="zenith-pixel">
                    <OrbitMarker kind={markerOf(member)} x={x} y={y} />
                  </g>
                );
              })}
              {/* Red comet running the ring; alternate rings run the other way. */}
              <g
                style={{ transformOrigin: `${ORBIT_CENTER}px ${ORBIT_CENTER}px`, animationDuration: `${2.6 + levelIndex * 0.8}s`, animationDirection: levelIndex % 2 ? 'reverse' : 'normal' }}
                className="animate-rim-spin motion-reduce:hidden"
              >
                <rect x={ORBIT_CENTER - 4.5} y={ORBIT_CENTER - radius - 4.5} width={9} height={9} rx={2.5} fill={RED} />
              </g>
            </g>
          );
        })}
      </svg>
      <span className="absolute top-1/2 left-1/2 grid size-14 -translate-1/2 place-items-center">
        <span style={{ background: RED }} className="absolute inset-1 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden" />
        <span className="relative grid size-12 place-items-center rounded-full bg-fg text-app">
          <Icon name="accounts" size={18} />
        </span>
      </span>
    </div>
  );
}

function NetworkPulse({ root, range, currency }: { root: CascadeMember; range: PeriodRange; currency: string }) {
  const stats = cascadeStats(root, (member) => isInRange(member.lastTradeAt, range));
  const members = descendantsOf(root);
  const levels = [...new Set(members.map((member) => member.level))].sort((a, b) => a - b);
  const levelCounts = levels.map((level) => ({ level, count: members.filter((member) => member.level === level).length }));
  const topCount = Math.max(1, ...levelCounts.map((item) => item.count));
  const figures: { label: string; hint: string; value: string; icon: IconName; emphasis?: boolean }[] = [
    { label: copy.kpiSubIbs, hint: copy.kpiSubIbsHint(stats.directSubIbs), value: String(stats.cascadeSubIbs), icon: 'trophy' },
    { label: copy.kpiClients, hint: copy.kpiClientsHint, value: String(stats.clients), icon: 'user' },
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(stats.active), icon: 'history' },
    { label: copy.kpiEarned, hint: copy.kpiEarnedHint, value: formatMoney(stats.earned, currency), icon: 'accounts', emphasis: true },
  ];

  return (
    <section className={cx(panelClass, 'zenith-tile grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-center')}>
      <LevelOrbits members={members} levels={levels} />

      <div className="flex min-w-0 flex-col gap-5">
        {/* Level tracks: how many members sit on each ring. */}
        <ul aria-hidden="true" className="flex flex-col gap-2">
          {levelCounts.map((item, index) => (
            <li key={item.level} style={stagger(index, 90, 250)} className="flex animate-feed-in items-center gap-3 motion-reduce:animate-none">
              <span className="w-8 shrink-0 rounded-full bg-fg py-0.5 text-center font-mono text-[10px] font-black text-app">L{item.level}</span>
              <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-fg/10">
                <span style={{ width: `${(item.count / topCount) * 100}%` }} className="absolute inset-y-0 left-0 origin-left animate-grow rounded-full bg-fg motion-reduce:animate-none">
                  <span style={{ background: RED }} className="absolute inset-y-0 right-0 w-2.5 rounded-full" />
                </span>
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-xs font-black text-fg tabular-nums">{item.count}</span>
            </li>
          ))}
        </ul>

        <ul className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-dashed border-line-strong pt-5 xl:grid-cols-4">
          {figures.map((figure, index) => (
            <li key={figure.label} style={stagger(index, 80, 400)} className="group/fig flex min-w-0 animate-feed-in flex-col gap-1.5 border-l-2 border-dashed border-line-strong pl-3 motion-reduce:animate-none">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-fg-muted">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg text-app transition-transform duration-300 group-hover/fig:-rotate-12 motion-reduce:transition-none">
                  <Icon name={figure.icon} size={13} />
                </span>
                <span className="truncate">{figure.label}</span>
              </span>
              <span className={cx('truncate font-mono text-2xl font-black tabular-nums', figure.emphasis ? 'text-success' : 'text-fg')}>{figure.value}</span>
              <span className="text-[11px] text-fg-subtle">{figure.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Cascade rows ───────────── */

function Figure({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5 rounded-full bg-fg/[0.04] px-3 py-1.5 ring-1 ring-line">
      <span className="text-[9.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{label}</span>
      <span className={cx('font-mono text-xs font-black tabular-nums', emphasis ? 'text-success' : 'text-fg')}>{value}</span>
    </span>
  );
}

function OpenButton({ member, onOpen, inverted = false }: { member: CascadeMember; onOpen: (member: CascadeMember) => void; inverted?: boolean }) {
  const className = cx(
    'group/open inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-1 pl-3 text-xs font-bold transition-[translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    inverted ? 'bg-app text-fg' : 'bg-fg text-app',
  );
  const label = (
    <>
      {copy.open}
      <span style={{ background: RED }} className="grid size-6 place-items-center rounded-full text-white transition-transform group-hover/open:translate-x-0.5">
        <Icon name="chevronRight" size={11} />
      </span>
    </>
  );
  const href = member.kind === 'master' ? '/ib/network/you' : memberPageHref(member.id);
  if (href) {
    return (
      <Link href={href} onClick={(event) => event.stopPropagation()} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(member);
      }}
      className={className}
    >
      {label}
    </button>
  );
}

function RowShell({ isToggle, isOpen, onToggle, accent, children }: {
  isToggle: boolean;
  isOpen: boolean;
  onToggle: () => void;
  accent: string;
  children: ReactNode;
}) {
  const shell = cx(
    'group relative flex w-full flex-col gap-3 overflow-hidden rounded-[24px] px-3 py-3 text-left transition-[background-color,box-shadow] duration-300 lg:flex-row lg:items-center',
    accent,
  );
  if (!isToggle) return <div className={shell}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onToggle();
      }}
      className={cx(shell, 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none')}
    >
      {children}
    </div>
  );
}

function MemberRow({ member, isOpen, onToggle, onOpen, currency }: {
  member: CascadeMember;
  isOpen: boolean;
  onToggle: () => void;
  onOpen: (member: CascadeMember) => void;
  currency: string;
}) {
  const hasBranch = member.children.length > 0;
  const kind = markerOf(member);
  const summary = branchSummary(member);
  const subLine = [member.accountNumber ? `#${member.accountNumber}` : null, member.email, member.handle, member.referralSource ? copy.via(member.referralSource) : null]
    .filter(Boolean)
    .join(' · ');

  let figures: ReactNode;
  if (member.kind === 'subIb') {
    figures = (
      <>
        <Figure label={copy.downline} value={copy.downlineValue(summary.subs, summary.clients)} />
        <Figure label={copy.branchEarned} value={formatMoney(summary.earned, currency)} emphasis />
      </>
    );
  } else {
    figures = (
      <>
        <Figure label={copy.deposits} value={formatMoney(member.deposits, currency)} />
        <Figure label={copy.net} value={formatMoney(member.deposits - member.withdrawals, currency)} />
        <Figure label={copy.lots} value={lotsFormat.format(member.lots)} />
        <Figure label={copy.youEarned} value={formatMoney(member.earned, currency)} emphasis />
      </>
    );
  }

  return (
    <RowShell
      isToggle={hasBranch}
      isOpen={isOpen}
      onToggle={onToggle}
      accent={kind === 'subIb' ? 'bg-fg/[0.05] ring-1 ring-line-strong hover:bg-fg/[0.08]' : 'bg-fg/[0.015] ring-1 ring-line hover:bg-fg/[0.04]'}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center">
          {hasBranch ? (
            <span
              aria-hidden="true"
              style={isOpen ? { background: RED } : undefined}
              className={cx('grid size-7 place-items-center rounded-[10px] transition-[background-color,color] duration-300', isOpen ? 'text-white' : 'text-fg ring-1 ring-line-strong group-hover:bg-fg group-hover:text-app')}
            >
              <Icon name="plus" size={13} className={cx('transition-transform duration-300 motion-reduce:transition-none', isOpen && 'rotate-45')} />
            </span>
          ) : (
            <Marker kind={kind} large />
          )}
        </span>
        <span className="relative grid size-10 shrink-0 place-items-center">
          <span
            className={cx(
              'grid size-10 place-items-center rounded-[13px] text-xs font-black transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none',
              kind === 'subIb' ? 'bg-fg text-app' : 'bg-fg/[0.06] text-fg ring-1 ring-line',
            )}
          >
            {firstLetter(member.name)}
          </span>
          {kind === 'subIb' && <span aria-hidden="true" style={{ background: RED }} className="absolute -top-1 -right-1 size-2.5 rounded-[3px] ring-2 ring-app" />}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-black text-fg">
            <span className="truncate">{member.name}</span>
            {member.kind === 'subIb' && <span className="rounded-full bg-fg px-2 py-0.5 text-[9.5px] font-black text-app">{copy.subIbTag(member.level)}</span>}
            {member.isDirectClient && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-black text-fg ring-1 ring-line-strong">
                <Marker kind="ownClient" />
                {copy.directClientTag}
              </span>
            )}
            {kind === 'subIbClient' && <span className="rounded-full border border-dashed border-fg-subtle/60 px-2 py-0.5 text-[9.5px] font-black text-fg-subtle">{copy.subIbClientTag}</span>}
          </p>
          <p className="truncate text-xs text-fg-subtle">{subLine}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-10 lg:pl-0">
        {figures}
        <OpenButton member={member} onOpen={onOpen} />
      </div>
    </RowShell>
  );
}

function Branch({ member, expanded, onToggle, onOpen, currency, index }: {
  member: CascadeMember;
  expanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpen: (member: CascadeMember) => void;
  currency: string;
  index: number;
}) {
  const isOpen = expanded(member.id);
  return (
    <li style={stagger(index)} className="relative animate-feed-in motion-reduce:animate-none">
      <span aria-hidden="true" className="absolute top-7 -left-5 w-5 border-t-2 border-dashed border-line-strong" />
      <span aria-hidden="true" className="absolute top-[25px] -left-[23px] size-1.5 rounded-[2px] bg-fg/45" />
      <MemberRow member={member} isOpen={isOpen} onToggle={() => onToggle(member.id)} onOpen={onOpen} currency={currency} />
      {member.children.length > 0 && isOpen && (
        <ul className="relative mt-2 ml-6 flex flex-col gap-2 border-l-2 border-dashed border-line-strong pl-5">
          {member.children.map((child, childIndex) => (
            <Branch key={child.id} member={child} expanded={expanded} onToggle={onToggle} onOpen={onOpen} currency={currency} index={childIndex} />
          ))}
        </ul>
      )}
    </li>
  );
}

function subTitleOf(member: CascadeMember): string {
  if (member.kind === 'subIb') return copy.subIbTag(member.level);
  return markerOf(member) === 'ownClient' ? copy.legendOwnClient : copy.subIbClientTag;
}

function MemberSheet({ member, currency, onClose }: { member: CascadeMember | null; currency: string; onClose: () => void }) {
  const summary = member ? branchSummary(member) : null;
  const rows: { label: string; value: string }[] = member
    ? [
        { label: copy.email, value: member.email },
        { label: copy.account, value: member.accountNumber ? `#${member.accountNumber}` : '—' },
        { label: copy.referralSource, value: member.referralSource ?? '—' },
        { label: copy.deposits, value: formatMoney(member.deposits, currency) },
        { label: copy.withdrawals, value: formatMoney(member.withdrawals, currency) },
        { label: copy.net, value: formatMoney(member.deposits - member.withdrawals, currency) },
        { label: copy.lots, value: lotsFormat.format(member.lots) },
        { label: copy.youEarned, value: formatMoney(member.earned, currency) },
        ...(member.kind === 'subIb' && summary
          ? [
              { label: copy.downline, value: copy.downlineValue(summary.subs, summary.clients) },
              { label: copy.branchEarned, value: formatMoney(summary.earned, currency) },
            ]
          : []),
      ]
    : [];

  const title = member ? (
    <span className="flex items-center gap-3">
      <span className="relative grid size-12 shrink-0 place-items-center">
        <span className="grid size-12 place-items-center rounded-[15px] bg-fg text-sm font-black text-app">{firstLetter(member.name)}</span>
        <span aria-hidden="true" style={{ background: RED }} className="absolute -top-1 -right-1 size-3 rounded-[3px] ring-2 ring-app" />
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Marker kind={markerOf(member)} />
        <span className="truncate text-lg font-black text-fg">{member.name}</span>
      </span>
    </span>
  ) : (
    ''
  );

  return (
    <Modal open={member !== null} onClose={onClose} title={title} description={member ? subTitleOf(member) : undefined} calm>
      <dl className="grid gap-x-6 gap-y-3 rounded-[24px] border border-dashed border-line-strong p-4 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.label} style={stagger(index, 45)} className="flex min-w-0 animate-feed-in items-end gap-2 motion-reduce:animate-none">
            <dt className="shrink-0 text-xs text-fg-subtle">{row.label}</dt>
            <span aria-hidden="true" className="mb-1 min-w-3 flex-1 border-b-2 border-dotted border-line-strong" />
            <dd className="min-w-0 truncate font-mono text-sm font-black text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

/** Everyone under `root`, without the root row itself — used by the member page's Network tab. */
export function CascadeTree({ root, currency }: { root: CascadeMember; currency: string }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [sheetMember, setSheetMember] = useState<CascadeMember | null>(null);

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <ul className="relative ml-1 flex flex-col gap-2 border-l-2 border-dashed border-line-strong pl-5">
        {root.children.map((child, index) => (
          <Branch key={child.id} member={child} expanded={(id) => openIds.has(id)} onToggle={toggle} onOpen={setSheetMember} currency={currency} index={index} />
        ))}
      </ul>
      <MemberSheet member={sheetMember} currency={currency} onClose={() => setSheetMember(null)} />
    </>
  );
}

export function NetworkCascadeDesk({ root, range, currency }: { root: CascadeMember; range: PeriodRange; currency: string }) {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(branchIds(root)));
  const [sheetMember, setSheetMember] = useState<CascadeMember | null>(null);

  const needle = query.trim().toLowerCase();
  const visible = filterCascade(root, needle);
  const isSearching = needle !== '';
  const summary = branchSummary(root);
  const isExpanded = (id: string) => isSearching || openIds.has(id);

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const legend: { kind: MarkerKind; label: string }[] = [
    { kind: 'subIb', label: copy.legendSubIb },
    { kind: 'ownClient', label: copy.legendOwnClient },
    { kind: 'subIbClient', label: copy.legendSubIbClient },
  ];
  const ghostPill =
    'inline-flex h-10 items-center gap-2 rounded-full bg-fg/[0.03] py-1 pr-4 pl-1 text-xs font-bold text-fg ring-1 ring-line transition-[background-color,color] duration-300 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

  return (
    <div className="flex flex-col gap-5">
      <NetworkPulse root={root} range={range} currency={currency} />

      <section style={{ animationDelay: '120ms' }} className="zenith-tile flex min-w-0 flex-col gap-4">
        <div className={cx(panelClass, 'flex flex-col gap-3 p-3 sm:p-4')}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="group flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-fg/[0.03] py-1 pr-4 pl-1 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-fg sm:max-w-md">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-app">
                <Icon name="search" size={15} />
              </span>
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <div className="flex gap-2 sm:ml-auto">
              <button type="button" onClick={() => setOpenIds(new Set(branchIds(root)))} className={ghostPill}>
                <span aria-hidden="true" style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white">
                  <Icon name="plus" size={13} />
                </span>
                {copy.expandAll}
              </button>
              <button type="button" onClick={() => setOpenIds(new Set())} className={ghostPill}>
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-fg/[0.08]">
                  <Icon name="close" size={13} />
                </span>
                {copy.collapse}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line-strong pt-3 text-xs text-fg-muted">
            {legend.map((item) => (
              <span key={item.kind} className="inline-flex items-center gap-2 rounded-full bg-fg/[0.03] px-3 py-1.5 ring-1 ring-line">
                <Marker kind={item.kind} />
                {item.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[11px] text-fg-subtle italic sm:ml-auto">
              <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
              {copy.hint}
            </span>
          </div>
        </div>

        {visible === null ? (
          <div className={cx(openClass, 'flex flex-col items-center gap-4 px-6 py-12 text-center')}>
            <span aria-hidden="true" className="relative grid place-items-center">
              <span className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }, (_, pixel) => (
                  <span
                    key={pixel}
                    style={{ animationDelay: `${(pixel % 7) * 0.15}s`, background: pixel === 24 ? RED : undefined }}
                    className={cx('zenith-blink size-2 rounded-[2px]', pixel !== 24 && 'bg-fg/20')}
                  />
                ))}
              </span>
              <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
                <Icon name="accounts" size={20} />
              </span>
            </span>
            <p className="text-sm text-fg-muted">{copy.empty}</p>
          </div>
        ) : (
          <div className={cx(openClass, 'p-3 sm:p-4')}>
            <RowShell isToggle={false} isOpen accent="bg-fg text-app" onToggle={() => undefined}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative grid size-12 shrink-0 place-items-center">
                  <span aria-hidden="true" style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[15px] opacity-50 motion-reduce:hidden" />
                  <span style={{ background: RED }} className="relative grid size-12 place-items-center rounded-[15px] text-sm font-black text-white">
                    {firstLetter(root.name)}
                  </span>
                </span>
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-black">{copy.you}</span>
                  <span className="opacity-60">· {root.name}</span>
                  <span className="rounded-full bg-app px-2 py-0.5 text-[9.5px] font-black text-fg">{copy.masterTag}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pl-15 lg:pl-0">
                <span className="text-xs opacity-70">
                  {copy.masterSummary(root.children.length, summary.subs)} <span className="font-mono font-black text-success">{formatMoney(summary.earned, currency)}</span> {copy.earnedSuffix}
                </span>
                <OpenButton member={root} onOpen={setSheetMember} inverted />
              </div>
            </RowShell>
            {visible.children.length > 0 && (
              <ul className="relative mt-2 ml-6 flex flex-col gap-2 border-l-2 border-dashed border-line-strong pl-5">
                {visible.children.map((child, index) => (
                  <Branch key={child.id} member={child} expanded={isExpanded} onToggle={toggle} onOpen={setSheetMember} currency={currency} index={index} />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <MemberSheet member={sheetMember} currency={currency} onClose={() => setSheetMember(null)} />
    </div>
  );
}
