export interface IbTransferClient {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
}

export interface IbTransferSetup {
  currency: string;
  senderName: string;
  availableBalance: number;
  minTransfer: number;
  noteMaxLength: number;
  clients: IbTransferClient[];
}

export const mockIbTransferSetup: IbTransferSetup = {
  currency: 'USD',
  senderName: 'Demo Ib',
  availableBalance: 0,
  minTransfer: 1,
  noteMaxLength: 500,
  clients: [],
};
