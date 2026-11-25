'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
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

const cardClass = 'rounded-3xl border border-line bg-surface shadow-card';

function riseDelay(index: number): CSSProperties {
  return { animationDelay: `${index * 80}ms` };
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

/* ───────────── Funnel: link count on a graphite tile, the three stages as tapering steps ───────────── */

function FunnelTiles({ links }: { links: ReferralLink[] }) {
  const funnel = totalFunnel(links);
  const ownLinks = links.filter((link) => !link.isDefault).length;
  const stages: { label: string; value: number; hint: string; icon: IconName }[] = [
    { label: copy.signedUp, value: funnel.signedUp, hint: copy.signedUpHint(funnel.visits), icon: 'user' },
    { label: copy.openedAccount, value: funnel.openedAccount, hint: copy.openedAccountHint, icon: 'accounts' },
    { label: copy.funded, value: funnel.funded, hint: copy.fundedHint, icon: 'deposit' },
  ];
  const widest = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]">
      <div className="relative isolate flex animate-rise flex-col gap-2 overflow-hidden rounded-3xl bg-[#18181b] p-5 text-white ring-1 ring-primary/30 motion-reduce:animate-none">
        <Icon name="globe" size={110} className="pointer-events-none absolute -right-6 -bottom-8 -z-10 text-white/[0.05]" />
        <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-white/50 uppercase">
          <Icon name="globe" size={13} className="text-(--brand-gleam)" />
          {copy.links}
        </span>
        <span className="font-mono text-5xl font-semibold text-(--brand-gleam) tabular-nums">{links.length}</span>
        <span className="mt-auto text-sm text-white/60">{copy.linksHint(ownLinks)}</span>
      </div>

      <ol className={cx(cardClass, 'flex flex-col justify-center gap-3 p-5')}>
        {stages.map((stage, index) => (
          <li key={stage.label} style={riseDelay(index + 1)} className="grid animate-rise items-center gap-x-4 gap-y-1 motion-reduce:animate-none sm:grid-cols-[11rem_minmax(0,1fr)]">
            <span className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon name={stage.icon} size={14} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{stage.label}</span>
                <span className="block truncate text-[11px] text-fg-subtle">{stage.hint}</span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  style={{ width: `${(stage.value / widest) * 100}%`, opacity: 1 - index * 0.2 }}
                  className="block h-full origin-left animate-grow rounded-full bg-primary motion-reduce:animate-none"
                />
              </span>
              <span className="w-12 text-right font-mono text-2xl font-semibold text-fg tabular-nums">{stage.value}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── One link: ticket card — title row, address strip with actions, funnel stub ───────────── */

function FunnelLedger({ funnel }: { funnel: LinkFunnel }) {
  const steps: { label: string; value: number }[] = [
    { label: copy.funnel.visits, value: funnel.visits },
    { label: copy.funnel.signedUp, value: funnel.signedUp },
    { label: copy.funnel.openedAccount, value: funnel.openedAccount },
    { label: copy.funnel.funded, value: funnel.funded },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2 ring-1 ring-line">
          <span className="font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
          <span className="min-w-0">
            <span className="block font-mono text-lg leading-tight font-semibold text-fg tabular-nums">{step.value}</span>
            <span className="block truncate text-[11px] text-fg-subtle">{step.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function LinkCard({ link, index, onRemove }: { link: ReferralLink; index: number; onRemove: () => void }) {
  return (
    <li style={riseDelay(index)} className={cx(cardClass, 'flex animate-rise flex-col overflow-hidden motion-reduce:animate-none')}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', link.isDefault ? 'bg-primary text-primary-fg' : 'bg-[#18181b] text-(--brand-gleam) ring-1 ring-primary/30')}>
            <Icon name={link.isDefault ? 'trophy' : 'globe'} size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-fg">{link.isDefault ? copy.defaultTitle : link.name}</p>
            {link.isDefault ? (
              <p className="mt-1 text-sm text-fg-muted">{copy.defaultHint}</p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-subtle">
                <span>{copy.offers}</span>
                {link.groups.map((group, groupIndex) => (
                  <span key={group} className={cx('rounded-md px-2 py-0.5 font-bold', groupIndex === 0 ? 'bg-primary text-primary-fg' : 'border border-line text-fg-muted')}>
                    {group}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" size={12} />
                  {link.expiresOn ? copy.expires(formatExpiry(link.expiresOn)) : copy.neverExpires}
                </span>
              </p>
            )}
          </div>
        </div>
        {link.isDefault ? (
          <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary uppercase ring-1 ring-primary/30">{copy.defaultBadge}</span>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label={copy.removeLink}
            title={copy.removeLink}
            className="grid size-8 place-items-center rounded-lg border border-line text-fg-subtle transition-colors hover:border-danger hover:text-danger"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 bg-[#18181b] px-5 py-3 sm:flex-row sm:items-center">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Icon name="globe" size={14} className="shrink-0 text-white/40" />
          <span className="truncate font-mono text-sm text-(--brand-gleam)">{linkUrl(link)}</span>
        </span>
        <div className="flex gap-2">
          <Button leftIcon="copy" onClick={() => copyLink(link)} className="flex-1 sm:flex-none">
            {copy.copyLink}
          </Button>
          <Button variant="outline" leftIcon="arrowUpRight" onClick={() => shareLink(link)} className="flex-1 border-white/20 text-white hover:text-(--brand-gleam) sm:flex-none">
            {copy.share}
          </Button>
        </div>
      </div>

      <div className="border-t border-dashed border-line p-4">
        <FunnelLedger funnel={link.funnel} />
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
      className={cx('flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors', isOffered ? 'border-primary bg-primary/[0.05]' : 'border-line')}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isOffered}
        aria-label={name}
        onClick={onToggle}
        className={cx('grid size-5 shrink-0 place-items-center rounded', isOffered ? 'bg-primary text-primary-fg' : 'border border-line')}
      >
        {isOffered && <Icon name="check" size={12} />}
      </button>
      <button type="button" aria-label={copy.moveGroup(name)} onKeyDown={handleKey} className="cursor-grab text-fg-subtle hover:text-fg active:cursor-grabbing">
        <Icon name="arrowsUpDown" size={14} />
      </button>
      <span className="text-sm font-semibold text-fg">{name}</span>
      {isFirst && <span className="rounded bg-[#18181b] px-2 py-0.5 text-[10px] font-bold text-(--brand-gleam)">{copy.shownFirst}</span>}
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
        className="relative flex h-full w-full max-w-md animate-rise flex-col border-l border-line bg-surface shadow-card motion-reduce:animate-none"
      >
        <header className="flex items-start gap-3 bg-[#18181b] px-5 py-5 text-white">
          <div className="min-w-0 flex-1">
            <h2 id="new-link-title" className="text-lg font-bold text-(--brand-gleam)">
              {copy.panelTitle}
            </h2>
            <p className="text-sm text-white/65">{copy.panelSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closePanel}
            className="grid size-9 place-items-center rounded-lg border border-white/15 text-white/70 hover:border-(--brand-gleam)/50 hover:text-white"
          >
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

          <div className="flex flex-col gap-2 border-l-2 border-primary pl-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">{copy.groupsTitle}</p>
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{copy.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{copy.subtitle}</p>
        </div>
        <Button leftIcon="plus" aria-haspopup="dialog" onClick={() => setIsPanelOpen(true)}>
          {copy.newLink}
        </Button>
      </header>

      <FunnelTiles links={links} />

      <ul className="flex flex-col gap-4">
        {links.map((link, index) => (
          <LinkCard key={link.id} link={link} index={index} onRemove={() => setLinks((current) => current.filter((item) => item.id !== link.id))} />
        ))}
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
