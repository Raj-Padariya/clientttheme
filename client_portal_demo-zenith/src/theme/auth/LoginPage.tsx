'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useLogin } from '@/core/auth/useLogin';
import { brandConfig } from '@/core/broker/config';
import { translate } from '@/core/i18n';
import { Button, LinkButton } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { Checkbox, Field, Input, PasswordInput } from '../ui/Input';
import { AuthLayout } from './AuthLayout';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useLogin();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const success = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
    if (success) router.push('/dashboard');
  }

  return (
    <AuthLayout title={brandConfig.loginWelcomeTitle} subtitle={translate('auth.loginSubtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 short:gap-4" noValidate>
        {error && <Alert tone="danger">{translate(error)}</Alert>}
        <Field label={translate('auth.email')} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            leftIcon="mail"
            placeholder={translate('auth.emailPlaceholder')}
            required
          />
        </Field>
        <Field label={translate('auth.password')} htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            leftIcon="lock"
            placeholder={translate('auth.passwordPlaceholder')}
            required
          />
        </Field>
        <Checkbox name="remember" label={translate('auth.remember')} />
        <Button type="submit" size="lg" fullWidth loading={isLoading} rightIcon="arrowRight" className="zen-auth-shine">
          {translate('auth.signIn')}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs text-fg-subtle short:my-5">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        {translate('auth.newHere', { brand: brandConfig.brandName })}
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      <LinkButton href="/register" variant="outline" size="lg" fullWidth>
        {translate('auth.openAccount')}
      </LinkButton>

      <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-line pt-5 short:mt-6 short:pt-4 tiny:hidden">
        {brandConfig.trustPoints.map((point) => (
          <li key={point} className="flex items-center gap-2 text-xs text-fg-muted">
            <Icon name="check" size={14} className="shrink-0 text-primary" />
            {point}
          </li>
        ))}
      </ul>
    </AuthLayout>
  );
}
