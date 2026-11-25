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

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

function firstLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function branchIds(root: CascadeMember): string[] {
  return [root, ...descendantsOf(root)].filter((node) => node.children.length > 0).map((node) => node.id);
}

/* ───────────── Markers: shape tells the role (diamond = sub-IB, ring = own client, dashed = sub-IB's client) ───────────── */

type MarkerKind = 'subIb' | 'ownClient' | 'subIbClient';

function markerOf(member: CascadeMember): MarkerKind {
  if (member.kind === 'subIb') return 'subIb';
  return member.level === 1 || member.isDirectClient ? 'ownClient' : 'subIbClient';
}

function Marker({ kind }: { kind: MarkerKind }) {
  if (kind === 'subIb') return <span aria-hidden="true" className="size-2.5 shrink-0 rotate-45 rounded-[2px] bg-primary" />;
  if (kind === 'ownClient') return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full ring-2 ring-primary" />;
  return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-dashed border-fg-subtle" />;
}

/* ───────────── Constellation band: hub with orbiting members + four network figures ───────────── */

function Constellation({ satellites }: { satellites: MarkerKind[] }) {
  return (
    <div aria-hidden="true" className="relative grid size-28 shrink-0 place-items-center">
      <span className="absolute inset-2 rounded-full border border-dashed border-primary/30" />
      <span className="absolute inset-0 animate-orbit [animation-duration:4s] motion-reduce:animate-none">
        {satellites.map((kind, index) => {
          const angle = (index / Math.max(satellites.length, 1)) * Math.PI * 2;
          return (
            <span
              key={index}
              className="absolute grid size-4 place-items-center rounded-full bg-surface"
              style={{ left: `calc(50% + ${Math.cos(angle) * 48}px - 8px)`, top: `calc(50% + ${Math.sin(angle) * 48}px - 8px)` }}
            >
              <Marker kind={kind} />
            </span>
          );
        })}
      </span>
      <span className="relative grid size-12 place-items-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/50">
        <Icon name="accounts" size={20} />
      </span>
    </div>
  );
}

