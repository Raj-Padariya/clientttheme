export type AssetClass = 'forex' | 'indices' | 'commodities';
export type Direction = 'up' | 'down';
export type LevelKind = 'resistance' | 'pivot' | 'last' | 'support';

export interface PriceLevel {
  kind: LevelKind;
  value: string;
}

export interface TechnicalView {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  timeframe: '30 MIN' | 'DAILY';
  localTime: string;
  publishedAt: string;
  direction: Direction;
  move: string;
  target: string;
  pivot: string;
  /** Top-to-bottom, exactly as labelled on the Trading Central chart. "last" is omitted where the label was hidden. */
  levels: PriceLevel[];
  axisLabels: readonly string[];
}

export const ASSET_CLASSES: AssetClass[] = ['forex', 'indices', 'commodities'];
export const LOCAL_TIMEZONE_LABEL = 'UTC+5:30';

const r = (value: string): PriceLevel => ({ kind: 'resistance', value });
const p = (value: string): PriceLevel => ({ kind: 'pivot', value });
const l = (value: string): PriceLevel => ({ kind: 'last', value });
const s = (value: string): PriceLevel => ({ kind: 'support', value });

const intraday = { timeframe: '30 MIN', axisLabels: ['Nov 2'] } as const;
const daily = { timeframe: 'DAILY', axisLabels: ['Aug', 'Sep', 'Oct'] } as const;

