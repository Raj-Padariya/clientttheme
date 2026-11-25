'use client';

import { useCallback, useState } from 'react';
import type { MessageKey } from '../i18n';
import { wait } from '../lib/mock';
import { DEMO_CREDENTIALS } from '../mock/data';

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    await wait(600);
    const isValid =
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
    setIsLoading(false);
    if (!isValid) setError('auth.invalidCredentials');
    return isValid;
  }, []);

  return { login, isLoading, error };
}
