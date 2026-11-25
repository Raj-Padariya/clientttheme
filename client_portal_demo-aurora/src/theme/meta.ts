import type { Viewport } from 'next';
import { Albert_Sans, Bricolage_Grotesque, Figtree, Instrument_Sans, JetBrains_Mono, Lexend, Onest, Outfit, Red_Hat_Display } from 'next/font/google';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { DEFAULT_PALETTE, fontOptions, palettePresets } from './lib/themePalette';
import { THEME_FONT_KEY, THEME_PALETTE_KEY, THEME_PICK_KEY, THEME_STORAGE_KEY } from './lib/themeStorage';

// Customizer font families. tokens.css points --font-brand / --font-brand-display at the chosen one;
// only Outfit (Aurora's default) is preloaded, the rest download when a client actually picks them.
const fontOutfit = Outfit({ variable: '--font-opt-outfit', subsets: ['latin'], display: 'swap' });
const fontLexend = Lexend({ variable: '--font-opt-lexend', subsets: ['latin'], display: 'swap', preload: false });
const fontFigtree = Figtree({ variable: '--font-opt-figtree', subsets: ['latin'], display: 'swap', preload: false });
const fontOnest = Onest({ variable: '--font-opt-onest', subsets: ['latin'], display: 'swap', preload: false });
const fontAlbert = Albert_Sans({ variable: '--font-opt-albert', subsets: ['latin'], display: 'swap', preload: false });
const fontRedHat = Red_Hat_Display({ variable: '--font-opt-redhat', subsets: ['latin'], display: 'swap', preload: false });
const fontBricolage = Bricolage_Grotesque({ variable: '--font-opt-bricolage', subsets: ['latin'], display: 'swap', preload: false });
const fontInstrument = Instrument_Sans({ variable: '--font-opt-instrument', subsets: ['latin'], display: 'swap', preload: false });
const brandMono = JetBrains_Mono({ variable: '--font-brand-mono', subsets: ['latin'], display: 'swap' });

export const fontClassName = [
  fontOutfit,
  fontLexend,
  fontFigtree,
  fontOnest,
  fontAlbert,
  fontRedHat,
  fontBricolage,
  fontInstrument,
  brandMono,
]
  .map((font) => font.variable)
  .join(' ');

export const themeViewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eceee9' },
    { media: '(prefers-color-scheme: dark)', color: '#12171a' },
  ],
};

export const pageTitles: Readonly<Record<string, string>> = {
  '/login': translate('auth.signIn'),
  '/register': translate('auth.createAccount'),
  '/dashboard': translate('nav.dashboard'),
  '/ib/dashboard': translate('nav.ibDashboard'),
  '/ib/network': translate('nav.ibMyNetwork'),
  '/ib/contests': translate('ibContest.pageTitle'),
  '/ib/commission-history': translate('nav.ibCommissionHistory'),
  '/ib/transfer-commission': translate('nav.ibTransferCommission'),
  '/ib/structure': translate('nav.ibMyStructure'),
  '/ib/sub-ib-requests': translate('nav.ibSubIbRequests'),
  '/ib/my-commission': translate('nav.ibMyCommission'),
  '/ib/commission-plans': translate('nav.ibCommissionPlans'),
  '/ib/referral-links': translate('nav.ibReferralLinks'),
  '/ib/marketing-material': translate('nav.ibMarketingMaterial'),
  '/ib/settings': translate('nav.settings'),
  '/ib/promotion/trade-and-win': translate('nav.tradeAndWin'),
  '/notifications': translate('notif.title'),
  '/copy-trading/master-dashboard': translate('nav.copyMasterDashboard'),
  '/pamm/manager-dashboard': translate('nav.pammManagerDashboard'),
  '/accounts': translate('nav.accounts'),
  '/deposit': translate('nav.deposit'),
  '/withdrawal': translate('nav.withdrawal'),
  '/transfer': translate('nav.transfer'),
  '/history': translate('nav.history'),
  '/wallet-history': translate('nav.walletHistory'),
  '/kyc': translate('nav.kyc'),
  '/promotion': translate('nav.promotion'),
  '/promotion/scratch-card': translate('nav.scratchCard'),
  '/promotion/trade-and-win': translate('nav.tradeAndWin'),
  '/promotion/demo-contest': translate('nav.demoContest'),
  '/promotion/bonuses': translate('nav.bonuses'),
  '/pamm': translate('nav.pamm'),
  '/pamm/become-manager': translate('nav.pammBecomeManager'),
  '/pamm/fund-managers': translate('nav.pammFundManagers'),
  '/pamm/investments': translate('nav.pammInvestments'),
  '/copy-trading': translate('nav.copyTrading'),
  '/copy-trading/become-master': translate('nav.copyBecomeMaster'),
  '/copy-trading/my-plans': translate('nav.copyMyPlans'),
  '/copy-trading/my-copiers': translate('nav.copyMyCopiers'),
  '/copy-trading/masters': translate('nav.copyMasters'),
  '/copy-trading/investments': translate('nav.copyInvestments'),
  '/tickets': translate('nav.tickets'),
  '/platforms': translate('nav.platforms'),
  '/trading-central': translate('nav.tradingCentral'),
  '/trading-central/economic-calendar': translate('nav.tcEconomicCalendar'),
  '/trading-central/education': translate('nav.tcEducation'),
  '/trading-central/technical-views': translate('nav.tcTechnicalViews'),
  '/trading-central/market-buzz': translate('nav.tcMarketBuzz'),
  '/settings': translate('nav.settings'),
  '/ui-kit': translate('nav.uiKit'),
};

// Non-default presets → base colour; the default (gold) palette sets nothing, so tokens.css applies untouched.
const customizerPresetPicks: Record<string, string> = Object.fromEntries(
  palettePresets.filter((preset) => preset.id !== DEFAULT_PALETTE).map((preset) => [preset.id, preset.pick]),
);
const customizerFontIds = fontOptions.map((font) => font.id);

// Runs before first paint so the stored light/dark mode, palette and font never flash.
// Stored palette / font values are checked against the known ids and the custom colour against #rrggbb,
// so a tampered localStorage value can never reach the page's CSS.
export const themeInitScript = `(function(){var d=document.documentElement;var a=${JSON.stringify(
  brandConfig.allowedModes,
)};var f='${brandConfig.defaultMode}';try{var m=localStorage.getItem('${THEME_STORAGE_KEY}');if(a.indexOf(m)<0){m=${
  brandConfig.followSystem
}?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):f;}if(a.indexOf(m)<0){m=f;}d.dataset.theme=m;}catch(e){d.dataset.theme=f;}try{var p=localStorage.getItem('${THEME_PALETTE_KEY}');var q=${JSON.stringify(
  customizerPresetPicks,
)};var c=p==='custom'?localStorage.getItem('${THEME_PICK_KEY}'):q.hasOwnProperty(p)?q[p]:null;if(c&&/^#[0-9a-fA-F]{6}$/.test(c)){d.dataset.palette=p;d.style.setProperty('--brand-pick',c.toLowerCase());}var n=localStorage.getItem('${THEME_FONT_KEY}');if(${JSON.stringify(
  customizerFontIds,
)}.indexOf(n)>0){d.dataset.font=n;}}catch(e){}})();`;
