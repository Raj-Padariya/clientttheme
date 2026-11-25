'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { cx } from '../lib/cx';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import type { PeriodRange } from './DirectClientsDesk';
import { NetworkDepth } from './IbNetworkDepth';
import { branchSummary, cascadeCopy as copy, descendantsOf, filterCascade, type CascadeMember } from './ibCascadeData';
import { memberPageHref } from './ibMemberOverviewData';
import { ACCENT, BoardHead, BookSearch, boardClass, captionClass } from './ibNetworkKit';
import './ibNetwork.css';

const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

/*
 * Aurora network book: a depth ladder of the downline, then the cascade as an order-routing tree. Every open
 * branch has a pulse travelling down its route line; the root row is the inverted "you" desk.
 */
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
  if (kind === 'ownClient') return <span aria-hidden="true" className={cx(size, 'shrink-0 rounded-full ring-2 ring-success')} />;
  return <span aria-hidden="true" className={cx(size, 'shrink-0 rounded-full border-2 border-dashed border-fg-subtle')} />;
}

/* ───────────── Routing rows ───────────── */

function Figure({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col rounded-[9px] bg-fg/[0.03] px-2.5 py-1 ring-1 ring-line">
      <span className="truncate text-[9.5px] font-semibold tracking-[0.1em] text-fg-subtle uppercase">{label}</span>
      <span className={cx('truncate font-mono text-xs font-black tabular-nums', emphasis ? 'text-success' : 'text-fg')}>{value}</span>
    </span>
  );
}

