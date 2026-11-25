import type { MessageKey } from '@/core/i18n';
import type { IconName } from '../ui/Icon';

export interface NavLink {
  href: string;
  labelKey: MessageKey;
  icon: IconName;
}

export interface NavItem {
  labelKey: MessageKey;
  icon: IconName;
  /** Present on leaf items; groups navigate through their `children`. */
  href?: string;
  children?: NavLink[];
}

export const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
  { href: '/accounts', labelKey: 'nav.accounts', icon: 'accounts' },
  {
    labelKey: 'nav.funds',
    icon: 'wallet',
    children: [
      { href: '/deposit', labelKey: 'nav.deposit', icon: 'deposit' },
      { href: '/withdrawal', labelKey: 'nav.withdrawal', icon: 'withdrawal' },
      { href: '/transfer', labelKey: 'nav.internalTransfer', icon: 'transfer' },
      { href: '/history', labelKey: 'nav.transactionHistory', icon: 'history' },
      { href: '/wallet-history', labelKey: 'nav.walletHistory', icon: 'wallet' },
    ],
  },
  {
    labelKey: 'nav.promotion',
    icon: 'megaphone',
    children: [
      { href: '/promotion/scratch-card', labelKey: 'nav.scratchCard', icon: 'scratchCard' },
      { href: '/promotion/trade-and-win', labelKey: 'nav.tradeAndWin', icon: 'tradeWin' },
      { href: '/promotion/demo-contest', labelKey: 'nav.demoContest', icon: 'trophy' },
      { href: '/promotion/bonuses', labelKey: 'nav.bonuses', icon: 'gift' },
    ],
  },
  {
    labelKey: 'nav.pamm',
    icon: 'trendUp',
    children: [
      { href: '/pamm/manager-dashboard', labelKey: 'nav.pammDashboard', icon: 'dashboard' },
      { href: '/pamm/become-manager', labelKey: 'nav.pammBecomeManager', icon: 'settings' },
      { href: '/pamm/fund-managers', labelKey: 'nav.pammFundManagers', icon: 'trendUp' },
      { href: '/pamm/investments', labelKey: 'nav.pammInvestments', icon: 'trendUp' },
    ],
  },
  {
    labelKey: 'nav.copyTrading',
    icon: 'copy',
    children: [
      { href: '/copy-trading/master-dashboard', labelKey: 'nav.copyMasterDashboard', icon: 'areaChart' },
      { href: '/copy-trading/become-master', labelKey: 'nav.copyBecomeMaster', icon: 'settings' },
      // Shown to everyone for now; once the backend reports master approval these replace "Become a Master".
      { href: '/copy-trading/my-plans', labelKey: 'nav.copyMyPlans', icon: 'areaChart' },
      { href: '/copy-trading/my-copiers', labelKey: 'nav.copyMyCopiers', icon: 'user' },
      { href: '/copy-trading/masters', labelKey: 'nav.copyMasters', icon: 'dashboard' },
      { href: '/copy-trading/investments', labelKey: 'nav.copyInvestments', icon: 'trendUp' },
    ],
  },
  { href: '/tickets', labelKey: 'nav.tickets', icon: 'ticket' },
  { href: '/platforms', labelKey: 'nav.platforms', icon: 'monitor' },
  {
    labelKey: 'nav.tradingCentral',
    icon: 'compass',
    children: [
      { href: '/trading-central/economic-calendar', labelKey: 'nav.tcEconomicCalendar', icon: 'calendar' },
      { href: '/trading-central/education', labelKey: 'nav.tcEducation', icon: 'monitor' },
      { href: '/trading-central/technical-views', labelKey: 'nav.tcTechnicalViews', icon: 'trendUp' },
      { href: '/trading-central/market-buzz', labelKey: 'nav.tcMarketBuzz', icon: 'lock' },
    ],
  },
  {
    labelKey: 'nav.settings',
    icon: 'settings',
    children: [
      { href: '/settings', labelKey: 'nav.profile', icon: 'user' },
      { href: '/kyc', labelKey: 'nav.kyc', icon: 'kyc' },
    ],
  },
];

// Menu shown while the IB portal is active (any route under /ib).
export const ibNavItems: NavItem[] = [
  { href: '/ib/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
  {
    labelKey: 'nav.promotion',
    icon: 'megaphone',
    children: [{ href: '/ib/promotion/trade-and-win', labelKey: 'nav.tradeAndWin', icon: 'tradeWin' }],
  },
  { href: '/ib/transfer-commission', labelKey: 'nav.ibTransferCommission', icon: 'transfer' },
  {
    labelKey: 'nav.ibNetworkClients',
    icon: 'user',
    children: [
      { href: '/ib/network', labelKey: 'nav.ibMyClients', icon: 'user' },
      { href: '/ib/sub-ib-requests', labelKey: 'nav.ibSubIbRequests', icon: 'inbox' },
    ],
  },
  {
    labelKey: 'nav.ibCommission',
    icon: 'wallet',
    children: [
      { href: '/ib/my-commission', labelKey: 'nav.ibMyCommission', icon: 'wallet' },
      { href: '/ib/commission-plans', labelKey: 'nav.ibCommissionPlans', icon: 'sliders' },
    ],
  },
  { href: '/ib/referral-links', labelKey: 'nav.ibReferralLinks', icon: 'megaphone' },
  { href: '/ib/marketing-material', labelKey: 'nav.ibMarketingMaterial', icon: 'fileText' },
  { href: '/ib/settings', labelKey: 'nav.settings', icon: 'settings' },
];

export const IB_HOME = '/ib/dashboard';
export const CLIENT_HOME = '/dashboard';

export function isIbPath(pathname: string): boolean {
  return pathname === '/ib' || pathname.startsWith('/ib/');
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(pathname: string, item: NavItem): boolean {
  return item.children?.some((child) => isNavItemActive(pathname, child.href)) ?? false;
}

export interface ActiveNav {
  /** The top-level entry that owns the page. */
  item: NavItem;
  /** The child link when the page sits inside a group; absent for top-level leaves. */
  link?: NavLink;
}

/** Which menu entry the current page belongs to; drives the context tabs and the breadcrumb. */
export function getActiveGroup(pathname: string, items: NavItem[]): ActiveNav | undefined {
  for (const item of items) {
    if (item.href && isNavItemActive(pathname, item.href)) return { item };
    const link = item.children?.find((child) => isNavItemActive(pathname, child.href));
    if (link) return { item, link };
  }
  return undefined;
}
