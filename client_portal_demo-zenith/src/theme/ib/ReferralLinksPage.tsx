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

/*
 * Zenith referral links (Vaulto language): an open header with a red rule, the default link as a panel whose code is
 * set in square flap tiles with a blinking red cursor, the funnel as capsule tracks with running red beads, own links
 * as textured tiles with a pixel journey strip, a dashed add tile, and a "New link" drawer with three pixel steps.
 */
const RED = 'var(--zenith-red)';
const JOURNEY_PIXELS = 4;
const panelClass = 'relative overflow-hidden rounded-[32px] bg-fg/[0.02] ring-1 ring-line';
const textureClass =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[size:10px_10px] text-fg/[0.14] [mask-image:linear-gradient(160deg,#000,transparent_65%)]';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const solidPill =
  'group/pill relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-fg py-1 pr-5 pl-1 text-sm font-bold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none';
const ghostPill =
  'group/pill relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full py-1 pr-5 pl-1 text-sm font-bold text-fg ring-1 ring-line-strong transition-[translate,background-color] duration-300 hover:-translate-y-0.5 hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

function stagger(index: number, stepMs = 70, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * stepMs}ms` };
}

// Tracks start empty and grow to their value after the first paint.
function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return grown;
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
    <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/pill:translate-x-full motion-reduce:hidden" />
  );
}

function RedDisc({ icon, size = 14 }: { icon: IconName; size?: number }) {
  return (
    <span style={{ background: RED }} className="relative grid size-9 shrink-0 place-items-center rounded-full text-white">
      <Icon name={icon} size={size} />
    </span>
  );
}

function RedRule() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
      <span className="h-px flex-1 bg-line" />
    </span>
  );
}

/* ───────────── Funnel: one capsule track per stage, share of the stage before it ───────────── */

function FunnelTracks({ links }: { links: ReferralLink[] }) {
  const grown = useGrown();
  const funnel = totalFunnel(links);
  const ownLinks = links.filter((link) => !link.isDefault).length;
  const stages: { label: string; value: number; hint: string; share: number; icon: IconName }[] = [
    { label: copy.links, value: links.length, hint: copy.linksHint(ownLinks), share: links.length > 0 ? 1 : 0, icon: 'globe' },
    { label: copy.signedUp, value: funnel.signedUp, hint: copy.signedUpHint(funnel.visits), share: ratio(funnel.signedUp, funnel.visits), icon: 'user' },
    { label: copy.openedAccount, value: funnel.openedAccount, hint: copy.openedAccountHint, share: ratio(funnel.openedAccount, funnel.signedUp), icon: 'accounts' },
    { label: copy.funded, value: funnel.funded, hint: copy.fundedHint, share: ratio(funnel.funded, funnel.openedAccount), icon: 'wallet' },
  ];

  return (
    <section style={stagger(1, 0, 120)} className={cx(panelClass, 'zenith-tile p-5 sm:p-6')}>
      <ol aria-label={copy.title} className="flex h-full flex-col justify-between gap-5">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          return (
            <li key={stage.label} className="group/stage grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4">
              <span
                style={isLast ? { background: RED } : undefined}
                className={cx(
                  'grid size-11 place-items-center rounded-[14px] transition-transform duration-300 group-hover/stage:-rotate-12 motion-reduce:transition-none',
                  isLast ? 'text-white' : 'bg-fg text-app',
                )}
              >
                <Icon name={stage.icon} size={16} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cx(captionClass, 'truncate text-fg-muted')}>{stage.label}</span>
                  <span className="font-mono text-3xl leading-none font-black tracking-tighter text-fg tabular-nums">{stage.value}</span>
                </div>
                <span aria-hidden="true" className="relative mt-2.5 block h-2.5 overflow-hidden rounded-full bg-fg/[0.07]">
                  <span
                    style={{ width: grown ? `${stage.share * 100}%` : '0%', transitionDelay: `${index * 140}ms` }}
                    className="absolute inset-y-0 left-0 rounded-full bg-fg transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                  />
                  <span className="absolute inset-y-0 right-1.5 left-1.5">
                    <span
                      style={{ background: RED, animationDelay: `${index * 0.45}s` }}
                      className="zenith-route absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] motion-reduce:hidden"
                    />
                  </span>
                </span>
                <span className="mt-1.5 block truncate text-xs text-fg-subtle">{stage.hint}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ───────────── Journey: four counts in one strip, each with a pixel meter of the share of visits ───────────── */

function JourneyStrip({ funnel }: { funnel: LinkFunnel }) {
  const steps: { label: string; value: number }[] = [
    { label: copy.funnel.visits, value: funnel.visits },
    { label: copy.funnel.signedUp, value: funnel.signedUp },
    { label: copy.funnel.openedAccount, value: funnel.openedAccount },
    { label: copy.funnel.funded, value: funnel.funded },
  ];

  return (
    <ol className="grid grid-cols-4 overflow-hidden rounded-[20px] bg-fg/[0.02] ring-1 ring-line">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const share = index === 0 ? (step.value > 0 ? 1 : 0) : ratio(step.value, funnel.visits);
        const lit = Math.round(share * JOURNEY_PIXELS);
        return (
          <li key={step.label} className={cx('flex min-w-0 flex-col gap-1.5 px-3 py-3', index > 0 && 'border-l border-dashed border-line-strong', isLast && 'bg-fg/[0.04]')}>
            <span aria-hidden="true" className="flex gap-0.5">
              {Array.from({ length: JOURNEY_PIXELS }, (_, pixel) => (
                <span
                  key={pixel}
                  style={pixel < lit && isLast ? { background: RED } : undefined}
                  className={cx('size-1.5 rounded-[2px]', pixel < lit ? !isLast && 'bg-fg' : 'bg-fg/12')}
                />
              ))}
            </span>
            <span className="font-mono text-xl leading-none font-black text-fg tabular-nums">{step.value}</span>
            <span className="truncate text-[10.5px] text-fg-subtle">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function LinkButtons({ link }: { link: ReferralLink }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => copyLink(link)} className={cx(solidPill, 'flex-1 sm:flex-none')}>
        <Shine />
        <RedDisc icon="copy" />
        <span className="relative">{copy.copyLink}</span>
      </button>
      <button type="button" onClick={() => shareLink(link)} className={cx(ghostPill, 'flex-1 sm:flex-none')}>
        <span className="relative grid size-9 place-items-center rounded-full bg-fg/[0.06] transition-transform duration-300 group-hover/pill:rotate-45 motion-reduce:transition-none">
          <Icon name="arrowUpRight" size={14} />
        </span>
        <span className="relative">{copy.share}</span>
      </button>
    </div>
  );
}

/* ───────────── Default link: code in square flap tiles, URL capsule, journey ───────────── */

function DefaultLinkPanel({ link }: { link: ReferralLink }) {
  return (
    <article className={cx(panelClass, 'zenith-tile flex flex-col gap-6 p-5 sm:p-6')}>
      <span aria-hidden="true" className={textureClass} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-fg/15 motion-reduce:hidden" />
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
              <Icon name="globe" size={16} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-base font-black text-fg">{copy.defaultTitle}</p>
            <p className="mt-0.5 text-sm text-fg-muted">{copy.defaultHint}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-fg px-2.5 py-1 text-[11px] font-black text-app">
          <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
          {copy.defaultBadge}
        </span>
      </div>

      <div className="relative">
        <p className={cx(captionClass, 'font-mono text-fg-subtle normal-case')}>?ref=</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {link.code.split('').map((char, index) => (
            <span
              key={`${char}-${index}`}
              style={stagger(index, 60, 250)}
              className="zenith-pixel relative grid h-14 w-10 place-items-center overflow-hidden rounded-[10px] bg-fg font-mono text-xl font-black text-app sm:h-16 sm:w-11 sm:text-2xl"
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-app/25" />
              <span className="relative">{char}</span>
            </span>
          ))}
          <span aria-hidden="true" style={{ background: RED }} className="zenith-blink h-14 w-1.5 rounded-full sm:h-16" />
        </div>
      </div>

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-fg/[0.04] py-1 pr-4 pl-1 font-mono text-sm ring-1 ring-line">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-fg/[0.07] text-fg">
            <Icon name="globe" size={14} />
          </span>
          <span className="truncate">
            <span className="text-fg-subtle">{referralBaseUrl}</span>
            <span className="font-black text-fg">{link.code}</span>
          </span>
        </span>
        <LinkButtons link={link} />
      </div>

      <div className="relative border-t border-dashed border-line-strong pt-5">
        <JourneyStrip funnel={link.funnel} />
      </div>
    </article>
  );
}

/* ───────────── Own links: textured tiles ───────────── */

function LinkTile({ link, index, onRemove }: { link: ReferralLink; index: number; onRemove: () => void }) {
  return (
    <li
      style={stagger(index, 90, 200)}
      className="group zenith-tile relative flex flex-col gap-4 overflow-hidden rounded-[30px] bg-fg/[0.02] p-5 ring-1 ring-line transition-[background-color,box-shadow] duration-300 hover:bg-fg/[0.04] hover:ring-line-strong motion-reduce:transition-none"
    >
      <span aria-hidden="true" className={textureClass} />

      <div className="relative flex items-start gap-3">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-fg text-app transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none">
          <Icon name="megaphone" size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-fg">{link.name}</p>
          <p className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-fg/[0.05] px-2 py-0.5 font-mono text-xs font-bold text-fg ring-1 ring-line">
            <span className="text-fg-subtle">?ref=</span>
            <span className="truncate">{link.code}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={copy.removeLink}
          title={copy.removeLink}
          className="grid size-9 shrink-0 place-items-center rounded-full text-fg-subtle ring-1 ring-line transition-[color,background-color,rotate] duration-300 hover:rotate-90 hover:bg-danger hover:text-white hover:ring-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="relative flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle">
        <span className={captionClass}>{copy.offers}</span>
        {link.groups.map((group, groupIndex) => (
          <span
            key={group}
            className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold', groupIndex === 0 ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line')}
          >
            {groupIndex === 0 && <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />}
            {group}
          </span>
        ))}
      </div>

      <div className="relative">
        <JourneyStrip funnel={link.funnel} />
      </div>

      <div className="relative mt-auto flex flex-col gap-3 border-t border-dashed border-line-strong pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <Icon name="clock" size={12} />
          {link.expiresOn ? copy.expires(formatExpiry(link.expiresOn)) : copy.neverExpires}
        </span>
        <LinkButtons link={link} />
      </div>
    </li>
  );
}

function AddLinkTile({ index, onOpen }: { index: number; onOpen: () => void }) {
  return (
    <li style={stagger(index, 90, 200)} className="zenith-tile">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="group/add flex size-full min-h-64 flex-col items-center justify-center gap-4 rounded-[30px] border-2 border-dashed border-line-strong p-6 text-center transition-[background-color,border-color] duration-300 hover:border-fg/40 hover:bg-fg/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="relative grid size-16 place-items-center">
          <span style={{ background: RED }} className="absolute inset-1 animate-ping-soft rounded-full opacity-40 motion-reduce:hidden" />
          <span style={{ background: RED }} className="relative grid size-14 place-items-center rounded-full text-white transition-transform duration-300 group-hover/add:rotate-90 motion-reduce:transition-none">
            <Icon name="plus" size={20} />
          </span>
        </span>
        <span className="text-sm font-black text-fg">{copy.newLink}</span>
        <span className="max-w-60 text-xs text-fg-muted">{copy.panelSubtitle}</span>
      </button>
    </li>
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
        'group/grp relative flex min-h-32 flex-col justify-between gap-3 overflow-hidden rounded-[22px] p-3 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none',
        isOffered ? 'bg-fg text-app' : 'border-2 border-dashed border-line-strong text-fg-muted',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={isOffered}
          aria-label={name}
          onClick={onToggle}
          style={isOffered ? { background: RED } : undefined}
          className={cx(
            'grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            isOffered ? 'text-white' : 'border-2 border-dashed border-fg/30 hover:border-fg/60',
          )}
        >
          {isOffered && <Icon name="check" size={13} />}
        </button>
        <button
          type="button"
          aria-label={copy.moveGroup(name)}
          onKeyDown={handleKey}
          className={cx(
            'grid size-8 cursor-grab place-items-center rounded-[10px] transition-colors active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            isOffered ? 'text-app/60 hover:bg-app/10 hover:text-app' : 'text-fg-subtle hover:bg-fg/[0.06] hover:text-fg',
          )}
        >
          <Icon name="arrowsUpDown" size={13} />
        </button>
      </div>
      <div className="min-w-0">
        <span aria-hidden="true" className={cx('font-mono text-[10.5px] font-bold', isOffered ? 'text-app/50' : 'text-fg-subtle')}>
          #{index + 1}
        </span>
        <p className="truncate text-lg leading-tight font-black">{name}</p>
        {isFirst && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-app px-2 py-0.5 text-[10px] font-black text-fg">
            <span aria-hidden="true" style={{ background: RED }} className="zenith-blink size-1.5 rounded-[2px]" />
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
        style={isDone ? { background: RED } : undefined}
        className={cx('grid size-8 shrink-0 place-items-center rounded-[10px] font-mono text-xs font-black transition-colors duration-300', isDone ? 'text-white' : 'bg-fg text-app')}
      >
        {isDone ? <Icon name="check" size={13} /> : step}
      </span>
      <span className="h-px flex-1 border-t border-dashed border-line-strong" />
      {children}
    </div>
  );
}

// Live preview of the link being built: only shows what the draft already holds, placeholders otherwise.
function LinkPreview({ draft, problem, steps }: { draft: LinkDraft; problem: string | null; steps: { isDone: boolean; isOptional: boolean }[] }) {
  const offered = draft.groups.filter((group) => group.isOffered);

  return (
    <div className="relative flex flex-col gap-5 overflow-hidden border-b border-dashed border-line-strong bg-fg/[0.03] p-5 md:border-r md:border-b-0 md:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />

      <div className="relative flex items-start gap-3 pr-10 md:pr-0">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
            <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
            <Icon name="plus" size={16} />
          </span>
        </span>
        <div className="min-w-0">
          <h2 id="new-link-title" className="text-2xl leading-tight font-black tracking-[-0.03em] text-fg">
            {copy.panelTitle}
          </h2>
          <p className="text-sm text-fg-muted">{copy.panelSubtitle}</p>
        </div>
      </div>

      <div aria-hidden="true" className="relative flex gap-1.5">
        {steps.map((step, index) => (
          <span
            key={index}
            className={cx('relative h-1.5 flex-1 overflow-hidden rounded-full', !step.isDone && step.isOptional ? 'border border-dashed border-line-strong' : 'bg-fg/[0.08]')}
          >
            <span
              style={{ background: RED, width: step.isDone ? '100%' : '0%' }}
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
            />
          </span>
        ))}
      </div>

      {/* The link card, filled in as the form is typed. */}
      <div aria-live="polite" className="relative flex flex-col gap-4 rounded-[24px] bg-surface p-4 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.6)] ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-fg text-app">
            <Icon name="megaphone" size={15} />
          </span>
          <p className={cx('min-w-0 truncate text-base font-black', draft.name.trim() ? 'text-fg' : 'text-fg-subtle')}>{draft.name.trim() || copy.namePlaceholder}</p>
        </div>

        <p className="flex min-w-0 items-center gap-2 rounded-full bg-fg/[0.04] px-3 py-2 font-mono text-[11px] ring-1 ring-line">
          <Icon name="globe" size={12} className="shrink-0 text-fg-subtle" />
          <span className="min-w-0 truncate">
            <span className="text-fg-subtle">?ref=</span>
            {draft.code.trim() ? (
              <span className={cx('font-black', problem ? 'text-danger' : 'text-fg')}>{draft.code.trim()}</span>
            ) : (
              <span className="text-fg-subtle italic">{copy.codePlaceholder}</span>
            )}
          </span>
          <span aria-hidden="true" style={{ background: RED }} className="zenith-blink ml-auto h-3.5 w-1 shrink-0 rounded-full" />
        </p>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cx(captionClass, 'text-fg-subtle')}>{copy.offers}</span>
          {offered.map((group, groupIndex) => (
            <span
              key={group.name}
              className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold', groupIndex === 0 ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line')}
            >
              {groupIndex === 0 && <span aria-hidden="true" style={{ background: RED }} className="size-1.5 rounded-[2px]" />}
              {group.name}
            </span>
          ))}
          {offered.length === 0 && <span aria-hidden="true" className="h-5 w-12 rounded-full border border-dashed border-line-strong" />}
        </div>

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
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl animate-rise flex-col overflow-y-auto rounded-[32px] bg-surface shadow-[0_30px_60px_-25px_rgb(0_0_0/0.55)] ring-1 ring-line motion-reduce:animate-none sm:max-h-[calc(100dvh-2rem)] md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closePanel}
          className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-surface text-fg-muted ring-1 ring-line transition-[color,rotate] duration-300 hover:rotate-90 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                <p className="flex min-w-0 animate-feed-in items-center gap-2 rounded-full bg-fg/[0.04] px-3 py-2 font-mono text-xs ring-1 ring-line motion-reduce:animate-none">
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
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-fg ring-1 ring-line-strong transition-colors hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {copy.cancel}
            </button>
            <button type="button" disabled={!isValid} onClick={() => onCreate(linkFromDraft(draft, links))} className={solidPill}>
              <Shine />
              <RedDisc icon="check" />
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
    <div className="space-y-6">
      <header className="zenith-tile flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
              <span className="absolute inset-0 animate-rim-spin [animation-duration:3s] motion-reduce:animate-none">
                <span style={{ background: RED }} className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-[2px]" />
              </span>
              <span className="grid size-11 place-items-center rounded-full bg-fg text-app">
                <Icon name="megaphone" size={17} />
              </span>
            </span>
            <div className="min-w-0">
              <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-fg sm:text-5xl">{copy.title}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" aria-haspopup="dialog" onClick={() => setIsPanelOpen(true)} className={solidPill}>
            <Shine />
            <RedDisc icon="plus" />
            <span className="relative">{copy.newLink}</span>
          </button>
        </div>
        <RedRule />
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {defaultLink && <DefaultLinkPanel link={defaultLink} />}
        <FunnelTracks links={links} />
      </div>

      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {ownLinks.map((link, index) => (
          <LinkTile key={link.id} link={link} index={index} onRemove={() => setLinks((current) => current.filter((item) => item.id !== link.id))} />
        ))}
        <AddLinkTile index={ownLinks.length} onOpen={() => setIsPanelOpen(true)} />
      </ul>

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