export const technicalViews: TechnicalView[] = [
  {
    id: 'gbpusd', symbol: 'GBP/USD', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:16 AM CET',
    direction: 'down', move: '15 - 32 PIPS', target: '1.3260', pivot: '1.3347',
    levels: [r('1.3393'), r('1.3376'), p('1.3347'), l('1.3292'), s('1.3277'), s('1.3260')],
  },
  {
    id: 'audusd', symbol: 'AUD/USD', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:16 AM CET',
    direction: 'down', move: '32 - 44 PIPS', target: '0.6988', pivot: '0.7050',
    levels: [r('0.7082'), r('0.7070'), p('0.7050'), l('0.7032'), s('0.7000'), s('0.6988')],
  },
  {
    id: 'audjpy', symbol: 'AUD/JPY', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:16 AM CET',
    direction: 'up', move: '66 - 86 PIPS', target: '111.83', pivot: '110.74',
    levels: [r('111.83'), r('111.63'), l('110.96'), p('110.74'), s('110.40'), s('110.21')],
  },
  {
    id: 'usdchf', symbol: 'USD/CHF', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:16 AM CET',
    direction: 'up', move: '10 - 21 PIPS', target: '0.8321', pivot: '0.8263',
    levels: [r('0.8321'), r('0.8310'), l('0.8300'), p('0.8263'), s('0.8243'), s('0.8232')],
  },
  {
    id: 'usdjpy', symbol: 'USD/JPY', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:15 AM CET',
    direction: 'up', move: '48 - 65 PIPS', target: '158.46', pivot: '157.68',
    levels: [r('158.46'), r('158.29'), l('157.81'), p('157.68'), s('157.40'), s('157.23')],
  },
  {
    id: 'usdcad', symbol: 'USD/CAD', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:15 AM CET',
    direction: 'up', move: '13 - 27 PIPS', target: '1.4095', pivot: '1.4031',
    levels: [r('1.4095'), r('1.4081'), l('1.4068'), p('1.4031'), s('1.4008'), s('1.3994')],
  },
  {
    id: 'eurusd', symbol: 'EUR/USD', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:13 AM CET',
    direction: 'down', move: '5 - 17 PIPS', target: '1.1101', pivot: '1.1172',
    levels: [r('1.1204'), r('1.1192'), p('1.1172'), l('1.1126'), s('1.1113'), s('1.1101')],
  },
  {
    id: 'eurgbp', symbol: 'EUR/GBP', assetClass: 'forex', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:13 AM CET',
    direction: 'down', move: '14 - 19 PIPS', target: '0.8346', pivot: '0.8373',
    levels: [r('0.8388'), r('0.8382'), p('0.8373'), l('0.8365'), s('0.8351'), s('0.8346')],
  },
  {
    id: 'dowjones', symbol: 'Dow Jones', assetClass: 'indices', ...daily,
    localTime: '1:09 AM', publishedAt: 'Tuesday, October 27, 2026 8:39:01 PM CET',
    direction: 'up', move: '2.64%', target: '53,800', pivot: '51,580',
    levels: [r('53800'), r('52920'), l('52417'), p('51580'), s('50540'), s('49900')],
  },
  {
    id: 'dax', symbol: 'Dax', assetClass: 'indices', ...daily,
    localTime: '2:06 PM', publishedAt: 'Monday, October 26, 2026 9:36:55 AM CET',
    direction: 'up', move: '3.66%', target: '26,200', pivot: '24,610',
    levels: [r('26200'), r('25800'), l('25275'), p('24610'), s('24200'), s('23900')],
  },
  {
    id: 'crude', symbol: 'Crude Oil (WTI)', assetClass: 'commodities', ...intraday,
    localTime: '11:43 AM', publishedAt: 'Wednesday, October 28, 2026 7:13:59 AM CET',
    direction: 'down', move: '2.09%', target: '99.45', pivot: '101.95',
    levels: [r('103.90'), r('103.10'), p('101.95'), s('100.30'), s('99.45')],
  },
  {
    id: 'gold', symbol: 'Gold', assetClass: 'commodities', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:18 AM CET',
    direction: 'down', move: '1.39%', target: '3,978', pivot: '4,062',
    levels: [r('4112'), r('4093'), p('4062'), l('4034'), s('3996'), s('3978')],
  },
  {
    id: 'silver', symbol: 'Silver', assetClass: 'commodities', ...intraday,
    localTime: '11:30 AM', publishedAt: 'Wednesday, October 28, 2026 7:00:17 AM CET',
    direction: 'up', move: '4.00%', target: '56.04', pivot: '53.70',
    levels: [r('56.04'), r('55.54'), p('53.70'), s('52.86'), s('52.36')],
  },
  {
    id: 'corn', symbol: 'Corn (CME)', assetClass: 'commodities', ...intraday,
    localTime: '7:55 AM', publishedAt: 'Wednesday, October 28, 2026 3:25:45 AM CET',
    direction: 'down', move: '1.28%', target: '444.50', pivot: '452.75',
    levels: [r('457.50'), r('455.75'), p('452.75'), l('450.25'), s('446.25'), s('444.50')],
  },
  {
    id: 'copper', symbol: 'Copper (CME)', assetClass: 'commodities', ...intraday,
    localTime: '7:52 AM', publishedAt: 'Wednesday, October 28, 2026 3:22:58 AM CET',
    direction: 'up', move: '1.60%', target: '6.7480', pivot: '6.5965',
    levels: [r('6.7480'), r('6.7145'), l('6.6420'), p('6.5965'), s('6.5410'), s('6.5075')],
  },
];

export type AnalysisHorizon = 'intraday' | 'daily' | 'weekly';

export interface HorizonMove {
  id: AnalysisHorizon;
  label: string;
  move: string;
  direction: Direction;
}

/** The written Trading Central analysis shown when a setup is opened. Same shape the backend will send per setup. */
export interface TechnicalAnalysis {
  horizons: HorizonMove[];
  localTime: string;
  publishedAt: string;
  headline: string;
  keyLevel: { kind: 'resistance' | 'support'; value: string };
  preference: string;
  alternative: string;
  comment: string;
}

