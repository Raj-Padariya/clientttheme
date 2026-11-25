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

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
}

/* ───────────── Pipeline rail: the four stages a request moves through, as summary tiles ───────────── */

function StageTile({ stage, count, index }: { stage: RequestStage; count: number; index: number }) {
  const text = copy.stages[stage];
  return (
    <li style={riseDelay(index)} className="flex animate-rise items-center gap-4 rounded-2xl bg-surface-2/30 p-4 ring-1 ring-line motion-reduce:animate-none">
      <span className="relative grid size-12 shrink-0 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-primary/45 motion-safe:animate-orbit [animation-duration:5s]" />
        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon name={stageIcons[stage]} size={16} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-fg-subtle">{text.label}</span>
        <span className="block font-mono text-2xl leading-tight font-bold text-fg tabular-nums">{count}</span>
        <span className="block text-sm text-fg-muted">{text.hint}</span>
      </span>
    </li>
  );
}

function PipelineRail({ counts }: { counts: Record<RequestStage, number> }) {
  return (
    <ul className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-8 left-8 hidden h-px border-t border-dashed border-primary/25 xl:block" />
      {stageOrder.map((stage, index) => (
        <StageTile key={stage} stage={stage} count={counts[stage]} index={index} />
      ))}
    </ul>
  );
}

/* ───────────── Tabs: segmented pill bar, count chip only where something is there ───────────── */

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
    <div role="tablist" aria-label={copy.title} className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-surface-2/40 p-1 ring-1 ring-line sm:w-fit">
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
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              isActive ? 'bg-primary/20 text-fg ring-1 ring-primary/50' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
            {item.count > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary/15 px-1.5 font-mono text-[11px] text-primary ring-1 ring-primary/40">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Requests ───────────── */

function RequestCard({ request, index }: { request: SubIbRequest; index: number }) {
  const stageText = copy.stages[request.stage];
  const href = request.stage === 'approved' ? memberPageHref(request.memberId) : null;
  const facts = [request.email, copy.asked(request.askedAgo), ...(request.decidedOn ? [copy.decided(request.decidedOn)] : [])];

  return (
    <li style={riseDelay(index)} className="flex animate-rise flex-col gap-4 rounded-2xl bg-surface-2/40 p-4 ring-1 ring-line motion-reduce:animate-none sm:flex-row sm:items-center sm:p-5">
      <span className="relative grid size-12 shrink-0 place-items-center">
        <span
          aria-hidden="true"
          className="absolute -inset-0.5 animate-orbit rounded-full bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_45%,transparent_70%,var(--brand-primary))] [animation-duration:4s] motion-reduce:animate-none"
        />
        <span className="relative grid size-full place-items-center rounded-full bg-primary/25 text-base font-bold text-primary ring-4 ring-surface">
          {request.name.trim().charAt(0).toUpperCase()}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-base font-bold text-fg">
          {request.name}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/40">
            <Icon name={stageIcons[request.stage]} size={11} />
            {stageText.badge}
          </span>
        </p>
        <p className="mt-0.5 truncate text-xs text-fg-subtle">{facts.join(' · ')}</p>
      </div>

      {(request.plan || href) && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface/60 px-4 py-3 ring-1 ring-line sm:items-end">
          {request.plan && (
            <p className="text-xs text-fg-muted">
              <span className="font-semibold text-primary">{stageText.badge}</span> {copy.onThePlan}{' '}
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-fg italic">{request.plan}</span>.
            </p>
          )}
          {href && (
            <Link
              href={href}
              className="group/open inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {copy.openPage}
              <Icon name="arrowRight" size={13} className="transition-transform group-hover/open:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="relative grid size-16 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-primary/40 motion-safe:animate-orbit [animation-duration:6s]" />
        <span aria-hidden="true" className="absolute inset-3 rounded-full bg-primary/10" />
        <Icon name="inbox" size={22} className="relative text-primary" />
      </span>
      <p className="text-base font-bold text-fg">{title}</p>
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
        <p className="text-sm text-fg-muted">{copy.subtitle}</p>
      </header>

      <PipelineRail counts={counts} />

      <RequestTabs tab={tab} counts={counts} total={requests.length} onTab={setTab} />

      <section role="tabpanel" className="orbit-card p-4 sm:p-5">
        {rows.length === 0 ? (
          <EmptyState title={empty.title} body={empty.body} />
        ) : (
          <ul key={tab} className="flex flex-col gap-3">
            {rows.map((request, index) => (
              <RequestCard key={request.id} request={request} index={index} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
