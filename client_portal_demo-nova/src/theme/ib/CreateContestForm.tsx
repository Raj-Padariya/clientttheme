'use client';

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { formatMoney } from '@/core/format';
import { translate, type MessageKey } from '@/core/i18n';
import { contestFormOptions, createContestDraft, type ContestDraft, type ContestPrizeRow, type ContestSymbolGroupId } from '@/core/mock/ibContests';
import { cx } from '../lib/cx';
import { DateTimePicker } from '../ui/DateTimePicker';
import { Icon, type IconName } from '../ui/Icon';
import { Select } from '../ui/Input';

// Deep-space panel in both themes; `wallet-card` pins the --hero-* tokens to their dark values for its children.
const graphite = 'wallet-card [background:var(--wallet-card-bg)]';
const goldFill = '[background-image:linear-gradient(135deg,var(--brand-gleam),var(--brand-accent))]';
const goldText = 'bg-clip-text text-transparent [background-image:linear-gradient(120deg,var(--brand-gleam),var(--brand-accent)_55%,var(--brand-gleam))]';
const eyebrow = 'text-[10px] font-bold tracking-[0.16em] uppercase';
const controlClass =
  'h-11 w-full rounded-xl bg-surface-2/60 px-3.5 text-sm text-fg ring-1 ring-line placeholder:text-fg-subtle transition-[box-shadow,background-color] duration-200 focus:bg-surface focus:ring-2 focus:ring-primary/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 aria-invalid:ring-danger/60 [color-scheme:dark] light:[color-scheme:light]';

type SectionId = 'general' | 'enrollment' | 'trading' | 'registration' | 'prize' | 'tasks' | 'visibility';
type FieldKey = 'name' | 'startDate' | 'endDate' | 'registrationCloses' | 'maxParticipants' | 'adminSharePercent' | 'prizes';
type Errors = Partial<Record<FieldKey, string>>;
type Strategy = (typeof contestFormOptions.strategies)[number];

const sections: { id: SectionId; labelKey: MessageKey; icon: IconName }[] = [
  { id: 'general', labelKey: 'ibCreate.secGeneral', icon: 'info' },
  { id: 'enrollment', labelKey: 'ibCreate.secEnrollment', icon: 'user' },
  { id: 'trading', labelKey: 'ibCreate.secTrading', icon: 'sliders' },
  { id: 'registration', labelKey: 'ibCreate.secRegistration', icon: 'kyc' },
  { id: 'prize', labelKey: 'ibCreate.secPrize', icon: 'gift' },
  { id: 'tasks', labelKey: 'ibCreate.secTasks', icon: 'checkCircle' },
  { id: 'visibility', labelKey: 'ibCreate.secVisibility', icon: 'eye' },
];

const FIELD_ORDER: FieldKey[] = ['name', 'startDate', 'endDate', 'registrationCloses', 'maxParticipants', 'adminSharePercent', 'prizes'];

const groupLabels: Record<ContestSymbolGroupId, MessageKey> = {
  forex: 'ibCreate.groupForex',
  metals: 'ibCreate.groupMetals',
  energy: 'ibCreate.groupEnergy',
  indices: 'ibCreate.groupIndices',
};

const strategyLabels: Record<Strategy, MessageKey> = {
  grid: 'ibCreate.stratGrid',
  hft: 'ibCreate.stratHft',
  copy: 'ibCreate.stratCopy',
  ea: 'ibCreate.stratEa',
};

function toNumber(value: string): number {
  return value === '' ? 0 : Number(value);
}

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function validate(draft: ContestDraft): Errors {
  const errors: Errors = {};
  const required = translate('ibCreate.errRequired');
  if (!draft.name.trim()) errors.name = required;
  if (!draft.startDate) errors.startDate = required;
  if (!draft.endDate) errors.endDate = required;
  else if (draft.startDate && draft.endDate <= draft.startDate) errors.endDate = translate('ibCreate.errEndBeforeStart');
  // datetime-local values share one format, so plain string comparison orders them correctly.
  if (draft.registrationCloses && draft.endDate && draft.registrationCloses > draft.endDate) errors.registrationCloses = translate('ibCreate.errRegAfterEnd');
  if (draft.maxParticipants < draft.minParticipants) errors.maxParticipants = translate('ibCreate.errParticipants');
  if (draft.adminSharePercent < contestFormOptions.minAdminSharePercent) errors.adminSharePercent = translate('ibCreate.errAdminMin');
  const allocated = draft.adminSharePercent + draft.prizes.reduce((total, row) => total + row.percentage, 0);
  if (allocated > 100) errors.prizes = translate('ibCreate.errPrizeTotal');
  return errors;
}

/* ───────────── Primitives ───────────── */

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-fg">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex animate-rise items-center gap-1 text-xs font-medium text-danger motion-reduce:animate-none">
          <Icon name="alert" size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

function errorProps(id: string, error?: string) {
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined };
}

