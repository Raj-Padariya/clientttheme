'use client';

import { useCallback, useState } from 'react';
import { wait } from '../lib/mock';
import { mockCountries } from '../mock/data';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);

  const register = useCallback(async (payload: RegisterPayload): Promise<boolean> => {
    setIsLoading(true);
    await wait(800);
    setIsLoading(false);
    return payload.email.length > 0;
  }, []);

  return { register, isLoading, countries: mockCountries };
}
