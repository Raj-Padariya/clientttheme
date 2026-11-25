'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { formatMoney } from '@/core/format';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Icon, type IconName } from '../ui/Icon';
import { CountUpMoney, KebabLink, ffText } from './finflowParts';

const GAUGE_TICKS = 40;
const ARC_START = 150;
const ARC_SWEEP = 240;
const CENTER = 120;
const TICK_INNER = 80;
const TICK_OUTER = 96;

function polar(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(radians), y: CENTER + radius * Math.sin(radians) };
}

/** 240° tick gauge: ticks light up to the free-margin share, a needle sweeps in, a radar beam circles behind. */
function PowerGauge({ share }: { share: number }) {
  const lit = Math.round(share * GAUGE_TICKS);
  const needleAngle = ARC_START + ARC_SWEEP * share;
  const needleStyle = { '--needle': `${needleAngle}deg`, transformOrigin: `${CENTER}px ${CENTER}px` } as CSSProperties;

  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[240/190] w-full max-w-[300px]">
      {/* Radar beam, clipped to the dial and centred on it (cx 120 / cy 120, r 80 in the 240×190 box). */}
      <span className="absolute top-[21%] left-[16.7%] aspect-square w-[66.6%] overflow-hidden rounded-full">
        <span className="absolute inset-0 animate-rim-spin bg-[conic-gradient(from_0deg,transparent_0deg,color-mix(in_oklab,var(--brand-primary)_28%,transparent)_50deg,transparent_70deg)] motion-reduce:animate-none" />
      </span>

      <svg viewBox="0 0 240 190" className="absolute inset-0 size-full overflow-visible">
        {/* Both rings sit outside the centre readout so they never cross the text. */}
        <circle cx={CENTER} cy={CENTER} r="66" fill="none" stroke="var(--border-strong)" strokeDasharray="2 6" />
        <g className="origin-center animate-rim-spin [transform-box:fill-box] motion-reduce:animate-none" style={{ animationDuration: '24s' }}>
          <circle cx={CENTER} cy={CENTER} r="72" fill="none" stroke="color-mix(in oklab, var(--brand-primary) 35%, transparent)" strokeDasharray="26 16 4 16" />
        </g>

        {Array.from({ length: GAUGE_TICKS }, (_, tick) => {
          const angle = ARC_START + (ARC_SWEEP * tick) / (GAUGE_TICKS - 1);
          const inner = polar(angle, TICK_INNER);
          const outer = polar(angle, TICK_OUTER);
          const isLit = tick < lit;
          const isEdge = tick === lit - 1;
          const strength = Math.round(30 + 70 * ((tick + 1) / Math.max(lit, 1)));
          return (
            <line
              key={tick}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={isEdge ? 5 : 3.5}
              strokeLinecap="round"
              stroke={isEdge ? 'var(--brand-gleam)' : isLit ? `color-mix(in oklab, var(--brand-primary) ${strength}%, transparent)` : 'var(--border)'}
              className={cx(isLit && 'animate-fade-quick motion-reduce:animate-none', isEdge && 'drop-shadow-[0_0_6px_var(--brand-primary)]')}
              style={isLit ? { animationDelay: `${tick * 22}ms` } : undefined}
            />
          );
        })}

        {/* A marker riding the tick ring replaces the needle, so nothing passes through the readout. */}
        <g
          style={needleStyle}
          className="[transform:rotate(var(--needle))] transition-transform duration-[1600ms] ease-[cubic-bezier(.2,.8,.2,1.1)] starting:[transform:rotate(150deg)] motion-reduce:transition-none"
        >
          <circle cx={CENTER + TICK_OUTER + 9} cy={CENTER} r="5" fill="var(--brand-gleam)" className="drop-shadow-[0_0_8px_var(--brand-primary)]" />
          <circle cx={CENTER + TICK_OUTER + 9} cy={CENTER} r="9" fill="none" stroke="var(--brand-gleam)" strokeOpacity="0.35" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

interface StatProps {
  icon: IconName;
  label: string;
  value: string;
  tone?: 'up' | 'down';
  delay: number;
}

function Stat({ icon, label, value, tone, delay }: StatProps) {
  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className="group flex min-w-0 animate-rise flex-col gap-2 rounded-2xl border border-line bg-surface-2/60 p-3 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/40 motion-reduce:animate-none motion-reduce:transition-none"
    >
      <span
        className={cx(
          'grid size-7 place-items-center rounded-lg',
          tone === 'up' && 'bg-success/15 text-success',
          tone === 'down' && 'bg-danger/15 text-danger',
          !tone && 'bg-primary-soft text-primary',
        )}
      >
        <Icon name={icon} size={14} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-medium tracking-wide text-fg-muted uppercase">{label}</span>
        <span className={cx('mt-0.5 block truncate text-sm font-bold tabular-nums', tone === 'up' ? 'text-success' : tone === 'down' ? 'text-danger' : 'text-fg')}>
          {value}
        </span>
      </span>
    </li>
  );
}

