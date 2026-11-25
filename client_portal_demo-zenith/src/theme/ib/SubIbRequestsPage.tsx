'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { memberPageHref } from './ibMemberOverviewData';
import {
  countByStage,
  mockSubIbRequests,
  stageOrder,
  subIbRequestsCopy as copy,
  type RequestStage,
  type RequestTab,
  type SubIbRequest,
} from './ibSubIbRequestsData';

/*
 * Zenith Sub-IB requests: the header carries a segmented ring of the four stages around the total, a stage ladder
 * rail sits on the left (capsule track per stage with a running red bead while it is pending), and on the right an
 * underline tab bar sits above a grid of request cards with a dotted fact timeline.
 */
const RED = 'var(--zenith-red)';
const RING_RADIUS = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_GAP = 4;
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';

const stageIcons: Record<RequestStage, IconName> = {
  waiting: 'clock',
  broker: 'bank',
  approved: 'checkCircle',
  declined: 'xCircle',
};

// Colour of each stage's chip, track fill and ring arc; the stage names and counts come from the data.
const stageTone: Record<RequestStage, { chip: string; fill: string; stroke: string }> = {
  waiting: { chip: 'bg-warning/12 text-warning ring-warning/30', fill: 'bg-warning', stroke: 'text-warning' },
  broker: { chip: 'bg-fg/[0.06] text-fg ring-line-strong', fill: 'bg-fg', stroke: 'text-fg' },
  approved: { chip: 'bg-success/12 text-success ring-success/30', fill: 'bg-success', stroke: 'text-success' },
  declined: { chip: 'bg-danger/10 text-danger ring-danger/30', fill: 'bg-danger', stroke: 'text-danger' },
};

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

// Tracks and arcs start empty and grow to their value after the first paint.
function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return grown;
}

function isPendingStage(stage: RequestStage) {
  return stage === 'waiting' || stage === 'broker';
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

/* ───────────── Stage ring: one thin arc per stage around the total ───────────── */

function StageRing({ counts, total }: { counts: Record<RequestStage, number>; total: number }) {
  const grown = useGrown();
  const filled = stageOrder.filter((stage) => counts[stage] > 0);
  const gap = filled.length > 1 ? RING_GAP : 0;
  const lengths = filled.map((stage) => (counts[stage] / total) * RING_CIRCUMFERENCE);
  const starts = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0));

  return (
    <div className="relative grid size-36 shrink-0 place-items-center sm:size-40">
      <svg viewBox="0 0 110 110" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="55" cy="55" r={RING_RADIUS} fill="none" strokeWidth="2" strokeDasharray="2 4" className="text-line-strong" stroke="currentColor" />
        {filled.map((stage, index) => {
          const arc = Math.max(lengths[index] - gap, 0);
          return (
            <circle
              key={stage}
              cx="55"
              cy="55"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${grown ? arc : 0} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={-starts[index]}
              style={{ transitionDelay: `${index * 180}ms` }}
              className={cx('transition-[stroke-dasharray] duration-1000 ease-out motion-reduce:transition-none', stageTone[stage].stroke)}
            />
          );
        })}
      </svg>
      {/* A red marker orbits the ring so it is never still. */}
      <span aria-hidden="true" className="absolute inset-0 animate-rim-spin [animation-duration:4s] motion-reduce:animate-none">
        <span style={{ background: RED }} className="absolute top-[3px] left-1/2 size-2.5 -translate-x-1/2 rounded-[3px] ring-2 ring-app" />
      </span>
      <div className="relative text-center">
        <span key={total} className="block animate-dot-pop font-mono text-5xl leading-none font-black tracking-tighter text-fg tabular-nums motion-reduce:animate-none">
          {total}
        </span>
        <span className={cx(captionClass, 'mt-1 block text-fg-subtle')}>{copy.all}</span>
      </div>
    </div>
  );
}

/* ───────────── Stage ladder: one rung per stage on a dashed spine ───────────── */

