'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Field, Input, Select } from '../ui/Input';
import { toast } from '../ui/Toast';
import { StatusStamp, Toggle } from './SettingsParts';
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
    <div className="flex animate-rise flex-col items-center gap-5 rounded-2xl border border-dashed border-primary/35 bg-primary/[0.04] px-4 py-7 text-center motion-reduce:animate-none">
      <span className="relative grid size-14 place-items-center rounded-2xl border border-primary/40 bg-primary/15 text-primary">
        <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-2xl border border-primary/40 motion-reduce:hidden" />
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
              'h-12 w-10 border-b-2 bg-transparent text-center font-mono text-2xl font-semibold text-fg transition-[border-color,translate] focus-visible:-translate-y-0.5 focus-visible:border-primary focus-visible:outline-none',
              digit ? 'border-primary/70' : 'border-line-strong',
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

  const flowStep = !selectedMethod ? 0 : isOtpStep ? 2 : 1;
  const flowSteps = ['Method', 'Details', 'Verify'];

  return (
    <div className="flex flex-col gap-6">
      <section style={staggerStyle(1, 120)} className="orbit-card relative isolate flex animate-rise flex-col overflow-hidden motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
              <Icon name="withdrawal" size={16} className="text-primary" />
              {withdrawalCopy.heading}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">{withdrawalCopy.subtitle}</p>
          </div>
          <ol aria-label="Progress" className="flex items-center gap-2">
            {flowSteps.map((label, index) => {
              const isDone = index < flowStep;
              const isCurrent = index === flowStep;
              return (
                <li key={label} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden="true" className={cx('h-px w-6 transition-colors duration-300', isDone || isCurrent ? 'bg-primary' : 'bg-line-strong')} />}
                  <span
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cx(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors duration-300',
                      isCurrent ? 'border-primary/50 bg-primary/15 text-fg' : isDone ? 'border-line text-primary' : 'border-line text-fg-subtle',
                    )}
                  >
                    {isDone ? <Icon name="check" size={11} /> : <span className="font-mono text-[10px]">{index + 1}</span>}
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
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
        </header>

        <div className="grid min-w-0 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div role="radiogroup" aria-label={withdrawalCopy.heading} className="flex gap-3 border-b border-line p-4 md:flex-col md:border-r md:border-b-0">
            {withdrawalMethodOptions.map((option, index) => {
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
                    'group relative flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none md:flex-none',
                    selected ? 'border-primary/55 bg-primary/[0.1] shadow-[0_16px_32px_-22px_var(--brand-primary)]' : 'border-line bg-fg/[0.02] hover:border-primary/35',
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={cx(
                        'grid size-11 place-items-center rounded-xl border transition-colors duration-300',
                        selected ? 'border-primary/50 bg-primary/25 text-primary' : 'border-line text-fg-muted group-hover:text-primary',
                      )}
                    >
                      <Icon name={option.icon} size={20} />
                    </span>
                    <span className="font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-fg">{option.label}</span>
                    <span className={cx('grid size-5 place-items-center rounded-md border transition-colors', selected ? 'border-primary bg-primary text-on-primary' : 'border-line-strong')}>
                      {selected && <Icon name="check" size={11} />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-col gap-5 p-5">
            {!selectedMethod && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="relative grid size-14 place-items-center">
                  <span aria-hidden="true" className="absolute inset-0 animate-orbit-spin rounded-2xl border border-dashed border-primary/40 [animation-duration:16s] motion-reduce:animate-none" />
                  <Icon name="chevronRight" size={20} className="animate-float text-primary md:rotate-180 motion-reduce:animate-none" />
                </span>
                <p className="text-sm text-fg-muted">Pick a method above to enter its details.</p>
              </div>
            )}

            {selectedMethod && isOtpStep && <OtpStep onVerify={verifyAndAdd} onBack={() => setIsOtpStep(false)} />}

            {selectedMethod && !isOtpStep && (
              <div key={selectedMethod} className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
                <div className="border-l-2 border-primary pl-3">
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

                <div className="flex justify-end gap-2 border-t border-dashed border-line-strong pt-4">
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
          </div>
        </div>
      </section>

      <section style={staggerStyle(2, 120)} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon name="wallet" size={15} className="text-primary" />
          {withdrawalCopy.listHeading}
          <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle tabular-nums">{savedMethods.length}</span>
        </h3>
        {savedMethods.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line-strong px-5 py-6">
            <span className="flex -space-x-3" aria-hidden="true">
              {[0, 1, 2].map((card) => (
                <span
                  key={card}
                  style={{ animationDelay: `${card * 200}ms` }}
                  className="h-10 w-14 animate-float rounded-lg border border-line-strong bg-surface shadow-card motion-reduce:animate-none"
                />
              ))}
            </span>
            <p className="text-sm font-medium text-fg-muted">{withdrawalCopy.empty}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {savedMethods.map((method) => {
              const option = withdrawalMethodOptions.find((item) => item.id === method.kind);
              return (
                <li
                  key={method.id}
                  className="orbit-card group relative flex animate-rise flex-col gap-4 overflow-hidden p-4 transition-[border-color] hover:border-primary/40 motion-reduce:animate-none motion-reduce:transition-none"
                >
                  <span aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 opacity-30" />
                  <div className="relative flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl border border-primary/35 bg-primary/12 text-primary">
                      <Icon name={option?.icon ?? 'wallet'} size={18} />
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${method.title}`}
                      onClick={() => removeMethod(method.id)}
                      className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  <div className="relative min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{method.title}</p>
                    <p className={cx('truncate text-xs text-fg-muted', method.kind === 'crypto' && 'font-mono')}>{method.detail}</p>
                  </div>
                  <div className="relative">
                    <StatusStamp tone="warning">Pending</StatusStamp>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const initialEmailState = Object.fromEntries(emailPreferences.map((preference) => [preference.id, true])) as Record<EmailPreference['id'], boolean>;

export function EmailPreferencesTab() {
  const [enabled, setEnabled] = useState(initialEmailState);
  const [saved, setSaved] = useState(false);
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <section aria-label={emailCopy.marketingHeading} style={staggerStyle(1, 100)} className="orbit-card relative flex min-w-0 animate-rise flex-col overflow-hidden motion-reduce:animate-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
        <header className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-primary/35 bg-primary/12 text-primary">
            <Icon name="bell" size={18} />
            <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-md bg-primary px-1 font-mono text-[10px] font-semibold text-on-primary tabular-nums">{enabledCount}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-fg">{emailCopy.heading}</h2>
            <p className="mt-0.5 text-xs text-fg-muted">{emailCopy.subtitle}</p>
          </div>
          <Button rightIcon={saved ? 'checkCircle' : undefined} onClick={() => setSaved(true)}>
            {emailCopy.save}
          </Button>
        </header>

        <div className="flex items-center justify-between gap-3 border-b border-line bg-fg/[0.015] px-5 py-2">
          <h3 className="text-[10px] font-semibold tracking-[0.16em] text-fg-subtle uppercase">{emailCopy.marketingHeading}</h3>
          <span className="flex items-center gap-2 font-mono text-[11px] text-fg-muted tabular-nums">
            <span aria-hidden="true" className="flex gap-0.5">
              {emailPreferences.map((preference) => (
                <span key={preference.id} className={cx('h-3 w-1 rounded-sm transition-colors duration-300', enabled[preference.id] ? 'bg-primary' : 'bg-line-strong')} />
              ))}
            </span>
            {enabledCount}/{emailPreferences.length}
          </span>
        </div>

        <ul className="flex flex-col divide-y divide-line">
          {emailPreferences.map((preference, index) => {
            const isOn = enabled[preference.id];
            return (
              <li
                key={preference.id}
                style={staggerStyle(index + 2, 90)}
                className={cx('relative flex animate-rise items-center gap-4 px-5 py-4 transition-colors duration-300 motion-reduce:animate-none', isOn ? 'bg-primary/[0.04]' : 'hover:bg-hover')}
              >
                <span aria-hidden="true" className={cx('absolute inset-y-3 left-0 w-0.5 rounded-full transition-colors duration-300', isOn ? 'bg-primary' : 'bg-transparent')} />
                <span
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-xl border transition-colors duration-300',
                    isOn ? 'border-primary/45 bg-primary/20 text-primary' : 'border-line text-fg-subtle',
                  )}
                >
                  <Icon name={preference.icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-sm', isOn ? 'font-semibold text-fg' : 'font-medium text-fg-muted')}>{preference.title}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">{preference.description}</p>
                </div>
                <span className={cx('hidden font-mono text-[10px] tracking-wide uppercase sm:block', isOn ? 'text-primary' : 'text-fg-subtle')}>{isOn ? 'On' : 'Off'}</span>
                <Toggle
                  checked={isOn}
                  label={preference.title}
                  onChange={(next) => {
                    setSaved(false);
                    setEnabled((current) => ({ ...current, [preference.id]: next }));
                  }}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section style={staggerStyle(4, 100)} className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-fg/[0.02] p-5 lg:sticky lg:top-24 motion-reduce:animate-none">
        <span aria-hidden="true" className="kpi-texture pointer-events-none absolute inset-0 opacity-30" />
        <span className="relative grid size-10 place-items-center rounded-xl border border-line-strong bg-surface text-primary">
          <Icon name="lock" size={18} />
        </span>
        <div className="relative">
          <h3 className="text-sm font-semibold text-fg">{emailCopy.alwaysOnHeading}</h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{emailCopy.alwaysOnBody}</p>
        </div>
        <ul className="relative flex flex-col gap-1.5">
          {alwaysOnEmails.map((item) => (
            <li key={item.label} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/70 px-3 py-2 text-xs text-fg-muted">
              <Icon name={item.icon} size={14} className="text-primary" />
              <span className="flex-1">{item.label}</span>
              <Icon name="check" size={12} className="text-success" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}