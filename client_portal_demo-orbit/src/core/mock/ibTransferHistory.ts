export type IbTransferStatus = 'pending' | 'completed' | 'rejected';

export interface IbTransferRecord {
  id: string;
  clientName: string;
  accountNumber: string;
  amount: number;
  status: IbTransferStatus;
  requestedAt: string;
  note: string;
}

export interface IbTransferHistory {
  currency: string;
  records: IbTransferRecord[];
}

export const mockIbTransferHistory: IbTransferHistory = {
  currency: 'USD',
  records: [],
};
