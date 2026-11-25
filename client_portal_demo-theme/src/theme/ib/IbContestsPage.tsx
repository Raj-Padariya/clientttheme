'use client';

import { useId, useState, type CSSProperties } from 'react';
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

const graphite = 'bg-[#18181b]';
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
  active: { labelKey: 'ibContest.statusActive', chip: 'border-emerald-400/50 text-emerald-300', dot: 'bg-emerald-400' },
  ended: { labelKey: 'ibContest.statusEnded', chip: 'border-white/15 text-white/45', dot: 'bg-white/40' },
};

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 90}ms` };
}

/* ───────────── Arena rail: title, create and the three tabs stacked down one graphite column ───────────── */

function ArenaRail({ active, onChange, onCreate, idBase }: { active: TabId; onChange: (tab: TabId) => void; onCreate: () => void; idBase: string }) {
  return (
    <aside className={cx('relative isolate flex animate-rise flex-col gap-6 overflow-hidden rounded-3xl p-5 text-white ring-1 ring-primary/30 motion-reduce:animate-none lg:sticky lg:top-24', graphite)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-80 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_24%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      {['top-6 right-8 [animation-delay:0s]', 'top-20 right-16 [animation-delay:-1.2s]', 'bottom-24 right-6 [animation-delay:-2.2s]'].map((position) => (
        <Icon key={position} name="bolt" size={10} className={cx('pointer-events-none absolute animate-twinkle text-primary motion-reduce:hidden', position)} />
      ))}

      <div className="flex items-center gap-3.5">
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="absolute -inset-1 animate-orbit rounded-xl bg-[conic-gradient(from_0deg,var(--brand-gleam),transparent_35%,transparent_60%,var(--brand-accent),var(--brand-gleam))] [animation-duration:5s] motion-reduce:animate-none"
          />
          <span className={cx('relative grid size-full place-items-center rounded-xl text-(--brand-gleam) ring-2 ring-[#18181b]', graphite)}>
            <Icon name="trophy" size={21} className="animate-float motion-reduce:animate-none" />
          </span>
        </span>
        <h1 className="text-xl font-semibold tracking-tight">{translate('ibContest.title')}</h1>
      </div>

      <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1.5">
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
                'group relative flex h-12 items-center gap-3 overflow-hidden rounded-xl px-3 text-left text-sm font-semibold transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                isActive ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              <span
                aria-hidden="true"
                className={cx('absolute inset-y-2 left-0 w-1 rounded-r-full transition-transform duration-300 motion-reduce:transition-none', goldFill, isActive ? 'scale-y-100' : 'scale-y-0')}
              />
              <span
                className={cx(
                  'grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300',
                  isActive ? cx('text-[#18181b]', goldFill) : 'bg-white/[0.06] text-(--brand-gleam)',
                )}
              >
                <Icon name={tab.icon} size={14} />
              </span>
              <span className="min-w-0 flex-1 truncate">{translate(tab.labelKey)}</span>
              <span className="font-mono text-[10px] text-white/30">{String(index + 1).padStart(2, '0')}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCreate}
        className={cx(
          'group relative mt-auto inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold text-[#18181b] transition-[box-shadow,filter] duration-300 hover:shadow-[0_14px_30px_-12px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          goldFill,
        )}
      >
        <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
        <Icon name="plus" size={15} className="relative transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
        <span className="relative">{translate('ibContest.create')}</span>
      </button>
    </aside>
  );
}

/* ───────────── Contest strip: identity on graphite, pool ring in the middle, actions on the right ───────────── */

const POOL_RADIUS = 40;
const POOL_CIRCUMFERENCE = 2 * Math.PI * POOL_RADIUS;

function PoolRing({ adminPercent }: { adminPercent: number }) {
  const gradientId = `${useId()}-pool`;
  const yourLength = POOL_CIRCUMFERENCE * ((100 - adminPercent) / 100);
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="size-24 shrink-0 -rotate-90">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--brand-gleam)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--brand-accent)' }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={POOL_RADIUS} fill="none" strokeWidth="10" className="stroke-fg/70" />
      <circle
        cx="50"
        cy="50"
        r={POOL_RADIUS}
        fill="none"
        strokeWidth="10"
        stroke={`url(#${gradientId})`}
        strokeDasharray={`${yourLength} ${POOL_CIRCUMFERENCE}`}
      />
    </svg>
  );
}