function TradingPowerCard({ accounts, currency }: { accounts?: TradingAccount[]; currency: string }) {
  const sum = (pick: (account: TradingAccount) => number) => accounts?.reduce((total, account) => total + pick(account), 0);
  const freeMargin = sum((account) => account.freeMargin);
  const equity = sum((account) => account.equity);
  const balance = sum((account) => account.balance);
  const usedMargin = equity !== undefined && freeMargin !== undefined ? Math.max(equity - freeMargin, 0) : undefined;
  const floating = equity !== undefined && balance !== undefined ? equity - balance : undefined;
  const share = equity && freeMargin !== undefined ? Math.min(Math.max(freeMargin / equity, 0), 1) : 0;

  return (
    <section
      aria-labelledby="power-title"
      className="orbit-card relative isolate flex animate-rise flex-col gap-4 overflow-hidden p-5 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 -z-10 size-64 -translate-x-1/2 animate-glow rounded-full bg-primary/15 blur-3xl motion-reduce:animate-none" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="power-title" className="text-base font-bold text-fg">
            {ffText.tradingPower}
          </h2>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            {accounts === undefined ? '—' : `${accounts.length} ${ffText.liveAccounts}`}
          </p>
        </div>
        <KebabLink href="/accounts" />
      </div>

      <div className="relative">
        {accounts === undefined ? <div className="mx-auto aspect-[240/190] w-full max-w-[300px] animate-pulse rounded-full bg-surface-2/60" /> : <PowerGauge share={share} />}
        <div className="absolute inset-x-0 top-[63%] flex -translate-y-1/2 flex-col items-center text-center">
          <span className="text-[10px] font-semibold tracking-[0.2em] text-fg-muted uppercase">{ffText.freeMargin}</span>
          <CountUpMoney value={freeMargin} currency={currency} className="mt-1 text-2xl font-extrabold tracking-tight text-fg" centsClassName="text-fg-subtle" />
          <span className="mt-0.5 text-[11px] font-semibold text-primary tabular-nums">
            {Math.round(share * 100)}% {ffText.available}
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        <Stat icon="areaChart" label={ffText.equity} value={equity === undefined ? '—' : formatMoney(equity, currency)} delay={260} />
        <Stat icon="accounts" label={ffText.usedMargin} value={usedMargin === undefined ? '—' : formatMoney(usedMargin, currency)} delay={320} />
        <Stat
          icon={(floating ?? 0) >= 0 ? 'trendUp' : 'trendDown'}
          label={ffText.floating}
          value={floating === undefined ? '—' : `${floating >= 0 ? '+' : '−'}${formatMoney(Math.abs(floating), currency)}`}
          tone={floating === undefined ? undefined : floating >= 0 ? 'up' : 'down'}
          delay={380}
        />
      </ul>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/platforms"
          className="group/btn relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary text-sm font-semibold text-on-primary shadow-[0_12px_28px_-14px_var(--brand-primary)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="wallet-sheen absolute inset-0 animate-sheen motion-reduce:animate-none" />
          <Icon name="trendUp" size={16} className="relative" />
          <span className="relative">{ffText.tradeNow}</span>
        </Link>
        <Link
          href="/accounts/new"
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong text-sm font-semibold text-fg transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Icon name="plus" size={16} />
          {ffText.openAccount}
        </Link>
      </div>
    </section>
  );
}

// Quick transfer targets as full rows, so logins never truncate and the card fills the rest of the column.
function SendTo({ accounts }: { accounts?: TradingAccount[] }) {
  const list = accounts?.slice(0, 4);
  return (
    <section
      aria-labelledby="ff-sendto-title"
      className="orbit-card relative isolate flex flex-1 animate-rise flex-col gap-4 overflow-hidden p-5 [animation-delay:200ms] motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-16 -z-10 size-48 animate-glow rounded-full bg-primary/12 blur-3xl motion-reduce:animate-none" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="ff-sendto-title" className="text-base font-bold text-fg">
            {ffText.sendTo}
          </h3>
          <p className="mt-0.5 text-xs text-fg-muted">{ffText.recipients}</p>
        </div>
        <KebabLink href="/accounts" />
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {list === undefined
          ? Array.from({ length: 2 }, (_, index) => <li key={index} className="h-16 animate-pulse rounded-2xl bg-surface-2/70" />)
          : list.map((account, index) => (
              <li key={account.id}>
                <Link
                  href="/transfer"
                  title={`${ffText.transfer} → ${account.login}`}
                  style={{ animationDelay: `${260 + index * 80}ms` }}
                  className="group flex animate-rise items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-2.5 pr-3 transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none motion-reduce:transition-none"
                >
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary/50 to-(--brand-accent)/40 p-[2px]">
                    <span className="grid size-full place-items-center rounded-full bg-surface text-[11px] font-bold text-primary tabular-nums">{account.login.slice(-3)}</span>
                    <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface bg-success" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg tabular-nums">{account.login}</span>
                    <span className="block truncate text-[11px] text-fg-muted tabular-nums">
                      {account.platform} · {formatMoney(account.balance, account.currency)}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary transition-[background-color,color,transform] duration-300 group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-on-primary motion-reduce:transition-none"
                  >
                    <Icon name="transfer" size={15} />
                  </span>
                </Link>
              </li>
            ))}
        <li className="mt-auto pt-2">
          <Link
            href="/accounts/new"
            className="group flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-2.5 text-sm font-semibold text-primary transition-colors duration-300 hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg ring-1 ring-line transition-[transform,color] duration-300 group-hover:rotate-90 group-hover:text-primary motion-reduce:transition-none">
              <Icon name="plus" size={18} />
            </span>
            {ffText.add}
          </Link>
        </li>
      </ul>
    </section>
  );
}

interface PowerColumnProps {
  accounts?: TradingAccount[];
  currency: string;
  className?: string;
}

/** Right column: how much trading power the live accounts have left, and quick transfer targets. The wallet lives in the left hero. */
export function PowerColumn({ accounts, currency, className }: PowerColumnProps) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-4', className)}>
      <TradingPowerCard accounts={accounts} currency={currency} />
      <SendTo accounts={accounts} />
    </div>
  );
}
