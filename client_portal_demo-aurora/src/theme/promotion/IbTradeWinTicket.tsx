'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/core/format';
import { translate } from '@/core/i18n';
import type { TradeWinReward } from '@/core/pages/useTradeWin';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { RedeemPrizeModal } from './RedeemPrizeModal';
import { useAnimatedNumber } from './ScratchExperience';
import { allowedText, categoryIcon, categoryTag, formatLots } from './TradeWinPage';
import { ACCENT, captionClass } from './ibTradeWinKit';

const CELEBRATION_MS = 2200;

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  const stepClass =
    'grid size-9 place-items-center rounded-[9px] text-fg transition-colors hover:bg-fg hover:text-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-25';

  return (
    <div className="flex items-center gap-3">
      <span className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.quantity')}</span>
      <div className="flex items-center rounded-[12px] bg-fg/[0.04] p-0.5 ring-1 ring-line">
        <button type="button" aria-label={translate('tradeWin.decrease')} disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepClass}>
          <span aria-hidden="true" className="text-base leading-none">−</span>
        </button>
        <span key={value} aria-live="polite" className="w-9 animate-dot-pop text-center font-mono text-base font-black text-fg tabular-nums motion-reduce:animate-none">
          {value}
        </span>
        <button type="button" aria-label={translate('tradeWin.increase')} disabled={value >= max} onClick={() => onChange(value + 1)} className={stepClass}>
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}

