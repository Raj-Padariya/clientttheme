import { CALENDAR_YEAR, countryNames, type EconomicEvent } from './economicEvents';

export type DetailTab = 'event' | 'price' | 'volatility' | 'impact';

export interface PriceCandle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface EventHistoryPoint {
  label: string;
  axisLabel: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
}

export interface VolatilityMove {
  axisLabel: string;
  changePips: number;
  trueRangePips: number;
}

export interface ImpactWindow {
  dateLabel: string;
  time: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  rangePips: number;
  trendPips: number;
  startPrice: number;
}

/** Everything the event detail modal shows. Same shape the backend will send per event. */
export interface EventDetail {
  baseName: string;
  description: string;
  unit: string;
  pair: string;
  pipSize: number;
  decimals: number;
  lastPrice: number;
  priceTime: string;
  /** Oldest first; the last point is the release on the calendar row. */
  history: EventHistoryPoint[];
  /** Long-run overview drawn under the event chart. */
  navigator: number[];
  priceCandles: PriceCandle[];
  /** Candle index of each history point, for the diamonds on the price chart. */
  eventCandleIndexes: number[];
  priceNavigator: number[];
  volatilityHorizon: string;
  eventFilter: string;
  impactHorizon: string;
  /** One per past release (the latest has no 4-hour window yet). */
  moves: VolatilityMove[];
  impacts: ImpactWindow[];
}

