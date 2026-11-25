export type ThemeMode = 'light' | 'dark';

export interface LogoAsset {
  src: string;
  width: number;
  height: number;
}

export interface DashboardOptions {
  hideTradeButton: boolean;
  splitCreateAccountCta: boolean;
  hideDepositBanner: boolean;
  createAccountFlow: 'cards' | 'dropdown';
  depositBannerTitle?: string;
  depositBannerText?: string;
}

export interface BrandConfig {
  slug: string;
  brandName: string;
  companyName: string;
  supportEmail: string;
  logo: { light: LogoAsset; dark: LogoAsset };
  appIcon: string;
  favicon: string;
  allowedModes: ThemeMode[];
  defaultMode: ThemeMode;
  followSystem: boolean;
  loginWelcomeTitle: string;
  registerWelcomeTitle: string;
  promoHeadline: string;
  promoDescription: string;
  trustPoints: string[];
  footerCopyright: string;
  legalText: string;
  termsUrl: string;
  privacyUrl: string;
  registrationDisclaimer: string;
  dashboard: DashboardOptions;
}
