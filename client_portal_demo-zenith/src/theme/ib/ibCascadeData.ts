// Content of the IB Manager Portal "My Network → Network" tab (reference screenshot, 2026-11-04), kept verbatim.

export type CascadeKind = 'master' | 'subIb' | 'client';

export interface CascadeMember {
  id: string;
  name: string;
  email: string;
  kind: CascadeKind;
  /** 0 = you, 1 = directly under you, 2 = under a sub-IB, … */
  level: number;
  /** Also one of your own (direct) clients. */
  isDirectClient: boolean;
  handle: string | null;
  referralSource: string | null;
  accountNumber: string | null;
  deposits: number;
  withdrawals: number;
  lots: number;
  /** What you earned from this member's own trading. */
  earned: number;
  lastTradeAt: string | null;
  children: CascadeMember[];
}

export const cascadeCopy = {
  subtitle: (directSubIbs: number, cascadeSubIbs: number, clients: number) =>
    `${directSubIbs} direct sub-IB${directSubIbs === 1 ? '' : 's'}, ${cascadeSubIbs} in the whole cascade, ${clients} client${clients === 1 ? '' : 's'}`,
  kpiSubIbs: 'Sub-IBs',
  kpiSubIbsHint: (count: number) => `${count} directly under you`,
  kpiClients: 'Network Clients',
  kpiClientsHint: 'you and your partners',
  kpiActive: 'Active',
  kpiActiveHint: 'traded this period',
  kpiEarned: 'You Earned',
  kpiEarnedHint: 'across the network',
  searchPlaceholder: 'Search anyone in your network',
  expandAll: 'Expand all',
  collapse: 'Collapse',
  legendSubIb: 'Sub-IB',
  legendOwnClient: 'Your own client',
  legendSubIbClient: "A sub-IB's client",
  hint: 'Click a row to open its branch · "Open →" for the full page',
  you: 'You',
  masterTag: 'Master IB',
  subIbTag: (level: number) => `Sub-IB · L${level}`,
  directClientTag: 'Direct client',
  subIbClientTag: "Sub-IB's client",
  via: (source: string) => `via ${source}`,
  masterSummary: (direct: number, subIbs: number) => `${direct} direct · ${subIbs} sub-IBs ·`,
  earnedSuffix: 'earned',
  downline: 'Downline',
  downlineValue: (subs: number, clients: number) => `${subs} sub · ${clients} clients`,
  branchEarned: 'Branch earned',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  net: 'Net',
  lots: 'Lots',
  youEarned: 'You earned',
  open: 'Open',
  email: 'Email',
  account: 'Account',
  referralSource: 'Referral Source',
  empty: 'Nobody in your network matches this search.',
};

export const mockCascade: CascadeMember = {
  id: 'CM-0',
  name: 'harry ib master',
  email: 'harryib@gmail.com',
  kind: 'master',
  level: 0,
  isDirectClient: false,
  handle: null,
  referralSource: null,
  accountNumber: null,
  deposits: 0,
  withdrawals: 0,
  lots: 0,
  earned: 0,
  lastTradeAt: null,
  children: [
    {
      id: 'CM-1',
      name: 'harry sub ib Ly',
      email: 'harrysubib@gmail.com',
      kind: 'subIb',
      level: 1,
      isDirectClient: true,
      handle: 'hhhhn',
      referralSource: 'My referral link',
      accountNumber: null,
      deposits: 0,
      withdrawals: 0,
      lots: 0,
      earned: 0,
      lastTradeAt: null,
      children: [
        {
          id: 'CM-2',
          name: 'H•••• T•••',
          email: 'ha•••@tenaxcode.com',
          kind: 'client',
          level: 2,
          isDirectClient: false,
          handle: null,
          referralSource: null,
          accountNumber: '2000001',
          deposits: 0,
          withdrawals: 0,
          lots: 0,
          earned: 0,
          lastTradeAt: null,
          children: [],
        },
      ],
    },
  ],
};

export function descendantsOf(member: CascadeMember): CascadeMember[] {
  return member.children.flatMap((child) => [child, ...descendantsOf(child)]);
}

export function isClientMember(member: CascadeMember): boolean {
  return member.kind === 'client' || member.isDirectClient;
}

export function branchSummary(member: CascadeMember) {
  const below = descendantsOf(member);
  return {
    subs: below.filter((node) => node.kind === 'subIb').length,
    clients: below.filter((node) => node.kind === 'client').length,
    earned: [member, ...below].reduce((sum, node) => sum + node.earned, 0),
  };
}

export function cascadeStats(root: CascadeMember, wasActive: (member: CascadeMember) => boolean) {
  const everyone = descendantsOf(root);
  return {
    directSubIbs: root.children.filter((node) => node.kind === 'subIb').length,
    cascadeSubIbs: everyone.filter((node) => node.kind === 'subIb').length,
    clients: everyone.filter(isClientMember).length,
    active: everyone.filter(wasActive).length,
    earned: everyone.reduce((sum, node) => sum + node.earned, 0),
  };
}

/** Keeps members that match the needle plus the ancestors that lead to them; `null` when nothing below matches. */
export function filterCascade(member: CascadeMember, needle: string): CascadeMember | null {
  if (needle === '') return member;
  const children = member.children.map((child) => filterCascade(child, needle)).filter((child): child is CascadeMember => child !== null);
  const fields = [member.name, member.email, member.accountNumber ?? '', member.handle ?? ''];
  const isMatch = fields.some((field) => field.toLowerCase().includes(needle));
  if (!isMatch && children.length === 0) return null;
  return { ...member, children };
}
