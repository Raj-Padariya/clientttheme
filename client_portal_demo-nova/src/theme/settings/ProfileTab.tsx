'use client';

import { useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';

import { DatePicker } from '../ui/DatePicker';
import { toKey } from '../ui/DateRangePicker';
import { Icon } from '../ui/Icon';
import { PhoneField } from '../ui/PhoneField';
import { PHONE_COUNTRIES } from '../ui/phoneCountries';
import { fieldControlClass } from './SettingsParts';
import {
  initialProfileValues,
  phoneCountry,
  profileEmail,
  profileFields,
  profileSaveLabel,
  profileSections,
  type ProfileField,
  type ProfileFieldId,
} from './settingsData';

const FORM_ID = 'settings-profile-form';
const requiredFields = profileFields.filter((field) => field.required);


function FieldLabel({ field, htmlFor }: { field: Pick<ProfileField, 'label' | 'required'>; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1 text-xs font-medium text-fg-muted">
      {field.label}
      {field.required ? <span className="text-danger">*</span> : <span className="text-fg-subtle">(Optional)</span>}
    </label>
  );
}

const ADULT_AGE_YEARS = 18;
const initialPhoneIso = PHONE_COUNTRIES.find((country) => country.name === phoneCountry.country)?.iso ?? PHONE_COUNTRIES[0].iso;

// Date of birth must be at least 18 years back, so the picker disables anything later.
function adultCutoffKey(): string {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - ADULT_AGE_YEARS);
  return toKey(cutoff);
}

function ProfileInput({ field, value, onChange }: { field: ProfileField; value: string; onChange: (value: string) => void }) {
  const inputId = `profile-${field.id}`;
  const isMissing = field.required && value.trim() === '';
  const [phoneIso, setPhoneIso] = useState(initialPhoneIso);

  return (
    <div className={cx('flex flex-col gap-1.5', field.kind === 'textarea' && 'sm:col-span-2')}>
      <FieldLabel field={field} htmlFor={inputId} />
      {field.kind === 'phone' ? (
        <PhoneField id={inputId} value={value} onChange={onChange} countryIso={phoneIso} onCountryChange={setPhoneIso} required />
      ) : field.kind === 'date' ? (
        <DatePicker id={inputId} value={value} onChange={onChange} max={adultCutoffKey()} invalid={isMissing} placeholder={field.label} />
      ) : field.kind === 'textarea' ? (
        <textarea
          id={inputId}
          rows={3}
          value={value}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className={cx(fieldControlClass, 'resize-y py-3', isMissing && 'ring-warning/60')}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className={cx(fieldControlClass, 'h-12', isMissing && 'ring-warning/60')}
        />
      )}
    </div>
  );
}

