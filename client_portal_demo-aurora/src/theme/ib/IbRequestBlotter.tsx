import Link from 'next/link';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { memberPageHref } from './ibMemberOverviewData';
import { stageOrder, subIbRequestsCopy as copy, type RequestStage, type RequestTab, type SubIbRequest } from './ibSubIbRequestsData';
import { ACCENT, boardClass, firstLetter, isPendingStage, stageIcons, stageTone, stagger } from './ibSubIbRequestsKit';

/*
 * Order blotter: a status filter tray on top, then one blotter row per request — partner, status chip + plan,
 * the asked → decided route, and the open-page action once they are approved.
 */
type Counts = Record<RequestStage, number>;

function StatusFilter({ tab, counts, total, onTab }: { tab: RequestTab; counts: Counts; total: number; onTab: (tab: RequestTab) => void }) {
  const tabs: { id: RequestTab; label: string; count: number; icon: IconName }[] = [
    ...stageOrder.map((stage) => ({ id: stage as RequestTab, label: copy.stages[stage].label, count: counts[stage], icon: stageIcons[stage] })),
    { id: 'all', label: copy.all, count: total, icon: 'inbox' },
  ];

  return (
    <div role="tablist" aria-label={copy.title} className="flex min-w-0 gap-1 overflow-x-auto rounded-[14px] bg-fg/[0.04] p-1 ring-1 ring-line">
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
              'group/tab inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[13px] font-bold whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              isActive ? 'bg-fg text-app shadow-sm' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg',
            )}
          >
            <Icon name={item.icon} size={14} className="transition-transform duration-300 group-hover/tab:scale-110" />
            {item.label}
            {item.count > 0 && (
              <span
                style={isActive ? { background: ACCENT } : undefined}
                className={cx('grid h-5 min-w-5 place-items-center rounded-[6px] px-1 font-mono text-[10.5px] font-black tabular-nums', isActive ? 'text-white' : 'bg-fg/[0.07] text-fg')}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RequestRow({ request, index }: { request: SubIbRequest; index: number }) {
  const stageText = copy.stages[request.stage];
  const href = request.stage === 'approved' ? memberPageHref(request.memberId) : null;
  const isLive = isPendingStage(request.stage);
  const steps = [copy.asked(request.askedAgo), ...(request.decidedOn ? [copy.decided(request.decidedOn)] : [])];

  return (
    <li
      style={stagger(index, 80, 120)}
      className="group grid animate-feed-in gap-4 px-4 py-4 transition-colors duration-300 hover:bg-fg/[0.03] motion-reduce:animate-none sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center rounded-[14px] bg-fg text-lg font-black text-app transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
          {firstLetter(request.name)}
          {isLive && (
            <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-3">
              <span style={{ background: ACCENT }} className="absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden" />
              <span style={{ background: ACCENT }} className="relative size-3 rounded-full ring-2 ring-surface" />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black text-fg">{request.name}</p>
          <p className="truncate text-xs text-fg-subtle">{request.email}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 pl-15 lg:pl-0">
        <span className={cx('inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px] font-bold ring-1', stageTone[request.stage].chip)}>
          <Icon name={stageIcons[request.stage]} size={12} />
          {stageText.badge}
          {isLive && <span aria-hidden="true" className="isr-blink size-1.5 rounded-full bg-current" />}
        </span>
        {request.plan && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
            {copy.onThePlan}
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-[8px] bg-fg/[0.05] py-0.5 pr-2 pl-0.5 font-mono text-fg ring-1 ring-line">
              <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-[6px] bg-fg text-app">
                <Icon name="trophy" size={10} />
              </span>
              <span className="truncate">{request.plan}</span>
            </span>
          </span>
        )}
      </div>

      <ol className="flex min-w-0 flex-wrap items-center gap-2 pl-15 text-xs text-fg-muted lg:pl-0">
        {steps.map((step, stepIndex) => {
          const isLast = stepIndex === steps.length - 1;
          const isPulse = isLast && isLive;
          return (
            <li key={step} className="flex min-w-0 items-center gap-2">
              {stepIndex > 0 && <span aria-hidden="true" className="h-0.5 w-6 shrink-0 rounded-full bg-line-strong" />}
              <span
                aria-hidden="true"
                style={isPulse ? { background: ACCENT } : undefined}
                className={cx('size-2 shrink-0 rounded-full', isPulse && 'isr-blink', !isPulse && (isLast ? stageTone[request.stage].fill : 'bg-fg/40'))}
              />
              <span className="truncate">{step}</span>
            </li>
          );
        })}
      </ol>

      <div className="flex pl-15 lg:justify-end lg:pl-0">
        {href && (
          <Link
            href={href}
            className="group/open inline-flex h-10 w-fit items-center gap-2 rounded-[12px] bg-fg py-1 pr-1 pl-4 text-xs font-bold text-app transition-[translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copy.openPage}
            <span style={{ background: ACCENT }} className="grid size-8 place-items-center rounded-[9px] text-white transition-transform group-hover/open:translate-x-0.5">
              <Icon name="arrowRight" size={13} />
            </span>
          </Link>
        )}
      </div>
    </li>
  );
}

function EmptyBook({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <svg viewBox="0 0 160 40" aria-hidden="true" className="h-10 w-40 text-fg/25">
        <path d="M2 30 L30 30 L42 18 L58 26 L74 10 L92 22 L110 22 L126 14 L156 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="isr-draw" />
        <circle cx="156" cy="14" r="3.5" style={{ fill: ACCENT }} className="isr-blink" />
      </svg>
      <span className="grid size-12 place-items-center rounded-[14px] bg-fg text-app">
        <Icon name="inbox" size={18} />
      </span>
      <p className="text-base font-black text-fg">{title}</p>
      <p className="max-w-md text-sm text-fg-muted">{body}</p>
    </div>
  );
}

export function RequestBlotter({ tab, counts, requests, onTab }: { tab: RequestTab; counts: Counts; requests: SubIbRequest[]; onTab: (tab: RequestTab) => void }) {
  const rows = tab === 'all' ? requests : requests.filter((request) => request.stage === tab);
  const empty = tab === 'all' ? { title: copy.allEmptyTitle, body: copy.allEmptyBody } : { title: copy.stages[tab].emptyTitle, body: copy.stages[tab].emptyBody };

  return (
    <section style={{ animationDelay: '140ms' }} className={cx(boardClass, 'animate-rise motion-reduce:animate-none')}>
      <div className="relative flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <StatusFilter tab={tab} counts={counts} total={requests.length} onTab={onTab} />
        <span className="flex shrink-0 items-center gap-2 px-1 text-xs text-fg-muted">
          <span aria-hidden="true" style={{ background: ACCENT }} className="isr-blink size-1.5 rounded-full" />
          <span className="font-mono font-black text-fg tabular-nums">{rows.length}</span>/ {requests.length}
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <span style={{ background: ACCENT }} className="isr-scan block h-full w-1/4" />
        </span>
      </div>

      <div role="tabpanel">
        {rows.length === 0 ? (
          <EmptyBook title={empty.title} body={empty.body} />
        ) : (
          <ul key={tab} className="divide-y divide-line">
            {rows.map((request, index) => (
              <RequestRow key={request.id} request={request} index={index} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