function ContestStrip({
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
  const adminPercent = Math.min(100, Math.max(0, contest.adminSharePercent));
  const actionClass =
    'group/action relative inline-flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-xl px-3 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

  return (
    <article
      style={riseDelay(index + 1)}
      className="group grid animate-rise overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-[box-shadow,border-color] duration-300 hover:border-primary/50 hover:shadow-[0_28px_56px_-30px_var(--brand-primary)] motion-reduce:animate-none md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_11rem]"
    >
      {/* Identity: name, status and entry terms on graphite. */}
      <div className={cx('relative isolate flex flex-col overflow-hidden p-5 text-white', graphite)}>
        <Icon
          name="trophy"
          size={110}
          className="pointer-events-none absolute -right-5 -bottom-8 -z-10 rotate-12 text-white/[0.05] transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110 motion-reduce:transition-none"
        />
        <span className={cx('inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase', status.chip)}>
          <span aria-hidden="true" className={cx('size-1.5 animate-twinkle rounded-full motion-reduce:animate-none', status.dot)} />
          {translate(status.labelKey)}
        </span>
        <h2 className="mt-3 truncate text-lg font-semibold tracking-tight">{contest.name}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-white/55">{contest.description}</p>

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <span
            title={translate('ibContest.participants', { count: String(contest.participants) })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1 font-mono text-xs font-semibold ring-1 ring-white/10 tabular-nums"
          >
            <Icon name="user" size={12} className="text-(--brand-gleam)" />
            <span className="sr-only">{translate('ibContest.participants', { count: String(contest.participants) })}</span>
            <span aria-hidden="true">{contest.participants}</span>
          </span>
          <span title={translate('ibContest.entryFee')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1 text-xs font-semibold ring-1 ring-white/10">
            <span aria-hidden="true" className="font-mono text-(--brand-gleam)">
              $
            </span>
            <span className="sr-only">{translate('ibContest.entryFee')}:</span>
            {contest.entryFee > 0 ? formatMoney(contest.entryFee, currency) : translate('ibContest.free')}
          </span>
        </div>
      </div>

      {/* Prize pool as a ring split between admin (graphite) and you (gold). */}
      <div className="flex items-center gap-5 p-5">
        <PoolRing adminPercent={adminPercent} />
        <div className="min-w-0 flex-1">
          <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibContest.totalPool')}</p>
          <p className={cx('mt-1 truncate font-mono text-2xl font-semibold tabular-nums', goldText)}>{formatMoney(contest.totalPool, currency)}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex min-w-0 items-center gap-2 truncate text-fg-muted">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-sm bg-fg/70" />
                {translate('ibContest.adminShare', { percent: String(contest.adminSharePercent) })}
              </dt>
              <dd className="font-mono font-semibold text-fg tabular-nums">{formatMoney(contest.adminShare, currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex min-w-0 items-center gap-2 truncate font-semibold text-primary">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-sm', goldFill)} />
                {translate('ibContest.yourShare')}
              </dt>
              <dd className="font-mono font-bold text-primary tabular-nums">{formatMoney(contest.yourShare, currency)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line p-4 md:col-span-2 xl:col-span-1 xl:grid-cols-1 xl:content-center xl:border-t-0 xl:border-l">
        <button type="button" onClick={onEnrollments} className={cx(actionClass, 'bg-surface-2 text-fg ring-1 ring-line hover:text-primary hover:ring-primary/50')}>
          <Icon name="user" size={13} />
          {translate('ibContest.enrollments')}
        </button>
        <button type="button" onClick={onAddFund} className={cx(actionClass, 'bg-surface-2 text-fg ring-1 ring-line hover:text-primary hover:ring-primary/50')}>
          <Icon name="crypto" size={13} />
          {translate('ibContest.addFund')}
        </button>
        <button type="button" onClick={onView} className={cx(actionClass, 'text-[#18181b] hover:shadow-[0_10px_22px_-10px_var(--brand-primary)]', goldFill)}>
          <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
          <Icon name="eye" size={13} className="relative transition-transform duration-300 group-hover/action:scale-125 motion-reduce:transition-none" />
          <span className="relative">{translate('ibContest.view')}</span>
        </button>
      </div>
    </article>
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

  // Picking a tab from the rail also leaves the create/view form, so the rail always does what it says.
  function selectTab(next: TabId) {
    setIsCreating(false);
    setViewing(null);
    setTab(next);
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <ArenaRail active={tab} onChange={selectTab} onCreate={openCreate} idBase={idBase} />
      <div className="min-w-0 space-y-5">
        {isCreating ? (
          <CreateContestForm onCancel={() => setIsCreating(false)} onCreated={handleCreated} />
        ) : viewing ? (
          <CreateContestForm key={viewing.id} mode="view" initialDraft={viewing.details} onCancel={() => setViewing(null)} />
        ) : (
          <>
            {createdMessage && (
              <p role="status" className="flex animate-rise items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 ring-1 ring-emerald-500/30 motion-reduce:animate-none">
                <Icon name="checkCircle" size={16} />
                {createdMessage}
              </p>
            )}

            <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${tab}`}>
              {!data ? (
                <div className="space-y-4">
                  <Skeleton className="h-52 rounded-3xl" />
                  <Skeleton className="h-52 rounded-3xl" />
                </div>
              ) : tab === 'mine' ? (
                <div className="flex flex-col gap-4">
                  {contests.map((contest, index) => (
                    <ContestStrip
                      key={contest.id}
                      contest={contest}
                      currency={data.currency}
                      index={index}
                      onEnrollments={() => openEnrollments(contest.id)}
                      onAddFund={() => setFundingId(contest.id)}
                      onView={() => openView(contest)}
                    />
                  ))}
                </div>
              ) : tab === 'enrollments' ? (
                <EnrollmentsPanel contests={contests} selectedId={focusId} onSelect={setFocusId} currency={data.currency} />
              ) : (
                <LeaderboardPanel contests={contests} selectedId={focusId} onSelect={setFocusId} currency={data.currency} />
              )}
            </div>
          </>
        )}
      </div>
      <AddPrizeFundDialog contest={fundingContest} currency={data?.currency ?? 'USD'} onClose={() => setFundingId(null)} onFunded={handleFunded} />
    </div>
  );
}
