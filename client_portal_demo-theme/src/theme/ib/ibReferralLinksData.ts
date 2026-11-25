// Content of the IB Manager Portal "Referral Links" page and its "New link" panel (reference screenshots, 2026-11-04), kept verbatim.

export interface LinkFunnel {
  visits: number;
  signedUp: number;
  openedAccount: number;
  funded: number;
}

export interface ReferralLink {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  /** Account groups a sign-up may open, in the order they are offered. Empty on the default link: it follows client group settings. */
  groups: string[];
  /** yyyy-mm-dd, or '' when it never expires. */
  expiresOn: string;
  funnel: LinkFunnel;
}

export interface LinkDraft {
  name: string;
  code: string;
  groups: { name: string; isOffered: boolean }[];
  expiresOn: string;
}

export const referralBaseUrl = 'https://app.tenaxcode.com/register?ref=';

export const referralLinksCopy = {
  title: 'Referral Links',
  subtitle: 'Every way somebody can sign up under you',
  newLink: 'New link',
  links: 'Links',
  linksHint: (own: number) => `${own} of your own`,
  signedUp: 'Signed up',
  signedUpHint: (visits: number) => `from ${visits} visits`,
  openedAccount: 'Opened an account',
  openedAccountHint: 'got as far as a trading account',
  funded: 'Funded',
  fundedHint: 'put money in',
  defaultTitle: 'My referral link',
  defaultBadge: 'Default',
  defaultHint: 'Follows your client group settings — it always works.',
  copyLink: 'Copy',
  share: 'Share',
  copied: 'Link copied',
  shareTitle: 'Sign up with my link',
  funnel: { visits: 'Visits', signedUp: 'Signed up', openedAccount: 'Opened account', funded: 'Funded' },
  offers: 'Offers',
  expires: (date: string) => `Stops working on ${date}`,
  neverExpires: 'Never expires',
  removeLink: 'Remove link',
  panelTitle: 'New link',
  panelSubtitle: 'Where you post it, and what it opens the door to',
  closePanel: 'Close',
  nameIt: 'Name it',
  namePlaceholder: 'Instagram bio',
  nameHint: 'Only you see this. It is how you tell your links apart.',
  code: 'Code (optional)',
  codePlaceholder: 'leave blank and we make one',
  codeHint: 'Letters, numbers, dashes and underscores. It cannot be changed later.',
  codeInvalid: 'Use only letters, numbers, dashes and underscores.',
  codeTaken: 'This code is already in use.',
  groupsTitle: 'Groups this link offers',
  groupsHint: 'A client who signs up here can open an account in these groups, and nothing else.',
  shownFirst: 'Shown first',
  moveGroup: (name: string) => `Move ${name} — use arrow up / down`,
  stopWorkingOn: 'Stop working on (optional)',
  stopWorkingOnHint: 'Useful for a campaign. Leave blank and it never expires.',
  makeLink: 'Make link',
  cancel: 'Cancel',
};

/** Groups the broker lets you offer, in the order the reference panel lists them. */
export const offerableGroups = ['ECN', 'Pro', 'Standard'];

const emptyFunnel: LinkFunnel = { visits: 0, signedUp: 0, openedAccount: 0, funded: 0 };

export const mockReferralLinks: ReferralLink[] = [
  { id: 'RL-1', name: 'My referral link', code: 'K8JHOF6OCY', isDefault: true, groups: [], expiresOn: '', funnel: emptyFunnel },
];

const CODE_PATTERN = /^[A-Za-z0-9_-]*$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

export function emptyLinkDraft(): LinkDraft {
  return { name: '', code: '', groups: offerableGroups.map((name) => ({ name, isOffered: true })), expiresOn: '' };
}

export function codeProblem(code: string, links: ReferralLink[]): string | null {
  const trimmed = code.trim();
  if (!CODE_PATTERN.test(trimmed)) return referralLinksCopy.codeInvalid;
  if (trimmed !== '' && links.some((link) => link.code.toLowerCase() === trimmed.toLowerCase())) return referralLinksCopy.codeTaken;
  return null;
}

export function isLinkDraftValid(draft: LinkDraft, links: ReferralLink[]): boolean {
  return draft.name.trim() !== '' && draft.groups.some((group) => group.isOffered) && codeProblem(draft.code, links) === null;
}

export function generateCode(links: ReferralLink[]): string {
  let code = '';
  do {
    code = Array.from({ length: 10 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (links.some((link) => link.code === code));
  return code;
}

export function linkFromDraft(draft: LinkDraft, links: ReferralLink[]): ReferralLink {
  return {
    id: `RL-${Date.now()}`,
    name: draft.name.trim(),
    code: draft.code.trim() || generateCode(links),
    isDefault: false,
    groups: draft.groups.filter((group) => group.isOffered).map((group) => group.name),
    expiresOn: draft.expiresOn,
    funnel: emptyFunnel,
  };
}

export function totalFunnel(links: ReferralLink[]): LinkFunnel {
  return links.reduce(
    (sum, link) => ({
      visits: sum.visits + link.funnel.visits,
      signedUp: sum.signedUp + link.funnel.signedUp,
      openedAccount: sum.openedAccount + link.funnel.openedAccount,
      funded: sum.funded + link.funnel.funded,
    }),
    emptyFunnel,
  );
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function formatExpiry(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
