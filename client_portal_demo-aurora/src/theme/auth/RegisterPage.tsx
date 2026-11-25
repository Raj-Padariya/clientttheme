'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useRegister, type RegisterPayload } from '@/core/auth/useRegister';
import { brandConfig } from '@/core/broker/config';
import { translate, type MessageKey } from '@/core/i18n';
import { Button } from '../ui/Button';
import { Checkbox, Field, fieldErrorId, Input, PasswordInput, Select } from '../ui/Input';
import { AuthLayout } from './AuthLayout';

type RegisterField = keyof RegisterPayload | 'confirmPassword' | 'terms';
type FieldErrors = Partial<Record<RegisterField, MessageKey>>;

const REQUIRED_FIELDS: RegisterField[] = ['firstName', 'lastName', 'email', 'phone', 'country', 'password'];
const TICKET_FIELDS: RegisterField[] = [...REQUIRED_FIELDS, 'confirmPassword', 'terms'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function readPayload(form: FormData): RegisterPayload {
  const value = (name: keyof RegisterPayload) => String(form.get(name) ?? '').trim();
  return {
    firstName: value('firstName'),
    lastName: value('lastName'),
    email: value('email'),
    phone: value('phone'),
    country: value('country'),
    password: String(form.get('password') ?? ''),
  };
}

function validate(payload: RegisterPayload, form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of REQUIRED_FIELDS) {
    if (!payload[field as keyof RegisterPayload]) errors[field] = 'auth.required';
  }
  if (payload.email && !EMAIL_PATTERN.test(payload.email)) errors.email = 'auth.invalidEmail';
  if (payload.password && payload.password.length < MIN_PASSWORD_LENGTH) errors.password = 'auth.passwordTooShort';
  if (form.get('confirmPassword') !== payload.password) errors.confirmPassword = 'auth.passwordMismatch';
  if (form.get('terms') !== 'on') errors.terms = 'auth.acceptTerms';
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, countries } = useRegister();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [filledCount, setFilledCount] = useState(0);

  const errorFor = (field: RegisterField) => (errors[field] ? translate(errors[field]) : undefined);
  const describedBy = (field: RegisterField) => (errors[field] ? fieldErrorId(field) : undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = readPayload(form);
    const nextErrors = validate(payload, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (await register(payload)) router.push('/dashboard');
  }

  function trackProgress(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    setFilledCount(TICKET_FIELDS.filter((field) => String(form.get(field) ?? '').trim() !== '').length);
  }

  return (
    <AuthLayout
      title={brandConfig.registerWelcomeTitle}
      subtitle={translate('auth.registerSubtitle')}
      progress={{ filled: filledCount, total: TICKET_FIELDS.length }}
      footer={
        <>
          {translate('auth.haveAccount')}{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {translate('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} onChange={trackProgress} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={translate('auth.firstName')} htmlFor="firstName" error={errorFor('firstName')}>
            <Input id="firstName" name="firstName" autoComplete="given-name" invalid={Boolean(errors.firstName)} aria-describedby={describedBy('firstName')} />
          </Field>
          <Field label={translate('auth.lastName')} htmlFor="lastName" error={errorFor('lastName')}>
            <Input id="lastName" name="lastName" autoComplete="family-name" invalid={Boolean(errors.lastName)} aria-describedby={describedBy('lastName')} />
          </Field>
        </div>
        <Field label={translate('auth.email')} htmlFor="email" error={errorFor('email')}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={translate('auth.emailPlaceholder')}
            invalid={Boolean(errors.email)}
            aria-describedby={describedBy('email')}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={translate('auth.phone')} htmlFor="phone" error={errorFor('phone')}>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone')} />
          </Field>
          <Field label={translate('auth.country')} htmlFor="country" error={errorFor('country')}>
            <Select id="country" name="country" defaultValue="" invalid={Boolean(errors.country)} aria-describedby={describedBy('country')}>
              <option value="" disabled>
                {translate('auth.selectCountry')}
              </option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={translate('auth.password')} htmlFor="password" error={errorFor('password')}>
          <PasswordInput id="password" name="password" autoComplete="new-password" invalid={Boolean(errors.password)} aria-describedby={describedBy('password')} />
        </Field>
        <Field label={translate('auth.confirmPassword')} htmlFor="confirmPassword" error={errorFor('confirmPassword')}>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
            aria-describedby={describedBy('confirmPassword')}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <Checkbox
            name="terms"
            aria-describedby={describedBy('terms')}
            label={
              <>
                {translate('auth.agreePrefix')}{' '}
                <a href={brandConfig.termsUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  {translate('auth.terms')}
                </a>{' '}
                {translate('auth.and')}{' '}
                <a href={brandConfig.privacyUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  {translate('auth.privacy')}
                </a>
              </>
            }
          />
          {errors.terms && (
            <p id={fieldErrorId('terms')} className="text-xs text-danger">
              {translate(errors.terms)}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" fullWidth loading={isLoading} className="aur-shine">
          {translate('auth.createAccount')}
        </Button>
        <p className="text-xs leading-relaxed text-fg-subtle">{brandConfig.registrationDisclaimer}</p>
      </form>
    </AuthLayout>
  );
}
