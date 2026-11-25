'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FrostCard } from '../dashboard/FrostCard';
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

const SHARE_DOTS = 12;

/*
 * Nova referral links: the default link is a dark pass with its code strung as glossy beads, the funnel is a frosted
 * stack of stages with dot meters, own links are tickets with a bead journey, and "New link" opens a floating drawer.
 */
const inkClass = 'relative overflow-hidden rounded-[30px] bg-[#0a1220] text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10';
const inkDots = 'pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:12px_12px]';
const captionClass = 'text-[10.5px] font-semibold tracking-[0.14em] uppercase';
const inkPill =
  'group/pill relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full py-1 pr-5 pl-1 text-sm font-bold transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 70}ms` };
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

/* ───────────── Funnel (frosted): four stages, each with a dot meter of the share that got this far ───────────── */

function FunnelStack({ links }: { links: ReferralLink[] }) {
  const funnel = totalFunnel(links);
  const ownLinks = links.filter((link) => !link.isDefault).length;
  const stages: { label: string; value: number; hint: string; share: number; icon: IconName }[] = [
    { label: copy.links, value: links.length, hint: copy.linksHint(ownLinks), share: links.length > 0 ? 1 : 0, icon: 'globe' },
    { label: copy.signedUp, value: funnel.signedUp, hint: copy.signedUpHint(funnel.visits), share: ratio(funnel.signedUp, funnel.visits), icon: 'user' },
    { label: copy.openedAccount, value: funnel.openedAccount, hint: copy.openedAccountHint, share: ratio(funnel.openedAccount, funnel.signedUp), icon: 'accounts' },
    { label: copy.funded, value: funnel.funded, hint: copy.fundedHint, share: ratio(funnel.funded, funnel.openedAccount), icon: 'wallet' },
  ];

  return (
    <FrostCard className="lg:col-span-5">
      <ol aria-label={copy.title} className="relative flex h-full flex-col justify-between gap-1 text-[#0a1220]">
        <span aria-hidden="true" className="absolute top-6 bottom-6 left-6 border-l-2 border-dotted border-[#0a1220]/20" />
        {stages.map((stage, index) => {
          const lit = Math.round(stage.share * SHARE_DOTS);
          return (
            <li key={stage.label} style={riseDelay(index + 1)} className="group/stage relative flex animate-feed-in items-center gap-4 py-2.5 motion-reduce:animate-none">
              <span className="relative grid size-12 shrink-0 place-items-center">
                <span
                  aria-hidden="true"
                  className={cx('absolute inset-0 rounded-full border-2 border-dashed border-[#0a1220]/25', index === 0 ? 'animate-rim-spin motion-reduce:animate-none' : 'group-hover/stage:animate-rim-spin')}
                />
                <span className={cx('grid size-9 place-items-center rounded-full', index === stages.length - 1 ? 'bg-[#0a1220] text-white' : 'bg-white text-[#0a1220] ring-1 ring-white shadow-[0_6px_14px_-8px_rgb(10_18_32/0.5)]')}>
                  <Icon name={stage.icon} size={15} />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cx(captionClass, 'truncate text-[#3b4658]')}>{stage.label}</span>
                  <span className="font-mono text-3xl leading-none font-black tabular-nums">{stage.value}</span>
                </div>
                <span aria-hidden="true" className="mt-2 flex gap-1">
                  {Array.from({ length: SHARE_DOTS }, (_, dot) => (
                    <span
                      key={dot}
                      style={dot < lit ? { animationDelay: `${index * 140 + dot * 35}ms` } : undefined}
                      className={cx('size-2 rounded-full', dot < lit ? 'animate-dot-pop bg-[#0a1220] motion-reduce:animate-none' : 'bg-[#0a1220]/10')}
                    />
                  ))}
                </span>
                <span className="mt-1 block truncate text-xs text-[#3b4658]">{stage.hint}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </FrostCard>
  );
}

/* ───────────── Journey: four counts as beads on a wire of blinking dots ───────────── */

function JourneyBeads({ funnel, inverted = false }: { funnel: LinkFunnel; inverted?: boolean }) {
  const steps: { label: string; value: number }[] = [
    { label: copy.funnel.visits, value: funnel.visits },
    { label: copy.funnel.signedUp, value: funnel.signedUp },
    { label: copy.funnel.openedAccount, value: funnel.openedAccount },
    { label: copy.funnel.funded, value: funnel.funded },
  ];

  return (
    <ol className="flex items-start">
      {steps.map((step, index) => (
        <li key={step.label} className="flex min-w-0 flex-1 items-start">
          <span className="flex min-w-0 flex-1 flex-col items-center text-center">
            <span
              className={cx(
                'grid h-10 min-w-10 place-items-center rounded-full px-2 font-mono text-sm font-black tabular-nums',
                index === steps.length - 1 ? (inverted ? 'bg-white text-[#0a1220]' : 'bg-fg text-app') : inverted ? 'bg-white/10 text-white ring-1 ring-white/15' : 'nova-gloss text-fg',
              )}
            >
              {step.value}
            </span>
            <span className={cx('mt-1.5 w-full truncate text-[10.5px]', inverted ? 'text-white/55' : 'text-fg-subtle')}>{step.label}</span>
          </span>
          {index < steps.length - 1 && (
            <span aria-hidden="true" className="mt-[18px] flex shrink-0 gap-1">
              {Array.from({ length: 3 }, (_, dot) => (
                <span key={dot} style={{ animationDelay: `${(index * 3 + dot) * 0.18}s` }} className={cx('size-1 animate-blink rounded-full motion-reduce:animate-none', inverted ? 'bg-white/60' : 'bg-fg/50')} />
              ))}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function LinkButtons({ link, inverted = false }: { link: ReferralLink; inverted?: boolean }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => copyLink(link)} className={cx(inkPill, 'flex-1 sm:flex-none', inverted ? 'bg-white text-[#0a1220]' : 'bg-fg text-app')}>
        <Shine />
        <span className={cx('relative grid size-9 place-items-center rounded-full', inverted ? 'bg-[#0a1220] text-white' : 'bg-app text-fg')}>
          <Icon name="copy" size={14} />
        </span>
        <span className="relative">{copy.copyLink}</span>
      </button>
      <button
        type="button"
        onClick={() => shareLink(link)}
        className={cx(inkPill, 'flex-1 ring-1 sm:flex-none', inverted ? 'text-white ring-white/25 hover:bg-white/10' : 'text-fg ring-line hover:ring-line-strong')}
      >
        <span className={cx('relative grid size-9 place-items-center rounded-full', inverted ? 'bg-white/10' : 'bg-fg/[0.06]')}>
          <Icon name="arrowUpRight" size={14} />
        </span>
        <span className="relative">{copy.share}</span>
      </button>
    </div>
  );
}

/* ───────────── Default link (dark pass): code beads, URL capsule, journey ───────────── */

function DefaultPass({ link }: { link: ReferralLink }) {
  return (
    <article className={cx(inkClass, 'flex animate-rise flex-col gap-6 p-5 motion-reduce:animate-none sm:p-6 lg:col-span-7')}>
      <span aria-hidden="true" className={cx(inkDots, '[mask-image:linear-gradient(160deg,#000,transparent_70%)]')} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-ring-ripple rounded-full ring-2 ring-white/20 motion-reduce:hidden" />
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-white/30 motion-reduce:animate-none" />
            <span className="grid size-9 place-items-center rounded-full bg-white text-[#0a1220]">
              <Icon name="globe" size={16} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-base font-black">{copy.defaultTitle}</p>
            <p className="mt-0.5 text-sm text-white/60">{copy.defaultHint}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#0a1220]">
          <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-success motion-reduce:animate-none" />
          {copy.defaultBadge}
        </span>
      </div>

      {/* The code, strung as glossy beads on a dotted wire. */}
      <div className="relative flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-xs text-white/45">?ref=</span>
        <span aria-hidden="true" className="absolute top-1/2 right-0 left-14 -z-0 border-t-2 border-dotted border-white/15" />
        {link.code.split('').map((char, index) => (
          <span
            key={`${char}-${index}`}
            style={{ animationDelay: `${250 + index * 60}ms` }}
            className="relative grid size-12 animate-dot-pop place-items-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#fff,#d7dde7_60%,#aab3c2)] font-mono text-lg font-black text-[#0a1220] shadow-[inset_0_-3px_6px_rgb(10_18_32/0.25),0_8px_16px_-10px_rgb(0_0_0/0.8)] motion-reduce:animate-none"
          >
            {char}
          </span>
        ))}
      </div>

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[0.06] py-1 pr-4 pl-1 font-mono text-sm ring-1 ring-white/15">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
            <Icon name="globe" size={14} />
          </span>
          <span className="truncate">
            <span className="text-white/45">{referralBaseUrl}</span>
            <span className="font-black">{link.code}</span>
          </span>
        </span>
        <LinkButtons link={link} inverted />
      </div>

      <div className="relative border-t-2 border-dotted border-white/15 pt-5">
        <JourneyBeads funnel={link.funnel} inverted />
      </div>
    </article>
  );
}

/* ───────────── Own links: tickets ───────────── */

function LinkTicket({ link, index, onRemove }: { link: ReferralLink; index: number; onRemove: () => void }) {
  return (
    <li
      style={riseDelay(index)}
      className="orbit-card nova-edge-light group relative flex animate-feed-in flex-col gap-4 overflow-hidden p-4 transition-[translate] duration-300 hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:transition-none sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-fg/20 group-hover:animate-rim-spin motion-reduce:group-hover:animate-none" />
          <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
            <Icon name="megaphone" size={15} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-fg">{link.name}</p>
          <p className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-fg/[0.05] px-2 py-0.5 font-mono text-xs font-bold text-fg">
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

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle">
        <span>{copy.offers}</span>
        {link.groups.map((group, groupIndex) => (
          <span key={group} className={cx('rounded-full px-2.5 py-0.5 font-bold', groupIndex === 0 ? 'bg-fg text-app' : 'text-fg-muted ring-1 ring-line')}>
            {group}
          </span>
        ))}
      </div>

      <div className="rounded-[22px] bg-fg/[0.03] px-3 py-3 ring-1 ring-line">
        <JourneyBeads funnel={link.funnel} />
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-dotted border-line-strong pt-3 sm:flex-row sm:items-center sm:justify-between">
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
    <li style={riseDelay(index)} className="animate-feed-in motion-reduce:animate-none">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="group/add flex size-full min-h-56 flex-col items-center justify-center gap-4 rounded-[30px] border-2 border-dashed border-line-strong p-6 text-center transition-[background-color,border-color] duration-300 hover:border-fg/40 hover:bg-fg/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true" className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="absolute inset-1 animate-ring-ripple rounded-full ring-2 ring-fg/10 motion-reduce:hidden" />
          <span className="grid size-11 place-items-center rounded-full bg-fg text-app transition-transform duration-300 group-hover/add:rotate-90">
            <Icon name="plus" size={18} />
          </span>
        </span>
        <span className="text-sm font-black text-fg">{copy.newLink}</span>
        <span className="max-w-60 text-xs text-fg-muted">{copy.panelSubtitle}</span>
      </button>
    </li>
  );
}

/* ───────────── New link drawer: floating panel with three numbered steps ───────────── */

function GroupRow({ name, isOffered, isFirst, index, onToggle, onMove, onDragStart, onDrop }: {
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
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onMove(index - 1);
    }
    if (event.key === 'ArrowDown') {
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
        'flex items-center gap-3 rounded-full py-1.5 pr-3 pl-1.5 transition-[background-color,color] duration-300',
        isOffered ? 'bg-fg text-app' : 'text-fg ring-1 ring-line',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isOffered}
        aria-label={name}
        onClick={onToggle}
        className={cx(
          'grid size-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isOffered ? 'bg-app text-fg' : 'border-2 border-dashed border-fg/30',
        )}
      >
        {isOffered && <Icon name="check" size={13} />}
      </button>
      <span className="flex-1 text-sm font-bold">{name}</span>
      {isFirst && (
        <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-black text-white">
          <span aria-hidden="true" className="size-1 animate-blink rounded-full bg-white motion-reduce:animate-none" />
          {copy.shownFirst}
        </span>
      )}
      <button
        type="button"
        aria-label={copy.moveGroup(name)}
        onKeyDown={handleKey}
        className={cx('grid size-7 cursor-grab place-items-center rounded-full active:cursor-grabbing', isOffered ? 'text-app/70 hover:text-app' : 'text-fg-subtle hover:text-fg')}
      >
        <Icon name="arrowsUpDown" size={13} />
      </button>
    </li>
  );
}

function StepBlock({ step, children }: { step: number; children: ReactNode }) {
  return (
    <section className="relative flex gap-4">
      <span aria-hidden="true" className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-fg font-mono text-xs font-black text-app ring-4 ring-surface">
        {step}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1">{children}</div>
    </section>
  );
}

function NewLinkPanel({ links, onClose, onCreate }: { links: ReferralLink[]; onClose: () => void; onCreate: (link: ReferralLink) => void }) {
  const [draft, setDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const problem = codeProblem(draft.code, links);
  const firstOffered = draft.groups.find((group) => group.isOffered)?.name;
  const isValid = isLinkDraftValid(draft, links);

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
    <div className="fixed inset-0 z-[65] flex justify-end p-2 sm:p-3">
      <button type="button" aria-label={copy.closePanel} tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-quick bg-overlay backdrop-blur-sm motion-reduce:animate-none" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-link-title"
        className="nova-edge-light relative flex h-full w-full max-w-md animate-feed-in flex-col overflow-hidden rounded-[30px] bg-surface shadow-[0_30px_60px_-25px_rgb(0_0_0/0.55)] ring-1 ring-line motion-reduce:animate-none"
      >
        <header className="relative flex items-start gap-3 px-5 pt-5 pb-4">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:linear-gradient(180deg,#000,transparent)]" />
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
            <span className="grid size-9 place-items-center rounded-full bg-fg text-app">
              <Icon name="plus" size={16} />
            </span>
          </span>
          <div className="relative min-w-0 flex-1">
            <h2 id="new-link-title" className="text-xl font-black tracking-[-0.02em] text-fg">
              {copy.panelTitle}
            </h2>
            <p className="text-sm text-fg-muted">{copy.panelSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closePanel}
            className="relative grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line transition-[color,rotate] duration-300 hover:rotate-90 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="close" size={14} />
          </button>
        </header>

        <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
          <span aria-hidden="true" className="absolute top-8 bottom-8 left-[35px] border-l-2 border-dotted border-line-strong" />

          <StepBlock step={1}>
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
            {draft.code && (
              <p className="flex min-w-0 animate-feed-in items-center gap-2 rounded-full bg-fg/[0.04] px-3 py-2 font-mono text-xs ring-1 ring-line motion-reduce:animate-none">
                <Icon name="globe" size={12} className="shrink-0 text-fg-subtle" />
                <span className="truncate">
                  <span className="text-fg-subtle">{referralBaseUrl}</span>
                  <span className={cx('font-black', problem ? 'text-danger' : 'text-fg')}>{draft.code}</span>
                </span>
              </p>
            )}
          </StepBlock>

          <StepBlock step={2}>
            <div>
              <p className={cx(captionClass, 'text-fg-subtle')}>{copy.groupsTitle}</p>
              <p className="mt-1 text-sm text-fg-muted">{copy.groupsHint}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {draft.groups.map((group, index) => (
                <GroupRow
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
          </StepBlock>

          <StepBlock step={3}>
            <Field label={copy.stopWorkingOn} htmlFor="link-expiry" hint={copy.stopWorkingOnHint}>
              <DatePicker id="link-expiry" value={draft.expiresOn} onChange={(expiresOn) => setDraft((current) => ({ ...current, expiresOn }))} />
            </Field>
          </StepBlock>
        </div>

        <footer className="flex gap-2 border-t-2 border-dotted border-line-strong px-5 py-4">
          <button type="button" disabled={!isValid} onClick={() => onCreate(linkFromDraft(draft, links))} className={cx(inkPill, 'flex-1 bg-fg text-app')}>
            <Shine />
            <span className="relative grid size-9 place-items-center rounded-full bg-app text-fg">
              <Icon name="check" size={14} />
            </span>
            <span className="relative">{copy.makeLink}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-fg ring-1 ring-line transition-colors hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copy.cancel}
          </button>
        </footer>
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
    <div className="flex flex-col gap-6">
      <header className="flex animate-feed-in items-center gap-4 motion-reduce:animate-none">
        <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-rim-spin rounded-full border-2 border-dashed border-fg/25 motion-reduce:animate-none" />
          <span className="grid size-10 animate-float place-items-center rounded-full bg-fg text-app motion-reduce:animate-none">
            <Icon name="megaphone" size={17} />
          </span>
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-[-0.03em] text-fg">{copy.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-12">
        {defaultLink && <DefaultPass link={defaultLink} />}
        <FunnelStack links={links} />
      </div>

      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {ownLinks.map((link, index) => (
          <LinkTicket key={link.id} link={link} index={index} onRemove={() => setLinks((current) => current.filter((item) => item.id !== link.id))} />
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
