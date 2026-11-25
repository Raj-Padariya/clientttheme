'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import type { ContestDraft, IbContest, IbContestStatus } from '@/core/mock/ibContests';
import { useIbContests } from '@/core/pages/useIbContests';
import { cx } from '../lib/cx';

import { Skeleton } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';
import { AddPrizeFundDialog } from './AddPrizeFundDialog';
import { CreateContestForm } from './CreateContestForm';
import { EnrollmentsPanel, LeaderboardPanel } from './IbContestInsights';

// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';

type TabId = 'mine' | 'enrollments' | 'leaderboard';

const tabs: { id: TabId; labelKey: MessageKey; icon: IconName }[] = [
  { id: 'mine', labelKey: 'ibContest.tabMine', icon: 'trophy' },
  { id: 'enrollments', labelKey: 'ibContest.tabEnrollments', icon: 'user' },
  { id: 'leaderboard', labelKey: 'ibContest.tabLeaderboard', icon: 'areaChart' },
];

const statusMeta: Record<IbContestStatus, { labelKey: MessageKey; chip: string; dot: string }> = {
  draft: { labelKey: 'ibContest.statusDraft', chip: 'border-dashed border-white/35 text-white/80', dot: 'bg-white/80' },
  active: { labelKey: 'ibContest.statusActive', chip: 'border-success/50 text-success', dot: 'bg-success' },
  ended: { labelKey: 'ibContest.statusEnded', chip: 'border-white/15 text-white/45', dot: 'bg-white/40' },
};

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 90}ms` };
}

/* ───────────── Arena scoreboard (hero + lane tabs) ───────────── */

type ArenaStats = { contests: number; participants: number; totalPool: number; yourShare: number; currency: string };

// Split-flap style tile: a dark slot with a hairline across the middle, like a stadium scoreboard digit.
function FlapTile({ label, value, index, isAccent }: { label: string; value: string; index: number; isAccent?: boolean }) {
  return (
    <div style={riseDelay(index)} className="min-w-0 animate-rise rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10 backdrop-blur motion-reduce:animate-none">
      <p className={cx(eyebrow, 'truncate text-white/45')}>{label}</p>
      <p className="relative mt-2 overflow-hidden rounded-lg bg-black/30 px-2.5 py-1.5 ring-1 ring-white/10">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
        <span className={cx('relative block truncate font-mono text-xl font-semibold tabular-nums', isAccent ? goldText : 'text-white')}>{value}</span>
      </p>
    </div>
  );
}

function ArenaBanner({ stats, onCreate, children }: { stats: ArenaStats | null; onCreate: () => void; children?: ReactNode }) {
  const placeholder = '—';
  return (
    <section className={cx('orbit-card relative isolate animate-rise overflow-hidden text-white motion-reduce:animate-none', graphite)}>
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-40 -right-24 -z-10 size-96 animate-orbit-spin motion-reduce:animate-none" />
      <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -bottom-52 left-1/4 -z-10 size-[28rem] animate-orbit-spin-rev motion-reduce:animate-none" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/3 -z-10 size-96 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand-primary)_26%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      {/* Stadium floodlight beams sweeping down from the top edge. */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-[18%] -z-10 h-72 w-40 -rotate-[24deg] bg-linear-to-b from-primary/25 to-transparent blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-[22%] -z-10 h-72 w-40 rotate-[24deg] bg-linear-to-b from-primary/20 to-transparent blur-2xl" />
      {/* Scattered sparks around the arena. */}
      {[
        'top-5 left-[38%] [animation-delay:0s]',
        'bottom-16 left-[52%] [animation-delay:-0.9s]',
        'top-8 right-[30%] [animation-delay:-1.8s]',
        'bottom-20 right-[42%] [animation-delay:-2.4s]',
      ].map((position) => (
        <Icon key={position} name="bolt" size={10} className={cx('pointer-events-none absolute animate-twinkle text-primary motion-reduce:hidden', position)} />
      ))}

      <div className="grid items-center gap-6 p-6 lg:p-7 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="flex items-center gap-4">
          <span className="relative grid size-16 shrink-0 place-items-center">
            <span
              aria-hidden="true"
              className="absolute -inset-1 animate-orbit rounded-2xl bg-[conic-gradient(from_0deg,var(--brand-gleam),transparent_35%,transparent_60%,var(--brand-accent),var(--brand-gleam))] [animation-duration:5s] motion-reduce:animate-none"
            />
            <span className={cx('relative grid size-full place-items-center rounded-2xl text-(--brand-gleam) ring-2 ring-(--hero-panel)', graphite)}>
              <Icon name="trophy" size={26} className="animate-float motion-reduce:animate-none" />
            </span>
          </span>
          <div className="min-w-0">
            <p className={cx(eyebrow, 'text-white/45')}>{translate('ibContest.pageTitle')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{translate('ibContest.title')}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <FlapTile index={1} label={translate('ibContest.tabMine')} value={stats ? String(stats.contests) : placeholder} />
          <FlapTile index={2} label={translate('ibContest.tabEnrollments')} value={stats ? String(stats.participants) : placeholder} />
          <FlapTile index={3} label={translate('ibContest.totalPool')} value={stats ? formatMoney(stats.totalPool, stats.currency) : placeholder} />
          <FlapTile index={4} label={translate('ibContest.yourShare')} value={stats ? formatMoney(stats.yourShare, stats.currency) : placeholder} isAccent />
        </div>

        <button
          type="button"
          onClick={onCreate}
          className={cx(
            'group relative inline-flex h-11 items-center justify-self-start gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold text-(--brand-on-primary) transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none xl:justify-self-end',
            goldFill,
          )}
        >
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
          <Icon name="plus" size={15} className="relative transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
          <span className="relative">{translate('ibContest.create')}</span>
        </button>
      </div>

      {children && <div className="border-t border-white/10 px-2">{children}</div>}
    </section>
  );
}

/* ───────────── Lane tabs: numbered lanes with a floodlit marker on the active one ───────────── */

function ContestTabs({ active, onChange, idBase }: { active: TabId; onChange: (tab: TabId) => void; idBase: string }) {
  const activeIndex = tabs.findIndex((tab) => tab.id === active);
  return (
    <div role="tablist" className="relative grid grid-cols-3">
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        className="absolute -top-px left-0 h-full w-1/3 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
      >
        <span className="mx-auto block h-0.5 w-2/3 rounded-full bg-primary shadow-[0_0_14px_var(--brand-primary)]" />
        <span className="mx-auto block h-[calc(100%-2px)] w-2/3 bg-linear-to-b from-primary/20 to-transparent" />
      </span>
      {tabs.map((tab, index) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`${idBase}-panel`}
            onClick={() => onChange(tab.id)}
            className={cx(
              'relative z-10 flex h-14 min-w-0 items-center justify-center gap-2 text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring',
              isActive ? 'text-white' : 'text-white/50 hover:text-white/80',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 transition-colors duration-300 sm:inline',
                isActive ? 'bg-primary/25 text-(--brand-gleam) ring-primary/50' : 'text-white/40 ring-white/15',
              )}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <Icon name={tab.icon} size={14} className="shrink-0" />
            <span className="truncate">{translate(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Contest arena card: pool ring · details · ticket stub of actions ───────────── */

function PoolRing({ contest, currency }: { contest: IbContest; currency: string }) {
  const adminPercent = Math.min(100, Math.max(0, contest.adminSharePercent));
  const yourPercent = 100 - adminPercent;
  const gap = adminPercent > 0 && yourPercent > 0 ? 1.5 : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-44">
        <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full -rotate-90">
          <circle cx={60} cy={60} r={52} fill="none" strokeWidth={8} className="stroke-white/[0.07]" />
          <circle cx={60} cy={60} r={52} fill="none" strokeWidth={1} strokeDasharray="1 3" className="stroke-white/15" transform="scale(0.82) translate(13.2 13.2)" />
          {adminPercent > 0 && (
            <circle cx={60} cy={60} r={52} fill="none" strokeWidth={8} pathLength={100} strokeDasharray={`${adminPercent - gap} 100`} className="stroke-white/30 transition-[stroke-dasharray] duration-700" />
          )}
          {yourPercent > 0 && (
            <circle
              cx={60}
              cy={60}
              r={52}
              fill="none"
              strokeWidth={8}
              pathLength={100}
              strokeDasharray={`${yourPercent - gap} 100`}
              strokeDashoffset={-adminPercent}
              className="stroke-primary/75 transition-[stroke-dasharray] duration-700"
            />
          )}
        </svg>
        {/* A light lapping the track, like a runner in the arena. */}
        <span aria-hidden="true" className="absolute inset-[6px] animate-orbit [animation-duration:5s] motion-reduce:hidden">
          <span className={cx('absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full shadow-[0_0_10px_var(--brand-primary)]', goldFill)} />
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className={cx(eyebrow, 'text-white/45')}>{translate('ibContest.totalPool')}</span>
          <span className={cx('mt-1 font-mono text-xl leading-tight font-semibold break-all tabular-nums', goldText)}>{formatMoney(contest.totalPool, currency)}</span>
        </div>
      </div>
      <div aria-hidden="true" className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-white/30" />
          {adminPercent}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary/75" />
          {yourPercent}%
        </span>
      </div>
    </div>
  );
}

function ContestTicket({
  contest,
  currency,
  index,
  onEnrollments,
  onAddFund,
  onView,
}: {
  contest: IbContest;
  currency: string;
  index: number;
  onEnrollments: () => void;
  onAddFund: () => void;
  onView: () => void;
}) {
  const status = statusMeta[contest.status];
  const actionClass =
    'group/action relative inline-flex h-10 w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

  return (
    <article
      style={riseDelay(index + 1)}
      className="orbit-card group relative grid animate-rise overflow-hidden transition-shadow duration-300 hover:shadow-[0_28px_56px_-30px_var(--brand-primary)] motion-reduce:animate-none motion-reduce:transition-none md:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_12rem]"
    >
      {/* Stage: pool ring on graphite. */}
      <div className={cx('relative isolate flex flex-col gap-3 p-5 text-white', graphite)}>
        <Icon
          name="trophy"
          size={140}
          className="pointer-events-none absolute -right-8 -bottom-10 -z-10 rotate-12 text-white/[0.04] transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110 motion-reduce:transition-none"
        />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-(--brand-gleam) to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] font-semibold text-white/40 tabular-nums">#{String(index + 1).padStart(2, '0')}</span>
          <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase', status.chip)}>
            <span aria-hidden="true" className={cx('size-1.5 animate-twinkle rounded-full motion-reduce:animate-none', status.dot)} />
            {translate(status.labelKey)}
          </span>
        </div>
        <PoolRing contest={contest} currency={currency} />
      </div>

      {/* Details: name, entry terms and the pool split. */}
      <div className="flex min-w-0 flex-col gap-4 p-5 lg:p-6">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight text-fg">{contest.name}</h2>
          <p className="mt-1 truncate text-sm text-fg-muted">{contest.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            title={translate('ibContest.participants', { count: String(contest.participants) })}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 font-mono text-xs font-semibold text-fg ring-1 ring-line tabular-nums"
          >
            <Icon name="user" size={12} className="text-primary" />
            <span className="sr-only">{translate('ibContest.participants', { count: String(contest.participants) })}</span>
            <span aria-hidden="true">{contest.participants}</span>
          </span>
          <span title={translate('ibContest.entryFee')} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-fg ring-1 ring-line">
            <span aria-hidden="true" className="font-mono text-primary">
              $
            </span>
            <span className="sr-only">{translate('ibContest.entryFee')}:</span>
            {contest.entryFee > 0 ? formatMoney(contest.entryFee, currency) : translate('ibContest.free')}
          </span>
        </div>

        <dl className="mt-auto grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-2/60 p-3.5 ring-1 ring-line">
            <dt className="flex items-center gap-2 text-xs text-fg-muted">
              <span aria-hidden="true" className="size-2 rounded-full bg-fg-subtle/50" />
              {translate('ibContest.adminShare', { percent: String(contest.adminSharePercent) })}
            </dt>
            <dd className="mt-1.5 font-mono text-lg font-semibold text-fg tabular-nums">{formatMoney(contest.adminShare, currency)}</dd>
          </div>
          <div className="rounded-2xl bg-primary/[0.07] p-3.5 ring-1 ring-primary/25">
            <dt className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span aria-hidden="true" className="size-2 rounded-full bg-primary/75" />
              {translate('ibContest.yourShare')}
            </dt>
            <dd className="mt-1.5 font-mono text-lg font-bold text-primary tabular-nums">{formatMoney(contest.yourShare, currency)}</dd>
          </div>
        </dl>
      </div>

      {/* Ticket stub: perforated edge with punched notches, holding the actions. */}
      <div className="relative grid grid-cols-3 content-center gap-2 border-t-2 border-dashed border-line p-5 md:col-span-2 xl:col-span-1 xl:grid-cols-1 xl:border-t-0 xl:border-l-2">
        <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full border border-line bg-app xl:-left-[13px]" />
        <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full border border-line bg-app xl:top-auto xl:-bottom-3 xl:-left-[13px]" />
        <button type="button" onClick={onEnrollments} className={cx(actionClass, 'bg-surface-2 text-fg ring-1 ring-line hover:text-primary hover:ring-primary/50')}>
          <Icon name="user" size={13} />
          {translate('ibContest.enrollments')}
        </button>
        <button type="button" onClick={onAddFund} className={cx(actionClass, 'bg-surface-2 text-fg ring-1 ring-line hover:text-primary hover:ring-primary/50')}>
          <Icon name="crypto" size={13} />
          {translate('ibContest.addFund')}
        </button>
        <button type="button" onClick={onView} className={cx(actionClass, 'text-(--brand-on-primary) hover:shadow-[0_10px_22px_-10px_var(--brand-primary)]', goldFill)}>
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
          <Icon name="eye" size={13} className="relative transition-transform duration-300 group-hover/action:scale-125 motion-reduce:transition-none" />
          <span className="relative">{translate('ibContest.view')}</span>
        </button>
      </div>
    </article>
  );
}

/** Empty lane at the end of the list that opens the create flow. */
function OpenLane({ index, onCreate }: { index: number; onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      style={riseDelay(index + 1)}
      className="group flex w-full animate-rise items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-line px-5 py-6 text-sm font-semibold text-fg-muted transition-[border-color,color,background-color] duration-300 hover:border-primary/50 hover:bg-primary/[0.04] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
    >
      <span className="grid size-9 place-items-center rounded-full bg-surface-2 ring-1 ring-line transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none">
        <Icon name="plus" size={15} />
      </span>
      {translate('ibContest.create')}
    </button>
  );
}


/* ───────────── Page ───────────── */

export default function IbContestsPage() {
  const { data } = useIbContests();
  const [tab, setTab] = useState<TabId>('mine');
  const [isCreating, setIsCreating] = useState(false);
  const [viewing, setViewing] = useState<IbContest | null>(null);
  const [createdContests, setCreatedContests] = useState<IbContest[]>([]);
  const [createdMessage, setCreatedMessage] = useState('');
  const [addedFunds, setAddedFunds] = useState<Record<string, number>>({});
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState('');
  const idBase = useId();

  function openEnrollments(id: string) {
    setFocusId(id);
    setTab('enrollments');
  }

  function handleFunded(contest: IbContest, amount: number) {
    setAddedFunds((current) => ({ ...current, [contest.id]: (current[contest.id] ?? 0) + amount }));
    setFundingId(null);
    setCreatedMessage(translate('ibFund.added', { amount: formatMoney(amount, data?.currency ?? 'USD'), name: contest.name }));
  }

  function openCreate() {
    setCreatedMessage('');
    setViewing(null);
    setIsCreating(true);
    window.scrollTo({ top: 0 });
  }

  function openView(contest: IbContest) {
    setCreatedMessage('');
    setViewing(contest);
    window.scrollTo({ top: 0 });
  }

  // New contests start as drafts with an empty pool until admin approves and participants join.
  function handleCreated(draft: ContestDraft) {
    const contest: IbContest = {
      id: `CN-${Date.now()}`,
      name: draft.name.trim(),
      description: draft.tagline.trim(),
      status: 'draft',
      participants: 0,
      entryFee: 0,
      totalPool: 0,
      adminSharePercent: draft.adminSharePercent,
      adminShare: 0,
      yourShare: 0,
      details: draft,
    };
    setCreatedContests((current) => [contest, ...current]);
    setCreatedMessage(translate('ibCreate.created', { name: contest.name }));
    setTab('mine');
    setIsCreating(false);
    window.scrollTo({ top: 0 });
  }

  // Funding grows the pool; the admin keeps its percentage and the rest is the IB's share.
  const contests = [...createdContests, ...(data?.contests ?? [])].map((contest) => {
    const added = addedFunds[contest.id];
    if (!added) return contest;
    const totalPool = contest.totalPool + added;
    const adminShare = Math.round(totalPool * contest.adminSharePercent) / 100;
    return { ...contest, totalPool, adminShare, yourShare: totalPool - adminShare };
  });
  const fundingContest = contests.find((contest) => contest.id === fundingId) ?? null;
  const isListing = !isCreating && !viewing;
  const stats: ArenaStats | null = data
    ? {
        contests: contests.length,
        participants: contests.reduce((sum, contest) => sum + contest.participants, 0),
        totalPool: contests.reduce((sum, contest) => sum + contest.totalPool, 0),
        yourShare: contests.reduce((sum, contest) => sum + contest.yourShare, 0),
        currency: data.currency,
      }
    : null;

  return (
    <div className="space-y-5">
      <ArenaBanner stats={stats} onCreate={openCreate}>
        {isListing && <ContestTabs active={tab} onChange={setTab} idBase={idBase} />}
      </ArenaBanner>
      {isCreating ? (
        <CreateContestForm onCancel={() => setIsCreating(false)} onCreated={handleCreated} />
      ) : viewing ? (
        <CreateContestForm key={viewing.id} mode="view" initialDraft={viewing.details} onCancel={() => setViewing(null)} />
      ) : (
        <>
          {createdMessage && (
            <p role="status" className="flex animate-rise items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success ring-1 ring-success/30 motion-reduce:animate-none">
              <Icon name="checkCircle" size={16} />
              {createdMessage}
            </p>
          )}

      <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${tab}`}>
        {!data ? (
          <Skeleton className="h-72 rounded-[28px]" />
        ) : tab === 'mine' ? (
          <div className="space-y-5">
            {contests.map((contest, index) => (
              <ContestTicket
                key={contest.id}
                contest={contest}
                currency={data.currency}
                index={index}
                onEnrollments={() => openEnrollments(contest.id)}
                onAddFund={() => setFundingId(contest.id)}
                onView={() => openView(contest)}
              />
            ))}
            <OpenLane index={contests.length} onCreate={openCreate} />
          </div>
        ) : tab === 'enrollments' ? (
          <EnrollmentsPanel contests={contests} selectedId={focusId} onSelect={setFocusId} currency={data.currency} />
        ) : (
          <LeaderboardPanel contests={contests} selectedId={focusId} onSelect={setFocusId} currency={data.currency} />
        )}
      </div>
        </>
      )}
      <AddPrizeFundDialog contest={fundingContest} currency={data?.currency ?? 'USD'} onClose={() => setFundingId(null)} onFunded={handleFunded} />
    </div>
  );
}
