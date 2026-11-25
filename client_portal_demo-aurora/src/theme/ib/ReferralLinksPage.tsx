'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { DatePicker } from '../ui/DatePicker';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import {
  codeProblem,
  emptyLinkDraft,
  formatExpiry,
  isLinkDraftValid,
  linkFromDraft,
  mockReferralLinks,
  moveItem,
  referralBaseUrl,
  referralLinksCopy as copy,
  totalFunnel,
  type LinkDraft,
  type LinkFunnel,
  type ReferralLink,
} from './ibReferralLinksData';
import './ibReferralLinks.css';

/*
 * Aurora referral links — "routing terminal": an open header; the default link as a ticket whose code types itself out;
 * the funnel as a step-line conversion route with a dot travelling down it; own links as a watchlist closed by a
 * "New link" row; the New link sheet keeps its live preview and three steps, joined by a route progress line.
 */
const CHART_WIDTH = 400;
const CHART_HEIGHT = 150;
const CHART_TOP = 18;
const CHART_RANGE = 104;
const cardClass = 'relative overflow-hidden rounded-[26px] bg-surface ring-1 ring-line';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const buttonBase =
  'group/cta relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden font-bold transition-[translate,opacity,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none';
const largeSize = 'h-11 rounded-[14px] px-4 text-sm';
const smallSize = 'h-9 rounded-[11px] px-3 text-xs';
const primaryTone = 'bg-primary text-on-primary hover:-translate-y-0.5 hover:bg-primary-hover';
const ghostTone = 'text-fg ring-1 ring-line-strong hover:bg-fg/[0.05]';

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

function linkUrl(link: ReferralLink) {
  return `${referralBaseUrl}${link.code}`;
}

function copyLink(link: ReferralLink) {
  void navigator.clipboard.writeText(linkUrl(link)).then(() => toast(copy.copied));
}

function shareLink(link: ReferralLink) {
  const url = linkUrl(link);
  if (typeof navigator.share === 'function') {
    navigator.share({ title: copy.shareTitle, url }).catch(() => undefined);
    return;
  }
  copyLink(link);
}

function ratio(part: number, whole: number) {
  return whole > 0 ? Math.min(part / whole, 1) : 0;
}

function Shine() {
  return (
    <span aria-hidden="true" className="rl-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent" />
  );
}

function LiveDot() {
  return (
    <span aria-hidden="true" className="relative size-1.5 shrink-0">
      <span className="rl-halo absolute inset-0 rounded-full bg-current" />
      <span className="relative block size-1.5 rounded-full bg-current" />
    </span>
  );
}

function LinkButtons({ link, isSmall = false }: { link: ReferralLink; isSmall?: boolean }) {
  const size = isSmall ? smallSize : largeSize;
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => copyLink(link)} className={cx(buttonBase, size, primaryTone, !isSmall && 'flex-1 sm:flex-none')}>
        <Shine />
        <Icon name="copy" size={isSmall ? 13 : 15} className="relative" />
        <span className="relative">{copy.copyLink}</span>
      </button>
      <button type="button" onClick={() => shareLink(link)} className={cx(buttonBase, size, ghostTone, !isSmall && 'flex-1 sm:flex-none')}>
        <Icon name="arrowUpRight" size={isSmall ? 13 : 15} className="transition-transform duration-300 group-hover/cta:rotate-45 motion-reduce:transition-none" />
        {copy.share}
      </button>
    </div>
  );
}

function OfferChips({ groups }: { groups: string[] }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
      <span className={cx(captionClass, 'text-fg-subtle')}>{copy.offers}</span>
      {groups.map((group, groupIndex) => (
        <span
          key={group}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 font-bold',
            groupIndex === 0 ? 'bg-primary text-on-primary' : 'text-fg-muted ring-1 ring-line',
          )}
        >
          {groupIndex === 0 && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
          {group}
        </span>
      ))}
      {groups.length === 0 && <span aria-hidden="true" className="h-5 w-12 rounded-[8px] border border-dashed border-line-strong" />}
    </div>
  );
}

/* ───────────── Journey: four quote cells, each with a level bar of the share of visits ───────────── */