function OpenButton({ member, onOpen, inverted = false }: { member: CascadeMember; onOpen: (member: CascadeMember) => void; inverted?: boolean }) {
  const className = cx(
    'group/open inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] pr-1.5 pl-3 text-xs font-bold ring-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    inverted ? 'bg-app text-fg ring-app' : 'text-fg ring-line hover:bg-fg hover:text-app',
  );
  const label = (
    <>
      {copy.open}
      <span style={{ background: ACCENT }} className="grid size-6 place-items-center rounded-[7px] text-white transition-transform group-hover/open:translate-x-0.5">
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

function RowShell({ isToggle, isOpen, onToggle, className, children }: { isToggle: boolean; isOpen: boolean; onToggle: () => void; className: string; children: ReactNode }) {
  const shell = cx('group relative flex w-full flex-col gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors duration-200 lg:flex-row lg:items-center', className);
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
    <RowShell isToggle={hasBranch} isOpen={isOpen} onToggle={onToggle} className={cx(kind === 'subIb' ? 'bg-fg/[0.04] ring-1 ring-line hover:bg-fg/[0.07]' : 'hover:bg-fg/[0.03]', isOpen && 'inx-flash')}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center">
          {hasBranch ? (
            <span
              aria-hidden="true"
              style={isOpen ? { background: ACCENT } : undefined}
              className={cx('grid size-7 place-items-center rounded-[8px] transition-colors duration-300', isOpen ? 'text-white' : 'text-fg ring-1 ring-line group-hover:bg-fg group-hover:text-app')}
            >
              <Icon name="plus" size={13} className={cx('transition-transform duration-300 motion-reduce:transition-none', isOpen && 'rotate-45')} />
            </span>
          ) : (
            <Marker kind={kind} large />
          )}
        </span>
        <span className={cx('relative grid size-10 shrink-0 place-items-center rounded-[11px] text-xs font-black', kind === 'subIb' ? 'bg-fg text-app' : 'bg-fg/[0.06] text-fg ring-1 ring-line')}>
          {firstLetter(member.name)}
          {kind === 'subIb' && <span aria-hidden="true" style={{ background: ACCENT }} className="absolute -top-1 -right-1 size-2.5 rounded-[3px] ring-2 ring-app" />}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-black text-fg">
            <span className="truncate">{member.name}</span>
            {member.kind === 'subIb' && <span className="rounded bg-fg px-1.5 py-0.5 font-mono text-[9.5px] font-black text-app">{copy.subIbTag(member.level)}</span>}
            {member.isDirectClient && (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-black text-success ring-1 ring-success/40">
                <Marker kind="ownClient" />
                {copy.directClientTag}
              </span>
            )}
            {kind === 'subIbClient' && <span className="rounded border border-dashed border-fg-subtle/60 px-1.5 py-0.5 text-[9.5px] font-black text-fg-subtle">{copy.subIbClientTag}</span>}
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
    <li style={{ animationDelay: `${index * 60}ms` }} className="relative animate-feed-in motion-reduce:animate-none">
      <span aria-hidden="true" className="absolute top-[26px] -left-4 w-4 border-t-2 border-line-strong" />
      <MemberRow member={member} isOpen={isOpen} onToggle={() => onToggle(member.id)} onOpen={onOpen} currency={currency} />
      {member.children.length > 0 && isOpen && <RouteList members={member.children} expanded={expanded} onToggle={onToggle} onOpen={onOpen} currency={currency} />}
    </li>
  );
}

// Children hang off a solid route line; a clay pulse travels down it while the branch is open.
function RouteList({ members, expanded, onToggle, onOpen, currency, className }: {
  members: CascadeMember[];
  expanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpen: (member: CascadeMember) => void;
  currency: string;
  className?: string;
}) {
  return (
    <ul className={cx('relative mt-1.5 ml-6 flex flex-col gap-1.5 pl-4', className)}>
      <span aria-hidden="true" className="absolute top-0 bottom-6 left-0 w-0.5 rounded-full bg-line-strong" />
      <span aria-hidden="true" style={{ background: ACCENT }} className="inx-route absolute left-0 size-2 -translate-x-[3px] rounded-full motion-reduce:hidden" />
      {members.map((child, childIndex) => (
        <Branch key={child.id} member={child} expanded={expanded} onToggle={onToggle} onOpen={onOpen} currency={currency} index={childIndex} />
      ))}
    </ul>
  );
}

/* ───────────── Member sheet (members without their own page) ───────────── */

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
      <span className="relative grid size-12 shrink-0 place-items-center rounded-[13px] bg-fg text-sm font-black text-app">
        {firstLetter(member.name)}
        <span aria-hidden="true" style={{ background: ACCENT }} className="absolute -top-1 -right-1 size-3 rounded-[3px] ring-2 ring-app" />
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
      <dl className="grid overflow-hidden rounded-[14px] bg-line ring-1 ring-line sm:grid-cols-2 [&>div]:bg-app">
        {rows.map((row, index) => (
          <div key={row.label} style={{ animationDelay: `${index * 45}ms` }} className="flex min-w-0 animate-feed-in flex-col gap-0.5 px-3 py-2.5 motion-reduce:animate-none">
            <dt className="text-[11px] text-fg-subtle">{row.label}</dt>
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
      <RouteList members={root.children} expanded={(id) => openIds.has(id)} onToggle={toggle} onOpen={setSheetMember} currency={currency} className="mt-0 ml-1" />
      <MemberSheet member={sheetMember} currency={currency} onClose={() => setSheetMember(null)} />
    </>
  );
}

/* ───────────── Network book ───────────── */

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
  const toolButton =
    'inline-flex h-11 items-center gap-2 rounded-[12px] px-3.5 text-xs font-bold text-fg ring-1 ring-line transition-colors duration-200 hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

  return (
    <div className="flex flex-col gap-4">
      <NetworkDepth root={root} range={range} currency={currency} />

      <section style={{ animationDelay: '120ms' }} className={cx(boardClass, 'animate-rise motion-reduce:animate-none')}>
        <BoardHead icon="accounts" caption={copy.masterSummary(root.children.length, summary.subs)} title={copy.legendSubIb} />

        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BookSearch value={query} placeholder={copy.searchPlaceholder} onChange={setQuery} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpenIds(new Set(branchIds(root)))} className={toolButton}>
                <span aria-hidden="true" style={{ background: ACCENT }} className="grid size-6 place-items-center rounded-[7px] text-white">
                  <Icon name="plus" size={12} />
                </span>
                {copy.expandAll}
              </button>
              <button type="button" onClick={() => setOpenIds(new Set())} className={toolButton}>
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-[7px] bg-fg/[0.08]">
                  <Icon name="close" size={12} />
                </span>
                {copy.collapse}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            {legend.map((item) => (
              <span key={item.kind} className="inline-flex items-center gap-2 rounded-[9px] bg-fg/[0.03] px-2.5 py-1.5 ring-1 ring-line">
                <Marker kind={item.kind} />
                {item.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[11px] text-fg-subtle sm:ml-auto">
              <span aria-hidden="true" style={{ background: ACCENT }} className="zenith-blink size-1.5 rounded-full" />
              {copy.hint}
            </span>
          </div>
        </div>

        {visible === null ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span aria-hidden="true" className="flex h-10 items-end gap-1">
              {[40, 70, 30, 90, 55, 75, 45].map((height, bar) => (
                <span key={bar} style={{ height: `${height}%`, animationDelay: `${bar * 0.15}s` }} className="inx-bar w-2 rounded-sm bg-fg/15" />
              ))}
            </span>
            <span className="grid size-11 place-items-center rounded-[12px] bg-fg/[0.06] text-fg">
              <Icon name="accounts" size={18} />
            </span>
            <p className="text-sm text-fg-muted">{copy.empty}</p>
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <RowShell isToggle={false} isOpen onToggle={() => undefined} className="bg-fg text-app">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative grid size-11 shrink-0 place-items-center">
                  <span aria-hidden="true" style={{ background: ACCENT }} className="absolute inset-0 animate-ping-soft rounded-[12px] opacity-50 motion-reduce:hidden" />
                  <span style={{ background: ACCENT }} className="relative grid size-11 place-items-center rounded-[12px] text-sm font-black text-white">
                    {firstLetter(root.name)}
                  </span>
                </span>
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-black">{copy.you}</span>
                  <span className="opacity-60">· {root.name}</span>
                  <span className={cx(captionClass, 'rounded bg-app px-1.5 py-0.5 text-fg')}>{copy.masterTag}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pl-14 lg:pl-0">
                <span className="text-xs opacity-70">
                  {copy.masterSummary(root.children.length, summary.subs)} <span className="font-mono font-black text-success">{formatMoney(summary.earned, currency)}</span> {copy.earnedSuffix}
                </span>
                <OpenButton member={root} onOpen={setSheetMember} inverted />
              </div>
            </RowShell>
            {visible.children.length > 0 && <RouteList members={visible.children} expanded={isExpanded} onToggle={toggle} onOpen={setSheetMember} currency={currency} />}
          </div>
        )}
      </section>

      <MemberSheet member={sheetMember} currency={currency} onClose={() => setSheetMember(null)} />
    </div>
  );
}
