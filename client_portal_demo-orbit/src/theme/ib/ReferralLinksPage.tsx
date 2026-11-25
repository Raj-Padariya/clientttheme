'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { DatePicker } from '../ui/DatePicker';
import { Icon } from '../ui/Icon';
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

/* ───────────── Sign-up orbit: each funnel stage is a ring, a planet rides each one ───────────── */

const ORBIT_CENTER = 120;

interface OrbitStage {
  label: string;
  value: number;
  hint: string;
  /** Share of the previous stage that made it this far, drawn as the ring's arc. */
  share: number;
  radius: number;
  arcClass: string;
  rideSeconds: number;
}

function SignupOrbit({ links }: { links: ReferralLink[] }) {
  const funnel = totalFunnel(links);
  const ownLinks = links.filter((link) => !link.isDefault).length;
  const stages: OrbitStage[] = [
    { label: copy.links, value: links.length, hint: copy.linksHint(ownLinks), share: links.length > 0 ? 1 : 0, radius: 108, arcClass: 'text-primary/45', rideSeconds: 6 },
    { label: copy.signedUp, value: funnel.signedUp, hint: copy.signedUpHint(funnel.visits), share: ratio(funnel.signedUp, funnel.visits), radius: 84, arcClass: 'text-primary/60', rideSeconds: 4.5 },
    { label: copy.openedAccount, value: funnel.openedAccount, hint: copy.openedAccountHint, share: ratio(funnel.openedAccount, funnel.signedUp), radius: 60, arcClass: 'text-primary/80', rideSeconds: 3.5 },
    { label: copy.funded, value: funnel.funded, hint: copy.fundedHint, share: ratio(funnel.funded, funnel.openedAccount), radius: 36, arcClass: 'text-primary', rideSeconds: 2.6 },
  ];

  return (
    <section aria-label={copy.title} className="orbit-card relative grid animate-rise items-center gap-6 overflow-hidden p-5 motion-reduce:animate-none sm:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-52">
        <svg viewBox="0 0 240 240" className="absolute inset-0 size-full" aria-hidden="true">
          {stages.map((stage) => (
            <g key={stage.label} transform={`rotate(-90 ${ORBIT_CENTER} ${ORBIT_CENTER})`}>
              <circle cx={ORBIT_CENTER} cy={ORBIT_CENTER} r={stage.radius} fill="none" strokeWidth="1.5" strokeDasharray="3 5" className="stroke-current text-primary/25" />
              <circle
                cx={ORBIT_CENTER}
                cy={ORBIT_CENTER}
                r={stage.radius}
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${stage.share * 100} 100`}
                className={cx('stroke-current transition-[stroke-dasharray] duration-700', stage.arcClass)}
              />
            </g>
          ))}
        </svg>
        {stages.map((stage, index) => (
          <span
            key={stage.label}
            aria-hidden="true"
            style={{ '--ride': `${stage.rideSeconds}s` } as CSSProperties}
            className={cx(
              'absolute inset-0 motion-reduce:animate-none',
              index % 2 === 0 ? 'animate-[orbit-spin_var(--ride)_linear_infinite]' : 'animate-[orbit-spin_var(--ride)_linear_infinite_reverse]',
            )}
          >
            <span
              style={{ top: `${((ORBIT_CENTER - stage.radius) / (ORBIT_CENTER * 2)) * 100}%` }}
              className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/15"
            />
          </span>
        ))}
        <span className="absolute inset-0 grid place-items-center">
          <span className="relative grid size-12 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
            <span aria-hidden="true" className="absolute inset-0 animate-pulse-ring rounded-full ring-1 ring-primary/40 motion-reduce:hidden" />
            <Icon name="globe" size={18} />
          </span>
        </span>
      </div>

      <ol className="flex flex-col divide-y divide-line">
        {stages.map((stage, index) => (
          <li key={stage.label} style={riseDelay(index + 1)} className="flex animate-rise items-center gap-3 py-2.5 first:pt-0 last:pb-0 motion-reduce:animate-none">
            <svg viewBox="0 0 20 20" className="size-5 shrink-0" aria-hidden="true">
              <circle cx="10" cy="10" r={8 - index * 1.6} fill="none" strokeWidth="2" className={cx('stroke-current', stage.arcClass)} />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-fg-subtle">{stage.label}</span>
              <span className="block truncate text-sm text-fg-muted">{stage.hint}</span>
            </span>
            <span className="font-mono text-2xl font-bold text-fg tabular-nums">{stage.value}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Journey track: the four counts of one link on a thin rail with a running comet ───────────── */

function JourneyTrack({ funnel }: { funnel: LinkFunnel }) {
  const steps: { label: string; value: number }[] = [
    { label: copy.funnel.visits, value: funnel.visits },
    { label: copy.funnel.signedUp, value: funnel.signedUp },
    { label: copy.funnel.openedAccount, value: funnel.openedAccount },
    { label: copy.funnel.funded, value: funnel.funded },
  ];
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute top-1.5 right-[12.5%] left-[12.5%] h-0.5 overflow-hidden rounded-full bg-primary/15">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-comet bg-linear-to-r from-transparent via-primary/70 to-transparent motion-reduce:hidden" />
      </span>
      <ol className="relative grid grid-cols-4">
        {steps.map((step) => (
          <li key={step.label} className="flex flex-col items-center text-center">
            <span aria-hidden="true" className="size-3.5 rounded-full bg-surface ring-2 ring-primary/50" />
            <span className="mt-2 font-mono text-lg leading-tight font-bold text-fg tabular-nums">{step.value}</span>
            <span className="text-[11px] text-fg-subtle">{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LinkActions({ link }: { link: ReferralLink }) {
  return (
    <div className="flex gap-2">
      <Button leftIcon="copy" onClick={() => copyLink(link)} className="flex-1 sm:flex-none">
        {copy.copyLink}
      </Button>
      <Button variant="outline" leftIcon="arrowUpRight" onClick={() => shareLink(link)} className="flex-1 sm:flex-none">
        {copy.share}
      </Button>
    </div>
  );
}

/* ───────────── Default link as a pass: code tiles, a perforated tear line, then the URL and its journey ───────────── */

function LinkPass({ link }: { link: ReferralLink }) {
  return (
    <article style={riseDelay(1)} className="orbit-card relative flex animate-rise flex-col overflow-hidden motion-reduce:animate-none">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-fg">{copy.defaultTitle}</p>
            <p className="mt-1 text-sm text-fg-muted">{copy.defaultHint}</p>
          </div>
          <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/30">{copy.defaultBadge}</span>
        </div>
        <div className="flex flex-wrap items-end gap-1.5">
          <span className="mr-1 pb-1 font-mono text-xs text-fg-subtle">?ref=</span>
          {link.code.split('').map((char, index) => (
            <span
              key={`${char}-${index}`}
              style={{ animationDelay: `${250 + index * 60}ms` }}
              className="grid h-12 w-9 animate-rank-pop place-items-center rounded-xl bg-primary/[0.07] font-mono text-xl font-bold text-fg ring-1 ring-primary/20 motion-reduce:animate-none"
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="relative h-6">
        <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-app ring-1 ring-line" />
        <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-app ring-1 ring-line" />
        <span className="absolute top-1/2 right-5 left-5 border-t-2 border-dashed border-line" />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <span className="flex h-11 min-w-0 flex-1 items-center rounded-xl bg-surface/70 px-3.5 font-mono text-sm ring-1 ring-line">
            <span className="truncate">
              <span className="text-fg-subtle">{referralBaseUrl}</span>
              <span className="font-semibold text-primary">{link.code}</span>
            </span>
          </span>
          <LinkActions link={link} />
        </div>
        <JourneyTrack funnel={link.funnel} />
      </div>
    </article>
  );
}

/* ───────────── Your own links: one slim row each ───────────── */

function LinkRow({ link, index, onRemove }: { link: ReferralLink; index: number; onRemove: () => void }) {
  return (
    <li style={riseDelay(index)} className="orbit-card flex animate-rise flex-col gap-4 p-4 motion-reduce:animate-none lg:flex-row lg:items-center">
      <div className="min-w-0 lg:w-72">
        <p className="truncate text-sm font-bold text-fg">{link.name}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-primary">{link.code}</p>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle">
          <span>{copy.offers}</span>
          {link.groups.map((group, groupIndex) => (
            <span
              key={group}
              className={cx('rounded-full px-2 py-0.5 font-semibold ring-1', groupIndex === 0 ? 'bg-primary/15 text-fg ring-primary/40' : 'text-fg-muted ring-line')}
            >
              {group}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={12} />
            {link.expiresOn ? copy.expires(formatExpiry(link.expiresOn)) : copy.neverExpires}
          </span>
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <JourneyTrack funnel={link.funnel} />
      </div>
      <div className="flex items-center gap-2">
        <LinkActions link={link} />
        <button
          type="button"
          onClick={onRemove}
          aria-label={copy.removeLink}
          title={copy.removeLink}
          className="grid size-10 shrink-0 place-items-center rounded-full text-fg-subtle ring-1 ring-line transition-colors hover:text-danger hover:ring-danger/40"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </li>
  );
}

/* ───────────── New link side panel ───────────── */

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
        'flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition-colors',
        isOffered ? 'bg-primary/[0.08] ring-primary/35' : 'ring-line',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isOffered}
        aria-label={name}
        onClick={onToggle}
        className={cx('grid size-5 shrink-0 place-items-center rounded-md ring-1', isOffered ? 'bg-primary/25 text-primary ring-primary/50' : 'ring-line-strong')}
      >
        {isOffered && <Icon name="check" size={12} />}
      </button>
      <button
        type="button"
        aria-label={copy.moveGroup(name)}
        onKeyDown={handleKey}
        className="cursor-grab text-fg-subtle hover:text-fg active:cursor-grabbing"
      >
        <Icon name="arrowsUpDown" size={14} />
      </button>
      <span className="text-sm font-semibold text-fg">{name}</span>
      {isFirst && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success/30">{copy.shownFirst}</span>}
    </li>
  );
}

function NewLinkPanel({ links, onClose, onCreate }: { links: ReferralLink[]; onClose: () => void; onCreate: (link: ReferralLink) => void }) {
  const [draft, setDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const problem = codeProblem(draft.code, links);
  const firstOffered = draft.groups.find((group) => group.isOffered)?.name;

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
    <div className="fixed inset-0 z-[65] flex justify-end">
      <button type="button" aria-label={copy.closePanel} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-overlay backdrop-blur-sm" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-link-title"
        className="relative flex h-full w-full max-w-md animate-rise flex-col border-l border-line bg-surface shadow-[0_30px_60px_-25px_rgb(0_0_0/0.55)] motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span aria-hidden="true" className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10">
            <span className="absolute inset-0 rounded-full border border-dashed border-primary/40 motion-safe:animate-orbit-spin" />
            <Icon name="globe" size={15} className="text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="new-link-title" className="text-lg font-semibold text-fg">
              {copy.panelTitle}
            </h2>
            <p className="text-sm text-fg-muted">{copy.panelSubtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={copy.closePanel} className="grid size-9 place-items-center rounded-full text-fg-muted ring-1 ring-line hover:text-fg">
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
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

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{copy.groupsTitle}</p>
            <p className="text-sm text-fg-muted">{copy.groupsHint}</p>
            <ul className="mt-1 flex flex-col gap-2">
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
          </div>

          <Field label={copy.stopWorkingOn} htmlFor="link-expiry" hint={copy.stopWorkingOnHint}>
            <DatePicker id="link-expiry" value={draft.expiresOn} onChange={(expiresOn) => setDraft((current) => ({ ...current, expiresOn }))} />
          </Field>
        </div>

        <footer className="flex gap-2 border-t border-line px-5 py-4">
          <Button disabled={!isLinkDraftValid(draft, links)} onClick={() => onCreate(linkFromDraft(draft, links))}>
            {copy.makeLink}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {copy.cancel}
          </Button>
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
        </div>
        <Button leftIcon="plus" aria-haspopup="dialog" onClick={() => setIsPanelOpen(true)}>
          {copy.newLink}
        </Button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SignupOrbit links={links} />
        {defaultLink && <LinkPass link={defaultLink} />}
      </div>

      {ownLinks.length > 0 && (
        <ul className="flex flex-col gap-3">
          {ownLinks.map((link, index) => (
            <LinkRow key={link.id} link={link} index={index} onRemove={() => setLinks((current) => current.filter((item) => item.id !== link.id))} />
          ))}
        </ul>
      )}

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