/** Copied word for word from the Trading Central screenshot; every other setup is built from its own levels below. */
const technicalAnalyses: Partial<Record<string, TechnicalAnalysis>> = {
  eurusd: {
    horizons: [
      { id: 'intraday', label: 'Intraday', move: '13 - 25 PIPS', direction: 'down' },
      { id: 'daily', label: 'Daily', move: '140 - 221 PIPS', direction: 'down' },
      { id: 'weekly', label: 'Weekly', move: '19 - 279 PIPS', direction: 'down' },
    ],
    localTime: '2:30 PM',
    publishedAt: 'Wednesday, October 28, 2026 10:00:13 AM CET',
    headline: 'EUR/USD intraday : Key support level approaches',
    keyLevel: { kind: 'resistance', value: '1.1192' },
    preference: 'The downside prevails as long as 1.1172 is resistance, with 1.1113 and 1.1101 as targets',
    alternative: 'Above 1.1172, look for 1.1192 and 1.1204.',
    comment: 'Prices are now approaching our first target. Reaching this level could trigger a pullback. Conversely, a decisive break below it could lead to a further fall.',
  },
};

export const analysisCopy = {
  targetLabel: 'Target level found at',
  pivotLabel: 'Pivot level found at',
  resistanceLabel: 'Resistance level found at',
  supportLabel: 'Support level found at',
  preference: 'Our preference',
  alternative: 'Alternative scenario',
  comment: 'Comment',
  storyteller: 'Storyteller',
  learningCenter: 'Learning Center',
  searchPlaceholder: 'Enter Symbol or Name',
};

export type PerformanceDirection = Direction | 'flat';

/** Trading Central Storyteller write-up, copied from the opened panel. */
export interface StorytellerStory {
  title: string;
  dateLabel: string;
  summary: string;
  strategy: {
    title: string;
    intro: string;
    plan: string;
    alternative: string;
    performance: { label: string; value: string; direction: PerformanceDirection }[];
  };
  insights: { trend: string; direction: Direction; note: string; points: string[] };
  multiTimeframe: string;
}

const storytellerStories: Partial<Record<string, StorytellerStory>> = {
  eurusd: {
    title: 'EUR/USD struggles near support at 1.1113 as bearish trend continues',
    dateLabel: 'October 28, 2026, 14:30',
    summary:
      'The EUR/USD pair is currently trading at 1.1126, below the pivot point of 1.1172, indicating a bearish trend. Watch for a potential rebound towards 1.1172 before considering short positions, or look for bearish movement if the support at 1.1113 is broken.',
    strategy: {
      title: 'Intraday trading strategy',
      intro:
        'Last price at 1.1126, with a bearish outlook, standing below the pivot point at 1.1172 compared to a first support at 1.1113. The current configuration shows an unfavorable risk/reward ratio.',
      plan: 'Suggest to wait for a price rebound towards the zone between 1.1172 and 1.1149 before opening Short positions, or play bearish acceleration if support at 1.1113 is broken.',
      alternative: 'In case of an upside breakout of 1.1172, expect a rise towards the first resistance at 1.1192.',
      performance: [
        { label: 'Last price (vs last close)', value: '0.00%', direction: 'flat' },
        { label: 'Last price (vs last week)', value: '-0.96%', direction: 'down' },
        { label: 'Last price (vs last month)', value: '-2.14%', direction: 'down' },
      ],
    },
    insights: {
      trend: 'Bearish',
      direction: 'down',
      note: 'From a chartist point of view, over the short term, prices have either entered within a bearish reversal process or started again a short-term bearish dynamic.',
      points: [
        'The RSI is below 50, indicating bearish momentum.',
        'The MACD is negative but above its signal line, suggesting potential for upward movement.',
        'The price is below both the 20 and 50 period moving averages, reinforcing a bearish trend.',
      ],
    },
    multiTimeframe:
      'As Trading Central identifies short-term & intraday bearish cycles in the same direction, keep your current short sell position or consider exiting your long one.',
  },
};

