export type InsightPointKind = 'volatility' | 'decision' | 'notice' | 'catalyst';

export interface InsightPoint {
  kind: InsightPointKind;
  title: string;
  body: string;
}

export interface RegionInsight {
  id: string;
  country: string;
  title: string;
  atr: string;
  when: string;
  points: InsightPoint[];
}

export interface CalendarStory {
  title: string;
  summary: string;
  regions: RegionInsight[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const calendarStoryCopy = {
  name: 'Storyteller',
  about: "Storyteller Economic Insight uses Trading Central's market data to summarise the upcoming economic events most likely to move your markets.",
  generating: 'Generating your insight...',
  nextMajorEvent: 'Next Major Event by Region',
  atrNote: 'ATR: Average True Range (one hour after event)',
  aiNote: "This content has been generated with the assistance of artificial intelligence based on Trading Central's proprietary market data and analytics.",
  help: 'Help',
  productSupport: 'Product Support',
  faq: 'FAQ',
};

/** Copied from the Trading Central Storyteller screenshots (Oct 28). */
export const calendarStory: CalendarStory = {
  title: 'EUR/USD: anticipated volatility ahead of key interest rate decisions',
  summary:
    'Today at 18:00 UTC, the Fed is expected to maintain the interest rate at 4%. Historically, this could lead to a movement of about 50.51 pips in EUR/USD. Tomorrow, on October 29 at 13:15 UTC, the ECB will announce its interest rate decision, which may result in an average move of 32.32 pips in EUR/USD.',
  regions: [
    {
      id: 'fed',
      country: 'US',
      title: 'Fed Interest Rate Decision',
      atr: 'ATR: ~50.51 pips',
      when: 'Oct 28, 18:00 UTC',
      points: [
        {
          kind: 'volatility',
          title: 'Volatility impact',
          body: 'Historically, EUR/USD tends to exhibit elevated volatility following interest-rate decisions. On average, EUR/USD moves 50.51 pips within one hour after the interest-rate decision is announced.',
        },
        { kind: 'decision', title: 'Interest-rate decision', body: 'Later today, Fed Interest Rate Decision is expected to maintain its key interest rate at 4%.' },
        { kind: 'notice', title: 'Previous interest-rate decision', body: 'Last time, Fed Interest Rate Decision hiked its key interest rate to 4%.' },
        { kind: 'notice', title: 'Policy outlook', body: 'The statement provided by the central bank will also shape expectations for future policy moves.' },
      ],
    },
    {
      id: 'ecb',
      country: 'EA',
      title: 'ECB Interest Rate Decision',
      atr: 'ATR: ~32.32 pips',
      when: 'Oct 29, 13:15 UTC',
      points: [
        {
          kind: 'notice',
          title: 'No major economic event',
          body: 'No major economic releases are scheduled in Euro Area today. Without a clear catalyst, prices are likely to be driven by technical factors and overall risk sentiment.',
        },
        {
          kind: 'catalyst',
          title: 'Next catalyst',
          body: 'Market focus now turns to the upcoming ECB Interest Rate Decision, scheduled for 13:15 UTC on October 29.',
        },
        {
          kind: 'volatility',
          title: 'Volatility impact',
          body: 'Historically, ECB Interest Rate Decision tends to produce an average move of around 32.32 pips in EUR/USD.',
        },
      ],
    },
  ],
};

/** Questions copied from the Product Support screenshot; answers are drafted until the official copy is supplied. */
export const calendarFaq: FaqItem[] = [
  {
    question: 'How often is the Economic Calendar updated?',
    answer: 'The calendar is updated in real time. Actual figures appear within seconds of each release, and forecasts and schedules are refreshed as soon as they change.',
  },
  {
    question: 'Which economic events should I pay attention to?',
    answer: 'Focus on high-importance events for the countries behind the currencies and markets you trade — typically interest-rate decisions, inflation, employment and GDP releases.',
  },
  {
    question: 'Who decides the importance level of an economic event?',
    answer: "Trading Central's analysts rate each event by how strongly markets have historically reacted to it, and review the ratings regularly.",
  },
  {
    question: 'What is Price Volatility?',
    answer: 'Price volatility is how much and how quickly a price moves over a given period. Higher volatility means larger, faster swings.',
  },
  {
    question: 'What is the True Range?',
    answer: "The True Range is the greatest of: the current high minus the current low, the current high minus the previous close, and the previous close minus the current low. It captures a period's full movement including gaps.",
  },
  {
    question: 'What are pips?',
    answer: 'A pip is the smallest standard price increment of a currency pair — usually 0.0001, or 0.01 for pairs quoted against the Japanese yen.',
  },
  {
    question: 'Why do you convert True Range calculations into pips?',
    answer: 'Pips give a common unit across currency pairs, so the size of a move can be compared regardless of the pair’s price level.',
  },
  {
    question: 'How is the Take Profit and Stop Loss calculated?',
    answer: 'Take Profit and Stop Loss levels are derived from the average True Range observed after past releases of the same event, so they reflect the move that event typically produces.',
  },
  {
    question: 'What is Storyteller Economic Insight?',
    answer: 'Storyteller Economic Insight is an AI-generated summary of the upcoming economic events most likely to move your markets, built on Trading Central’s market data and analytics.',
  },
  {
    question: 'How does it decide which economic event the Storyteller highlights?',
    answer: 'It ranks upcoming events by importance and by the volatility they have historically caused, then highlights the most significant one for each region.',
  },
  {
    question: 'How does Storyteller EI know which countries and currencies to analyze?',
    answer: 'It follows the countries and currencies behind the most traded instruments, starting with the major pairs such as EUR/USD.',
  },
];
