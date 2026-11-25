'use client';

import { useState } from 'react';
import { useMockQuery, wait } from '../lib/mock';
import { mockAccounts, mockWithdrawalMethods } from '../mock/data';
import type { PaymentMethod, TradingAccount } from '../types';

export interface WithdrawalOptions {
  methods: PaymentMethod[];
  accounts: TradingAccount[];
}

export interface WithdrawalRequest {
  methodId: string;
  accountId: string;
  amount: number;
}

function loadWithdrawalOptions(): WithdrawalOptions {
  return {
    methods: mockWithdrawalMethods,
    accounts: mockAccounts.filter((account) => account.type === 'live'),
  };
}

export function useWithdrawal() {
  const options = useMockQuery(loadWithdrawalOptions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<WithdrawalRequest | null>(null);

  async function submit(request: WithdrawalRequest) {
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
