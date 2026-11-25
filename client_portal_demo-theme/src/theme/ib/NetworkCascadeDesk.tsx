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

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';
const lotsFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

function firstLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function branchIds(root: CascadeMember): string[] {
  return [root, ...descendantsOf(root)].filter((node) => node.children.length > 0).map((node) => node.id);
}

type Lineage = 'subIb' | 'ownClient' | 'subIbClient';

function lineageOf(member: CascadeMember): Lineage {
  if (member.kind === 'subIb') return 'subIb';
  return member.level === 1 || member.isDirectClient ? 'ownClient' : 'subIbClient';
}

/** Left edge bar on each row: solid gold = sub-IB, gold outline = your own client, hairline = a sub-IB's client. */
const lineageBar: Record<Lineage, string> = {
  subIb: 'bg-primary',
  ownClient: 'border-2 border-primary bg-transparent',
  subIbClient: 'bg-line',
};

function LineageSwatch({ lineage }: { lineage: Lineage }) {
  return <span aria-hidden="true" className={cx('h-3.5 w-1.5 shrink-0 rounded-full', lineageBar[lineage])} />;
}

/* ───────────── Network gauge: graphite instrument strip, sub-IBs → clients → active → earned ───────────── */

function NetworkChain({ root, range, currency }: { root: CascadeMember; range: PeriodRange; currency: string }) {
  const stats = cascadeStats(root, (member) => isInRange(member.lastTradeAt, range));
  const stations: { label: string; hint: string; value: string; icon: IconName; emphasis?: boolean }[] = [
    { label: copy.kpiSubIbs, hint: copy.kpiSubIbsHint(stats.directSubIbs), value: String(stats.cascadeSubIbs), icon: 'trophy' },
    { label: copy.kpiClients, hint: copy.kpiClientsHint, value: String(stats.clients), icon: 'user' },
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(stats.active), icon: 'history' },
    { label: copy.kpiEarned, hint: copy.kpiEarnedHint, value: formatMoney(stats.earned, currency), icon: 'accounts', emphasis: true },
  ];
  // Share of clients who traded in the period, drawn as a thin gold track under the "active" cell.
  const activeShare = stats.clients > 0 ? (stats.active / stats.clients) * 100 : 0;

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[#18181b] text-white ring-1 ring-primary/30">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-1/4 -z-10 size-72 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_22%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <ol className="grid grid-cols-2 divide-white/10 xl:grid-cols-4 xl:divide-x">
        {stations.map((station, index) => (
          <li key={station.label} style={riseDelay(index)} className="flex animate-rise flex-col gap-2 p-5 motion-reduce:animate-none">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-[0.16em] text-white/45 uppercase">{station.label}</span>
              <span className={cx('grid size-8 place-items-center rounded-lg', station.emphasis ? 'bg-primary/25 text-(--brand-gleam)' : 'bg-white/[0.06] text-white/60')}>
                <Icon name={station.icon} size={14} />
              </span>
            </span>
            <span
              className={cx(
                'truncate font-mono text-3xl font-semibold tabular-nums',
                station.emphasis && 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]',
              )}
            >
              {station.value}
            </span>
            {index === 2 ? (
              <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-white/10">
                <span style={{ width: `${activeShare}%` }} className="block h-full origin-left animate-grow rounded-full bg-(--brand-gleam) motion-reduce:animate-none" />
              </span>
            ) : (
              <span aria-hidden="true" className="block h-1 rounded-full bg-white/[0.04]" />
            )}
            <span className="text-xs text-white/50">{station.hint}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Rows ───────────── */

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <span className="flex min-w-[84px] flex-col items-start sm:items-end">
      <span className="text-[9.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{label}</span>
      <span className={cx('font-mono text-sm font-bold tabular-nums', emphasis ? 'text-primary' : 'text-fg')}>{value}</span>
    </span>
  );
}

function OpenLink({ member, onOpen }: { member: CascadeMember; onOpen: (member: CascadeMember) => void }) {
  const className =
    'inline-flex shrink-0 items-center gap-1 border-b border-primary/40 pb-0.5 text-xs font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring';
  const label = (
    <>
      {copy.open}
      <Icon name="chevronRight" size={12} />
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

function Row({ member, depth, isOpen, onToggle, onOpen, currency }: {
  member: CascadeMember;
  depth: number;
  isOpen: boolean;
  onToggle: () => void;
  onOpen: (member: CascadeMember) => void;
  currency: string;
}) {
  const hasBranch = member.children.length > 0;
  const lineage = lineageOf(member);
  const summary = branchSummary(member);
  const subLine = [member.accountNumber ? `#${member.accountNumber}` : null, member.email, member.handle, member.referralSource ? copy.via(member.referralSource) : null]
    .filter(Boolean)
    .join(' · ');

  let stats: ReactNode;
  if (member.kind === 'subIb') {
    stats = (
      <>
        <Stat label={copy.downline} value={copy.downlineValue(summary.subs, summary.clients)} />
        <Stat label={copy.branchEarned} value={formatMoney(summary.earned, currency)} emphasis />
      </>
    );
  } else {
    stats = (
      <>
        <Stat label={copy.deposits} value={formatMoney(member.deposits, currency)} />
        <Stat label={copy.net} value={formatMoney(member.deposits - member.withdrawals, currency)} />
        <Stat label={copy.lots} value={lotsFormat.format(member.lots)} />
        <Stat label={copy.youEarned} value={formatMoney(member.earned, currency)} emphasis />
      </>
    );
  }

  const content = (
    <>
      <span aria-hidden="true" className={cx('absolute inset-y-3 left-0 w-1.5 rounded-full', lineageBar[lineage])} />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid w-4 shrink-0 place-items-center text-fg-subtle">
          {hasBranch && <Icon name="chevronRight" size={14} className={cx('transition-transform duration-300', isOpen && 'rotate-90')} />}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#18181b] text-xs font-bold text-(--brand-gleam)">{firstLetter(member.name)}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-fg">
            <span className="truncate">{member.name}</span>
            {member.kind === 'subIb' && (
              <span className="rounded border border-primary/50 px-1.5 text-[9.5px] font-bold text-primary">{copy.subIbTag(member.level)}</span>
            )}
            {member.isDirectClient && <span className="rounded bg-primary/15 px-1.5 text-[9.5px] font-bold text-primary">{copy.directClientTag}</span>}
            {lineage === 'subIbClient' && <span className="rounded border border-line px-1.5 text-[9.5px] font-bold text-fg-subtle">{copy.subIbClientTag}</span>}
          </p>
          <p className="truncate text-xs text-fg-subtle">{subLine}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-7 sm:pl-0">
        {stats}
        <OpenLink member={member} onOpen={onOpen} />
      </div>
    </>
  );

  const shell = 'relative flex w-full flex-col gap-3 border-b border-dashed border-line py-4 pr-3 pl-5 text-left transition-colors hover:bg-primary/[0.04] sm:flex-row sm:items-center';
  const indent: CSSProperties = { paddingLeft: `${1.25 + depth * 1.75}rem` };
  // One vertical guide per ancestor level, with an elbow into this row, so depth reads as a tree.
  const guides = depth > 0 && (
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0">
      {Array.from({ length: depth }, (_, level) => (
        <span key={level} style={{ left: `${1.6 + level * 1.75}rem` }} className="absolute inset-y-0 w-px bg-line" />
      ))}
      <span style={{ left: `${1.6 + (depth - 1) * 1.75}rem` }} className="absolute top-1/2 h-px w-4 bg-primary/50" />
    </span>
  );

  if (!hasBranch) {
    return (
      <div className={shell} style={indent}>
        {guides}
        {content}
      </div>
    );
  }
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
      className={cx(shell, 'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring')}
      style={indent}
    >
      {guides}
      {content}
    </div>
  );
}

function Branch({ member, depth, expanded, onToggle, onOpen, currency, index }: {
  member: CascadeMember;
  depth: number;
  expanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpen: (member: CascadeMember) => void;
  currency: string;
  index: number;
}) {
  const isOpen = expanded(member.id);
  return (
    <li style={riseDelay(index)} className="animate-rise motion-reduce:animate-none">
      <Row member={member} depth={depth} isOpen={isOpen} onToggle={() => onToggle(member.id)} onOpen={onOpen} currency={currency} />
      {member.children.length > 0 && isOpen && (
        <ul>
          {member.children.map((child, childIndex) => (
            <Branch key={child.id} member={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onOpen={onOpen} currency={currency} index={childIndex} />
          ))}
        </ul>
      )}
    </li>
  );
}

function subTitleOf(member: CascadeMember): string {
  if (member.kind === 'subIb') return copy.subIbTag(member.level);
  return lineageOf(member) === 'ownClient' ? copy.legendOwnClient : copy.subIbClientTag;
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

  return (
    <Modal open={member !== null} onClose={onClose} title={member?.name ?? ''} description={member ? subTitleOf(member) : undefined}>
      <dl className="flex flex-col divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs text-fg-subtle">{row.label}</dt>
            <dd className="truncate font-mono text-sm text-fg">{row.value}</dd>
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
      <ul>
        {root.children.map((child, index) => (
          <Branch key={child.id} member={child} depth={0} expanded={(id) => openIds.has(id)} onToggle={toggle} onOpen={setSheetMember} currency={currency} index={index} />
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

  const legend: { lineage: Lineage; label: string }[] = [
    { lineage: 'subIb', label: copy.legendSubIb },
    { lineage: 'ownClient', label: copy.legendOwnClient },
    { lineage: 'subIbClient', label: copy.legendSubIbClient },
  ];
  const ghostButton =
    'h-10 rounded-xl border border-line px-4 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring';

  return (
    <div className="flex flex-col gap-6">
      <NetworkChain root={root} range={range} currency={currency} />

      <section className={cx(cardClass, 'min-w-0 overflow-hidden')}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-6">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 transition-colors focus-within:border-primary sm:max-w-sm">
            <Icon name="search" size={15} className="shrink-0 text-fg-subtle" />
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
          <div className="flex gap-2 sm:ml-auto">
            <button type="button" onClick={() => setOpenIds(new Set(branchIds(root)))} className={ghostButton}>
              {copy.expandAll}
            </button>
            <button type="button" onClick={() => setOpenIds(new Set())} className={ghostButton}>
              {copy.collapse}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line bg-surface-2/50 px-4 py-2.5 text-xs text-fg-muted sm:px-6">
          {legend.map((item) => (
            <span key={item.lineage} className="inline-flex items-center gap-2">
              <LineageSwatch lineage={item.lineage} />
              {item.label}
            </span>
          ))}
          <span className="text-[11px] text-fg-subtle italic sm:ml-auto">{copy.hint}</span>
        </div>

        {visible === null ? (
          <p className="px-6 py-12 text-center text-sm text-fg-muted">{copy.empty}</p>
        ) : (
          <div>
            <div className="relative flex flex-col gap-3 border-b border-line bg-[#18181b] px-5 py-4 text-white sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-(--brand-gleam)/60 text-sm font-bold text-(--brand-gleam)">{firstLetter(root.name)}</span>
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-bold">{copy.you}</span>
                  <span className="text-white/60">· {root.name}</span>
                  <span className="rounded bg-(--brand-gleam)/20 px-1.5 text-[9.5px] font-bold text-(--brand-gleam)">{copy.masterTag}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs text-white/60">
                  {copy.masterSummary(root.children.length, summary.subs)}{' '}
                  <span className="font-mono font-semibold text-(--brand-gleam)">{formatMoney(summary.earned, currency)}</span> {copy.earnedSuffix}
                </span>
                <Link
                  href="/ib/network/you"
                  className="inline-flex items-center gap-1 border-b border-(--brand-gleam)/40 pb-0.5 text-xs font-semibold text-(--brand-gleam) hover:border-(--brand-gleam) focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {copy.open}
                  <Icon name="chevronRight" size={12} />
                </Link>
              </div>
            </div>
            <ul>
              {visible.children.map((child, index) => (
                <Branch key={child.id} member={child} depth={0} expanded={isExpanded} onToggle={toggle} onOpen={setSheetMember} currency={currency} index={index} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <MemberSheet member={sheetMember} currency={currency} onClose={() => setSheetMember(null)} />
    </div>
  );
}
