const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface PeriodWindow {
  start: number;
  end: number;
  ticks: number[];
}

/** Parses a local `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` string without a UTC shift. */
export function parseLocal(value: string): Date {
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM-DD HH:mm`, the chart axis/tooltip stamp. */
export function axisStamp(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Window of `days` calendar days ending at `windowEnd` (1 = that day only). It starts at midnight, so a 30-day
 * window ending 28 Oct 23:00 reads 29 Sept 00:00 → 28 Oct 23:00. Ticks are spread roughly ten across.
 */
export function buildPeriodWindow(windowEnd: string, days: number): PeriodWindow {
  const end = parseLocal(windowEnd);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  start.setDate(start.getDate() - (days - 1));

  const step = days === 1 ? 3 * HOUR_MS : Math.max(1, Math.floor(days / 10)) * DAY_MS;
  const ticks: number[] = [];
  // Stop a full step short of the end so the last regular tick never collides with the end label.
  for (let time = start.getTime(); time <= end.getTime() - step; time += step) ticks.push(time);
  ticks.push(end.getTime());
  return { start: start.getTime(), end: end.getTime(), ticks };
}

/** Rounds a raw axis step up to 1 / 2 / 2.5 / 5 × 10ⁿ so tick labels stay readable. */
export function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

/** Compact axis money: `$12.5k`, `$-0.2`. */
export function axisMoney(value: number): string {
  if (Math.abs(value) >= 1000) return `$${Number((value / 1000).toFixed(1))}k`;
  return `$${Number(value.toFixed(2))}`;
}

export function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