export function OrderTicket({
  reward,
  currency,
  availableLots,
  availableDeposit,
  stockLeft,
  claimed,
  onRedeem,
}: {
  reward: TradeWinReward;
  currency: string;
  availableLots: number;
  availableDeposit: number;
  stockLeft: number;
  claimed: number;
  onRedeem: (reward: TradeWinReward, quantity: number) => string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isCelebrating) return;
    const timer = window.setTimeout(() => setIsCelebrating(false), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [isCelebrating]);

  const safeQuantity = Math.min(quantity, Math.max(stockLeft, 1));
  const hasStock = stockLeft > 0;
  const hasLots = availableLots >= reward.lotRequirement * safeQuantity;
  const canRedeem = hasStock && hasLots && !isCelebrating;
  const requirementPercent = reward.lotRequirement > 0 ? (availableLots / reward.lotRequirement) * 100 : 100;
  const requirementShare = Math.round(Math.min(100, Math.max(0, requirementPercent)));
  const meterShare = useAnimatedNumber(requirementShare, 1100);
  const isLowStock = stockLeft <= 2;
  const inventoryTotal = stockLeft + claimed;
  const stockShare = inventoryTotal > 0 ? (stockLeft / inventoryTotal) * 100 : 0;

  let buttonLabel = translate('tradeWin.redeemNow');
  if (isCelebrating) buttonLabel = translate('tradeWin.redeemed');
  else if (!hasStock) buttonLabel = translate('tradeWin.outOfStock');
  else if (!hasLots) buttonLabel = translate('tradeWin.notEnoughLots');

  const facts: { key: string; icon: IconName; label: string; value: string; highlight: boolean }[] = [
    { key: 'groups', icon: 'accounts', label: translate('tradeWin.allowedGroups'), value: allowedText(reward.allowedGroups), highlight: false },
    { key: 'symbols', icon: 'trendUp', label: translate('tradeWin.allowedSymbols'), value: allowedText(reward.allowedSymbols), highlight: false },
    { key: 'lots', icon: 'pieChart', label: translate('tradeWin.yourLots'), value: formatLots(availableLots), highlight: true },
    { key: 'deposit', icon: 'deposit', label: translate('tradeWin.yourDeposit'), value: formatMoney(availableDeposit, currency), highlight: true },
  ];

  function handleRedeem() {
    if (!canRedeem) return;
    setIsConfirming(true);
  }

  function confirmRedeem(): string {
    const reference = onRedeem(reward, safeQuantity);
    setIsCelebrating(true);
    return reference;
  }

  function closeRedeem() {
    setIsConfirming(false);
    setQuantity(1);
  }

  return (
    <>
      <div className="flex min-w-0 animate-feed-in flex-col gap-5 p-4 motion-reduce:animate-none sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
          {/* Product window: a scan line sweeps the product; a FILLED stamp slams on when the redemption goes through. */}
          <div className="relative aspect-square overflow-hidden rounded-[16px] bg-fg/[0.05] ring-1 ring-line">
            {reward.image ? (
              <Image src={reward.image} alt={reward.name} fill unoptimized sizes="176px" className="object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-fg">
                <Icon name={categoryIcon[reward.category]} size={46} strokeWidth={1.5} />
              </span>
            )}
            <span aria-hidden="true" style={{ background: ACCENT }} className="twx-scan absolute inset-x-0 h-0.5 opacity-80 shadow-[0_0_12px_var(--zenith-red)]" />
            {isCelebrating && (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-app/70 backdrop-blur-[2px]">
                <span className="twx-stamp rounded-md border-[3px] border-success px-3 py-1 font-mono text-xl font-black tracking-[0.2em] text-success">FILLED</span>
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-fg px-2 py-0.5 font-mono text-[10px] font-black tracking-[0.12em] text-app uppercase">
                <Icon name={categoryIcon[reward.category]} size={11} />
                {categoryTag(reward.category)}
              </span>
              {reward.closedTradesOnly && (
                <span className="inline-flex items-center gap-1 rounded-md bg-fg/[0.06] px-2 py-0.5 text-[11px] font-semibold text-fg-muted ring-1 ring-line">
                  <Icon name="checkCircle" size={11} />
                  {translate('tradeWin.closedTradesOnly')}
                </span>
              )}
            </div>
            <h3 className="text-2xl leading-tight font-black tracking-[-0.02em] text-fg">{reward.name}</h3>
            <p className="text-sm text-fg-muted">{reward.description}</p>
            <div className="mt-auto flex items-end justify-between gap-3 border-t border-dashed border-line pt-3">
              <div>
                <p className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.value')}</p>
                <p className="font-mono text-2xl font-black text-fg tabular-nums">{formatMoney(reward.value, currency)}</p>
              </div>
              <div className="text-right">
                <p className={cx(captionClass, 'text-fg-subtle')}>{translate('tradeWin.lotRequirement')}</p>
                <p className="font-mono text-2xl font-black text-fg tabular-nums">
                  {reward.lotRequirement} <span className="font-sans text-xs font-semibold text-fg-muted">{translate('tradeWin.lots')}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fill meter: how much of the lot requirement the partner already holds, drawn as an order filling up. */}
        <div
          role="progressbar"
          aria-label={translate('tradeWin.requirementProgress')}
          aria-valuenow={requirementShare}
          aria-valuemin={0}
          aria-valuemax={100}
          className="flex items-center gap-3"
        >
          <span aria-hidden="true" className="relative h-4 flex-1 overflow-hidden rounded-md bg-fg/[0.06] ring-1 ring-line">
            <span style={{ width: `${meterShare}%` }} className={cx('twx-stripes absolute inset-y-0 left-0', requirementShare >= 100 ? 'bg-success' : 'bg-fg/70')} />
            {[25, 50, 75].map((mark) => (
              <span key={mark} style={{ left: `${mark}%` }} className="absolute inset-y-0 w-px bg-app/50" />
            ))}
          </span>
          <span className={cx('w-12 text-right font-mono text-sm font-black tabular-nums', requirementShare >= 100 ? 'text-success' : 'text-fg')}>{Math.round(meterShare)}%</span>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] bg-line ring-1 ring-line">
          {facts.map((fact, index) => (
            <div key={fact.key} style={{ animationDelay: `${index * 70}ms` }} className="min-w-0 animate-feed-in bg-app px-3 py-2.5 motion-reduce:animate-none">
              <dt className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                <Icon name={fact.icon} size={12} />
                <span className="truncate">{fact.label}</span>
              </dt>
              <dd className={cx('mt-0.5 truncate font-mono text-sm font-black tabular-nums', fact.highlight ? 'text-success' : 'text-fg')}>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {/* Stock depth: units left on the bid side, units already claimed on the ask side. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <span className={cx('inline-flex items-center gap-1.5', isLowStock ? 'text-danger' : 'text-fg-muted')}>
              <Icon name="inbox" size={13} />
              {translate('tradeWin.stock')}
              <span className="font-black">{translate('tradeWin.stockLeft', { count: stockLeft })}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              <Icon name="history" size={13} />
              {translate('tradeWin.claimed')}
              <span className="font-black text-fg">{translate('tradeWin.claimedTimes', { count: claimed })}</span>
            </span>
          </div>
          <span aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            <span style={{ width: `${stockShare}%` }} className={cx('twx-breathe h-full rounded-l-full', isLowStock ? 'zenith-blink bg-danger' : 'bg-success')} />
            <span className="h-full flex-1 rounded-r-full bg-fg/15" />
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <QuantityStepper value={safeQuantity} max={Math.max(stockLeft, 1)} onChange={setQuantity} />
          <button
            type="button"
            disabled={!canRedeem && !isCelebrating}
            onClick={handleRedeem}
            className={cx(
              'relative inline-flex h-12 min-w-48 flex-1 items-center justify-center gap-2 overflow-hidden rounded-[12px] px-6 text-sm font-black transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none sm:flex-none',
              isCelebrating ? 'bg-success text-white' : 'bg-fg text-app',
            )}
          >
            {canRedeem && <span aria-hidden="true" className="twx-sweep absolute inset-y-0 left-0 w-1/4 bg-white/30" />}
            <Icon name={isCelebrating ? 'checkCircle' : 'gift'} size={16} className="relative" />
            <span className="relative">{buttonLabel}</span>
          </button>
        </div>
      </div>
      {isConfirming && (
        <RedeemPrizeModal
          name={reward.name}
          icon={categoryIcon[reward.category]}
          value={reward.value}
          quantity={safeQuantity}
          currency={currency}
          onConfirm={confirmRedeem}
          onClose={closeRedeem}
        />
      )}
    </>
  );
}
