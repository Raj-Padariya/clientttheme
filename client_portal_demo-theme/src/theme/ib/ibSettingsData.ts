// Content of the IB Manager Portal "Settings" and "Marketing Material" pages (reference screenshots, 2026-11-04), kept verbatim.

export interface OfferGroup {
  name: string;
  isOffered: boolean;
}

export interface IbSetup {
  planName: string;
  smallestPayout: number;
  walletStatus: string;
  currency: string;
}

export const mockOfferGroups: OfferGroup[] = [
  { name: 'ECN', isOffered: true },
  { name: 'Pro', isOffered: true },
  { name: 'Standard', isOffered: true },
];

export const mockIbSetup: IbSetup = {
  planName: 'Plan 0',
  smallestPayout: 0,
  walletStatus: 'Active',
  currency: 'USD',
};

export const ibSettingsCopy = {
  title: 'Settings',
  subtitle: 'What your clients see, and what your broker pays you on',
  groupsTitle: (plan: string) => `Groups on ${plan}`,
  groupsOn: (on: number, total: number) => `${on} of ${total} on`,
  groupsBody: 'When somebody signs up under you and opens a trading account, these are the account types they can pick from.',
  notePrefix: 'Your ',
  noteLink: 'default referral link',
  noteSuffix: ' offers exactly this list. A link you make yourself can offer fewer of them — never more.',
  shownFirst: 'Shown first to your clients',
  canPick: 'Your clients can pick this',
  remove: 'Remove',
  moveGroup: (name: string) => `Move ${name} (use arrow keys)`,
  allOnOffer: 'Every group your plan carries is already on offer.',
  offOffer: 'Not on offer',
  addBack: (name: string) => `Add ${name} back`,
  save: 'Save',
  undo: 'Undo',
  saved: 'Groups saved',
  setupTitle: 'Your setup',
  setupBody: 'Set by your broker. Ask them if any of it needs to change.',
  plan: 'Your commission plan',
  smallestPayout: 'Smallest payout',
  smallestPayoutHint: 'You cannot request less than this.',
  wallet: 'Wallet',
};

export interface MarketingMaterial {
  id: string;
  name: string;
}

// Nothing has been published by the broker yet.
export const mockMarketingMaterials: MarketingMaterial[] = [];

export const marketingMaterialCopy = {
  title: 'Marketing Material',
  subtitle: 'Banners, decks and copy your broker has published for you to promote with',
  search: 'Search material',
  emptyTitle: 'Nothing published yet',
  emptyBody: 'When your broker publishes banners or documents for partners, they show up here.',
};

export function moveGroup(list: OfferGroup[], from: number, to: number): OfferGroup[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