function SelectBox({ id, value, options, onChange }: { id: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'group flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 transition-[background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        checked ? 'bg-primary/[0.08] ring-primary/45' : 'bg-surface-2/50 ring-line hover:ring-primary/30',
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cx('grid size-7 shrink-0 place-items-center rounded-lg ring-1 transition-colors duration-300', checked ? 'bg-primary/20 text-primary ring-primary/40' : 'bg-surface text-fg-subtle ring-line')}
        >
          <Icon name={checked ? 'check' : 'close'} size={12} />
        </span>
        <span className="truncate text-sm font-medium text-fg">{label}</span>
      </span>
      <span aria-hidden="true" className={cx('relative h-5 w-9 shrink-0 rounded-full ring-1 transition-colors duration-300', checked ? 'bg-primary/55 ring-primary/60' : 'bg-surface ring-line')}>
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_2px_6px_color-mix(in_oklab,var(--brand-deep)_40%,transparent)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)] motion-reduce:transition-none',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
}

// Each section reads like a chapter: a glowing edge, a graphite icon, and its number ghosted large behind.
function SectionCard({ domId, section, index, children }: { domId: string; section: (typeof sections)[number]; index: number; children: ReactNode }) {
  const number = String(index + 1).padStart(2, '0');
  return (
    <section
      id={domId}
      data-section={section.id}
      style={{ animationDelay: `${index * 70}ms` }}
      className="orbit-card relative animate-rise scroll-mt-28 overflow-hidden motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="absolute top-6 left-0 h-9 w-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--brand-primary)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-3 right-5 font-mono text-7xl font-bold text-primary/[0.07] select-none">
        {number}
      </span>
      <header className="relative flex items-center gap-3 px-5 pt-5">
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl text-(--brand-gleam) ring-1 ring-primary/40', graphite)}>
          <Icon name={section.icon} size={16} />
        </span>
        <div className="min-w-0">
          <p className={cx(eyebrow, 'text-primary')}>
            {number}/{String(sections.length).padStart(2, '0')}
          </p>
          <h3 className="truncate text-base font-semibold tracking-tight text-fg">{translate(section.labelKey)}</h3>
        </div>
      </header>
      <div className="relative p-5">{children}</div>
    </section>
  );
}

/* ───────────── Prize split bar ───────────── */

function PrizeSplitBar({ adminShare, prizes, size = 'lg' }: { adminShare: number; prizes: ContestPrizeRow[]; size?: 'sm' | 'lg' }) {
  const allocated = adminShare + prizes.reduce((total, row) => total + row.percentage, 0);
  const isOver = allocated > 100;
  // Over-allocation squeezes the slices to fit so the bar never overflows; the red ring flags it.
  const scale = isOver ? 100 / allocated : 1;
  // Thin translucent track: admin in a neutral tone, prizes in violet that fades rank by rank.
  const slices = [
    { key: 'admin', width: adminShare, className: 'bg-fg-subtle/45', opacity: 1 },
    ...prizes.map((row, index) => ({ key: row.id, width: row.percentage, className: 'bg-primary', opacity: Math.max(0.25, 0.75 - index * 0.15) })),
  ];

  return (
    <div
      aria-hidden="true"
      className={cx(
        'flex overflow-hidden rounded-full bg-surface-2 ring-1 transition-shadow duration-300',
        size === 'lg' ? 'h-2.5' : 'h-1.5',
        isOver ? 'ring-2 ring-danger/70' : 'ring-line',
      )}
    >
      {slices.map((slice) => (
        <span
          key={slice.key}
          style={{ width: `${Math.max(0, slice.width) * scale}%`, opacity: slice.opacity }}
          className={cx('h-full border-r-2 border-surface transition-[width] duration-500 ease-out last:border-r-0 motion-reduce:transition-none', slice.className)}
        />
      ))}
    </div>
  );
}

/* ───────────── Section navigator ───────────── */

