export type Importance = 'high' | 'medium' | 'low';
export type EventType = 'economic' | 'holiday';
export type CountryGroup = 'g7' | 'eu' | 'all';

export interface VolatilityInsight {
  pair: string;
  pips: string;
}
export interface EconomicEvent {
  id: string;
  day: number;
  /** "We measured N pips volatility…" banner shown above this event. */
  insight?: VolatilityInsight;
  time: string;
  country: string;
  name: string;
  importance: Importance;
  type: EventType;
  actual?: string;
  forecast?: string;
  previous?: string;
  revisedFrom?: string;
}

export const TOTAL_EVENTS = 331;
export const CALENDAR_YEAR = 2026;
export const CALENDAR_MONTH_INDEX = 9;
export const SELECTED_DAY = 22;
export const RANGE_END_DAY = 28;
export const TODAY = 28;
export const TIMEZONE = 'Asia/Kolkata';
export const TIMEZONE_LABEL = 'GMT+05:30';

export const countryNames: Record<string, string> = {
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  NL: 'Netherlands',
  SG: 'Singapore',
  NO: 'Norway',
  DK: 'Denmark',
  HU: 'Hungary',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  TR: 'Turkey',
  CH: 'Switzerland',
  PL: 'Poland',
  HK: 'Hong Kong',
  CN: 'China',
  GB: 'United Kingdom',
  MX: 'Mexico',
  BR: 'Brazil',
  CA: 'Canada',
  EA: 'Euro Area',
  US: 'United States',
  ZA: 'South Africa',
  AT: 'Austria',
  SE: 'Sweden',
};

export const countryGroups: Record<Exclude<CountryGroup, 'all'>, string[]> = {
  g7: ['US', 'GB', 'CA', 'FR', 'JP', 'DE', 'IT'],
  eu: ['EA', 'FR', 'NL', 'DK', 'HU', 'PL', 'DE', 'IT'],
};

type EventRow = [time: string, country: string, name: string, importance: Importance, actual?: string, forecast?: string, previous?: string, revisedFrom?: string];

const rows: EventRow[] = [
  ['03:15', 'NZ', 'Inflation Rate YoY Q3', 'high', '3.7%', '3.8%', '4.1%'],
  ['03:15', 'NZ', 'Inflation Rate QoQ Q3', 'medium', '0.7%', '0.8%', '1.5%'],
  ['05:20', 'JP', 'Stock Investment by Foreigners OCT/17', 'low', '-¥466.5B', undefined, '¥3.546T', '¥3.522T'],
  ['05:20', 'JP', 'Foreign Bond Investment OCT/17', 'low', '-¥101.6B', undefined, '¥339.9B', '¥306.7B'],
  ['06:30', 'KR', 'Interest Rate Decision', 'medium', '3%', '3%', '3%'],
  ['10:00', 'NL', 'Consumer Confidence OCT', 'medium', '-34', '-34', '-33'],
  ['10:30', 'SG', '6-Month T-Bill Auction', 'low', '1.95%', undefined, '1.9%'],
  ['11:30', 'NO', 'Unemployment Rate SEP', 'high', '5%', '4.5%', '4.0%', '4.4%'],
  ['11:30', 'NO', 'Industrial Confidence Q3', 'low', '3.4', '1', '2.5', '2.3'],
  ['11:30', 'DK', 'Consumer Confidence OCT', 'low', '17.2', '14', '13.7'],
  ['12:00', 'HU', 'Unemployment Rate SEP', 'high', '4.7%', '4.7%', '4.5%'],
  ['12:15', 'FR', 'Business Confidence OCT', 'medium', '105', '101', '101'],
  ['12:15', 'FR', 'Business Climate Indicator OCT', 'low', '97', '96', '96'],
  ['12:30', 'TR', 'Consumer Confidence OCT', 'medium', '84.8', '87', '85.9'],
  ['13:00', 'CH', 'SNB Monetary Policy Meeting Minutes', 'medium'],
  ['13:00', 'PL', 'Business Confidence OCT', 'low', '-6.6', '-6.3', '-5.8'],
  ['13:00', 'PL', 'Retail Sales YoY SEP', 'low', '3.3%', '3.7%', '3.8%'],
  ['14:00', 'HK', 'Unemployment Rate SEP', 'high', '3.9%', '3.7%', '3.8%'],
  ['14:00', 'HK', 'Inflation Rate YoY SEP', 'high', '1.9%', '1.8%', '1.7%'],
  ['14:00', 'HK', 'Inflation Rate MoM SEP', 'medium', '0.3%', '0.3%', '0.1%'],
  ['14:00', 'CN', 'FDI (YTD) YoY SEPT', 'medium', '4.3%', '4.8%', '3.3%'],
  ['14:30', 'GB', 'Index-linked Treasury Gilt 2031 Auction', 'low', '1.141%', undefined, '0.833%'],
  ['15:00', 'HU', '10-Year Bond Auction', 'low', '5.57%', undefined, '5.39%'],
  ['15:00', 'HU', '15-Year Bond Auction', 'low', '5.61%', undefined, '5.69%'],
  ['15:00', 'HU', '12 Month DTB Auction', 'low', '5.00%', undefined, '5.14%'],
  ['15:30', 'GB', 'CBI Industrial Trends Orders OCT', 'medium', '32', '20', '0'],
  ['15:30', 'GB', 'CBI Business Optimism Index Q4', 'medium', '27', '38', '30'],
  ['16:20', 'GB', 'BoE Bailey Speech', 'medium'],
  ['16:30', 'TR', 'TCMB Interest Rate Decision', 'medium', '39%', '39%', '40.5%'],
  ['16:30', 'TR', 'Overnight Borrowing Rate OCT', 'low', '34.5%', '35.5%', '35.5%'],
  ['16:30', 'TR', 'Overnight Lending Rate OCT', 'low', '39%', '40%', '40%'],
  ['17:00', 'TR', 'Foreign Exchange Reserves OCT/16', 'low', '$62.148B', undefined, '$64.27B'],
  ['17:30', 'MX', 'Unemployment Rate SEP', 'high', '2.8%', '3%', '3%'],
  ['17:30', 'BR', 'BCB National Monetary Council Meeting', 'medium'],
  ['17:30', 'PL', 'M3 Money Supply YoY SEP', 'low', '12.5%', '11.4%', '11.3%'],
  ['17:30', 'MX', 'Mid-month Inflation Rate YoY OCT', 'low', '3.62%', '3.6%', '3.42%'],
  ['17:30', 'MX', 'Mid-month Core Inflation Rate MoM OCT', 'low', '0.25%', '0.18%', '0.17%'],
  ['17:30', 'MX', 'Mid-month Core Inflation Rate YoY OCT', 'low', '3.78%', '3.74%', '3.79%'],
  ['17:30', 'MX', 'Mid-month Inflation Rate MoM OCT', 'low', '0.41%', '0.37%', '0.33%'],
  ['17:30', 'CA', 'CFIB Business Barometer OCT', 'low', '50', '47', '48.5', '47.9'],
  ['17:45', 'EA', 'ECB Panetta Speech', 'low'],
  ['18:00', 'US', 'Initial Jobless Claims OCT/17', 'high', '194K', '200K', '208K', '198K'],
  ['18:00', 'CA', 'PPI YoY SEP', 'high', '14.5%', '14.1%', '13.2%', '13.9%'],
  ['18:00', 'CA', 'PPI MoM SEP', 'high', '2%', '0.9%', '1.2%', '1.2%'],
  ['18:00', 'CA', 'New Housing Price Index MoM SEP', 'medium', '-0.2%', '-0.1%', '-0.1%'],
  ['18:00', 'ZA', 'Building Permits YoY AUG', 'low', '-4.3%', '3.2%', '4.1%'],
  ['18:00', 'US', 'Continuing Jobless Claims OCT/10', 'low', '1.728M', '1.72M', '1.703M', '1.71M'],
  ['18:00', 'US', 'Jobless Claims 4-week Average OCT/17', 'low', '197.75K', '200K', '198.75K', '198.5K'],
  ['18:00', 'CA', 'Raw Materials Prices MoM SEP', 'low', '4.8%', '3.1%', '3.3%', '3.1%'],
  ['18:00', 'CA', 'Raw Materials Prices YoY SEP', 'low', '27%', '24%', '22.9%', '22.9%'],
];