function JourneyCells({ funnel, isCompact = false }: { funnel: LinkFunnel; isCompact?: boolean }) {
  const steps: { label: string; value: number }[] = [
    { label: copy.funnel.visits, value: funnel.visits },
    { label: copy.funnel.signedUp, value: funnel.signedUp },
    { label: copy.funnel.openedAccount, value: funnel.openedAccount },
    { label: copy.funnel.funded, value: funnel.funded },
  ];

  return (
    <ol className={cx('grid gap-px overflow-hidden rounded-[16px] bg-line ring-1 ring-line', isCompact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const share = index === 0 ? (step.value > 0 ? 1 : 0) : ratio(step.value, funnel.visits);
        return (
          <li key={step.label} className={cx('flex min-w-0 items-end gap-2.5 bg-surface', isCompact ? 'px-2.5 py-2' : 'px-3 py-2.5')}>
            <span aria-hidden="true" className={cx('relative w-1.5 shrink-0 overflow-hidden rounded-full bg-fg/[0.08]', isCompact ? 'h-7' : 'h-9')}>
              <span style={{ height: `${share * 100}%` }} className={cx('absolute inset-x-0 bottom-0 rounded-full', isLast ? 'bg-accent' : 'bg-primary')} />
            </span>
            <span className="min-w-0">
              <span className={cx('block font-mono leading-none font-black text-fg tabular-nums', isCompact ? 'text-base' : 'text-lg')}>{step.value}</span>
              <span className="mt-1 block text-[10.5px] leading-tight text-fg-subtle">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Default link: a ticket whose code types itself out ───────────── */

function DefaultLinkTicket({ link }: { link: ReferralLink }) {
  return (
    <article className={cx(cardClass, 'rl-rise flex flex-col')}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center rounded-[14px] bg-primary text-on-primary">
            <span className="rl-pulse absolute inset-0 rounded-[14px] ring-2 ring-primary" />
            <Icon name="globe" size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black text-fg">{copy.defaultTitle}</p>
            <p className="mt-0.5 text-sm text-fg-muted">{copy.defaultHint}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-success/10 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-success uppercase ring-1 ring-success/30">
          <LiveDot />
          {copy.defaultBadge}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div>
          <p className={cx(captionClass, 'font-mono text-fg-subtle normal-case')}>?ref=</p>
          <p className="mt-2 flex items-center font-mono text-3xl leading-none font-black text-fg sm:text-5xl">
            <span className="sr-only">{link.code}</span>
            <span aria-hidden="true" style={{ '--rl-chars': link.code.length } as CSSProperties} className="rl-type inline-block overflow-hidden whitespace-nowrap">
              {link.code}
            </span>
            <span aria-hidden="true" className="rl-caret ml-1 inline-block h-[0.9em] w-[0.18em] shrink-0 rounded-[2px] bg-primary" />
          </p>
        </div>

        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
          <span className="flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-[14px] bg-fg/[0.04] px-3 font-mono text-xs ring-1 ring-line sm:text-sm 2xl:flex-1">
            <Icon name="globe" size={13} className="shrink-0 text-fg-subtle" />
            <span className="truncate">
              <span className="text-fg-subtle">{referralBaseUrl}</span>
              <span className="font-black text-fg">{link.code}</span>
            </span>
          </span>
          <LinkButtons link={link} />
        </div>

        <div className="mt-auto">
          <JourneyCells funnel={link.funnel} />
        </div>
      </div>
    </article>
  );
}

/* ───────────── Funnel: a step-line conversion route, one level per stage ───────────── */

function ConversionRoute({ links }: { links: ReferralLink[] }) {
  const funnel = totalFunnel(links);
  const ownLinks = links.filter((link) => !link.isDefault).length;
  const stages: { label: string; value: number; hint: string; share: number; icon: IconName }[] = [
    { label: copy.links, value: links.length, hint: copy.linksHint(ownLinks), share: links.length > 0 ? 1 : 0, icon: 'globe' },
    { label: copy.signedUp, value: funnel.signedUp, hint: copy.signedUpHint(funnel.visits), share: ratio(funnel.signedUp, funnel.visits), icon: 'user' },
    { label: copy.openedAccount, value: funnel.openedAccount, hint: copy.openedAccountHint, share: ratio(funnel.openedAccount, funnel.signedUp), icon: 'accounts' },
    { label: copy.funded, value: funnel.funded, hint: copy.fundedHint, share: ratio(funnel.funded, funnel.openedAccount), icon: 'wallet' },
  ];
  const step = CHART_WIDTH / stages.length;
  const levels = stages.map((stage) => CHART_TOP + (1 - stage.share) * CHART_RANGE);
  const linePath = levels.map((y, index) => `${index === 0 ? `M0 ${y}` : `V${y}`} H${(index + 1) * step}`).join(' ');
  const areaPath = `${linePath} V${CHART_HEIGHT} H0 Z`;

  return (
    <section style={stagger(1, 0, 120)} className={cx(cardClass, 'rl-rise flex flex-col')}>
      <div className="px-2 pt-4">
        <svg aria-hidden="true" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="block h-auto w-full">
          {stages.slice(1).map((stage, index) => (
            <line key={stage.label} x1={(index + 1) * step} x2={(index + 1) * step} y1={0} y2={CHART_HEIGHT} className="stroke-line" strokeDasharray="3 5" />
          ))}
          <path d={areaPath} className="fill-primary/10" />
          <path d={linePath} fill="none" className="stroke-primary/30" strokeWidth={3} strokeLinejoin="round" />
          <path d={linePath} fill="none" className="rl-flow stroke-primary" strokeWidth={3} strokeLinejoin="round" strokeDasharray="10 14" />
          {levels.map((y, index) => (
            <circle key={stages[index].label} cx={index * step + step / 2} cy={y} r={5} className={index === stages.length - 1 ? 'fill-accent' : 'fill-primary'} />
          ))}
          <circle r={6} className="fill-accent motion-reduce:hidden">
            <animateMotion dur="3.2s" repeatCount="indefinite" path={linePath} />
          </circle>
        </svg>
      </div>
      <ol aria-label={copy.title} className="mt-auto grid grid-cols-2 gap-px border-t border-line bg-line">
        {stages.map((stage) => (
          <li key={stage.label} className="flex min-w-0 flex-col gap-1.5 bg-surface px-4 py-4">
            <span className="flex min-w-0 items-center gap-1.5 text-fg-subtle">
              <Icon name={stage.icon} size={12} className="shrink-0" />
              <span className={cx(captionClass, 'leading-tight text-fg-muted')}>{stage.label}</span>
            </span>
            <span className="font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">{stage.value}</span>
            <span className="text-xs leading-snug text-fg-subtle">{stage.hint}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Own links: a watchlist, closed by a "New link" row ───────────── */

function LinkRow({ link, index, onRemove }: { link: ReferralLink; index: number; onRemove: () => void }) {
  return (
    <li
      style={stagger(index, 80, 220)}
      className="rl-rise grid gap-4 px-5 py-4 transition-colors duration-200 hover:bg-fg/[0.02] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_auto] xl:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary/15 text-primary">
          <Icon name="megaphone" size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black text-fg">{link.name}</p>
          <p className="mt-0.5 truncate font-mono text-xs">
            <span className="text-fg-subtle">?ref=</span>
            <span className="font-bold text-fg">{link.code}</span>
          </p>
        </div>
      </div>

      <OfferChips groups={link.groups} />

      <JourneyCells funnel={link.funnel} isCompact />

      <div className="flex flex-wrap items-center justify-between gap-3 xl:flex-col xl:items-end">
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <Icon name="clock" size={12} />
          {link.expiresOn ? copy.expires(formatExpiry(link.expiresOn)) : copy.neverExpires}
        </span>
        <div className="flex items-center gap-2">
          <LinkButtons link={link} isSmall />
          <button
            type="button"
            onClick={onRemove}
            aria-label={copy.removeLink}
            title={copy.removeLink}
            className="grid size-9 shrink-0 place-items-center rounded-[11px] text-fg-subtle ring-1 ring-line transition-[color,background-color,rotate] duration-300 hover:rotate-90 hover:bg-danger hover:text-white hover:ring-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}

function LinksWatchlist({ links, onRemove, onOpen }: { links: ReferralLink[]; onRemove: (link: ReferralLink) => void; onOpen: () => void }) {
  return (
    <section style={stagger(2, 0, 180)} className={cx(cardClass, 'rl-rise')}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <h2 className="font-display text-xl font-black tracking-tight text-fg">{copy.links}</h2>
        <span className="rounded-[8px] bg-fg/[0.05] px-2 py-0.5 font-mono text-[11px] text-fg-muted ring-1 ring-line">{copy.linksHint(links.length)}</span>
      </div>
      <ul className="divide-y divide-line">
        {links.map((link, index) => (
          <LinkRow key={link.id} link={link} index={index} onRemove={() => onRemove(link)} />
        ))}
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onOpen}
            className="group/add flex w-full items-center gap-4 px-5 py-5 text-left transition-colors duration-200 hover:bg-primary/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-[14px] border-2 border-dashed border-primary/50 text-primary transition-transform duration-300 group-hover/add:rotate-90 motion-reduce:transition-none"
            >
              <Icon name="plus" size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-mono text-sm font-black text-fg">
                {copy.newLink}
                <span aria-hidden="true" className="rl-caret inline-block h-4 w-2 rounded-[1px] bg-primary" />
              </span>
              <span className="mt-0.5 block text-xs text-fg-muted">{copy.panelSubtitle}</span>
            </span>
            <Icon
              name="arrowUpRight"
              size={16}
              className="shrink-0 text-fg-subtle transition-transform duration-200 group-hover/add:translate-x-0.5 group-hover/add:-translate-y-0.5"
            />
          </button>
        </li>
      </ul>
    </section>
  );
}

/* ───────────── New link sheet: live link preview on the left, the three steps on the right ───────────── */

function GroupTile({ name, isOffered, isFirst, index, onToggle, onMove, onDragStart, onDrop }: {
  name: string;
  isOffered: boolean;
  isFirst: boolean;
  index: number;
  onToggle: () => void;
  onMove: (to: number) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      onMove(index - 1);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      onMove(index + 1);
    }
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cx(
        'relative flex min-h-32 flex-col justify-between gap-3 overflow-hidden rounded-[18px] p-3 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
        isOffered ? 'bg-primary/12 text-fg ring-1 ring-primary/40' : 'border-2 border-dashed border-line-strong text-fg-muted',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={isOffered}
          aria-label={name}
          onClick={onToggle}
          className={cx(
            'grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            isOffered ? 'bg-primary text-on-primary' : 'border-2 border-dashed border-fg/30 hover:border-fg/60',
          )}
        >
          {isOffered && <Icon name="check" size={13} />}
        </button>
        <button
          type="button"
          aria-label={copy.moveGroup(name)}
          onKeyDown={handleKey}
          className="grid size-8 cursor-grab place-items-center rounded-[10px] text-fg-subtle transition-colors hover:bg-fg/[0.06] hover:text-fg active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="arrowsUpDown" size={13} />
        </button>
      </div>
      <div className="min-w-0">
        <span aria-hidden="true" className="font-mono text-[10.5px] font-bold text-fg-subtle">
          #{index + 1}
        </span>
        <p className="truncate text-lg leading-tight font-black">{name}</p>
        {isFirst && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-2 py-0.5 text-[10px] font-black text-on-primary">
            <LiveDot />
            {copy.shownFirst}
          </span>
        )}
      </div>
    </li>
  );
}

function StepHeading({ step, isDone, children }: { step: number; isDone: boolean; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cx(
          'grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-black transition-colors duration-300',
          isDone ? 'bg-primary text-on-primary' : 'bg-fg/[0.08] text-fg',
        )}
      >
        {isDone ? <Icon name="check" size={13} /> : step}
      </span>
      <span className="h-px flex-1 border-t border-dashed border-line-strong" />
      {children}
    </div>
  );
}

// Route progress across the three steps: a node per step and a line that fills once the step is done.
function StepRoute({ steps }: { steps: { isDone: boolean; isOptional: boolean }[] }) {
  return (
    <ol aria-hidden="true" className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => (
        <li key={index} className="flex items-center gap-2">
          <span
            className={cx(
              'grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-black transition-colors duration-300',
              step.isDone ? 'bg-primary text-on-primary' : step.isOptional ? 'border border-dashed border-line-strong text-fg-subtle' : 'bg-fg/[0.08] text-fg-muted',
            )}
          >
            {step.isDone ? <Icon name="check" size={11} /> : index + 1}
          </span>
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-fg/[0.08]">
            <span
              style={{ width: step.isDone ? '100%' : '0%' }}
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            />
            {!step.isDone && <span className="rl-bead absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Live preview of the link being built: only shows what the draft already holds, placeholders otherwise.
function LinkPreview({ draft, problem, steps }: { draft: LinkDraft; problem: string | null; steps: { isDone: boolean; isOptional: boolean }[] }) {
  const offered = draft.groups.filter((group) => group.isOffered).map((group) => group.name);

  return (
    <div className="relative flex flex-col gap-5 overflow-hidden border-b border-dashed border-line-strong bg-fg/[0.03] p-5 md:border-r md:border-b-0 md:p-6">
      <div className="relative flex items-start gap-3 pr-10 md:pr-0">
        <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center rounded-[14px] bg-primary text-on-primary">
          <span className="rl-pulse absolute inset-0 rounded-[14px] ring-2 ring-primary" />
          <Icon name="plus" size={16} />
        </span>
        <div className="min-w-0">
          <h2 id="new-link-title" className="font-display text-2xl leading-tight font-black tracking-[-0.03em] text-fg">
            {copy.panelTitle}
          </h2>
          <p className="text-sm text-fg-muted">{copy.panelSubtitle}</p>
        </div>
      </div>

      <StepRoute steps={steps} />

      {/* The link ticket, filled in as the form is typed. */}
      <div aria-live="polite" className="relative flex flex-col gap-4 rounded-[20px] bg-surface p-4 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.6)] ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary/15 text-primary">
            <Icon name="megaphone" size={15} />
          </span>
          <p className={cx('min-w-0 truncate text-base font-black', draft.name.trim() ? 'text-fg' : 'text-fg-subtle')}>{draft.name.trim() || copy.namePlaceholder}</p>
        </div>

        <p className="flex min-w-0 items-center gap-2 rounded-[12px] bg-fg/[0.04] px-3 py-2 font-mono text-[11px] ring-1 ring-line">
          <Icon name="globe" size={12} className="shrink-0 text-fg-subtle" />
          <span className="min-w-0 truncate">
            <span className="text-fg-subtle">?ref=</span>
            {draft.code.trim() ? (
              <span className={cx('font-black', problem ? 'text-danger' : 'text-fg')}>{draft.code.trim()}</span>
            ) : (
              <span className="text-fg-subtle italic">{copy.codePlaceholder}</span>
            )}
          </span>
          <span aria-hidden="true" className="rl-caret ml-auto h-3.5 w-1 shrink-0 rounded-full bg-primary" />
        </p>

        <OfferChips groups={offered} />

        <span className="inline-flex items-center gap-1.5 border-t border-dashed border-line-strong pt-3 text-xs text-fg-muted">
          <Icon name="clock" size={12} />
          {draft.expiresOn ? copy.expires(formatExpiry(draft.expiresOn)) : copy.neverExpires}
        </span>
      </div>
    </div>
  );
}

function NewLinkPanel({ links, onClose, onCreate }: { links: ReferralLink[]; onClose: () => void; onCreate: (link: ReferralLink) => void }) {
  const [draft, setDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const problem = codeProblem(draft.code, links);
  const firstOffered = draft.groups.find((group) => group.isOffered)?.name;
  const isValid = isLinkDraftValid(draft, links);
  const steps = [
    { isDone: draft.name.trim() !== '' && problem === null, isOptional: false },
    { isDone: draft.groups.some((group) => group.isOffered), isOptional: false },
    { isDone: draft.expiresOn !== '', isOptional: true },
  ];

  useEffect(() => {
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function moveGroup(from: number, to: number) {
    setDraft((current) => ({ ...current, groups: moveItem(current.groups, from, to) }));
  }

  function toggleGroup(name: string) {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.name === name ? { ...group, isOffered: !group.isOffered } : group)),
    }));
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-end justify-center p-2 sm:items-center sm:p-4">
      <button type="button" aria-label={copy.closePanel} tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay backdrop-blur-sm motion-reduce:animate-none" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-link-title"
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl animate-rise flex-col overflow-y-auto rounded-[26px] bg-surface shadow-[0_30px_60px_-25px_rgb(0_0_0/0.55)] ring-1 ring-line motion-reduce:animate-none sm:max-h-[calc(100dvh-2rem)] md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closePanel}
          className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-[11px] bg-surface text-fg-muted ring-1 ring-line transition-[color,rotate] duration-300 hover:rotate-90 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="close" size={14} />
        </button>

        <LinkPreview draft={draft} problem={problem} steps={steps} />

        <div className="flex min-h-0 flex-col">
          <div className="flex flex-1 flex-col gap-7 p-5 md:overflow-y-auto md:p-6 md:pt-16">
            <section className="flex flex-col gap-4">
              <StepHeading step={1} isDone={steps[0].isDone} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.nameIt} htmlFor="link-name" hint={copy.nameHint}>
                  <Input
                    id="link-name"
                    autoFocus
                    value={draft.name}
                    placeholder={copy.namePlaceholder}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </Field>
                <Field label={copy.code} htmlFor="link-code" hint={copy.codeHint} error={problem ?? undefined}>
                  <Input
                    id="link-code"
                    value={draft.code}
                    invalid={problem !== null}
                    placeholder={copy.codePlaceholder}
                    onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                  />
                </Field>
              </div>
              {draft.code && (
                <p className="flex min-w-0 animate-feed-in items-center gap-2 rounded-[12px] bg-fg/[0.04] px-3 py-2 font-mono text-xs ring-1 ring-line motion-reduce:animate-none">
                  <Icon name="globe" size={12} className="shrink-0 text-fg-subtle" />
                  <span className="truncate">
                    <span className="text-fg-subtle">{referralBaseUrl}</span>
                    <span className={cx('font-black', problem ? 'text-danger' : 'text-fg')}>{draft.code}</span>
                  </span>
                </p>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <StepHeading step={2} isDone={steps[1].isDone}>
                <span className={cx(captionClass, 'text-fg-subtle')}>{copy.groupsTitle}</span>
              </StepHeading>
              <p className="text-sm text-fg-muted">{copy.groupsHint}</p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {draft.groups.map((group, index) => (
                  <GroupTile
                    key={group.name}
                    name={group.name}
                    isOffered={group.isOffered}
                    isFirst={group.name === firstOffered}
                    index={index}
                    onToggle={() => toggleGroup(group.name)}
                    onMove={(to) => moveGroup(index, to)}
                    onDragStart={() => setDragIndex(index)}
                    onDrop={() => {
                      if (dragIndex !== null) moveGroup(dragIndex, index);
                      setDragIndex(null);
                    }}
                  />
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <StepHeading step={3} isDone={steps[2].isDone} />
              <div className="sm:max-w-xs">
                <Field label={copy.stopWorkingOn} htmlFor="link-expiry" hint={copy.stopWorkingOnHint}>
                  <DatePicker id="link-expiry" value={draft.expiresOn} onChange={(expiresOn) => setDraft((current) => ({ ...current, expiresOn }))} />
                </Field>
              </div>
            </section>
          </div>

          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-dashed border-line-strong px-5 py-4 md:px-6">
            <button type="button" onClick={onClose} className={cx(buttonBase, largeSize, ghostTone)}>
              {copy.cancel}
            </button>
            <button type="button" disabled={!isValid} onClick={() => onCreate(linkFromDraft(draft, links))} className={cx(buttonBase, largeSize, primaryTone)}>
              <Shine />
              <Icon name="check" size={15} className="relative" />
              <span className="relative">{copy.makeLink}</span>
            </button>
          </footer>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export default function ReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLink[]>(mockReferralLinks);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const defaultLink = links.find((link) => link.isDefault);
  const ownLinks = links.filter((link) => !link.isDefault);

  return (
    <div className="space-y-5">
      <header className="rl-rise flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] text-fg sm:text-5xl">{copy.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
        </div>
        <button type="button" aria-haspopup="dialog" onClick={() => setIsPanelOpen(true)} className={cx(buttonBase, largeSize, primaryTone)}>
          <Shine />
          <Icon name="plus" size={15} className="relative" />
          <span className="relative">{copy.newLink}</span>
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {defaultLink && <DefaultLinkTicket link={defaultLink} />}
        <ConversionRoute links={links} />
      </div>

      <LinksWatchlist
        links={ownLinks}
        onRemove={(link) => setLinks((current) => current.filter((item) => item.id !== link.id))}
        onOpen={() => setIsPanelOpen(true)}
      />

      {isPanelOpen && (
        <NewLinkPanel
          links={links}
          onClose={() => setIsPanelOpen(false)}
          onCreate={(link) => {
            setLinks((current) => [...current, link]);
            setIsPanelOpen(false);
          }}
        />
      )}
    </div>
  );
}