function SectionRail({ active, onJump }: { active: SectionId; onJump: (id: SectionId) => void }) {
  const activeIndex = sections.findIndex((section) => section.id === active);
  return (
    <nav aria-label={translate('ibCreate.sections')} className="orbit-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className={cx(eyebrow, 'text-fg-subtle')}>{translate('ibCreate.sections')}</p>
        <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
          {activeIndex + 1}/{sections.length}
        </span>
      </div>
      {/* Segmented progress: one thin segment per section. */}
      <div aria-hidden="true" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }} className="mt-3 grid gap-1">
        {sections.map((section, index) => (
          <span key={section.id} className={cx('h-1 rounded-full transition-colors duration-500', index <= activeIndex ? 'bg-primary/60' : 'bg-surface-2')} />
        ))}
      </div>
      <ol className="mt-3 space-y-1">
        {sections.map((section, index) => {
          const isActive = section.id === active;
          const isPast = index < activeIndex;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onJump(section.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cx(
                  'relative flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-ring',
                  isActive ? 'bg-primary/[0.08] font-semibold text-fg' : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
                )}
              >
                <span
                  className={cx(
                    'relative grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold ring-1 transition-[background-color,color] duration-300',
                    isActive && cx(graphite, 'text-(--brand-gleam) ring-primary/60'),
                    isPast && 'bg-primary/15 text-primary ring-primary/30',
                    !isActive && !isPast && 'bg-surface-2 text-fg-subtle ring-line',
                  )}
                >
                  {isActive && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-lg border border-primary motion-reduce:hidden" />}
                  {isPast ? <Icon name="check" size={12} /> : index + 1}
                </span>
                <span className="truncate">{translate(section.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function formatWhen(value: string): string {
  return value ? value.replace('T', ' · ') : '— — —';
}

// Preview as an admission ticket: graphite face with the name, torn off above the dates and pool split.
function LivePreview({ draft }: { draft: ContestDraft }) {
  return (
    <section aria-label={translate('ibCreate.preview')} className="overflow-hidden rounded-[28px] bg-surface ring-1 ring-primary/40 shadow-[0_24px_48px_-32px_var(--brand-primary)]">
      <div className={cx('relative isolate overflow-hidden p-5 text-white', graphite)}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 -z-10 size-56 animate-drift rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_28%,transparent),transparent_68%)] motion-reduce:animate-none"
        />
        <Icon name="trophy" size={96} className="pointer-events-none absolute -right-4 -bottom-6 -z-10 rotate-12 text-white/[0.05]" />

        <p className={cx(eyebrow, 'flex items-center gap-1.5 text-white/50')}>
          <span aria-hidden="true" className="size-1.5 animate-twinkle rounded-full bg-(--brand-gleam) motion-reduce:animate-none" />
          {translate('ibCreate.preview')}
        </p>
        <p className={cx('mt-3 truncate text-xl font-semibold tracking-tight', draft.name.trim() ? goldText : 'text-white/35')}>{draft.name.trim() || translate('ibCreate.untitled')}</p>
        <p className="truncate text-sm text-white/55">{draft.tagline.trim() || translate('ibCreate.taglinePh')}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {[draft.timezone, formatMoney(draft.startingBalance, 'USD'), draft.rankingBy, draft.maxLeverage].map((chip, index) => (
            <span key={`${chip}-${index}`} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/75 ring-1 ring-white/10">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="relative border-t-2 border-dashed border-line">
        <span className="absolute -top-3 -left-3 size-6 rounded-full border border-line bg-app" />
        <span className="absolute -top-3 -right-3 size-6 rounded-full border border-line bg-app" />
      </div>

      <div className="space-y-4 p-5">
        <dl className="space-y-1.5 font-mono text-[11px] text-fg-muted">
          <div className="flex justify-between gap-2">
            <dt className="text-fg-subtle">{translate('ibCreate.startDate')}</dt>
            <dd className="truncate">{formatWhen(draft.startDate)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-fg-subtle">{translate('ibCreate.endDate')}</dt>
            <dd className="truncate">{formatWhen(draft.endDate)}</dd>
          </div>
        </dl>
        <PrizeSplitBar adminShare={draft.adminSharePercent} prizes={draft.prizes} size="sm" />
      </div>
    </section>
  );
}

/* ───────────── Symbols picker ───────────── */

function SymbolPicker({ selected, onChange }: { selected: string[]; onChange: (symbols: string[]) => void }) {
  const fieldId = useId();
  const [group, setGroup] = useState<ContestSymbolGroupId | ''>('');
  const [query, setQuery] = useState('');
  const needle = query.trim().toUpperCase();
  const visibleGroups = contestFormOptions.symbolGroups
    .filter((entry) => group === '' || entry.id === group)
    .map((entry) => ({ ...entry, symbols: entry.symbols.filter((symbol) => symbol.includes(needle)) }))
    .filter((entry) => entry.symbols.length > 0);
  const visibleSymbols = visibleGroups.flatMap((entry) => entry.symbols);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs font-semibold text-fg">{translate('ibCreate.symbols')}</p>
        <p className="text-[11px] text-fg-subtle">{translate('ibCreate.symbolsHint')}</p>
      </div>
      <div className="overflow-hidden rounded-2xl ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/40 p-2.5">
          <div className="relative w-full sm:w-44">
            <label htmlFor={`${fieldId}-group`} className="sr-only">
              {translate('ibCreate.symbolGroup')}
            </label>
            <Select id={`${fieldId}-group`} value={group} onChange={(event) => setGroup(event.target.value as ContestSymbolGroupId | '')}>
              <option value="">{translate('ibCreate.symbolGroup')}</option>
              {contestFormOptions.symbolGroups.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {translate(groupLabels[entry.id])}
                </option>
              ))}
            </Select>
          </div>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{translate('ibCreate.symbolSearch')}</span>
            <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translate('ibCreate.symbolSearch')} className={cx(controlClass, 'h-10 pl-10')} />
          </label>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span aria-live="polite" className={cx('rounded-full px-2.5 py-1 font-mono tabular-nums ring-1 transition-colors', selected.length > 0 ? 'bg-primary/10 text-primary ring-primary/40' : 'text-fg-subtle ring-line')}>
              {translate('ibCreate.selectedCount', { count: String(selected.length) })}
            </span>
            <button type="button" onClick={() => onChange([...new Set([...selected, ...visibleSymbols])])} className="text-primary hover:underline">
              {translate('ibCreate.selectAll')}
            </button>
            <button type="button" onClick={() => onChange([])} className="text-danger hover:underline">
              {translate('ibCreate.clear')}
            </button>
          </div>
        </div>

        <div className="max-h-72 space-y-4 overflow-y-auto p-3">
          {visibleGroups.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">{translate('ibCreate.noSymbols', { query })}</p>}
          {visibleGroups.map((entry) => (
            <div key={entry.id}>
              <p className={cx(eyebrow, 'mb-2 text-fg-subtle')}>{translate(groupLabels[entry.id])}</p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 2xl:grid-cols-8">
                {entry.symbols.map((symbol) => {
                  const isOn = selected.includes(symbol);
                  return (
                    <button
                      key={symbol}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => onChange(toggleItem(selected, symbol))}
                      className={cx(
                        'flex h-9 items-center gap-1.5 rounded-xl px-2.5 font-mono text-[11px] font-semibold ring-1 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
                        isOn ? cx('text-(--brand-on-primary) ring-transparent shadow-[0_6px_14px_-8px_var(--brand-primary)]', goldFill) : 'bg-surface text-fg-muted ring-line hover:text-fg hover:ring-primary/40',
                      )}
                    >
                      <span className={cx('grid size-3.5 shrink-0 place-items-center rounded-[4px] ring-1', isOn ? 'wallet-card [background:var(--wallet-card-bg)] text-(--brand-gleam) ring-transparent' : 'ring-line')}>
                        {isOn && <Icon name="check" size={9} className="animate-rise motion-reduce:animate-none" />}
                      </span>
                      <span className="truncate">{symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Countries picker ───────────── */

function CountryPicker({ id, selected, onChange }: { id: string; selected: string[]; onChange: (countries: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches = contestFormOptions.countries.filter((country) => country.toLowerCase().includes(needle));

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-fg">
        {translate('ibCreate.excludedCountries')}
      </label>
      <button
        id={id}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        onClick={() => setIsOpen((open) => !open)}
        className={cx(controlClass, 'flex h-auto min-h-11 flex-wrap items-center gap-1.5 py-2 pr-10 text-left relative')}
      >
        {selected.length === 0 ? (
          <span className="text-fg-subtle">{translate('ibCreate.countriesPh')}</span>
        ) : (
          selected.map((country) => (
            <span key={country} className="inline-flex animate-rise items-center gap-1 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger ring-1 ring-danger/30 motion-reduce:animate-none">
              {country}
            </span>
          ))
        )}
        <Icon name="chevronDown" size={14} className={cx('absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-muted transition-transform duration-300', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div id={`${id}-panel`} className="mt-2 animate-rise overflow-hidden rounded-2xl bg-surface shadow-pop ring-1 ring-line motion-reduce:animate-none">
          <label className="relative block border-b border-line p-2">
            <span className="sr-only">{translate('ibCreate.countrySearch')}</span>
            <Icon name="search" size={14} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-fg-subtle" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translate('ibCreate.countrySearch')} className={cx(controlClass, 'h-10 pl-10')} />
          </label>
          <ul className="grid max-h-56 gap-0.5 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((country) => {
              const isOn = selected.includes(country);
              return (
                <li key={country}>
                  <button
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => onChange(toggleItem(selected, country))}
                    className={cx('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors', isOn ? 'bg-danger/10 text-danger' : 'text-fg hover:bg-surface-2')}
                  >
                    <span className={cx('grid size-4 shrink-0 place-items-center rounded-[5px] ring-1', isOn ? 'bg-danger text-white ring-transparent' : 'ring-line')}>
                      {isOn && <Icon name="close" size={10} />}
                    </span>
                    <span className="truncate">{country}</span>
                    {isOn && <span className="sr-only">{translate('ibCreate.removeCountry', { country })}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────── Prize podium ───────────── */

function medalClass(rank: number): string {
  if (rank === 1) return cx('text-(--brand-on-primary) shadow-[0_8px_20px_-8px_var(--brand-primary)]', goldFill);
  if (rank === 2) return 'bg-primary/25 text-primary ring-1 ring-primary/45';
  if (rank === 3) return 'bg-linear-to-br from-(--orbit-violet) to-(--brand-deep) text-white';
  return 'bg-surface-2 text-fg-muted ring-1 ring-line';
}

function PrizeRowCard({ row, idBase, onChange, onRemove }: { row: ContestPrizeRow; idBase: string; onChange: (patch: Partial<ContestPrizeRow>) => void; onRemove: () => void }) {
  const ids = { rank: `${idBase}-rank`, type: `${idBase}-type`, pct: `${idBase}-pct`, cond: `${idBase}-cond` };
  return (
    <li className="group relative flex animate-rise items-start gap-3 overflow-hidden rounded-2xl bg-surface-2/40 p-3.5 pl-4 ring-1 ring-line transition-[box-shadow] duration-300 hover:ring-primary/40 motion-reduce:animate-none">
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary/50" />
      <span className={cx('relative mt-6 grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-bold transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none', medalClass(row.rank))}>
        {row.rank === 1 && <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-full border border-primary motion-reduce:hidden" />}
        {row.rank}
      </span>
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_7rem_minmax(0,1.5fr)]">
        <Field id={ids.rank} label={translate('ibCreate.rank')}>
          <input id={ids.rank} type="number" min={1} value={row.rank} onChange={(event) => onChange({ rank: toNumber(event.target.value) })} className={controlClass} />
        </Field>
        <Field id={ids.type} label={translate('ibCreate.type')}>
          <SelectBox id={ids.type} value={row.type} options={contestFormOptions.prizeTypes} onChange={(type) => onChange({ type })} />
        </Field>
        <Field id={ids.pct} label={translate('ibCreate.percentage')}>
          <input id={ids.pct} type="number" min={0} max={100} value={row.percentage} onChange={(event) => onChange({ percentage: toNumber(event.target.value) })} className={controlClass} />
        </Field>
        <Field id={ids.cond} label={translate('ibCreate.condition')}>
          <input id={ids.cond} type="text" value={row.condition} onChange={(event) => onChange({ condition: event.target.value })} className={controlClass} />
        </Field>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={translate('ibCreate.removePrizeRow', { rank: String(row.rank) })}
        className="mt-6 grid size-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger ring-1 ring-danger/30 transition-[background-color,color,transform] duration-300 hover:rotate-6 hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}

/* ───────────── Form ───────────── */

type ContestFormProps =
  | { mode?: 'create'; onCancel: () => void; onCreated: (draft: ContestDraft) => void; initialDraft?: undefined }
  | { mode: 'view'; onCancel: () => void; initialDraft: ContestDraft; onCreated?: undefined };

export function CreateContestForm({ mode = 'create', onCancel, onCreated, initialDraft }: ContestFormProps) {
  const isView = mode === 'view';
  const base = useId();
  const [draft, setDraft] = useState<ContestDraft>(() => initialDraft ?? createContestDraft());
  const [errors, setErrors] = useState<Errors>({});
  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const fieldId = (key: string) => `${base}-${key}`;
  const sectionId = (id: SectionId) => `${base}-sec-${id}`;
  const errorCount = Object.values(errors).filter(Boolean).length;

  // Scroll-spy: the section nearest the top of the viewport lights up in the rail.
  useEffect(() => {
    const targets = sections.map((section) => document.getElementById(`${base}-sec-${section.id}`)).filter((element): element is HTMLElement => element !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const topmost = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = topmost?.target.getAttribute('data-section');
        if (id) setActiveSection(id as SectionId);
      },
      { rootMargin: '-25% 0px -60% 0px' },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [base]);

  function patch<K extends keyof ContestDraft>(key: K, value: ContestDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as FieldKey];
      return next;
    });
  }

  function patchPrize(id: string, change: Partial<ContestPrizeRow>) {
    patch(
      'prizes',
      draft.prizes.map((row) => (row.id === id ? { ...row, ...change } : row)),
    );
  }

  function addPrize() {
    const nextRank = draft.prizes.reduce((highest, row) => Math.max(highest, row.rank), 0) + 1;
    patch('prizes', [...draft.prizes, { id: `PR-${Date.now()}`, rank: nextRank, type: contestFormOptions.prizeTypes[0], percentage: 0, condition: '' }]);
  }

  function jumpTo(id: SectionId) {
    setActiveSection(id);
    document.getElementById(sectionId(id))?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    onCreated?.(draft);
  }

  const sectionProps = (id: SectionId) => {
    const index = sections.findIndex((section) => section.id === id);
    return { domId: sectionId(id), section: sections[index], index };
  };

  return (
    <div className="space-y-5">
      <div className={cx('orbit-card relative isolate flex animate-rise flex-wrap items-center justify-between gap-3 overflow-hidden px-6 py-5 text-white motion-reduce:animate-none', graphite)}>
        <span aria-hidden="true" className="orbit-ring pointer-events-none absolute -top-32 -right-24 -z-10 size-80 animate-orbit-spin motion-reduce:animate-none" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-[30%] -z-10 h-56 w-40 -rotate-[24deg] bg-linear-to-b from-primary/25 to-transparent blur-2xl" />
        <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="relative grid size-11 place-items-center rounded-2xl bg-primary/20 text-(--brand-gleam) ring-1 ring-primary/50">
            <span aria-hidden="true" className="absolute inset-0 animate-ring-ripple rounded-2xl border border-primary motion-reduce:hidden" />
            <Icon name={isView ? 'eye' : 'plus'} size={17} />
          </span>
          {translate(isView ? 'ibCreate.viewHeading' : 'ibCreate.heading')}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="group inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon name="arrowLeft" size={14} className="transition-transform duration-300 group-hover:-translate-x-1 motion-reduce:transition-none" />
          {translate('ibCreate.back')}
        </button>
      </div>

      {/* Form leads on the left; the ticket preview and section navigator ride along on the right. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:order-last lg:block lg:self-start">
          <LivePreview draft={draft} />
          <SectionRail active={activeSection} onJump={jumpTo} />
        </aside>

        <form noValidate onSubmit={handleSubmit} className="min-w-0 space-y-5">
          {!isView && (
            <p className="relative flex animate-rise items-center gap-3 overflow-hidden rounded-2xl bg-info/10 px-4 py-3 text-sm text-info ring-1 ring-info/30 motion-reduce:animate-none">
              <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-info/10 to-transparent motion-reduce:hidden" />
              <Icon name="info" size={16} className="relative shrink-0" />
              <span className="relative">{translate('ibCreate.approvalNote')}</span>
            </p>
          )}

          {/* A disabled fieldset locks every input, picker, chip and switch at once for the read-only view. */}
          <fieldset disabled={isView} className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:[&_button]:cursor-default disabled:[&_input]:cursor-default">
          <SectionCard {...sectionProps('general')}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Field id={fieldId('name')} label={translate('ibCreate.name')} error={errors.name} className="xl:col-span-3">
                <input {...errorProps(fieldId('name'), errors.name)} type="text" value={draft.name} onChange={(event) => patch('name', event.target.value)} placeholder={translate('ibCreate.namePh')} className={controlClass} />
              </Field>
              <Field id={fieldId('tagline')} label={translate('ibCreate.tagline')} className="xl:col-span-3">
                <input id={fieldId('tagline')} type="text" value={draft.tagline} onChange={(event) => patch('tagline', event.target.value)} placeholder={translate('ibCreate.taglinePh')} className={controlClass} />
              </Field>
              <Field id={fieldId('startDate')} label={translate('ibCreate.startDate')} error={errors.startDate} className="xl:col-span-2">
                <DateTimePicker
                  id={fieldId('startDate')}
                  value={draft.startDate}
                  onChange={(value) => patch('startDate', value)}
                  invalid={Boolean(errors.startDate)}
                  describedBy={errors.startDate ? `${fieldId('startDate')}-error` : undefined}
                  placeholder={translate('ibCreate.datePh')}
                />
              </Field>
              <Field id={fieldId('endDate')} label={translate('ibCreate.endDate')} error={errors.endDate} className="xl:col-span-2">
                <DateTimePicker
                  id={fieldId('endDate')}
                  value={draft.endDate}
                  onChange={(value) => patch('endDate', value)}
                  invalid={Boolean(errors.endDate)}
                  describedBy={errors.endDate ? `${fieldId('endDate')}-error` : undefined}
                  placeholder={translate('ibCreate.datePh')}
                />
              </Field>
              <Field id={fieldId('registrationCloses')} label={translate('ibCreate.regCloses')} error={errors.registrationCloses} className="xl:col-span-2">
                <DateTimePicker
                  id={fieldId('registrationCloses')}
                  value={draft.registrationCloses}
                  onChange={(value) => patch('registrationCloses', value)}
                  invalid={Boolean(errors.registrationCloses)}
                  describedBy={errors.registrationCloses ? `${fieldId('registrationCloses')}-error` : undefined}
                  placeholder={translate('ibCreate.datePh')}
                />
              </Field>
              <Field id={fieldId('timezone')} label={translate('ibCreate.timezone')} className="xl:col-span-2">
                <SelectBox id={fieldId('timezone')} value={draft.timezone} options={contestFormOptions.timezones} onChange={(value) => patch('timezone', value)} />
              </Field>
              <Field id={fieldId('startingBalance')} label={translate('ibCreate.startBalance')} className="xl:col-span-2">
                <input id={fieldId('startingBalance')} type="number" min={0} value={draft.startingBalance} onChange={(event) => patch('startingBalance', toNumber(event.target.value))} className={controlClass} />
              </Field>
              <Field id={fieldId('rankingBy')} label={translate('ibCreate.rankingBy')} className="xl:col-span-2">
                <SelectBox id={fieldId('rankingBy')} value={draft.rankingBy} options={contestFormOptions.rankingBy} onChange={(value) => patch('rankingBy', value)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard {...sectionProps('enrollment')}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field id={fieldId('minParticipants')} label={translate('ibCreate.minParticipants')}>
                <input id={fieldId('minParticipants')} type="number" min={1} value={draft.minParticipants} onChange={(event) => patch('minParticipants', toNumber(event.target.value))} className={controlClass} />
              </Field>
              <Field id={fieldId('maxParticipants')} label={translate('ibCreate.maxParticipants')} error={errors.maxParticipants}>
                <input
                  {...errorProps(fieldId('maxParticipants'), errors.maxParticipants)}
                  type="number"
                  min={1}
                  value={draft.maxParticipants}
                  onChange={(event) => patch('maxParticipants', toNumber(event.target.value))}
                  className={controlClass}
                />
              </Field>
              <Field id={fieldId('enrollmentType')} label={translate('ibCreate.enrollmentType')}>
                <SelectBox id={fieldId('enrollmentType')} value={draft.enrollmentType} options={contestFormOptions.enrollmentTypes} onChange={(value) => patch('enrollmentType', value)} />
              </Field>
              <Field id={fieldId('multipleParticipation')} label={translate('ibCreate.multiParticipation')}>
                <SelectBox
                  id={fieldId('multipleParticipation')}
                  value={draft.multipleParticipation}
                  options={contestFormOptions.multipleParticipation}
                  onChange={(value) => patch('multipleParticipation', value)}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard {...sectionProps('trading')}>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field id={fieldId('minTradingDays')} label={translate('ibCreate.minDuration')}>
                  <input id={fieldId('minTradingDays')} type="number" min={0} value={draft.minTradingDays} onChange={(event) => patch('minTradingDays', toNumber(event.target.value))} className={controlClass} />
                </Field>
                <Field id={fieldId('maxLeverage')} label={translate('ibCreate.maxLeverage')}>
                  <SelectBox id={fieldId('maxLeverage')} value={draft.maxLeverage} options={contestFormOptions.leverages} onChange={(value) => patch('maxLeverage', value)} />
                </Field>
                <Field id={fieldId('maxLots')} label={translate('ibCreate.maxLots')}>
                  <input id={fieldId('maxLots')} type="number" min={0} value={draft.maxLots} onChange={(event) => patch('maxLots', toNumber(event.target.value))} className={controlClass} />
                </Field>
                <Field id={fieldId('maxPositions')} label={translate('ibCreate.maxPositions')}>
                  <div className="relative">
                    <input id={fieldId('maxPositions')} type="number" value={contestFormOptions.maxPositions} disabled aria-describedby={`${fieldId('maxPositions')}-note`} className={cx(controlClass, 'pr-10')} />
                    <Icon name="lock" size={14} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-subtle" />
                  </div>
                  <p id={`${fieldId('maxPositions')}-note`} className="mt-1.5 flex gap-1.5 text-[11px] leading-snug text-fg-subtle">
                    <Icon name="info" size={12} className="mt-px shrink-0 text-primary" />
                    {translate('ibCreate.maxPositionsNote')}
                  </p>
                </Field>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2/40 p-3.5 ring-1 ring-line transition-colors has-checked:bg-danger/[0.06] has-checked:ring-danger/40">
                <input type="checkbox" checked={draft.autoDisqualify} onChange={(event) => patch('autoDisqualify', event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-(--brand-primary)" />
                <span className="text-sm text-fg">
                  <span className="font-semibold">{translate('ibCreate.autoDisqualify')}</span>
                  <span className="text-fg-muted"> — {translate('ibCreate.autoDisqualifyHint')}</span>
                </span>
              </label>

              <SymbolPicker selected={draft.symbols} onChange={(symbols) => patch('symbols', symbols)} />

              <div>
                <p className="mb-2 text-xs font-semibold text-fg">{translate('ibCreate.prohibited')}</p>
                <div className="flex flex-wrap gap-2">
                  {contestFormOptions.strategies.map((strategy) => {
                    const isOn = draft.prohibitedStrategies.includes(strategy);
                    return (
                      <button
                        key={strategy}
                        type="button"
                        aria-pressed={isOn}
                        onClick={() => patch('prohibitedStrategies', toggleItem(draft.prohibitedStrategies, strategy))}
                        className={cx(
                          'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ring-1 transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring',
                          isOn ? 'bg-danger/10 text-danger ring-danger/40 line-through decoration-2' : 'bg-surface-2/50 text-fg-muted ring-line hover:text-fg hover:ring-primary/40',
                        )}
                      >
                        <Icon name={isOn ? 'xCircle' : 'plus'} size={13} className="transition-transform duration-300" />
                        {translate(strategyLabels[strategy])}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard {...sectionProps('registration')}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field id={fieldId('whoCanRegister')} label={translate('ibCreate.whoCanRegister')}>
                  <SelectBox id={fieldId('whoCanRegister')} value={draft.whoCanRegister} options={contestFormOptions.whoCanRegister} onChange={(value) => patch('whoCanRegister', value)} />
                </Field>
                <Field id={fieldId('kycRequired')} label={translate('ibCreate.kycRequired')}>
                  <SelectBox id={fieldId('kycRequired')} value={draft.kycRequired} options={contestFormOptions.yesNo} onChange={(value) => patch('kycRequired', value)} />
                </Field>
                <Field id={fieldId('realAccountRequired')} label={translate('ibCreate.realAccount')}>
                  <SelectBox id={fieldId('realAccountRequired')} value={draft.realAccountRequired} options={contestFormOptions.yesNo} onChange={(value) => patch('realAccountRequired', value)} />
                </Field>
                <Field id={fieldId('kycToClaimPrize')} label={translate('ibCreate.kycPrize')}>
                  <SelectBox id={fieldId('kycToClaimPrize')} value={draft.kycToClaimPrize} options={contestFormOptions.yesNo} onChange={(value) => patch('kycToClaimPrize', value)} />
                </Field>
              </div>
              <CountryPicker id={fieldId('excludedCountries')} selected={draft.excludedCountries} onChange={(countries) => patch('excludedCountries', countries)} />
            </div>
          </SectionCard>

          <SectionCard {...sectionProps('prize')}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={fieldId('prizePoolType')} label={translate('ibCreate.prizePoolType')}>
                  <SelectBox id={fieldId('prizePoolType')} value={draft.prizePoolType} options={contestFormOptions.prizePoolTypes} onChange={(value) => patch('prizePoolType', value)} />
                </Field>
                <Field id={fieldId('adminSharePercent')} label={translate('ibCreate.adminSharePct')} error={errors.adminSharePercent}>
                  <input
                    {...errorProps(fieldId('adminSharePercent'), errors.adminSharePercent)}
                    type="number"
                    min={contestFormOptions.minAdminSharePercent}
                    max={100}
                    value={draft.adminSharePercent}
                    onChange={(event) => patch('adminSharePercent', toNumber(event.target.value))}
                    className={controlClass}
                  />
                </Field>
              </div>

              <div id={fieldId('prizes')} tabIndex={-1} aria-describedby={errors.prizes ? `${fieldId('prizes')}-error` : undefined} className="space-y-2 rounded-2xl focus:outline-none">
                <PrizeSplitBar adminShare={draft.adminSharePercent} prizes={draft.prizes} />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-fg-muted">
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={cx('size-2 rounded-full', graphite)} />
                    {translate('ibCreate.adminSlice')} {draft.adminSharePercent}%
                  </li>
                  {draft.prizes.map((row) => (
                    <li key={row.id} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className={cx('size-2 rounded-full', goldFill)} />
                      {translate('ibCreate.rankSlice', { rank: String(row.rank) })} {row.percentage}%
                    </li>
                  ))}
                </ul>
                {errors.prizes && (
                  <p id={`${fieldId('prizes')}-error`} className="flex animate-rise items-center gap-1 text-xs font-medium text-danger motion-reduce:animate-none">
                    <Icon name="alert" size={12} />
                    {errors.prizes}
                  </p>
                )}
              </div>

              <ol className="space-y-2.5">
                {draft.prizes.map((row) => (
                  <PrizeRowCard
                    key={row.id}
                    row={row}
                    idBase={`${base}-prize-${row.id}`}
                    onChange={(change) => patchPrize(row.id, change)}
                    onRemove={() => patch('prizes', draft.prizes.filter((entry) => entry.id !== row.id))}
                  />
                ))}
              </ol>
              <button
                type="button"
                onClick={addPrize}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-fg-muted transition-[border-color,color,background-color] duration-300 hover:border-primary/60 hover:bg-primary/[0.05] hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon name="plus" size={14} className="transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none" />
                {translate('ibCreate.addPrizeRow')}
              </button>
            </div>
          </SectionCard>

          <SectionCard {...sectionProps('tasks')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Switch label={translate('ibCreate.enrollmentTasks')} checked={draft.enrollmentTasks} onChange={(value) => patch('enrollmentTasks', value)} />
              <Switch label={translate('ibCreate.terms')} checked={draft.termsAndConditions} onChange={(value) => patch('termsAndConditions', value)} />
            </div>
          </SectionCard>

          <SectionCard {...sectionProps('visibility')}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Switch label={translate('ibCreate.showClientPortal')} checked={draft.showInClientPortal} onChange={(value) => patch('showInClientPortal', value)} />
              <Switch label={translate('ibCreate.showAgency')} checked={draft.showInAgency} onChange={(value) => patch('showInAgency', value)} />
              <Switch label={translate('ibCreate.pushNotification')} checked={draft.sendPushNotification} onChange={(value) => patch('sendPushNotification', value)} />
              <Switch label={translate('ibCreate.alertSales')} checked={draft.alertSalesTeam} onChange={(value) => patch('alertSalesTeam', value)} />
            </div>
          </SectionCard>
          </fieldset>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-[24px] bg-surface/85 p-3 shadow-pop ring-1 ring-line backdrop-blur">
            {isView ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-11 items-center rounded-full bg-surface-2 px-6 text-sm font-semibold text-fg ring-1 ring-line transition-colors hover:text-primary hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {translate('ibCreate.close')}
              </button>
            ) : (
            <>
            {errorCount > 0 && (
              <p role="alert" className="mr-auto flex items-center gap-1.5 pl-2 text-sm font-medium text-danger">
                <Icon name="alert" size={14} />
                {translate('ibCreate.errorSummary', { count: String(errorCount) })}
              </p>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center rounded-full bg-surface-2 px-5 text-sm font-semibold text-fg ring-1 ring-line transition-colors hover:ring-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {translate('ibCreate.cancel')}
            </button>
            <button
              type="submit"
              className={cx(
                'group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold text-(--brand-on-primary) transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_var(--brand-primary)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                goldFill,
              )}
            >
              <span aria-hidden="true" className="absolute inset-0 animate-wallet-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
              <Icon name="checkCircle" size={15} className="relative" />
              <span className="relative">{translate('ibCreate.submit')}</span>
            </button>
            </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
