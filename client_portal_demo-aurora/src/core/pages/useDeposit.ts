'use client';

import { useState } from 'react';
import { useMockQuery, wait } from '../lib/mock';
import { mockAccounts, mockPaymentMethods } from '../mock/data';
import type { PaymentMethod, TradingAccount } from '../types';

export interface DepositOptions {
  methods: PaymentMethod[];
  accounts: TradingAccount[];
}

export interface DepositRequest {
  methodId: string;
  accountId: string;
  amount: number;
}

function loadDepositOptions(): DepositOptions {
  return {
    methods: mockPaymentMethods,
    accounts: mockAccounts.filter((account) => account.type === 'live'),
  };
}

export function useDeposit() {
  const options = useMockQuery(loadDepositOptions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DepositRequest | null>(null);

  async function submit(request: DepositRequest) {
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