export const storytellerCopy = {
  name: 'Storyteller',
  about:
    "Trading Central's Storyteller leverages proprietary natural language processing and large language models built and trained in-house by our award-winning Labs and Research teams. Its uniquely specialized financial expertise offers investors the approachable support they need to navigate market complexity.",
  whatToKnow: 'What you should know',
  strategy: 'Intraday trading strategy',
  insights: 'Short-term insights',
  multiTimeframe: 'Multi-timeframe analysis',
  tradingPlan: 'Trading plan:',
  alternative: 'Alternative scenario:',
  performance: 'Price performance:',
  trend: 'Trend:',
  // The screenshot cuts this sentence off here; the rest was not visible.
  aiNote: "This content has been generated with the assistance of artificial intelligence based on Trading Central's proprietary market data and",
};

const HORIZON_BY_TIMEFRAME: Record<TechnicalView['timeframe'], AnalysisHorizon> = { '30 MIN': 'intraday', DAILY: 'daily' };
const HORIZON_LABEL: Record<AnalysisHorizon, string> = { intraday: 'Intraday', daily: 'Daily', weekly: 'Weekly' };

function parseLevel(value: string) {
  return Number(value.replace(/,/g, ''));
}

/** Levels either side of the pivot, nearest first, plus the last price when the chart labelled it. */
function levelLadder(view: TechnicalView) {
  const priced = view.levels.filter((level) => level.kind !== 'last');
  const pivotIndex = priced.findIndex((level) => level.kind === 'pivot');
  return {
    above: priced.slice(0, pivotIndex).map((level) => level.value).reverse(),
    below: priced.slice(pivotIndex + 1).map((level) => level.value),
    last: view.levels.find((level) => level.kind === 'last')?.value,
  };
}

function twoLevels(levels: string[], fallback: string) {
  return levels.length > 0 ? levels.slice(0, 2).join(' and ') : fallback;
}