function StageRung({ stage, count, total, index }: { stage: RequestStage; count: number; total: number; index: number }) {
  const grown = useGrown();
  const text = copy.stages[stage];
  const isPending = isPendingStage(stage) && count > 0;
  const share = total > 0 ? count / total : 0;

  return (
    <li style={stagger(index, 90, 150)} className="group/rung zenith-tile relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
      <span className="relative z-10 grid size-11 place-items-center">
        {isPending && <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[14px] opacity-50 motion-reduce:hidden" />}
        <span
          style={isPending ? { background: RED } : undefined}
          className={cx(
            'relative grid size-11 place-items-center rounded-[14px] ring-4 ring-app transition-transform duration-300 group-hover/rung:-rotate-12 motion-reduce:transition-none',
            isPending ? 'text-white' : 'bg-fg text-app',
          )}
        >
          <Icon name={stageIcons[stage]} size={16} />
        </span>
      </span>
      <div className="min-w-0 pb-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-bold text-fg">{text.label}</span>
          <span key={count} className="animate-dot-pop font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums motion-reduce:animate-none">
            {count}
          </span>
        </div>
        <span aria-hidden="true" className="relative mt-2.5 block h-2 overflow-hidden rounded-full bg-fg/[0.07]">
          <span
            style={{ width: grown ? `${share * 100}%` : '0%', transitionDelay: `${index * 140}ms` }}
            className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none', stageTone[stage].fill)}
          />
          {isPending && (
            <span className="absolute inset-y-0 right-1 left-1">
              <span
                style={{ background: RED, animationDelay: `${index * 0.5}s` }}
                className="zenith-route absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] motion-reduce:hidden"
              />
            </span>
          )}
        </span>
        <span className="mt-1.5 block text-xs text-fg-subtle">{text.hint}</span>
      </div>
    </li>
  );
}

function StageLadder({ counts, total }: { counts: Record<RequestStage, number>; total: number }) {
  return (
    <section className="zenith-tile relative rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6">
      <span aria-hidden="true" className="absolute top-12 bottom-12 left-[43px] border-l-2 border-dashed border-line-strong sm:left-[47px]" />
      <ol aria-label={copy.title} className="relative flex flex-col gap-6">
        {stageOrder.map((stage, index) => (
          <StageRung key={stage} stage={stage} count={counts[stage]} total={total} index={index} />
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Tabs: underline bar, the active tab gets a red rule that grows in ───────────── */

function RequestTabs({ tab, counts, total, onTab }: {
  tab: RequestTab;
  counts: Record<RequestStage, number>;
  total: number;
  onTab: (tab: RequestTab) => void;
}) {
  const tabs: { id: RequestTab; label: string; count: number; icon: IconName }[] = [
    ...stageOrder.map((stage) => ({ id: stage as RequestTab, label: copy.stages[stage].label, count: counts[stage], icon: stageIcons[stage] })),
    { id: 'all', label: copy.all, count: total, icon: 'inbox' },
  ];

  return (
    <div role="tablist" aria-label={copy.title} className="flex gap-1 overflow-x-auto border-b border-dashed border-line-strong">
      {tabs.map((item) => {
        const isActive = item.id === tab;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTab(item.id)}
            className={cx(
              'group/tab relative inline-flex h-12 shrink-0 items-center gap-2 rounded-t-[14px] px-3 text-sm font-bold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'text-fg' : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={14} className={cx('transition-transform duration-300 group-hover/tab:-rotate-12', isActive ? 'text-fg' : 'text-fg-subtle')} />
            {item.label}
            {item.count > 0 && (
              <span
                style={isActive ? { background: RED } : undefined}
                className={cx('grid h-6 min-w-6 place-items-center rounded-[8px] px-1.5 font-mono text-[11px] font-black', isActive ? 'text-white' : 'bg-fg/[0.06] text-fg')}
              >
                {item.count}
              </span>
            )}
            <span
              aria-hidden="true"
              style={{ background: RED }}
              className={cx(
                'absolute inset-x-2 -bottom-px h-[3px] origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none',
                isActive ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Request cards ───────────── */

function RequestCard({ request, index }: { request: SubIbRequest; index: number }) {
  const stageText = copy.stages[request.stage];
  const href = request.stage === 'approved' ? memberPageHref(request.memberId) : null;
  const facts = [request.email, copy.asked(request.askedAgo), ...(request.decidedOn ? [copy.decided(request.decidedOn)] : [])];
  const isWaiting = isPendingStage(request.stage);

  return (
    <li
      style={stagger(index, 70)}
      className="group zenith-tile relative flex flex-col gap-4 overflow-hidden rounded-[28px] bg-fg/[0.02] p-5 ring-1 ring-line transition-[background-color,box-shadow] duration-300 hover:bg-fg/[0.04] hover:ring-line-strong motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:10px_10px] text-fg/[0.12] [mask-image:linear-gradient(200deg,#000,transparent_55%)]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="relative grid size-14 shrink-0 place-items-center">
          <span className="grid size-14 place-items-center rounded-[18px] bg-fg text-xl font-black text-app transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
            {request.name.trim().charAt(0).toUpperCase()}
          </span>
          {isWaiting && (
            <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-3">
              <span style={{ background: RED }} className="absolute inset-0 animate-ping-soft rounded-[3px] motion-reduce:hidden" />
              <span style={{ background: RED }} className="relative size-3 rounded-[3px] ring-2 ring-app" />
            </span>
          )}
        </span>
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', stageTone[request.stage].chip)}>
          <span aria-hidden="true" className={cx('size-1.5 rounded-[2px] bg-current', isWaiting && 'zenith-blink')} />
          {stageText.badge}
        </span>
      </div>

      <div className="relative min-w-0">
        <p className="truncate text-lg font-black tracking-[-0.01em] text-fg">{request.name}</p>
        <ol className="relative mt-3 flex flex-col gap-2 text-xs text-fg-muted">
          <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 left-[3px] border-l border-dashed border-line-strong" />
          {facts.map((fact, factIndex) => (
            <li key={fact} className="relative flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                style={factIndex === facts.length - 1 && isWaiting ? { background: RED } : undefined}
                className={cx('size-[7px] shrink-0 rounded-[2px]', factIndex === facts.length - 1 && isWaiting ? 'zenith-blink' : 'bg-fg/40')}
              />
              <span className="truncate">{fact}</span>
            </li>
          ))}
        </ol>
      </div>

      {(request.plan || href) && (
        <div className="relative mt-auto flex flex-col gap-3 border-t border-dashed border-line-strong pt-4">
          {request.plan && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
              <span className="font-bold text-fg">{stageText.badge}</span> {copy.onThePlan}{' '}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.05] py-0.5 pr-2.5 pl-1 font-mono text-fg ring-1 ring-line">
                <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-fg text-app">
                  <Icon name="trophy" size={10} />
                </span>
                {request.plan}
              </span>
              .
            </p>
          )}
          {href && (
            <Link
              href={href}
              className="group/open inline-flex h-10 w-fit items-center gap-2 rounded-full bg-fg py-1 pr-1 pl-4 text-xs font-bold text-app transition-[translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copy.openPage}
              <span style={{ background: RED }} className="grid size-8 place-items-center rounded-full text-white transition-transform group-hover/open:translate-x-0.5">
                <Icon name="arrowRight" size={13} />
              </span>
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-[28px] border border-dashed border-line-strong px-4 py-14 text-center">
      <span aria-hidden="true" className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/20 motion-reduce:animate-none" />
        <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
          <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 rounded-[3px]" />
        </span>
        <span className="absolute inset-4 animate-ring-ripple rounded-full ring-2 ring-fg/10 motion-reduce:hidden" />
        <span className="grid size-14 place-items-center rounded-[18px] bg-fg text-app">
          <Icon name="inbox" size={20} />
        </span>
      </span>
      <p className="text-base font-black text-fg">{title}</p>
      <p className="max-w-md text-sm text-fg-muted">{body}</p>
    </div>
  );
}

export default function SubIbRequestsPage() {
  const [tab, setTab] = useState<RequestTab>('waiting');
  const requests = mockSubIbRequests;
  const counts = countByStage(requests);
  const rows = tab === 'all' ? requests : requests.filter((request) => request.stage === tab);
  const empty = tab === 'all' ? { title: copy.allEmptyTitle, body: copy.allEmptyBody } : { title: copy.stages[tab].emptyTitle, body: copy.stages[tab].emptyBody };

  return (
    <div className="space-y-6">
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-fg/[0.04] py-1 pr-3 pl-1 text-xs font-bold text-fg-muted ring-1 ring-line">
              <span className="grid size-6 place-items-center rounded-full bg-fg text-app">
                <Icon name="user" size={12} />
              </span>
              <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
              {copy.stages.waiting.label} · {counts.waiting}
            </span>
            <h1 className="mt-3 text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
          </div>
          <StageRing counts={counts} total={requests.length} />
        </div>
        <RedRule />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6">
          <StageLadder counts={counts} total={requests.length} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <RequestTabs tab={tab} counts={counts} total={requests.length} onTab={setTab} />

          <section role="tabpanel" style={{ animationDelay: '120ms' }} className="zenith-tile">
            {rows.length === 0 ? (
              <EmptyState title={empty.title} body={empty.body} />
            ) : (
              <ul key={tab} className="grid gap-4 md:grid-cols-2">
                {rows.map((request, index) => (
                  <RequestCard key={request.id} request={request} index={index} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
