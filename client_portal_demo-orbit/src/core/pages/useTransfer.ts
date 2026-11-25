'use client';

import { useState } from 'react';
import { useMockQuery, wait } from '../lib/mock';
import { mockAccounts, mockWallet } from '../mock/data';
import type { TradingAccount, Wallet } from '../types';

export interface TransferOptions {
  wallet: Wallet;
  accounts: TradingAccount[];
}

/** `fromId` / `toId` are a trading account id, or WALLET_ID for the client wallet. */
export interface TransferRequest {
  fromId: string;
  toId: string;
  amount: number;
  description?: string;
}

export const WALLET_ID = 'wallet';

function loadTransferOptions(): TransferOptions {
  return {
    wallet: mockWallet,
    accounts: mockAccounts.filter((account) => account.type === 'live'),
  };
}

export function useTransfer() {
  const options = useMockQuery(loadTransferOptions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<TransferRequest | null>(null);

  async function submit(request: TransferRequest) {
    setIsSubmitting(true);
    await wait(700);
    setIsSubmitting(false);
    setSubmitted(request);
  }

  function reset() {
    setSubmitted(null);
  }

  return { ...options, isSubmitting, submitted, submit, reset };
}
