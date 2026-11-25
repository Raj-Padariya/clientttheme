'use client';

import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { RequestBlotter } from './IbRequestBlotter';
import { RequestPipeline } from './IbRequestPipeline';
import { countByStage, mockSubIbRequests, subIbRequestsCopy as copy, type RequestTab } from './ibSubIbRequestsData';
import { ACCENT } from './ibSubIbRequestsKit';
import './ibSubIbRequests.css';

/*
 * Aurora Sub-IB requests as an order status desk: the order-lifecycle board (total + one node per stage),
 * then the order blotter with the status filter and one row per request.
 */
export default function SubIbRequestsPage() {
  const [tab, setTab] = useState<RequestTab>('waiting');
  const requests = mockSubIbRequests;
  const counts = countByStage(requests);

  return (
    <div className="space-y-5">
      <header className="flex animate-rise flex-col gap-4 motion-reduce:animate-none sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{copy.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-[12px] bg-fg/[0.04] py-1 pr-3 pl-1 text-xs font-bold text-fg-muted ring-1 ring-line">
          <span className="grid size-7 place-items-center rounded-[9px] bg-fg text-app">
            <Icon name="user" size={13} />
          </span>
          <span aria-hidden="true" style={{ background: ACCENT }} className="isr-blink size-1.5 rounded-full" />
          {copy.stages.waiting.label} · <span className="font-mono font-black text-fg tabular-nums">{counts.waiting}</span>
        </span>
      </header>

      <RequestPipeline counts={counts} total={requests.length} />
      <RequestBlotter tab={tab} counts={counts} requests={requests} onTab={setTab} />
    </div>
  );
}
