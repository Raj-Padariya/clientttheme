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

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';

const stageIcons: Record<RequestStage, IconName> = {
  waiting: 'clock',
  broker: 'bank',
  approved: 'checkCircle',
  declined: 'xCircle',
};

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
}

/* ───────────── Stage pipeline: one graphite strip, a station per stage joined by arrows ───────────── */

function StageTiles({ counts }: { counts: Record<RequestStage, number> }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[#18181b] text-white ring-1 ring-primary/30">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 -z-10 size-72 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_22%,transparent),transparent_68%)] motion-reduce:animate-none"
      />
      <ol className="grid sm:grid-cols-2 xl:grid-cols-4">
        {stageOrder.map((stage, index) => {
          const text = copy.stages[stage];
          const isLead = index === 0;
          return (
            <li
              key={stage}
              style={riseDelay(index)}
              className={cx(
                'relative flex animate-rise flex-col gap-2 p-5 motion-reduce:animate-none',
                index > 0 && 'border-t border-white/10 sm:border-t-0',
                index % 2 === 1 && 'sm:border-l sm:border-white/10',
                index >= 2 && 'sm:border-t sm:border-white/10 xl:border-t-0',
                index === 2 && 'xl:border-l',
              )}
            >
              {index > 0 && (
                <span aria-hidden="true" className="absolute top-1/2 -left-3 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full bg-[#18181b] text-white/40 ring-1 ring-white/10 xl:grid">
                  <Icon name="chevronRight" size={12} />
                </span>
              )}
              <span className="flex items-center gap-2.5">
                <span className={cx('grid size-8 place-items-center rounded-lg', isLead ? 'bg-primary/25 text-(--brand-gleam)' : 'bg-white/[0.06] text-white/60')}>
                  <Icon name={stageIcons[stage]} size={14} />
                </span>
                <span className={cx('text-xs font-semibold', isLead ? 'text-(--brand-gleam)' : 'text-white/60')}>{text.label}</span>
                <span className="ml-auto font-mono text-[10px] text-white/30">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span className={cx('font-mono text-4xl font-semibold tabular-nums', isLead ? 'text-(--brand-gleam)' : 'text-white')}>{counts[stage]}</span>
              <span className="text-xs text-white/55">{text.hint}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ───────────── Tabs: segmented pill bar, count tag only where something is there ───────────── */

function RequestTabs({ tab, counts, total, onTab }: {
  tab: RequestTab;
  counts: Record<RequestStage, number>;
  total: number;
  onTab: (tab: RequestTab) => void;
}) {
  const tabs: { id: RequestTab; label: string; count: number }[] = [
    ...stageOrder.map((stage) => ({ id: stage as RequestTab, label: copy.stages[stage].label, count: counts[stage] })),
    { id: 'all', label: copy.all, count: total },
  ];

  return (
    <div role="tablist" aria-label={copy.title} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface p-1 shadow-card ring-1 ring-line">
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
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-[#18181b] text-white' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
            {item.count > 0 && (
              <span className={cx('rounded-md px-1.5 font-mono text-[11px] font-bold', isActive ? 'bg-primary text-primary-fg' : 'bg-primary/10 text-primary')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Requests: request cards, decision note in a dashed footer ───────────── */

function RequestEntry({ request, index }: { request: SubIbRequest; index: number }) {
  const stageText = copy.stages[request.stage];
  const href = request.stage === 'approved' ? memberPageHref(request.memberId) : null;
  const facts = [request.email, copy.asked(request.askedAgo), ...(request.decidedOn ? [copy.decided(request.decidedOn)] : [])];

  return (
    <li
      style={riseDelay(index)}
      className="flex animate-rise flex-col overflow-hidden rounded-2xl border border-line bg-surface-2/40 transition-colors hover:border-primary/40 motion-reduce:animate-none"
    >
      <div className="flex items-start gap-3.5 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#18181b] font-mono text-lg font-bold text-(--brand-gleam) ring-1 ring-primary/30">
          {request.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-fg">
            <span className="truncate">{request.name}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/30">
              <Icon name={stageIcons[request.stage]} size={10} />
              {stageText.badge}
            </span>
          </p>
          <p className="mt-1 text-xs break-words text-fg-subtle">{facts.join(' · ')}</p>
        </div>
      </div>
      {(request.plan || href) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line px-4 py-3">
          {request.plan && (
            <p className="text-sm text-fg-muted">
              <span className="font-semibold text-fg">{stageText.badge}</span> {copy.onThePlan} <span className="font-semibold text-primary italic">{request.plan}</span>.
            </p>
          )}
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-lg bg-[#18181b] px-3 py-1.5 text-xs font-semibold text-(--brand-gleam) ring-1 ring-primary/30 transition-colors hover:ring-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {copy.openPage}
              <Icon name="arrowRight" size={12} />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

export default function SubIbRequestsPage() {
  const [tab, setTab] = useState<RequestTab>('waiting');
  const requests = mockSubIbRequests;
  const counts = countByStage(requests);
  const rows = tab === 'all' ? requests : requests.filter((request) => request.stage === tab);
  const heading = tab === 'all' ? copy.all : copy.stages[tab].label;
  const empty = tab === 'all' ? { title: copy.allEmptyTitle, body: copy.allEmptyBody } : { title: copy.stages[tab].emptyTitle, body: copy.stages[tab].emptyBody };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 border-l-4 border-primary pl-4">
        <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
        <p className="text-sm text-fg-muted">{copy.subtitle}</p>
      </header>

      <StageTiles counts={counts} />

      <div className="flex flex-col gap-5">
        <RequestTabs tab={tab} counts={counts} total={requests.length} onTab={setTab} />

        <section role="tabpanel" aria-label={heading} className={cx(cardClass, 'flex flex-col gap-5 p-5 sm:p-6')}>
          <h2 className="flex items-center gap-3 text-sm font-semibold text-fg">
            {heading}
            <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-primary ring-1 ring-line">{rows.length}</span>
          </h2>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-12 text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-[#18181b] text-(--brand-gleam) ring-1 ring-primary/30">
                <Icon name="inbox" size={20} />
              </span>
              <p className="text-base font-bold text-fg">{empty.title}</p>
              <p className="max-w-md text-sm text-fg-muted">{empty.body}</p>
            </div>
          ) : (
            <ul key={tab} className="grid gap-3 md:grid-cols-2">
              {rows.map((request, index) => (
                <RequestEntry key={request.id} request={request} index={index} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