/** Oct 28 rows copied from the Trading Central screenshot (only the 14:30–15:40 slice was visible). */
const todayRows: EventRow[] = [
  ['14:30', 'IT', 'Industrial Sales MoM AUG', 'low', '-0.9%', '-0.8%', '1.7%', '1.7%'],
  ['14:30', 'CH', 'Economic Sentiment Index OCT', 'low', '-15.3', '1.3', '2.6'],
  ['14:30', 'AT', 'UniCredit Bank Manufacturing PMI OCT', 'low', '55.9', '54', '54.9'],
  ['15:30', 'IT', 'PPI MoM SEP', 'high', undefined, '0.5%', '2.4%'],
  ['15:30', 'IT', 'PPI YoY SEP', 'high', undefined, '11.2%', '10.9%'],
  ['15:30', 'SE', '2037 SGB Auction', 'low', undefined, undefined, '3.1919%'],
  ['15:35', 'SE', '2032 SGB Auction', 'low', undefined, undefined, '3.0092%'],
  ['15:35', 'NO', 'NGB Auction', 'low'],
  ['15:40', 'IT', '12-Month BOT Auction', 'low', undefined, undefined, '3.175%'],
];

const todayInsights: Partial<Record<number, VolatilityInsight>> = {
  3: { pair: 'EUR/USD', pips: '29.20' },
  5: { pair: 'USD/SEK', pips: '458.35' },
  6: { pair: 'USD/SEK', pips: '352.29' },
  8: { pair: 'EUR/USD', pips: '30.03' },
};

function toEvents(source: EventRow[], day: number, insights: Partial<Record<number, VolatilityInsight>> = {}): EconomicEvent[] {
  return source.map(([time, country, name, importance, actual, forecast, previous, revisedFrom], index) => ({
    id: `${day}-${time}-${country}-${index}`,
    day,
    insight: insights[index],
    time,
    country,
    name,
    importance,
    type: 'economic',
    actual,
    forecast,
    previous,
    revisedFrom,
  }));
}

export const economicEvents: EconomicEvent[] = [...toEvents(rows, SELECTED_DAY), ...toEvents(todayRows, TODAY, todayInsights)];

export const disclaimerParagraphs: string[] = [
  '© 2026 Trading Central. All Rights Reserved. The information contained herein: (1) is proprietary to Trading Central and/or its content providers; (2) may not be copied or distributed; (3) is not warranted to be accurate, complete or timely; and, (4) does not constitute advice or a recommendation by Riyadex Financials (PTY) Ltd., Trading Central or its content providers in respect of the investment in financial instruments. Neither Riyadex Financials (PTY) Ltd. nor Trading Central nor its content providers are responsible for any damages or losses arising from any use of this information. Past performance is no guarantee of future results.',
  'Pricing, historical chart data and fundamental company data are provided by Morningstar Research Inc.',
  'Technical Event® is a registered trademark of Trading Central.',
  'Trading Central products and services are protected under U.S. Patent Nos.: 6,801,201; 7,469,226; 7,469,238; 7,835,966 and 7,853,506 and corresponding foreign patents.',
];
