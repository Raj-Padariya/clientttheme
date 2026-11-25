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

const RED = 'var(--aurora-cta-from)';
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
          className={cx(fieldControlClass, 'resize-y rounded-[24px] py-3', isMissing && 'ring-warning/60')}
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

/** Required-field completion: a big numeral, one pixel per required field (filled solid, missing blinking), then the checklist and Save. */
function CompletionCard({ values, percent, filledCount, saved }: { values: Record<ProfileFieldId, string>; percent: number; filledCount: number; saved: boolean }) {
  return (
    <aside style={staggerStyle(1, 120)} className="flex animate-rise flex-col gap-5 rounded-[30px] border border-dashed border-line-strong p-5 xl:sticky xl:top-24 motion-reduce:animate-none">
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono text-6xl leading-none font-black tracking-tighter text-fg tabular-nums">
          {percent}
          <span className="text-2xl text-fg-subtle">%</span>
        </span>
        <span className="flex flex-col items-end pb-1 text-right">
          <span className="text-xs font-bold text-fg">Profile</span>
          <span className="font-mono text-[11px] text-fg-muted tabular-nums">
            {filledCount}/{requiredFields.length} *
          </span>
        </span>
      </div>

      <span aria-hidden="true" className="flex gap-1">
        {requiredFields.map((field, index) => {
          const filled = values[field.id].trim() !== '';
          return (
            <span
              key={field.id}
              style={{ transitionDelay: `${index * 40}ms`, animationDelay: `${index * 60}ms` }}
              className={cx(
                'h-6 min-w-0 flex-1 animate-dot-pop rounded-[5px] transition-colors duration-500 motion-reduce:animate-none motion-reduce:transition-none',
                filled ? 'bg-fg' : 'zenith-blink border-2 border-warning',
              )}
            />
          );
        })}
      </span>

      <ul className="flex flex-col gap-1.5">
        {requiredFields.map((field) => {
          const filled = values[field.id].trim() !== '';
          return (
            <li key={field.id}>
              <label
                htmlFor={`profile-${field.id}`}
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-xs transition-[background-color,color,translate] duration-200 hover:translate-x-0.5',
                  filled ? 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg' : 'bg-warning/10 font-semibold text-warning ring-1 ring-warning/30 hover:bg-warning/15',
                )}
              >
                <span aria-hidden="true" className={cx('grid size-6 shrink-0 place-items-center rounded-full', filled ? 'bg-success text-white' : 'border border-dashed border-warning/70')}>
                  {filled ? <Icon name="check" size={11} /> : <span className="size-1.5 rounded-[2px] bg-current" />}
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
        className="group/ink inline-flex h-12 w-full items-center gap-3 rounded-full bg-fg py-2 pr-2 pl-5 text-sm font-semibold text-app transition-[translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span className="flex-1 text-left">{profileSaveLabel}</span>
        <span
          style={saved ? undefined : { background: RED }}
          className={cx('grid size-8 place-items-center rounded-full transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none', saved ? 'bg-success text-white' : 'text-white')}
        >
          <Icon name={saved ? 'checkCircle' : 'arrowRight'} size={14} />
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <form id={FORM_ID} onSubmit={submit} className="flex min-w-0 flex-col gap-6">
        {sections.map((section, index) => {
          const sectionFields = profileFields.filter((field) => field.section === section.id);
          const sectionFilled = sectionFields.filter((field) => !field.required || values[field.id].trim() !== '').length;
          return (
            <fieldset key={section.id} style={staggerStyle(index + 2, 120)} className="flex min-w-0 animate-rise flex-col gap-5 rounded-[32px] bg-fg/[0.02] p-5 ring-1 ring-line sm:p-6 motion-reduce:animate-none">
              <legend className="sr-only">{profileSections[section.id]}</legend>
              <div aria-hidden="true" className="flex items-end gap-4">
                <span className="font-mono text-5xl leading-[0.85] font-black tracking-tighter text-fg/15 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2 pb-0.5 text-xl font-black tracking-tight text-fg">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-app">
                    <Icon name={section.icon} size={14} />
                  </span>
                  <span className="truncate">{profileSections[section.id]}</span>
                </span>
                <span className="flex items-center gap-2 rounded-full bg-fg/[0.04] py-1 pr-3 pl-2 font-mono text-[11px] text-fg-muted tabular-nums ring-1 ring-line">
                  <span className="flex gap-0.5">
                    {sectionFields.map((field, dot) => (
                      <span key={field.id} style={dot === sectionFilled - 1 ? { background: RED } : undefined} className={cx('h-2.5 w-1.5 rounded-[2px]', dot < sectionFilled ? 'bg-fg' : 'bg-fg/20')} />
                    ))}
                  </span>
                  {sectionFilled}/{sectionFields.length}
                </span>
              </div>
              <span aria-hidden="true" className="flex items-center gap-1.5">
                <span style={{ background: RED }} className="h-0.5 w-8 rounded-full" />
                <span className="h-px flex-1 bg-line" />
              </span>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                {section.id === 'basic' && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <FieldLabel field={{ label: profileEmail.label, required: false }} htmlFor="profile-email" />
                    <div className="relative">
                      <input id="profile-email" type="email" value={profileEmail.value} readOnly className={cx(fieldControlClass, 'h-12 pr-14 pl-5 font-mono font-medium')} />
                      <span aria-hidden="true" className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-fg text-app">
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