export const detailCopy = {
  tabs: { event: 'Event Chart', price: 'Price Chart', volatility: 'Volatility', impact: 'Impact' } satisfies Record<DetailTab, string>,
  actualVsForecast: 'Actual vs Forecast',
  forecast: 'Forecast',
  actual: 'Actual',
  previous: 'Previous',
  pastEvents: 'Past Events',
  economicEvents: 'Economic Events',
  historicalImpact: 'Historical Impact',
  impactOfPastEvents: 'Impact of Past Events',
  priceChange: (pair: string, horizon: string) => `${pair}: Price change ${horizon}`,
  bullish: 'Bullish',
  bearish: 'Bearish',
  trueRange: 'True Range',
  average: 'average',
  volatilityIntro: 'Here we summarize the volatility and direction of price movement observed after historical events.',
  endedBullish: 'ended bullish',
  endedBearish: 'ended bearish',
  events: 'events',
  priceChangeHeading: (pair: string) => `Price Change ( ${pair} )`,
  volatilityHeading: (pair: string) => `Volatility ( ${pair} )`,
  averageRange: 'Average range after the event (TR)',
  actualAbove: 'Actual Above Forecast',
  actualBelow: 'Actual Below Forecast',
  actualInline: 'Actual In Line With Forecast',
  prevEvent: 'Prev Event',
  nextEvent: 'Next Event',
  noFigures: 'No figures have been published for this event yet.',
  copyright: '© 2026 TRADING CENTRAL',
  volatilityInfo: 'Price change and True Range are measured on the selected pair over the selected window after each past release of this event.',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RELEASE_PERIOD = /\s+(?:(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:\/\d{1,2})?|Q[1-4])$/;
const HISTORY_LENGTH = 13;
const PRICE_CANDLES = 240;

const PAIR_BY_COUNTRY: Record<string, string> = {
  EA: 'EUR/USD', DE: 'EUR/USD', FR: 'EUR/USD', IT: 'EUR/USD', NL: 'EUR/USD', AT: 'EUR/USD', US: 'EUR/USD',
  GB: 'GBP/USD', JP: 'USD/JPY', CA: 'USD/CAD', CH: 'USD/CHF', NZ: 'NZD/USD', SE: 'USD/SEK', NO: 'USD/NOK',
  DK: 'USD/DKK', HU: 'EUR/HUF', PL: 'EUR/PLN', TR: 'USD/TRY', CN: 'USD/CNH', HK: 'USD/HKD', KR: 'USD/KRW',
  SG: 'USD/SGD', MX: 'USD/MXN', BR: 'USD/BRL', ZA: 'USD/ZAR',
};

/** [last price, pip size, decimals, typical 4-hour range in pips] — demo values until the price feed is connected. */
const PAIR_MARKET: Record<string, [number, number, number, number]> = {
  'EUR/USD': [1.1126, 0.0001, 4, 30],
  'GBP/USD': [1.3292, 0.0001, 4, 40],
  'USD/JPY': [157.81, 0.01, 2, 45],
  'USD/CAD': [1.4068, 0.0001, 4, 35],
  'USD/CHF': [0.83, 0.0001, 4, 30],
  'NZD/USD': [0.5712, 0.0001, 4, 30],
  'USD/SEK': [9.4215, 0.0001, 4, 400],
  'USD/NOK': [10.118, 0.0001, 4, 420],
  'USD/DKK': [6.711, 0.0001, 4, 220],
  'EUR/HUF': [389.45, 0.01, 2, 120],
  'EUR/PLN': [4.2475, 0.0001, 4, 160],
  'USD/TRY': [41.85, 0.0001, 4, 900],
  'USD/CNH': [7.122, 0.0001, 4, 150],
  'USD/HKD': [7.7712, 0.0001, 4, 25],
  'USD/KRW': [1385.4, 0.01, 2, 600],
  'USD/SGD': [1.2915, 0.0001, 4, 35],
  'USD/MXN': [18.42, 0.0001, 4, 700],
  'USD/BRL': [5.38, 0.0001, 4, 450],
  'USD/ZAR': [17.12, 0.0001, 4, 650],
  'EUR/ZAR': [18.5307, 0.0001, 4, 630],
};

/** Copied word for word from the Trading Central screenshots. */
const exactDescriptions: Partial<Record<string, string>> = {
  'IT:PPI YoY':
    'In Italy, the industrial producer price index measures the evolution of output prices for goods manufactured in Italy and sold on the domestic and non-domestic markets.',
};

function seededRandom(seedText: string) {
  let state = 2166136261;
  for (const char of seedText) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

function parseFigure(value: string | undefined): { value: number; unit: string; decimals: number } | null {
  const match = value?.trim().match(/^(-?\d+(?:\.(\d+))?)\s*([%KMBT]?)$/);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[3], decimals: match[2]?.length ?? 0 };
}

export function eventBaseName(name: string) {
  return name.replace(RELEASE_PERIOD, '');
}

function monthAt(offset: number) {
  // offset 0 is Oct of the year before the calendar year, matching the 13-release window in the screenshot.
  const monthIndex = (9 + offset) % 12;
  const year = CALENDAR_YEAR - 1 + Math.floor((9 + offset) / 12);
  return { monthIndex, year, axisLabel: monthIndex === 0 ? String(year) : MONTHS[monthIndex] };
}

function buildPriceCandles(random: () => number, lastPrice: number, decimals: number): PriceCandle[] {
  const startPrice = lastPrice * (1 + (random() - 0.35) * 0.14);
  const step = (lastPrice - startPrice) / PRICE_CANDLES;
  const noise = lastPrice * 0.006;
  const candles: PriceCandle[] = [];
  let close = startPrice;
  for (let index = 0; index < PRICE_CANDLES; index += 1) {
    const open = close;
    const isLast = index === PRICE_CANDLES - 1;
    close = isLast ? lastPrice : open + step + (random() - 0.5) * noise;
    const high = Math.max(open, close) + random() * noise * 0.6;
    const low = Math.min(open, close) - random() * noise * 0.6;
    candles.push({ open: round(open, decimals), high: round(high, decimals), low: round(low, decimals), close: round(close, decimals) });
  }
  return candles;
}

function buildDetail(event: EconomicEvent): EventDetail {
  const random = seededRandom(event.id);
  const baseName = eventBaseName(event.name);
  const countryName = countryNames[event.country] ?? event.country;
  const pair = PAIR_BY_COUNTRY[event.country] ?? 'EUR/USD';
  const [lastPrice, pipSize, decimals, typicalPips] = PAIR_MARKET[pair] ?? PAIR_MARKET['EUR/USD'];

  const actual = parseFigure(event.actual);
  const forecast = parseFigure(event.forecast);
  const previous = parseFigure(event.previous);
  const reference = forecast ?? actual ?? previous;
  const figureDecimals = Math.max(reference?.decimals ?? 1, 1);
  const spread = reference ? Math.max(Math.abs(reference.value) * 0.35, reference.unit === '%' ? 0.3 : 0.5) : 0;

  const history: EventHistoryPoint[] = Array.from({ length: HISTORY_LENGTH }, (_, offset) => {
    const { monthIndex, year, axisLabel } = monthAt(offset);
    const isLatest = offset === HISTORY_LENGTH - 1;
    const label = isLatest ? `${MONTHS[monthIndex]} ${event.day}, ${year}` : `${MONTHS[monthIndex]} ${year}`;
    if (isLatest) return { label, axisLabel, actual: actual?.value ?? null, forecast: forecast?.value ?? null, previous: previous?.value ?? null };
    if (!reference) return { label, axisLabel, actual: null, forecast: null, previous: null };
    return {
      label,
      axisLabel,
      actual: round(reference.value + (random() - 0.5) * 2 * spread, figureDecimals),
      forecast: round(reference.value + (random() - 0.5) * spread, figureDecimals),
      previous: null,
    };
  });
  if (previous && history.length > 1) history[history.length - 2].actual = previous.value;
  for (let index = 1; index < history.length - 1; index += 1) history[index].previous = history[index - 1].actual;

  const navigator = Array.from({ length: 52 }, () => (reference ? Math.abs(reference.value) * (0.3 + random() * 1.4) : random()));
  const priceCandles = buildPriceCandles(random, lastPrice, decimals);
  const eventCandleIndexes = history.map((_, offset) => Math.min(PRICE_CANDLES - 1, Math.round(((offset + 0.4) / HISTORY_LENGTH) * PRICE_CANDLES)));
  const priceNavigator = Array.from({ length: 120 }, (_, index) => lastPrice * (1 + Math.sin(index / 9) * 0.04 + (random() - 0.5) * 0.03));

  const moves: VolatilityMove[] = history.slice(0, -1).map((point) => {
    const trueRangePips = round(typicalPips * (0.5 + random() * 1.4), 1);
    const changePips = round(trueRangePips * (0.1 + random() * 0.7) * (random() > 0.45 ? 1 : -1), 1);
    return { axisLabel: point.axisLabel, changePips, trueRangePips };
  });

  const impacts: ImpactWindow[] = history.slice(0, -1).map((point, index) => ({
    dateLabel: point.label.replace(/^(\w+) (\d+), (\d+)$/, '$3 $1 $2').replace(/^(\w+) (\d{4})$/, '$2 $1'),
    time: event.time,
    actual: point.actual,
    forecast: point.forecast,
    previous: point.previous,
    rangePips: round(moves[index].trueRangePips * 0.7, 1),
    trendPips: round(moves[index].changePips * 0.5, 1),
    startPrice: round(priceCandles[eventCandleIndexes[index]].close, decimals),
  }));

  return {
    baseName,
    description:
      exactDescriptions[`${event.country}:${baseName}`] ??
      `${countryName} ${baseName}. Trading Central tracks how ${pair} has moved after each past release of this indicator, so you can compare today's figure with its history.`,
    unit: (actual ?? forecast ?? previous)?.unit ?? '',
    pair,
    pipSize,
    decimals,
    lastPrice,
    priceTime: `${event.time}:00`,
    history,
    navigator,
    priceCandles,
    eventCandleIndexes,
    priceNavigator,
    volatilityHorizon: '4 hours after event',
    eventFilter: 'All events',
    impactHorizon: '1 hour after event',
    moves,
    impacts,
  };
}

/** IT Industrial Sales MoM, read off the Trading Central event, price, volatility and impact screenshots. */
function withIndustrialSalesData(detail: EventDetail): EventDetail {
  const labels = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 27, 2026', 'Jun 25, 2026', 'Jul 29, 2026', 'Aug 28, 2026', 'Sep 29, 2026', 'Oct 28, 2026'];
  const actuals = [-0.7, 2.1, -0.5, -0.1, 0.5, -0.3, 0.6, 2, 0.3, 0.6, -1, 1.7, -0.9];
  const forecasts = [0.3, 0.4, -1.2, 0.4, 0.6, -0.2, 0.5, -0.4, -0.7, -0.7, -0.3, 0.5, -0.8];
  const history = detail.history.map((point, index) => ({
    ...point,
    label: labels[index],
    actual: actuals[index],
    forecast: forecasts[index],
    previous: index === 11 ? -0.9 : index === 0 ? null : actuals[index - 1],
  }));
  const changes = [20, 80, 80, -550, 450, -560, 400, -130, -120, 20, 250, -650];
  // Chosen to match the bar heights in the screenshot while averaging exactly 633.05 pips.
  const trueRanges = [560, 345, 350, 1420, 560, 1180, 610, 480, 335, 500, 420, 836.6];
  const moves = changes.map((changePips, index) => ({ axisLabel: history[index].axisLabel, changePips, trueRangePips: trueRanges[index] }));
  const impacts = detail.impacts.map((impact, index) => ({
    ...impact,
    actual: history[index].actual,
    forecast: history[index].forecast,
    previous: history[index].previous,
    rangePips: Number((trueRanges[index] * 0.7).toFixed(1)),
    trendPips: Number((changes[index] * 0.5).toFixed(1)),
  }));
  impacts[11] = { dateLabel: '2026 Sep 29', time: '13:30', actual: 1.7, forecast: 0.5, previous: -0.9, rangePips: 505, trendPips: -261.8, startPrice: 18.6505 };

  return { ...detail, pair: 'EUR/ZAR', pipSize: 0.0001, decimals: 4, lastPrice: 18.5307, priceTime: '15:25:00', unit: '%', history, moves, impacts };
}

const exactDetails: Partial<Record<string, (detail: EventDetail) => EventDetail>> = {
  'IT:Industrial Sales MoM': withIndustrialSalesData,
};

const detailCache = new Map<string, EventDetail>();

/** Until the backend sends event history, every event gets one built from its own figures; screenshot events use the real numbers. */
export function getEventDetail(event: EconomicEvent): EventDetail {
  const cached = detailCache.get(event.id);
  if (cached) return cached;
  const generated = buildDetail(event);
  const exact = exactDetails[`${event.country}:${generated.baseName}`];
  const detail = exact ? exact(generated) : generated;
  if (exact) {
    // The real pair differs from the generated one, so rebuild the price path around the real last price.
    const random = seededRandom(`${event.id}-price`);
    detail.priceCandles = buildPriceCandles(random, detail.lastPrice, detail.decimals);
  }
  detailCache.set(event.id, detail);
  return detail;
}

/** 5-minute candles from 2h before to 1.5h after the release, shaped so the hour after it spans exactly `rangePips` and ends `trendPips` away. */
export function buildImpactCandles(impact: ImpactWindow, detail: EventDetail, seed: string) {
  const random = seededRandom(seed);
  const pip = detail.pipSize;
  const range = impact.rangePips * pip;
  const trend = impact.trendPips * pip;
  const isBearish = trend < 0;
  const counter = (range - Math.abs(trend)) * 0.6;
  const extremeFirst = impact.startPrice + (isBearish ? counter : -counter);
  const extremeSecond = isBearish ? extremeFirst - range : extremeFirst + range;
  const endPrice = impact.startPrice + trend;
  const noise = range * 0.08;

  const path: number[] = [];
  for (let index = 0; index < 24; index += 1) {
    const progress = index / 23;
    path.push(impact.startPrice + (1 - progress) * range * (isBearish ? 0.55 : -0.55) + (random() - 0.5) * noise * 2);
  }
  const waypoints = [impact.startPrice, extremeFirst, extremeSecond, endPrice];
  const waypointAt = [0, 3, 10, 12];
  for (let index = 1; index <= 12; index += 1) {
    const segment = waypointAt.findIndex((at) => at >= index);
    const from = waypointAt[segment - 1];
    const to = waypointAt[segment];
    const progress = (index - from) / (to - from);
    const value = waypoints[segment - 1] + (waypoints[segment] - waypoints[segment - 1]) * progress;
    path.push(index === 3 || index === 10 || index === 12 ? value : value + (random() - 0.5) * noise);
  }
  for (let index = 0; index < 6; index += 1) path.push(endPrice + (random() - 0.5) * noise * 2);

  const top = Math.max(extremeFirst, extremeSecond);
  const bottom = Math.min(extremeFirst, extremeSecond);
  return path.map((close, index): PriceCandle => {
    const open = index === 0 ? close + (random() - 0.5) * noise : path[index - 1];
    let high = Math.max(open, close) + random() * noise;
    let low = Math.min(open, close) - random() * noise;
    const inWindow = index >= 24 && index <= 35;
    if (inWindow) {
      high = Math.min(high, top);
      low = Math.max(low, bottom);
    }
    const isFirstExtreme = index === 26;
    const isSecondExtreme = index === 33;
    if ((isFirstExtreme && isBearish) || (isSecondExtreme && !isBearish)) high = top;
    if ((isFirstExtreme && !isBearish) || (isSecondExtreme && isBearish)) low = bottom;
    return { open, high, low, close };
  });
}