/** "11:30 AM" → "11:30", "2:06 PM" → "14:06", matching the Storyteller date line. */
function toClock24(localTime: string) {
  const [clock, meridiem] = localTime.split(' ');
  const [hours, minutes] = clock.split(':').map(Number);
  const hours24 = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "Wednesday, October 28, 2026 7:00:16 AM CET" → "October 28, 2026". */
function toDateLabel(publishedAt: string) {
  const [, monthDay, yearAndTime] = publishedAt.split(', ');
  return `${monthDay}, ${yearAndTime.split(' ')[0]}`;
}

function buildAnalysis(view: TechnicalView): TechnicalAnalysis {
  const isUp = view.direction === 'up';
  const horizon = HORIZON_BY_TIMEFRAME[view.timeframe];
  const { above, below } = levelLadder(view);
  const towards = isUp ? above : below;
  const against = isUp ? below : above;

  return {
    horizons: [{ id: horizon, label: HORIZON_LABEL[horizon], move: view.move, direction: view.direction }],
    localTime: view.localTime,
    publishedAt: view.publishedAt,
    headline: `${view.symbol} ${HORIZON_LABEL[horizon].toLowerCase()} : ${isUp ? 'The upside prevails' : 'Key support level approaches'}`,
    keyLevel: { kind: isUp ? 'support' : 'resistance', value: against[0] ?? view.pivot },
    preference: `The ${isUp ? 'upside' : 'downside'} prevails as long as ${view.pivot} is ${isUp ? 'support' : 'resistance'}, with ${twoLevels(towards, view.target)} as targets`,
    alternative: `${isUp ? 'Below' : 'Above'} ${view.pivot}, look for ${twoLevels(against, view.pivot)}.`,
    comment: `As long as ${view.pivot} holds as ${isUp ? 'support' : 'resistance'}, a move towards ${view.target} remains our favoured scenario. A decisive break ${isUp ? 'below' : 'above'} it would call this view into question.`,
  };
}

function buildStory(view: TechnicalView): StorytellerStory {
  const isUp = view.direction === 'up';
  const horizonLabel = HORIZON_LABEL[HORIZON_BY_TIMEFRAME[view.timeframe]];
  const { above, below, last } = levelLadder(view);
  const firstAbove = above[0] ?? view.target;
  const firstBelow = below[0] ?? view.target;
  const subject = view.assetClass === 'forex' ? `The ${view.symbol} pair` : view.symbol;
  const side = isUp ? 'above' : 'below';
  const position = last ? `is currently trading at ${last}, ${side} the pivot point of ${view.pivot}` : `is currently trading ${side} the pivot point of ${view.pivot}`;
  const decimals = view.pivot.split('.')[1]?.length ?? 0;
  const zoneEdge = ((parseLevel(view.pivot) + parseLevel(last ?? (isUp ? firstAbove : firstBelow))) / 2).toFixed(decimals);
  const trend = isUp ? 'bullish' : 'bearish';

  return {
    title: isUp ? `${view.symbol} holds above ${view.pivot} as bullish trend continues` : `${view.symbol} struggles near support at ${firstBelow} as bearish trend continues`,
    dateLabel: `${toDateLabel(view.publishedAt)}, ${toClock24(view.localTime)}`,
    summary: isUp
      ? `${subject} ${position}, indicating a bullish trend. Watch for a potential pullback towards ${view.pivot} before considering long positions, or look for bullish movement if the resistance at ${firstAbove} is broken.`
      : `${subject} ${position}, indicating a bearish trend. Watch for a potential rebound towards ${view.pivot} before considering short positions, or look for bearish movement if the support at ${firstBelow} is broken.`,
    strategy: {
      title: `${horizonLabel} trading strategy`,
      intro: isUp
        ? `${last ? `Last price at ${last}` : 'Price'}, with a bullish outlook, standing above the pivot point at ${view.pivot} compared to a first resistance at ${firstAbove}.`
        : `${last ? `Last price at ${last}` : 'Price'}, with a bearish outlook, standing below the pivot point at ${view.pivot} compared to a first support at ${firstBelow}.`,
      plan: isUp
        ? `Suggest to wait for a price pullback towards the zone between ${view.pivot} and ${zoneEdge} before opening Long positions, or play bullish acceleration if resistance at ${firstAbove} is broken.`
        : `Suggest to wait for a price rebound towards the zone between ${view.pivot} and ${zoneEdge} before opening Short positions, or play bearish acceleration if support at ${firstBelow} is broken.`,
      alternative: isUp
        ? `In case of a downside breakout of ${view.pivot}, expect a fall towards the first support at ${firstBelow}.`
        : `In case of an upside breakout of ${view.pivot}, expect a rise towards the first resistance at ${firstAbove}.`,
      performance: [],
    },
    insights: {
      trend: isUp ? 'Bullish' : 'Bearish',
      direction: view.direction,
      note: `From a chartist point of view, over the short term, prices have either entered within a ${trend} reversal process or started again a short-term ${trend} dynamic.`,
      points: isUp
        ? [
            'The RSI is above 50, indicating bullish momentum.',
            'The MACD is positive and above its signal line, supporting further upside.',
            'The price is above both the 20 and 50 period moving averages, reinforcing a bullish trend.',
          ]
        : [
            'The RSI is below 50, indicating bearish momentum.',
            'The MACD is negative and below its signal line, supporting further downside.',
            'The price is below both the 20 and 50 period moving averages, reinforcing a bearish trend.',
          ],
    },
    multiTimeframe: isUp
      ? `As Trading Central identifies short-term & ${horizonLabel.toLowerCase()} bullish cycles in the same direction, keep your current long position or consider exiting your short one.`
      : `As Trading Central identifies short-term & ${horizonLabel.toLowerCase()} bearish cycles in the same direction, keep your current short sell position or consider exiting your long one.`,
  };
}

/** Until the backend sends these per setup, every setup gets a write-up built from its own levels. */
export function getTechnicalAnalysis(view: TechnicalView): TechnicalAnalysis {
  return technicalAnalyses[view.id] ?? buildAnalysis(view);
}

export function getStorytellerStory(view: TechnicalView): StorytellerStory {
  return storytellerStories[view.id] ?? buildStory(view);
}
