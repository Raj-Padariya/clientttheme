'use client';

import { useState, type FormEvent } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
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
          className={cx(fieldControlClass, 'resize-y py-3', isMissing && 'border-warning/60')}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className={cx(fieldControlClass, 'h-11', isMissing && 'border-warning/60')}
        />
      )}
    </div>
  );
}

/** Required-field completion as a segmented meter: one segment per required field. */
function CompletionMeter({ values, percent, filledCount, saved }: { values: Record<ProfileFieldId, string>; percent: number; filledCount: number; saved: boolean }) {
  return (
    <section style={staggerStyle(1, 120)} className="orbit-card relative isolate animate-rise overflow-hidden motion-reduce:animate-none">
      <div aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 -z-10 opacity-40" />
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-center gap-4">
          <span className="font-mono text-4xl leading-none font-semibold text-fg tabular-nums">
            {percent}
            <span className="text-lg text-fg-muted">%</span>
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">Profile</p>
            <p className="font-mono text-xs text-fg-muted tabular-nums">
              {filledCount}/{requiredFields.length} *
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div aria-hidden="true" className="flex gap-1">
            {requiredFields.map((field, index) => {
              const filled = values[field.id].trim() !== '';
              return (
                <span
                  key={field.id}
                  style={{ transitionDelay: `${index * 40}ms` }}
                  className={cx(
                    'h-2 flex-1 rounded-sm transition-colors duration-500 motion-reduce:transition-none',
                    filled ? 'bg-primary shadow-[0_0_8px_-2px_var(--brand-primary)]' : 'bg-warning/25',
                  )}
                />
              );
            })}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {requiredFields.map((field) => {
              const filled = values[field.id].trim() !== '';
              return (
                <li key={field.id}>
                  <label
                    htmlFor={`profile-${field.id}`}
                    className={cx(
                      'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors',
                      filled ? 'border-line text-fg-muted hover:border-line-strong' : 'border-warning/40 bg-warning/10 font-medium text-warning hover:bg-warning/15',
                    )}
                  >
                    {filled ? <Icon name="check" size={11} className="text-success" /> : <span className="size-1.5 rounded-full bg-current" />}
                    {field.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <Button type="submit" form={FORM_ID} size="lg" className="lg:shrink-0" rightIcon={saved ? 'checkCircle' : 'arrowRight'}>
          {profileSaveLabel}
        </Button>
      </div>
    </section>
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
    <div className="flex flex-col gap-6">
      <CompletionMeter values={values} percent={percent} filledCount={filledCount} saved={saved} />

      <form id={FORM_ID} onSubmit={submit} style={staggerStyle(2, 120)} className="orbit-card flex min-w-0 animate-rise flex-col divide-y divide-line motion-reduce:animate-none">
        {sections.map((section, index) => {
          const sectionFields = profileFields.filter((field) => field.section === section.id);
          const sectionFilled = sectionFields.filter((field) => !field.required || values[field.id].trim() !== '').length;
          return (
            <fieldset key={section.id} className="grid min-w-0 gap-5 p-5 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
              <legend className="sr-only">{profileSections[section.id]}</legend>
              <div aria-hidden="true" className="flex items-start gap-3 md:flex-col md:gap-2">
                <span className="font-mono text-3xl leading-none font-semibold text-primary/40">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <Icon name={section.icon} size={15} className="text-primary" />
                    {profileSections[section.id]}
                  </span>
                  <span className="w-fit rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle tabular-nums">
                    {sectionFilled}/{sectionFields.length}
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                {section.id === 'basic' && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <FieldLabel field={{ label: profileEmail.label, required: false }} htmlFor="profile-email" />
                    <div className="relative">
                      <input id="profile-email" type="email" value={profileEmail.value} readOnly className={cx(fieldControlClass, 'h-11 pr-10 font-mono font-medium')} />
                      <Icon name="lock" size={15} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-subtle" />
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
    </div>
  );
}