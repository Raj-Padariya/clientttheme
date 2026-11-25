import { mockUser, mockWallet } from '../mock/data';
import type { User, Wallet } from '../types';

export function useSession(): { user: User; wallet: Wallet } {
  return { user: mockUser, wallet: mockWallet };
}
