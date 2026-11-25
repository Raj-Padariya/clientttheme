'use client';

import { useIbDashboard } from '@/core/pages/useIbDashboard';
import { ClientMonitor, CommissionSpread, FundsOrderBook } from './IbDashBook';
import { IbDashSkeleton, QuickHotkeys, ReferralTicket, TimeAndSales } from './IbDashTape';
import { QuoteTerminal, TickerTape } from './IbDashTerminal';
import './ibDashboard.css';

/*
 * Aurora IB dashboard as a partner trading terminal: a stats ticker tape, the rebate quoted like a last price
 * next to commission candles, client funds as an order book, a margin monitor, the commission split as a
 * bid/ask spread, activity as a time & sales tape with a ticket, and referral + quick actions as side panels.
 */
export default function IbDashboardPage() {
  const { data, isFetching, refetch } = useIbDashboard();

  if (!data) return <IbDashSkeleton />;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <TickerTape stats={data.stats} />
      <QuoteTerminal data={data} />
      <FundsOrderBook stats={data.stats} />
      <ClientMonitor stats={data.stats} />
      <CommissionSpread data={data} />
      <TimeAndSales activity={data.activity} currency={data.stats.currency} isFetching={isFetching} onRefresh={() => void refetch()} />
      <div className="flex flex-col gap-4 lg:col-span-4">
        <ReferralTicket link={data.referralLink} visits={data.referralVisits} />
        <QuickHotkeys />
      </div>
    </div>
  );
}
