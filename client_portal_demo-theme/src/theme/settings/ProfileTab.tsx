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
import { fieldControlClass, Panel } from './SettingsParts';
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
          className={cx(fieldControlClass, 'h-11', isMissing && 'ring-warning/60')}
        />
      )}
    </div>
  );
}

function CompletionRing({ percent }: { percent: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-24 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="6" className="stroke-surface-2" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
          className="stroke-primary transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="text-xl font-semibold tabular-nums text-fg">{percent}%</span>
    </div>
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

  const renderSection = (section: keyof typeof profileSections) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {section === 'basic' && (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <FieldLabel field={{ label: profileEmail.label, required: false }} htmlFor="profile-email" />
          <div className="relative">
            <input id="profile-email" type="email" value={profileEmail.value} readOnly className={cx(fieldControlClass, 'h-11 pr-10 font-medium')} />
            <Icon name="lock" size={15} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-subtle" />
          </div>
        </div>
      )}
      {profileFields
        .filter((field) => field.section === section)
        .map((field) => (
          <ProfileInput key={field.id} field={field} value={values[field.id]} onChange={(value) => updateField(field.id, value)} />
        ))}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form id={FORM_ID} onSubmit={submit} className="flex min-w-0 flex-col gap-6">
        <Panel icon="user" title={profileSections.basic} style={staggerStyle(1, 120)}>
          {renderSection('basic')}
        </Panel>
        <Panel icon="globe" title={profileSections.address} style={staggerStyle(2, 120)}>
          {renderSection('address')}
        </Panel>
      </form>

      <aside style={staggerStyle(3, 120)} className="glow-border flex animate-rise flex-col gap-5 rounded-xl bg-surface p-5 shadow-card lg:sticky lg:top-24 lg:self-start motion-reduce:animate-none">
        <div className="flex items-center gap-4">
          <CompletionRing percent={percent} />
          <div>
            <p className="text-sm font-semibold text-fg">Profile</p>
            <p className="text-xs tabular-nums text-fg-muted">
              {filledCount}/{requiredFields.length} *
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-1">
          {requiredFields.map((field) => {
            const filled = values[field.id].trim() !== '';
            return (
              <li key={field.id}>
                <label
                  htmlFor={`profile-${field.id}`}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-hover"
                >
                  <span
                    className={cx(
                      'grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-300',
                      filled ? 'bg-success text-white' : 'bg-warning/15 text-warning ring-1 ring-warning/40',
                    )}
                  >
                    {filled ? <Icon name="check" size={11} /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={filled ? 'text-fg-muted' : 'font-medium text-fg'}>{field.label}</span>
                </label>
              </li>
            );
          })}
        </ul>

        <Button type="submit" form={FORM_ID} size="lg" fullWidth rightIcon={saved ? 'checkCircle' : 'arrowRight'}>
          {profileSaveLabel}
        </Button>
      </aside>
    </div>
  );
}
