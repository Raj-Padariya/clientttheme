import type { BrandConfig } from './types';

export const brandConfig: BrandConfig = {
  slug: 'demo',
  brandName: 'Demo FX',
  companyName: 'Demo FX Ltd',
  supportEmail: 'support@demofx.example',
  logo: {
    light: { src: '/brand/logo-light.svg', width: 140, height: 32 },
    dark: { src: '/brand/logo-dark.svg', width: 140, height: 32 },
  },
  appIcon: '/brand/app-icon.svg',
  favicon: '/brand/favicon.ico',
  allowedModes: ['light', 'dark'],
  defaultMode: 'dark',
  followSystem: false,
  loginWelcomeTitle: 'Welcome back',
  registerWelcomeTitle: 'Open your account',
  promoHeadline: 'Trade global markets with confidence',
  promoDescription: 'Forex, metals, indices and crypto CFDs with tight spreads and fast execution.',
  trustPoints: ['Segregated client funds', 'Instant deposits, fast withdrawals', '24/5 multilingual support'],
  footerCopyright: '© 2026 Demo FX Ltd. All rights reserved.',
  legalText:
    'Trading leveraged products carries a high level of risk and may not be suitable for all investors.',
  termsUrl: 'https://demofx.example/terms',
  privacyUrl: 'https://demofx.example/privacy',
  registrationDisclaimer: 'By registering you confirm that you have read and accepted our client agreement.',
  dashboard: {
    hideTradeButton: false,
    splitCreateAccountCta: false,
    hideDepositBanner: false,
    createAccountFlow: 'cards',
  },
};
