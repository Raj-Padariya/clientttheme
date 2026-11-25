'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
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

const stageIcons: Record<RequestStage, IconName> = {
  waiting: 'clock',
  broker: 'bank',
  approved: 'checkCircle',
  declined: 'xCircle',
};

// Colour of each stage's chip and count beads; the stage names and counts come from the data.
const stageTone: Record<RequestStage, { chip: string; bead: string }> = {
  waiting: { chip: 'bg-warning/12 text-warning ring-warning/30', bead: 'bg-warning' },
  broker: { chip: 'bg-fg/[0.06] text-fg ring-line-strong', bead: 'bg-white' },
  approved: { chip: 'bg-success/12 text-success ring-success/30', bead: 'bg-success' },
  declined: { chip: 'bg-danger/10 text-danger ring-danger/30', bead: 'bg-danger' },
};

const MAX_COUNT_BEADS = 12;
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Pipeline abacus: the four stages strung on one vertical wire, each with its count as beads ───────────── */

function StageStop({ stage, count, index, isLast }: { stage: RequestStage; count: number; index: number; isLast: boolean }) {
  const text = copy.stages[stage];
  const beads = Math.min(count, MAX_COUNT_BEADS);

  return (
    <li style={riseDelay(index)} className="group/stage relative flex animate-feed-in gap-4 pb-6 last:pb-0 motion-reduce:animate-none">
      {!isLast && <span aria-hidden="true" className="absolute top-12 bottom-0 left-6 border-l-2 border-dotted border-white/20" />}
      <span className="relative grid size-12 shrink-0 place-items-center">
        <span
          aria-hidden="true"
          className={cx('absolute inset-0 rounded-full border-2 border-dashed border-white/25', count > 0 ? 'animate-rim-spin motion-reduce:animate-none' : 'group-hover/stage:animate-rim-spin')}
        />
        <span className="grid size-9 place-items-center rounded-full bg-white text-[#0a1220]">
          <Icon name={stageIcons[stage]} size={15} />
        </span>
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-xs font-semibold text-white/60">{text.label}</span>
          <span key={count} className="animate-dot-pop font-mono text-2xl leading-none font-black tabular-nums motion-reduce:animate-none">
            {count}
          </span>
        </div>
        <span aria-hidden="true" className="mt-2 flex min-h-2.5 flex-wrap gap-1">
          {beads === 0 ? (
            <span className="size-2.5 rounded-full border-2 border-dashed border-white/25" />
          ) : (
            Array.from({ length: beads }, (_, bead) => (
              <span key={bead} style={{ animationDelay: `${index * 120 + bead * 50}ms` }} className={cx('size-2.5 animate-dot-pop rounded-full motion-reduce:animate-none', stageTone[stage].bead)} />
            ))
          )}
        </span>
        <span className="mt-1.5 block text-xs text-white/45">{text.hint}</span>
      </div>
    </li>
  );
}

function PipelineAbacus({ counts }: { counts: Record<RequestStage, number> }) {
  return (
    <section className={cx(inkClass, 'animate-rise p-5 motion-reduce:animate-none sm:p-6')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(180deg,#000,transparent_75%)]')} />
      <ul className="relative">
        {stageOrder.map((stage, index) => (
          <StageStop key={stage} stage={stage} count={counts[stage]} index={index} isLast={index === stageOrder.length - 1} />
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Tabs: bead pills, count bead only where something is there ───────────── */

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
    <div role="tablist" aria-label={copy.title} className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
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
              'group/tab inline-flex h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-bold whitespace-nowrap transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong',
            )}
          >
            <span className={cx('grid size-9 place-items-center rounded-full transition-transform duration-300 group-hover/tab:rotate-12', isActive ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
              <Icon name={item.icon} size={14} />
            </span>
            {item.label}
            {item.count > 0 ? (
              <span className={cx('grid h-7 min-w-7 place-items-center rounded-full px-1.5 font-mono text-[11px] font-black', isActive ? 'bg-app text-fg' : 'bg-fg/[0.06] text-fg')}>{item.count}</span>
            ) : (
              <span aria-hidden="true" className="w-1" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Request tickets ───────────── */

function RequestTicket({ request, index }: { request: SubIbRequest; index: number }) {
  const stageText = copy.stages[request.stage];
  const href = request.stage === 'approved' ? memberPageHref(request.memberId) : null;
  const facts = [request.email, copy.asked(request.askedAgo), ...(request.decidedOn ? [copy.decided(request.decidedOn)] : [])];
  const isWaiting = request.stage === 'waiting' || request.stage === 'broker';

  return (
    <li
      style={riseDelay(index)}
      className="group flex animate-feed-in flex-col gap-4 rounded-[26px] p-4 ring-1 ring-line transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:ring-line-strong motion-reduce:animate-none motion-reduce:transition-none sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="relative grid size-14 shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-dashed border-fg/25 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
          {isWaiting && <span aria-hidden="true" className="absolute inset-1 animate-ring-ripple rounded-full ring-2 ring-fg/15 motion-reduce:hidden" />}
          <span className="grid size-10 place-items-center rounded-full bg-fg text-base font-black text-app">{request.name.trim().charAt(0).toUpperCase()}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-base font-black text-fg">
            {request.name}
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', stageTone[request.stage].chip)}>
              <span aria-hidden="true" className={cx('size-1.5 rounded-full bg-current', isWaiting && 'animate-blink motion-reduce:animate-none')} />
              {stageText.badge}
            </span>
          </p>
          <ul className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
            {facts.map((fact, factIndex) => (
              <li key={fact} className="flex min-w-0 items-center gap-2">
                {factIndex > 0 && <span aria-hidden="true" className="size-1 rounded-full bg-fg/30" />}
                <span className="truncate">{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(request.plan || href) && (
        <div className="flex flex-col gap-3 border-t-2 border-dotted border-line-strong pt-3 sm:flex-row sm:items-center sm:justify-between">
          {request.plan ? (
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
          ) : (
            <span />
          )}
          {href && (
            <Link
              href={href}
              className="group/open inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-fg py-1 pr-1 pl-4 text-xs font-bold text-app transition-[translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:self-auto"
            >
              {copy.openPage}
              <span className="grid size-8 place-items-center rounded-full bg-app text-fg transition-transform group-hover/open:translate-x-0.5">
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
    <div className="flex flex-col items-center gap-4 px-4 py-14 text-center">
      <span aria-hidden="true" className="relative grid place-items-center">
        <span className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, dot) => (
            <span key={dot} style={{ animationDelay: `${(dot % 7) * 0.15}s` }} className="size-1.5 animate-blink rounded-full bg-fg/15 motion-reduce:animate-none" />
          ))}
        </span>
        <span className="absolute grid size-14 place-items-center rounded-full bg-fg text-app">
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
    <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        <header className="flex animate-feed-in items-start gap-4 motion-reduce:animate-none">
          <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-10 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
              <Icon name="user" size={17} />
            </span>
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{copy.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
          </div>
        </header>
        <PipelineAbacus counts={counts} />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <RequestTabs tab={tab} counts={counts} total={requests.length} onTab={setTab} />

        <section role="tabpanel" style={{ animationDelay: '120ms' }} className="orbit-card nova-edge-light relative animate-rise overflow-hidden p-4 motion-reduce:animate-none sm:p-5">
          {rows.length === 0 ? (
            <EmptyState title={empty.title} body={empty.body} />
          ) : (
            <ul key={tab} className="flex flex-col gap-3">
              {rows.map((request, index) => (
                <RequestTicket key={request.id} request={request} index={index} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
