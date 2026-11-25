'use client';

import { useIbTradeWin } from '@/core/pages/useTradeWin';
import { TradeWinScreen } from './TradeWinPage';

export default function IbTradeWinPage() {
  const { data, isLoading } = useIbTradeWin();
  return <TradeWinScreen data={data} isLoading={isLoading} isIb />;
}