/** Required-field completion as a ring: one bead per required field, solid once filled. */
function CompletionCard({ values, percent, filledCount, saved }: { values: Record<ProfileFieldId, string>; percent: number; filledCount: number; saved: boolean }) {
  return (
    <aside style={staggerStyle(1, 120)} className="orbit-card nova-edge-light relative isolate flex animate-rise flex-col gap-5 overflow-hidden p-5 xl:sticky xl:top-24 motion-reduce:animate-none">
      <div className="relative mx-auto grid aspect-square w-full max-w-[12rem] place-items-center">
        <span aria-hidden="true" className="absolute inset-[6%] rounded-full border border-dotted border-line-strong" />
        <span aria-hidden="true" className="absolute inset-[22%] animate-rim-spin rounded-full border border-dashed border-line [animation-duration:26s] motion-reduce:animate-none" />
        {requiredFields.map((field, index) => {
          const angle = (index / requiredFields.length) * 2 * Math.PI - Math.PI / 2;
          const filled = values[field.id].trim() !== '';
          return (
            <span
              key={field.id}
              aria-hidden="true"
              style={{ left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%`, transitionDelay: `${index * 40}ms` }}
              className={cx(
                'absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 motion-reduce:transition-none',
                filled ? 'bg-fg ring-4 ring-surface' : 'border-2 border-warning bg-surface',
              )}
            />
          );
        })}
        <div className="relative flex flex-col items-center text-center">
          <span className="font-mono text-4xl leading-none font-black text-fg tabular-nums">
            {percent}
            <span className="text-lg text-fg-muted">%</span>
          </span>
          <span className="mt-1 text-xs font-bold text-fg">Profile</span>
          <span className="font-mono text-[11px] text-fg-muted tabular-nums">
            {filledCount}/{requiredFields.length} *
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1 border-t border-dotted border-line-strong pt-4">
        {requiredFields.map((field) => {
          const filled = values[field.id].trim() !== '';
          return (
            <li key={field.id}>
              <label
                htmlFor={`profile-${field.id}`}
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-xs transition-colors',
                  filled ? 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg' : 'bg-warning/10 font-semibold text-warning hover:bg-warning/15',
                )}
              >
                <span aria-hidden="true" className={cx('grid size-6 shrink-0 place-items-center rounded-full', filled ? 'bg-success/15 text-success' : 'border border-dashed border-warning/70')}>
                  {filled ? <Icon name="check" size={11} /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{field.label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="submit"
        form={FORM_ID}
        className="group/ink relative inline-flex h-12 w-full items-center gap-3 overflow-hidden rounded-full bg-fg py-2 pr-2 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
        <span className="relative flex-1 text-left">{profileSaveLabel}</span>
        <span className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
          <Icon name={saved ? 'checkCircle' : 'arrowRight'} size={14} className={saved ? 'text-success' : undefined} />
        </span>
      </button>
    </aside>
  );
}

export function ProfileTab() {
  const [values, setValues] = useState(initialProfileValues);
  const [saved, setSaved] = useState(false);

  const filledCount = requiredFields.filter((field) => values[field.id].trim() !== '').length;
  const percent = Math.round((filledCount / requiredFields.length) * 100);

  const updateField = (id: ProfileFieldId, value: string) => {
    setSaved(false);
    setValues((current) => ({ ...current, [id]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
  };

  const sections = [
    { id: 'basic' as const, icon: 'user' as const },
    { id: 'address' as const, icon: 'globe' as const },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
      <form id={FORM_ID} onSubmit={submit} className="flex min-w-0 flex-col gap-6">
        {sections.map((section, index) => {
          const sectionFields = profileFields.filter((field) => field.section === section.id);
          const sectionFilled = sectionFields.filter((field) => !field.required || values[field.id].trim() !== '').length;
          return (
            <fieldset key={section.id} style={staggerStyle(index + 2, 120)} className="orbit-card nova-edge-light flex min-w-0 animate-rise flex-col gap-5 p-5 motion-reduce:animate-none">
              <legend className="sr-only">{profileSections[section.id]}</legend>
              <div aria-hidden="true" className="flex items-center gap-3.5">
                <span className="relative grid size-12 shrink-0 place-items-center">
                  <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
                  <span className="grid size-9 place-items-center rounded-full bg-fg font-mono text-sm font-black text-app">{String(index + 1).padStart(2, '0')}</span>
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <Icon name={section.icon} size={16} className="shrink-0 text-fg-muted" />
                  <span className="truncate">{profileSections[section.id]}</span>
                </span>
                <span className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1.5 font-mono text-[11px] text-fg-muted tabular-nums ring-1 ring-line">
                  <span className="flex gap-0.5">
                    {sectionFields.map((field, dot) => (
                      <span key={field.id} className={cx('size-1.5 rounded-full', dot < sectionFilled ? 'bg-fg' : 'bg-fg/20')} />
                    ))}
                  </span>
                  {sectionFilled}/{sectionFields.length}
                </span>
              </div>
              <span aria-hidden="true" className="border-t border-dotted border-line-strong" />

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                {section.id === 'basic' && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <FieldLabel field={{ label: profileEmail.label, required: false }} htmlFor="profile-email" />
                    <div className="relative">
                      <input id="profile-email" type="email" value={profileEmail.value} readOnly className={cx(fieldControlClass, 'h-12 pr-14 pl-4 font-mono font-medium')} />
                      <span aria-hidden="true" className="nova-gloss absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-fg-muted">
                        <Icon name="lock" size={13} />
                      </span>
                    </div>
                  </div>
                )}
                {sectionFields.map((field) => (
                  <ProfileInput key={field.id} field={field} value={values[field.id]} onChange={(value) => updateField(field.id, value)} />
                ))}
              </div>
            </fieldset>
          );
        })}
      </form>

      <CompletionCard values={values} percent={percent} filledCount={filledCount} saved={saved} />
    </div>
  );
}