function NetworkPulse({ root, range, currency }: { root: CascadeMember; range: PeriodRange; currency: string }) {
  const stats = cascadeStats(root, (member) => isInRange(member.lastTradeAt, range));
  const figures: { label: string; hint: string; value: string; icon: IconName; emphasis?: boolean }[] = [
    { label: copy.kpiSubIbs, hint: copy.kpiSubIbsHint(stats.directSubIbs), value: String(stats.cascadeSubIbs), icon: 'trophy' },
    { label: copy.kpiClients, hint: copy.kpiClientsHint, value: String(stats.clients), icon: 'user' },
    { label: copy.kpiActive, hint: copy.kpiActiveHint, value: String(stats.active), icon: 'history' },
    { label: copy.kpiEarned, hint: copy.kpiEarnedHint, value: formatMoney(stats.earned, currency), icon: 'accounts', emphasis: true },
  ];

  return (
    <section className="orbit-card flex flex-col items-stretch gap-2 overflow-hidden p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex justify-center lg:justify-start">
        <Constellation satellites={descendantsOf(root).map(markerOf)} />
      </div>
      <ul className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line xl:grid-cols-4">
        {figures.map((figure, index) => (
          <li key={figure.label} style={riseDelay(index)} className="flex animate-rise flex-col gap-1.5 bg-surface p-4 motion-reduce:animate-none">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
              <Icon name={figure.icon} size={13} className="text-primary" />
              {figure.label}
            </span>
            <span className={cx('font-mono text-2xl font-bold tabular-nums', figure.emphasis ? 'text-primary' : 'text-fg')}>{figure.value}</span>
            <span className="text-xs text-fg-subtle">{figure.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Cascade rows ───────────── */

function Figure({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col items-start rounded-xl bg-surface-2/50 px-2.5 py-1.5 ring-1 ring-line sm:items-end">
      <span className="text-[9.5px] font-semibold tracking-[0.12em] text-fg-subtle uppercase">{label}</span>
      <span className={cx('font-mono text-xs font-semibold tabular-nums', emphasis ? 'text-primary' : 'text-fg')}>{value}</span>
    </span>
  );
}

function OpenButton({ member, onOpen }: { member: CascadeMember; onOpen: (member: CascadeMember) => void }) {
  const className =
    'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/35 transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring';
  const label = (
    <>
      {copy.open}
      <Icon name="chevronRight" size={12} className="transition-transform group-hover/open:translate-x-0.5" />
    </>
  );
  const href = member.kind === 'master' ? '/ib/network/you' : memberPageHref(member.id);
  if (href) {
    return (
      <Link href={href} onClick={(event) => event.stopPropagation()} className={cx('group/open', className)}>
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
      className={cx('group/open', className)}
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
  const shell = cx('group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left ring-1 transition-colors lg:flex-row lg:items-center', accent);
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
      className={cx(shell, 'cursor-pointer focus-visible:outline-2 focus-visible:outline-ring')}
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
      accent={kind === 'subIb' ? 'bg-primary/[0.06] ring-primary/25 hover:bg-primary/10' : 'bg-surface-2/30 ring-line hover:bg-surface-2/60'}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid w-4 shrink-0 place-items-center text-fg-subtle">
          {hasBranch ? <Icon name="chevronRight" size={14} className={cx('transition-transform duration-300', isOpen && 'rotate-90')} /> : <Marker kind={kind} />}
        </span>
        <span
          className={cx(
            'grid size-9 shrink-0 place-items-center text-xs font-bold',
            kind === 'subIb' ? 'rounded-xl bg-primary/20 text-primary ring-1 ring-primary/40' : 'rounded-full bg-surface-2 text-fg-muted ring-1 ring-line',
          )}
        >
          {firstLetter(member.name)}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-fg">
            <span className="truncate">{member.name}</span>
            {member.kind === 'subIb' && (
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-bold text-primary ring-1 ring-primary/40">{copy.subIbTag(member.level)}</span>
            )}
            {member.isDirectClient && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-bold text-fg ring-1 ring-line">
                <Marker kind="ownClient" />
                {copy.directClientTag}
              </span>
            )}
            {kind === 'subIbClient' && (
              <span className="rounded-md border border-dashed border-fg-subtle/60 px-1.5 py-0.5 text-[9.5px] font-bold text-fg-subtle">{copy.subIbClientTag}</span>
            )}
          </p>
          <p className="truncate text-xs text-fg-subtle">{subLine}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-7 lg:pl-0">
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
    <li style={riseDelay(index)} className="relative animate-rise motion-reduce:animate-none">
      <span aria-hidden="true" className="absolute top-7 -left-5 w-5 border-t border-dashed border-primary/40" />
      <MemberRow member={member} isOpen={isOpen} onToggle={() => onToggle(member.id)} onOpen={onOpen} currency={currency} />
      {member.children.length > 0 && isOpen && (
        <ul className="relative mt-2 ml-6 flex flex-col gap-2 border-l border-dashed border-primary/40 pl-5">
          {member.children.map((child, childIndex) => (
            <Branch key={child.id} member={child} expanded={expanded} onToggle={onToggle} onOpen={onOpen} currency={currency} index={childIndex} />
          ))}
        </ul>
      )}
    </li>
  );
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
    <Modal open={member !== null} onClose={onClose} title={member?.name ?? ''} description={member ? subTitleOf(member) : undefined} calm>
      <dl className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 sm:border-b sm:border-line sm:px-2">
            <dt className="text-xs text-fg-subtle">{row.label}</dt>
            <dd className="truncate font-mono text-sm text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

function subTitleOf(member: CascadeMember): string {
  if (member.kind === 'subIb') return copy.subIbTag(member.level);
  return markerOf(member) === 'ownClient' ? copy.legendOwnClient : copy.subIbClientTag;
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
      <ul className="relative ml-1 flex flex-col gap-2 border-l border-dashed border-primary/40 pl-5">
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

  return (
    <div className="flex flex-col gap-6">
      <NetworkPulse root={root} range={range} currency={currency} />

      <section className="orbit-card min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="group flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface-2/60 px-4 ring-1 ring-line transition-shadow focus-within:ring-primary/60 sm:max-w-md">
            <Icon name="search" size={16} className="shrink-0 text-fg-subtle group-focus-within:text-primary" />
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
          <div className="inline-flex rounded-2xl bg-surface-2/50 p-1 ring-1 ring-line sm:ml-auto">
            <button
              type="button"
              onClick={() => setOpenIds(new Set(branchIds(root)))}
              className="h-9 rounded-xl px-4 text-xs font-semibold text-fg transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {copy.expandAll}
            </button>
            <button
              type="button"
              onClick={() => setOpenIds(new Set())}
              className="h-9 rounded-xl px-4 text-xs font-semibold text-fg transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {copy.collapse}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2/20 px-4 py-2.5 text-xs text-fg-muted sm:px-5">
          {legend.map((item) => (
            <span key={item.kind} className="inline-flex items-center gap-2">
              <Marker kind={item.kind} />
              {item.label}
            </span>
          ))}
          <span className="text-[11px] text-fg-subtle italic sm:ml-auto">{copy.hint}</span>
        </div>

        <div className="p-4 sm:p-5">
          {visible === null ? (
            <p className="py-10 text-center text-sm text-fg-muted">{copy.empty}</p>
          ) : (
            <>
              <RowShell isToggle={false} isOpen accent="bg-primary/10 ring-primary/45" onToggle={() => undefined}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative grid size-10 shrink-0 place-items-center rounded-full">
                    <span
                      aria-hidden="true"
                      className="absolute -inset-0.5 animate-orbit rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_40%,transparent_65%,var(--brand-primary))] [animation-duration:3s] motion-reduce:animate-none"
                    />
                    <span className="relative grid size-full place-items-center rounded-full bg-primary/25 text-sm font-bold text-primary ring-2 ring-surface">{firstLetter(root.name)}</span>
                  </span>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-bold text-fg">{copy.you}</span>
                    <span className="text-fg-muted">· {root.name}</span>
                    <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[9.5px] font-bold text-primary ring-1 ring-primary/45">{copy.masterTag}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-13 lg:pl-0">
                  <span className="text-xs text-fg-muted">
                    {copy.masterSummary(root.children.length, summary.subs)}{' '}
                    <span className="font-mono font-semibold text-primary">{formatMoney(summary.earned, currency)}</span> {copy.earnedSuffix}
                  </span>
                  <OpenButton member={root} onOpen={setSheetMember} />
                </div>
              </RowShell>
              {visible.children.length > 0 && (
                <ul className="relative mt-2 ml-6 flex flex-col gap-2 border-l border-dashed border-primary/40 pl-5">
                  {visible.children.map((child, index) => (
                    <Branch key={child.id} member={child} expanded={isExpanded} onToggle={toggle} onOpen={setSheetMember} currency={currency} index={index} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      <MemberSheet member={sheetMember} currency={currency} onClose={() => setSheetMember(null)} />
    </div>
  );
}
