import { mockIbDashboard, type IbStats, type IbTradeCommission } from './ib';

export type IbNetworkRole = 'ib' | 'client';

export interface IbNetworkClient {
  id: string;
  name: string;
  email: string;
  role: IbNetworkRole;
  parentIb: string;
  level: number;
  accountNumber: string;
  totalDeposit: number;
  totalWithdraw: number;
  totalLots: number;
  totalRebate: number;
  totalEquity: number;
}

export interface IbClientTrade {
  id: string;
  accountNumber: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  openedAt: string;
  closedAt: string;
  commission: number;
  profit: number;
}

export type IbTreeRole = 'master' | 'subIb' | 'client';

export interface IbTreeNode {
  id: string;
  name: string;
  email: string;
  role: IbTreeRole;
  children: IbTreeNode[];
}

export interface IbNetwork {
  ibName: string;
  masterIb: string;
  totalSubIb: number;
  stats: IbStats;
  clients: IbNetworkClient[];
  /** Everyone the "Select client" drawer can pick from; a superset of `clients`. */
  pickerClients: IbNetworkClient[];
  trades: IbTradeCommission[];
  clientTrades: IbClientTrade[];
  tree: IbTreeNode;
}

const networkClients: IbNetworkClient[] = [
  {
    id: 'NC-1',
    name: 'demo test',
    email: 'demo@gmail.com',
    role: 'ib',
    parentIb: 'demo ib',
    level: 1,
    accountNumber: '2000000',
    totalDeposit: 1100,
    totalWithdraw: 220,
    totalLots: 1.03,
    totalRebate: 10.28,
    totalEquity: 806.41,
  },
  {
    id: 'NC-2',
    name: 'st*** pl***',
    email: 'st***@gmail.com',
    role: 'client',
    parentIb: 'demo test',
    level: 2,
    accountNumber: '2000002',
    totalDeposit: 2000,
    totalWithdraw: 0,
    totalLots: 1,
    totalRebate: 5,
    totalEquity: 926,
  },
];

// Placeholder clients so the picker drawer has enough rows to search and page through until real data is wired.
function dummyClient(index: number, name: string, email: string, role: IbNetworkRole, parentIb: string, level: number): IbNetworkClient {
  return {
    id: `DC-${index}`,
    name,
    email,
    role,
    parentIb,
    level,
    accountNumber: String(2000002 + index),
    totalDeposit: 500 * index,
    totalWithdraw: index % 3 === 0 ? 100 * index : 0,
    totalLots: Number((0.25 * index).toFixed(2)),
    totalRebate: Number((1.25 * index).toFixed(2)),
    totalEquity: Number((420 * index + 37.5).toFixed(2)),
  };
}

const dummyClients: IbNetworkClient[] = [
  dummyClient(1, 'ra*** sh***', 'ra***@gmail.com', 'client', 'demo test', 2),
  dummyClient(2, 'an*** ve***', 'an***@yahoo.com', 'client', 'demo ib', 1),
  dummyClient(3, 'mo*** kh***', 'mo***@outlook.com', 'ib', 'demo ib', 1),
  dummyClient(4, 'pr*** pa***', 'pr***@gmail.com', 'client', 'mo*** kh***', 2),
  dummyClient(5, 'vi*** ra***', 'vi***@gmail.com', 'client', 'mo*** kh***', 2),
  dummyClient(6, 'ka*** si***', 'ka***@hotmail.com', 'client', 'demo ib', 1),
  dummyClient(7, 'ne*** jo***', 'ne***@gmail.com', 'client', 'demo test', 2),
  dummyClient(8, 'ar*** gu***', 'ar***@gmail.com', 'client', 'demo ib', 1),
  dummyClient(9, 'su*** me***', 'su***@yahoo.com', 'client', 'mo*** kh***', 2),
  dummyClient(10, 'ha*** ku***', 'ha***@gmail.com', 'client', 'demo ib', 1),
];

const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];

// Two to four closed trades per placeholder account, spread over the last few months.
function dummyTrades(accountNumber: string, seed: number): IbClientTrade[] {
  const count = 2 + (seed % 3);
  return Array.from({ length: count }, (_, index) => {
    const step = seed * 7 + index * 3;
    const opened = new Date(Date.UTC(2026, 5 + ((seed + index) % 4), 3 + ((step * 5) % 25), 9 + (step % 8), (step * 11) % 60));
    const closed = new Date(opened.getTime() + (5 + ((step * 13) % 240)) * 60_000);
    const volume = [0.01, 0.05, 0.1, 0.5, 1][step % 5];
    const profit = Number((((step % 2 === 0 ? 1 : -1) * (volume * 100 + (step % 9) * 1.37))).toFixed(2));
    return {
      id: `DT-${accountNumber}-${index}`,
      accountNumber,
      symbol: symbols[step % symbols.length],
      side: step % 3 === 0 ? 'sell' : 'buy',
      volume,
      openedAt: opened.toISOString(),
      closedAt: closed.toISOString(),
      commission: Number((volume * 10).toFixed(2)),
      profit,
    };
  });
}

export const mockIbNetwork: IbNetwork = {
  ibName: 'Demo Ib',
  masterIb: 'Demo Ib',
  totalSubIb: 1,
  stats: mockIbDashboard.stats,
  clients: networkClients,
  pickerClients: [...networkClients, ...dummyClients],
  tree: {
    id: 'TN-1',
    name: 'demo ib',
    email: 'demoib@gmail.com',
    role: 'master',
    children: [
      {
        id: 'TN-2',
        name: 'demo test',
        email: 'demo@gmail.com',
        role: 'subIb',
        children: [{ id: 'TN-3', name: 'star plus', email: 'star@gmail.com', role: 'client', children: [] }],
      },
    ],
  },
  trades: mockIbDashboard.activity.filter((item): item is IbTradeCommission => item.kind === 'commission'),
  clientTrades: [
    { id: 'CT-1', accountNumber: '2000000', symbol: 'XAUUSD', side: 'buy', volume: 0.01, openedAt: '2026-08-17T12:41:00Z', closedAt: '2026-08-17T12:42:00Z', commission: 0.08, profit: 1.79 },
    { id: 'CT-2', accountNumber: '2000000', symbol: 'XAUUSD', side: 'sell', volume: 0.01, openedAt: '2026-07-22T14:23:00Z', closedAt: '2026-07-22T14:23:00Z', commission: 0.1, profit: 0.26 },
    { id: 'CT-3', accountNumber: '2000000', symbol: 'XAUUSD', side: 'buy', volume: 0.01, openedAt: '2026-07-22T14:23:00Z', closedAt: '2026-07-22T14:23:00Z', commission: 0.1, profit: 0.31 },
    { id: 'CT-4', accountNumber: '2000000', symbol: 'XAUUSD', side: 'buy', volume: 1, openedAt: '2026-07-21T13:11:00Z', closedAt: '2026-07-21T13:12:00Z', commission: 10, profit: 59 },
    ...dummyTrades('2000002', 0),
    ...dummyClients.flatMap((client, index) => dummyTrades(client.accountNumber, index + 1)),
  ],
};
