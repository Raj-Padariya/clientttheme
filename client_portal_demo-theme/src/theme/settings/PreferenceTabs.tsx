'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, Input, Select } from '../ui/Input';
import { toast } from '../ui/Toast';
import { Panel, StatusStamp, Toggle } from './SettingsParts';
import {
  accountIdentity,
  alwaysOnEmails,
  cryptoNetworks,
  emailCopy,
  emailPreferences,
  withdrawalCopy,
  withdrawalFormCopy,
  withdrawalMethodOptions,
  type EmailPreference,
  type WithdrawalMethodOption,
} from './settingsData';

const HOLDER_NAME_PATTERN = /^[A-Za-z\s\-'.]+$/;
const OTP_LENGTH = 6;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

interface SavedWithdrawalMethod {
  id: number;
  kind: WithdrawalMethodOption['id'];
  title: string;
  detail: string;
}

function maskAddress(address: string) {
  return address.length <= 10 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProofDropzone({ id, label, file, onFileChange, required = false, invalid = false }: { id: string; label: string; file: File | null; onFileChange: (file: File | null) => void; required?: boolean; invalid?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function accept(next: File | undefined) {
    if (!next || !next.type.startsWith('image/')) return;
    const tooLarge = next.size > MAX_PROOF_BYTES;
    setSizeError(tooLarge);
    onFileChange(tooLarge ? null : next);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    accept(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg">
        {label} {required ? <span className="text-danger">*</span> : <span className="text-xs font-normal text-fg-subtle">(Optional)</span>}
      </span>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cx(
          'relative flex items-center gap-4 overflow-hidden rounded-xl border border-dashed p-3 transition-[border-color,background-color] duration-200',
          isDragging ? 'border-primary bg-primary-soft' : invalid ? 'border-warning/60 bg-warning/5' : 'border-line-strong bg-surface-2/60 hover:border-primary/50',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {file && previewUrl ? (
          <>
            <Image src={previewUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 animate-rise rounded-lg object-cover ring-1 ring-line motion-reduce:animate-none" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{file.name}</p>
              <p className="text-xs text-fg-muted">{formatFileSize(file.size)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => onFileChange(null)}
              className="grid size-8 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="close" size={14} />
            </button>
          </>
        ) : (
          <>
            <span className={cx('grid size-12 shrink-0 place-items-center rounded-xl ring-1 transition-colors', isDragging ? 'bg-primary text-on-primary ring-primary' : 'bg-surface text-primary ring-line')}>
              <Icon name="plus" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg">
                <label htmlFor={id} className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline">
                  {withdrawalFormCopy.chooseFile}
                </label>{' '}
                <span className="text-fg-muted">or drag an image here</span>
              </p>
              <p className="text-xs text-fg-subtle">{sizeError ? 'Image must be 5 MB or smaller.' : `${withdrawalFormCopy.noFile} · PNG, JPG up to 5 MB`}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OtpStep({ onVerify, onBack }: { onVerify: () => void; onBack: () => void }) {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isComplete = digits.every(Boolean);

  function setDigit(position: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      setDigits((current) => current.map((digit, index) => (index === position ? '' : digit)));
      return;
    }
    // Pasting a whole code fills the following boxes too.
    setDigits((current) => current.map((digit, index) => (index >= position && index < position + typed.length ? typed[index - position] : digit)));
    inputRefs.current[Math.min(position + typed.length, OTP_LENGTH - 1)]?.focus();
  }

  function handleKeyDown(position: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[position] && position > 0) inputRefs.current[position - 1]?.focus();
  }

  return (
    <div className="flex animate-rise flex-col items-center gap-5 rounded-xl bg-surface-2/60 px-4 py-6 text-center ring-1 ring-line motion-reduce:animate-none">
      <span className="relative grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full ring-1 ring-primary/40 motion-reduce:hidden" />
        <Icon name="kyc" size={24} />
      </span>
      <div>
        <p className="text-base font-semibold text-fg">Enter verification code</p>
        <p className="mt-1 text-sm text-fg-muted">We sent a {OTP_LENGTH}-digit code to {accountIdentity.email}</p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Verification code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            value={digit}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1}`}
            maxLength={OTP_LENGTH}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={cx(
              'size-11 rounded-lg bg-surface text-center font-mono text-lg font-semibold text-fg ring-1 transition-[box-shadow,transform] focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
              digit ? 'ring-primary/60' : 'ring-line',
            )}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button leftIcon="check" disabled={!isComplete} onClick={onVerify}>
          Verify & Add
        </Button>
      </div>
    </div>
  );
}

export function WithdrawalMethodsTab() {
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethodOption['id'] | null>(null);
  const [network, setNetwork] = useState('');
  const [address, setAddress] = useState('');
  const [holderName, setHolderName] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [savedMethods, setSavedMethods] = useState<SavedWithdrawalMethod[]>([]);
  const nextIdRef = useRef(1);

  const holderNameInvalid = holderName.trim() !== '' && !HOLDER_NAME_PATTERN.test(holderName.trim());
  const errors =
    selectedMethod === 'crypto'
      ? { network: !network, address: address.trim() === '', proof: !proofFile }
      : { holderName: holderName.trim() === '' || holderNameInvalid };
  const hasErrors = Object.values(errors).some(Boolean);

  function resetForm() {
    setNetwork('');
    setAddress('');
    setHolderName('');
    setProofFile(null);
    setShowErrors(false);
    setIsOtpStep(false);
  }

  function selectMethod(method: WithdrawalMethodOption['id']) {
    if (method === selectedMethod) return;
    resetForm();
    setSelectedMethod(method);
  }

  function sendOtp() {
    setShowErrors(true);
    if (hasErrors) {
      toast('Please complete the required fields', { tone: 'warning' });
      return;
    }
    setIsOtpStep(true);
    toast('OTP sent', { tone: 'info', description: `Check ${accountIdentity.email} for your verification code.` });
  }

  function verifyAndAdd() {
    if (!selectedMethod) return;
    const method: SavedWithdrawalMethod =
      selectedMethod === 'crypto'
        ? { id: nextIdRef.current++, kind: 'crypto', title: network, detail: maskAddress(address.trim()) }
        : { id: nextIdRef.current++, kind: 'local', title: 'Local Transfer', detail: holderName.trim() };
    setSavedMethods((current) => [method, ...current]);
    toast('Withdrawal method added', { description: `${method.title} · ${method.detail}` });
    resetForm();
    setSelectedMethod(null);
  }

  function removeMethod(id: number) {
    setSavedMethods((current) => current.filter((method) => method.id !== id));
    toast('Withdrawal method removed', { tone: 'danger' });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel
        icon="withdrawal"
        title={withdrawalCopy.heading}
        subtitle={withdrawalCopy.subtitle}
        style={staggerStyle(1, 120)}
        action={
          <Button
            size="sm"
            variant="outline"
            leftIcon="refresh"
            onClick={() => {
              resetForm();
              setSelectedMethod(null);
              toast('Withdrawal methods refreshed', { tone: 'info' });
            }}
          >
            {withdrawalCopy.refresh}
          </Button>
        }
      >
        <div role="radiogroup" aria-label={withdrawalCopy.heading} className="grid gap-3 sm:grid-cols-2">
          {withdrawalMethodOptions.map((option) => {
            const selected = option.id === selectedMethod;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isOtpStep}
                onClick={() => selectMethod(option.id)}
                className={cx(
                  'group relative flex items-center gap-3 overflow-hidden rounded-xl p-3.5 text-left ring-1 transition-[box-shadow,transform,background-color] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none',
                  selected ? 'bg-primary-soft shadow-[0_16px_32px_-20px_var(--brand-primary)] ring-primary' : 'bg-surface-2 ring-line hover:ring-line-strong',
                )}
              >
                {selected && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
                <span
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-300',
                    selected ? 'bg-primary text-on-primary' : 'bg-surface text-fg-muted group-hover:text-primary',
                  )}
                >
                  <Icon name={option.icon} size={20} />
                </span>
                <span className="flex-1 text-sm font-semibold text-fg">{option.label}</span>
                <span className={cx('grid size-5 place-items-center rounded-full ring-2 transition-colors', selected ? 'bg-primary text-on-primary ring-primary' : 'ring-line-strong')}>
                  {selected && <Icon name="check" size={11} />}
                </span>
              </button>
            );
          })}
        </div>

        {!selectedMethod && (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-fg-muted">
            <Icon name="chevronRight" size={14} className="-rotate-90 animate-float text-primary motion-reduce:animate-none" />
            Pick a method above to enter its details.
          </p>
        )}

        {selectedMethod && isOtpStep && <OtpStep onVerify={verifyAndAdd} onBack={() => setIsOtpStep(false)} />}

        {selectedMethod && !isOtpStep && (
          <div key={selectedMethod} className="flex animate-rise flex-col gap-5 border-t border-line pt-5 motion-reduce:animate-none">
            <div>
              <h4 className="text-sm font-semibold text-fg">{selectedMethod === 'crypto' ? withdrawalFormCopy.cryptoHeading : withdrawalFormCopy.localHeading}</h4>
              <p className="mt-0.5 text-xs text-fg-muted">{selectedMethod === 'crypto' ? withdrawalFormCopy.cryptoSubtitle : withdrawalFormCopy.localSubtitle}</p>
            </div>

            {selectedMethod === 'crypto' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={withdrawalFormCopy.network} htmlFor="withdrawal-network" hint={withdrawalFormCopy.networkHint}>
                    <Select id="withdrawal-network" value={network} invalid={showErrors && !network} onChange={(event) => setNetwork(event.target.value)}>
                      <option value="">{withdrawalFormCopy.networkPlaceholder}</option>
                      {cryptoNetworks.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={withdrawalFormCopy.cryptoAddress} htmlFor="withdrawal-address" error={showErrors && address.trim() === '' ? 'Enter your wallet address' : undefined}>
                    <Input
                      id="withdrawal-address"
                      value={address}
                      spellCheck={false}
                      autoComplete="off"
                      invalid={showErrors && address.trim() === ''}
                      onChange={(event) => setAddress(event.target.value)}
                      className="font-mono"
                    />
                  </Field>
                </div>
                <ProofDropzone id="withdrawal-crypto-proof" label={withdrawalFormCopy.cryptoProof} file={proofFile} onFileChange={setProofFile} required invalid={showErrors && !proofFile} />
              </>
            ) : (
              <>
                <Field
                  label={withdrawalFormCopy.holderName}
                  htmlFor="withdrawal-holder"
                  hint={withdrawalFormCopy.holderHint}
                  error={holderNameInvalid ? withdrawalFormCopy.holderHint : showErrors && holderName.trim() === '' ? 'Enter the account holder name' : undefined}
                  className="sm:max-w-sm"
                >
                  <Input
                    id="withdrawal-holder"
                    value={holderName}
                    placeholder={withdrawalFormCopy.holderPlaceholder}
                    autoComplete="name"
                    invalid={holderNameInvalid || (showErrors && holderName.trim() === '')}
                    onChange={(event) => setHolderName(event.target.value)}
                  />
                </Field>
                <ProofDropzone id="withdrawal-local-proof" label={withdrawalFormCopy.localProof} file={proofFile} onFileChange={setProofFile} />
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setSelectedMethod(null);
                }}
              >
                {withdrawalFormCopy.cancel}
              </Button>
              <Button rightIcon="chevronRight" onClick={sendOtp}>
                {withdrawalFormCopy.sendOtp}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <Panel icon="wallet" title={withdrawalCopy.listHeading} style={staggerStyle(2, 120)}>
        {savedMethods.length === 0 ? (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-surface-2 px-6 py-14 text-center ring-1 ring-line">
            <span aria-hidden="true" className="absolute size-40 animate-ring-ripple rounded-full ring-1 ring-primary/30 motion-reduce:animate-none" />
            <span className="relative grid size-16 animate-float place-items-center rounded-2xl bg-surface text-primary shadow-card ring-1 ring-line motion-reduce:animate-none">
              <Icon name="wallet" size={28} />
            </span>
            <p className="relative text-sm font-medium text-fg-muted">{withdrawalCopy.empty}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {savedMethods.map((method) => {
              const option = withdrawalMethodOptions.find((item) => item.id === method.kind);
              return (
                <li key={method.id} className="group flex animate-rise items-center gap-3 rounded-xl bg-surface-2 p-3.5 ring-1 ring-line transition-shadow hover:ring-primary/40 motion-reduce:animate-none">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon name={option?.icon ?? 'wallet'} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{method.title}</p>
                    <p className={cx('truncate text-xs text-fg-muted', method.kind === 'crypto' && 'font-mono')}>{method.detail}</p>
                  </div>
                  <StatusStamp tone="warning">Pending</StatusStamp>
                  <button
                    type="button"
                    aria-label={`Remove ${method.title}`}
                    onClick={() => removeMethod(method.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const initialEmailState = Object.fromEntries(emailPreferences.map((preference) => [preference.id, true])) as Record<EmailPreference['id'], boolean>;

export function EmailPreferencesTab() {
  const [enabled, setEnabled] = useState(initialEmailState);
  const [saved, setSaved] = useState(false);
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{emailCopy.heading}</h2>
          <p className="mt-0.5 text-sm text-fg-muted">{emailCopy.subtitle}</p>
        </div>
        <Button rightIcon={saved ? 'checkCircle' : undefined} onClick={() => setSaved(true)}>
          {emailCopy.save}
        </Button>
      </header>

      <section aria-label={emailCopy.marketingHeading} className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
          {emailCopy.marketingHeading}
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] tabular-nums text-primary">
            {enabledCount}/{emailPreferences.length}
          </span>
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {emailPreferences.map((preference, index) => {
            const isOn = enabled[preference.id];
            return (
              <article
                key={preference.id}
                style={staggerStyle(index + 1, 100)}
                className={cx(
                  'relative flex animate-rise flex-col gap-5 overflow-hidden rounded-xl p-5 ring-1 transition-[background-color,box-shadow] duration-300 motion-reduce:animate-none',
                  isOn ? 'bg-surface shadow-[0_18px_36px_-24px_var(--brand-primary)] ring-primary/40' : 'bg-surface-2 ring-line',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-primary/20 blur-2xl transition-opacity duration-500',
                    isOn ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="relative flex items-center justify-between">
                  <span
                    className={cx(
                      'grid size-11 place-items-center rounded-xl transition-colors duration-300',
                      isOn ? 'bg-primary text-on-primary' : 'bg-surface text-fg-subtle ring-1 ring-line',
                    )}
                  >
                    <Icon name={preference.icon} size={20} />
                  </span>
                  <Toggle
                    checked={isOn}
                    label={preference.title}
                    onChange={(next) => {
                      setSaved(false);
                      setEnabled((current) => ({ ...current, [preference.id]: next }));
                    }}
                  />
                </div>
                <div className="relative">
                  <p className="text-sm font-semibold text-fg">{preference.title}</p>
                  <p className="mt-1 text-xs text-fg-muted">{preference.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section style={staggerStyle(4, 100)} className="flex animate-rise flex-col gap-4 rounded-xl border border-dashed border-line-strong bg-surface-2/60 p-5 motion-reduce:animate-none">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-primary ring-1 ring-line">
            <Icon name="lock" size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-fg">{emailCopy.alwaysOnHeading}</h3>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">{emailCopy.alwaysOnBody}</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {alwaysOnEmails.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-fg-muted ring-1 ring-line">
              <Icon name={item.icon} size={13} className="text-primary" />
              {item.label}
              <Icon name="check" size={12} className="text-success" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
