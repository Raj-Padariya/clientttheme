'use client';

import { useIbTradeWin } from '@/core/pages/useTradeWin';
import { IbTradeWinScreen } from './IbTradeWinScreen';

export default function IbTradeWinPage() {
  const { data, isLoading } = useIbTradeWin();
  return <IbTradeWinScreen data={data} isLoading={isLoading} />;
}
