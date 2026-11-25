'use client';

import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { useAnimatedNumber } from './ScratchExperience';
import { formatLots } from './TradeWinPage';
import { ACCENT, boardClass, captionClass } from './ibTradeWinKit';

/*
 * Account strip: the IB lot balance reads like trading-account equity — a big animated balance, a stacked
 * allocation bar (spendable / spent on rewards / rest of the downline volume) and the two win readouts beside it.
 */
export function AccountStrip({
  availableLots,
  tradedLots,
  spentLots,
  pastWins,
  valueWon,
  currency,
}: {
  availableLots: number;
  tradedLots: number;
  spentLots: number;
  pastWins: number;
  valueWon: number;
  currency: string;
}) {
  const lots = useAnimatedNumber(availableLots, 1200);
  const wins = useAnimatedNumber(pastWins, 900);
  const won = useAnimatedNumber(valueWon, 1200);
  const volume = Math.max(tradedLots, availableLots + spentLots);
  const availableShare = volume > 0 ? (availableLots / volume) * 100 : 0;
  const spentShare = volume > 0 ? Math.min(100 - availableShare, (spentLots / volume) * 100) : 0;
  const readouts: { key: string; icon: IconName; label: string; hint: string; value: string; tone: string }[] = [
    { key: 'wins', icon: 'checkCircle', label: translate('tradeWin.pastWins'), hint: translate('tradeWin.totalRedemptions'), value: String(Math.round(wins)), tone: 'text-fg' },
    { key: 'won', icon: 'wallet', label: translate('tradeWin.valueWon'), hint: translate('tradeWin.totalPrizeValue'), value: formatMoney(won, currency), tone: 'text-success' },
  ];

  return (
    <section className={cx(boardClass, 'grid animate-rise motion-reduce:animate-none lg:col-span-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]')}>
      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cx(captionClass, 'flex items-center gap-2 text-fg-muted')}>
            <span className="grid size-7 place-items-center rounded-[8px] bg-fg text-app">
              <Icon name="pieChart" size={13} />
            </span>
            {translate('tradeWin.availableIbLots')}
          </p>
          <span style={{ background: ACCENT }} className="twx-tick inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-white">
            <Icon name="gift" size={13} />
            <span className="font-mono text-[11px] font-black tabular-nums">{Math.round(availableShare)}%</span>
          </span>
        </div>

        <p className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-6xl leading-[0.85] font-black tracking-tighter text-fg tabular-nums sm:text-7xl">{formatLots(lots)}</span>
          <span className={cx(captionClass, 'text-fg-muted')}>{translate('tradeWin.lots')}</span>
        </p>

        {/* Allocation bar: spendable lots fill with moving stripes, spent lots sit in clay, the rest is the remaining downline volume. */}
        <div aria-hidden="true" className="flex h-5 overflow-hidden rounded-md bg-fg/[0.06] ring-1 ring-line">
          <span style={{ width: `${availableShare}%` }} className="twx-grow twx-stripes h-full bg-success" />
          <span style={{ width: `${spentShare}%`, background: ACCENT, animationDelay: '300ms' }} className="twx-grow h-full opacity-80" />
        </div>

        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <span aria-hidden="true" style={{ background: ACCENT }} className="size-2 shrink-0 rounded-[2px]" />
          {translate('tradeWin.downlineSpent', { traded: formatLots(tradedLots), spent: formatLots(spentLots) })}
        </p>
      </div>

      <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-1 lg:border-t-0 lg:border-l">
        {readouts.map((readout, index) => (
          <div
            key={readout.key}
            style={{ animationDelay: `${200 + index * 120}ms` }}
            className="flex min-w-0 animate-feed-in items-center gap-3 border-line p-4 not-last:border-r motion-reduce:animate-none sm:p-5 lg:not-last:border-r-0 lg:not-last:border-b"
          >
            <span className={cx('grid size-11 shrink-0 place-items-center rounded-[12px]', index === 0 ? 'bg-fg text-app' : 'bg-success/15 text-success')}>
              <Icon name={readout.icon} size={17} />
            </span>
            <div className="min-w-0">
              <dt className={cx(captionClass, 'truncate text-fg-subtle')}>{readout.label}</dt>
              <dd className={cx('mt-0.5 truncate font-mono text-2xl font-black tracking-tight tabular-nums sm:text-3xl', readout.tone)}>{readout.value}</dd>
              <dd className="truncate text-[11px] text-fg-muted">{readout.hint}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
