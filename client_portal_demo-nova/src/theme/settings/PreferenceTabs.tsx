'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { staggerStyle } from '../pamm/motion';

import { Icon, type IconName } from '../ui/Icon';
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
          'relative flex items-center gap-4 overflow-hidden rounded-[22px] border-2 border-dotted p-3 transition-[border-color,background-color] duration-200',
          isDragging ? 'border-fg/60 bg-fg/[0.06]' : invalid ? 'border-warning/60 bg-warning/5' : 'border-line-strong hover:border-fg/35',
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
            <Image src={previewUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 animate-rise rounded-full object-cover ring-2 ring-line-strong motion-reduce:animate-none" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{file.name}</p>
              <p className="font-mono text-xs text-fg-muted">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-9 rounded-full px-3.5 text-xs font-semibold text-fg ring-1 ring-line transition-[background-color,color,box-shadow] hover:bg-fg hover:text-app hover:ring-fg focus-visible:outline-2 focus-visible:outline-ring"
            >
              Replace
            </button>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => onFileChange(null)}
              className="grid size-9 shrink-0 place-items-center rounded-full text-fg-subtle ring-1 ring-line transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon name="close" size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="relative grid size-14 shrink-0 place-items-center">
              <span aria-hidden="true" className={cx('absolute inset-0 rounded-full border border-dashed border-fg/30', isDragging && 'animate-rim-spin motion-reduce:animate-none')} />
              <span className={cx('grid size-10 place-items-center rounded-full transition-colors', isDragging ? 'bg-fg text-app' : 'nova-gloss text-fg')}>
                <Icon name="plus" size={18} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg">
                <label htmlFor={id} className="cursor-pointer font-bold text-fg underline decoration-dotted underline-offset-4 hover:decoration-solid">
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

function InkPill({ children, onClick, disabled, icon }: { children: ReactNode; onClick: () => void; disabled?: boolean; icon: IconName }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group/ink relative inline-flex h-11 items-center gap-2.5 overflow-hidden rounded-full bg-fg py-1.5 pr-1.5 pl-5 text-sm font-semibold text-app transition-[translate,opacity] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/ink:translate-x-full motion-reduce:hidden" />
      <span className="relative">{children}</span>
      <span className="relative grid size-8 place-items-center rounded-full bg-app text-fg transition-transform duration-300 group-hover/ink:translate-x-0.5 motion-reduce:transition-none">
        <Icon name={icon} size={14} />
      </span>
    </button>
  );
}

function GhostPill({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: IconName }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-fg-muted ring-1 ring-line transition-[color,box-shadow] duration-300 hover:text-fg hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-ring"
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
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
    <div className="flex animate-rise flex-col items-center gap-5 rounded-[26px] bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[size:14px_14px] px-4 py-8 text-center ring-1 ring-line motion-reduce:animate-none">
      <span className="relative grid size-16 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/40 motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-1 animate-ping-soft rounded-full bg-fg/10 motion-reduce:hidden" />
        <span className="nova-gloss relative grid size-12 place-items-center rounded-full text-fg">
          <Icon name="kyc" size={20} />
        </span>
      </span>
      <div>
        <p className="text-lg font-bold text-fg">Enter verification code</p>
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
              'size-12 rounded-full text-center font-mono text-xl font-black transition-[background-color,color,box-shadow,translate] focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-fg/60 focus-visible:outline-none',
              digit ? 'bg-fg text-app' : 'bg-fg/[0.04] text-fg ring-1 ring-line-strong',
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <GhostPill onClick={onBack}>Back</GhostPill>
        <InkPill icon="check" disabled={!isComplete} onClick={onVerify}>
          Verify & Add
        </InkPill>
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <section style={staggerStyle(1, 120)} className="orbit-card nova-edge-light relative isolate flex min-w-0 animate-rise flex-col gap-5 overflow-hidden p-5 motion-reduce:animate-none">
        <header className="flex flex-wrap items-center gap-3.5">
          <span aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
            <span className="nova-gloss grid size-9 place-items-center rounded-full text-fg">
              <Icon name="withdrawal" size={15} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-fg">{withdrawalCopy.heading}</h2>
            <p className="mt-0.5 text-xs text-fg-muted">{withdrawalCopy.subtitle}</p>
          </div>
          <GhostPill
            icon="refresh"
            onClick={() => {
              resetForm();
              setSelectedMethod(null);
              toast('Withdrawal methods refreshed', { tone: 'info' });
            }}
          >
            {withdrawalCopy.refresh}
          </GhostPill>
        </header>

        <ol aria-label="Progress" className="relative grid grid-cols-3">
          <span aria-hidden="true" className="absolute top-5 right-[16.66%] left-[16.66%] border-t-2 border-dotted border-line-strong" />
          <span
            aria-hidden="true"
            style={{ width: `${(flowStep / (flowSteps.length - 1)) * 66.66}%` }}
            className="absolute top-5 left-[16.66%] border-t-2 border-fg transition-[width] duration-500 ease-out motion-reduce:transition-none"
          />
          {flowSteps.map((label, index) => {
            const isDone = index < flowStep;
            const isCurrent = index === flowStep;
            return (
              <li key={label} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-1.5">
                <span className="relative grid size-10 place-items-center rounded-full bg-surface">
                  {isCurrent && <span aria-hidden="true" className="absolute -inset-1 animate-rim-spin rounded-full border border-dashed border-fg/45 motion-reduce:animate-none" />}
                  <span
                    className={cx(
                      'grid size-9 place-items-center rounded-full font-mono text-xs font-black transition-colors duration-300',
                      isCurrent ? 'bg-fg text-app' : isDone ? 'bg-success/15 text-success' : 'text-fg-subtle ring-1 ring-line',
                    )}
                  >
                    {isDone ? <Icon name="check" size={13} /> : index + 1}
                  </span>
                </span>
                <span className={cx('text-[11px] font-semibold', isCurrent ? 'text-fg' : 'text-fg-subtle')}>{label}</span>
              </li>
            );
          })}
        </ol>

        <div role="radiogroup" aria-label={withdrawalCopy.heading} className="grid gap-3 sm:grid-cols-2">
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
                  'group relative flex items-center gap-4 overflow-hidden rounded-full py-2 pr-5 pl-2 text-left transition-[background-color,color,box-shadow,translate] duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none',
                  selected ? 'bg-fg text-app' : 'ring-1 ring-line hover:ring-line-strong',
                )}
              >
                <span className={cx('grid size-12 shrink-0 place-items-center rounded-full', selected ? 'bg-app text-fg' : 'nova-gloss text-fg')}>
                  <Icon name={option.icon} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block font-mono text-[10px]', selected ? 'text-app/60' : 'text-fg-subtle')}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={cx('block truncate text-sm font-bold', selected ? 'text-app' : 'text-fg')}>{option.label}</span>
                </span>
                <span aria-hidden="true" className={cx('grid size-6 shrink-0 place-items-center rounded-full', selected ? 'bg-app text-fg' : 'border border-dashed border-line-strong')}>
                  {selected && <Icon name="check" size={12} />}
                </span>
              </button>
            );
          })}
        </div>

        <span aria-hidden="true" className="border-t border-dotted border-line-strong" />

        {!selectedMethod && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <span aria-hidden="true" className="flex items-end gap-1.5">
              {[0, 1, 2, 3, 4].map((dot) => (
                <span key={dot} style={{ animationDelay: `${dot * 140}ms` }} className="size-2 animate-bounce rounded-full bg-fg/40 motion-reduce:animate-none" />
              ))}
            </span>
            <p className="text-sm text-fg-muted">Pick a method above to enter its details.</p>
          </div>
        )}

        {selectedMethod && isOtpStep && <OtpStep onVerify={verifyAndAdd} onBack={() => setIsOtpStep(false)} />}

        {selectedMethod && !isOtpStep && (
          <div key={selectedMethod} className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-fg" />
              <div>
                <h4 className="text-base font-bold text-fg">{selectedMethod === 'crypto' ? withdrawalFormCopy.cryptoHeading : withdrawalFormCopy.localHeading}</h4>
                <p className="mt-0.5 text-xs text-fg-muted">{selectedMethod === 'crypto' ? withdrawalFormCopy.cryptoSubtitle : withdrawalFormCopy.localSubtitle}</p>
              </div>
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

            <div className="flex flex-wrap justify-end gap-2 border-t border-dotted border-line-strong pt-4">
              <GhostPill
                onClick={() => {
                  resetForm();
                  setSelectedMethod(null);
                }}
              >
                {withdrawalFormCopy.cancel}
              </GhostPill>
              <InkPill icon="chevronRight" onClick={sendOtp}>
                {withdrawalFormCopy.sendOtp}
              </InkPill>
            </div>
          </div>
        )}
      </section>

      <section style={staggerStyle(2, 120)} className="orbit-card nova-edge-light flex animate-rise flex-col gap-4 p-5 xl:sticky xl:top-24 motion-reduce:animate-none">
        <h3 className="flex items-center gap-2.5 text-base font-bold text-fg">
          <span aria-hidden="true" className="nova-gloss grid size-8 place-items-center rounded-full text-fg">
            <Icon name="wallet" size={14} />
          </span>
          <span className="flex-1">{withdrawalCopy.listHeading}</span>
          <span className="grid size-7 place-items-center rounded-full bg-fg font-mono text-[11px] font-black text-app tabular-nums">{savedMethods.length}</span>
        </h3>
        <span aria-hidden="true" className="border-t border-dotted border-line-strong" />
        {savedMethods.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span aria-hidden="true" className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 18 }, (_, dot) => (
                <span key={dot} style={{ animationDelay: `${dot * 40}ms` }} className={cx('size-2 animate-dot-pop rounded-full motion-reduce:animate-none', dot % 7 === 3 ? 'bg-fg/50' : 'bg-fg/12')} />
              ))}
            </span>
            <p className="text-sm font-medium text-fg-muted">{withdrawalCopy.empty}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {savedMethods.map((method) => {
              const option = withdrawalMethodOptions.find((item) => item.id === method.kind);
              return (
                <li key={method.id} className="group flex animate-feed-in items-center gap-3 rounded-[22px] p-2.5 ring-1 ring-line transition-[box-shadow] hover:ring-line-strong motion-reduce:animate-none">
                  <span className="nova-gloss grid size-10 shrink-0 place-items-center rounded-full text-fg">
                    <Icon name={option?.icon ?? 'wallet'} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-fg">{method.title}</p>
                    <p className={cx('truncate text-xs text-fg-muted', method.kind === 'crypto' && 'font-mono')}>{method.detail}</p>
                    <div className="mt-1.5">
                      <StatusStamp tone="warning">Pending</StatusStamp>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${method.title}`}
                    onClick={() => removeMethod(method.id)}
                    className="grid size-8 shrink-0 place-items-center self-start rounded-full text-fg-subtle ring-1 ring-line transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Icon name="close" size={13} />
                  </button>
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
    <div className="flex flex-col gap-6">
      <section aria-label={emailCopy.marketingHeading} style={staggerStyle(1, 100)} className="orbit-card nova-edge-light relative flex min-w-0 animate-rise flex-col gap-5 overflow-hidden p-5 motion-reduce:animate-none">
        <header className="flex flex-wrap items-center gap-4">
          <span className="relative grid size-14 shrink-0 place-items-center">
            <span aria-hidden="true" className="absolute inset-0 animate-rim-spin rounded-full border border-dashed border-fg/30 motion-reduce:animate-none" />
            <span className="nova-gloss grid size-10 place-items-center rounded-full text-fg">
              <Icon name="bell" size={17} />
            </span>
            <span className="absolute -top-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-fg font-mono text-[10px] font-black text-app tabular-nums ring-2 ring-surface">{enabledCount}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-fg">{emailCopy.heading}</h2>
            <p className="mt-0.5 text-xs text-fg-muted">{emailCopy.subtitle}</p>
          </div>
          <InkPill icon={saved ? 'checkCircle' : 'arrowRight'} onClick={() => setSaved(true)}>
            {emailCopy.save}
          </InkPill>
        </header>

        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-[10.5px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{emailCopy.marketingHeading}</h3>
          <span aria-hidden="true" className="flex-1 border-t border-dotted border-line-strong" />
          <span className="flex items-center gap-2 font-mono text-[11px] font-bold text-fg tabular-nums">
            <span aria-hidden="true" className="flex gap-1">
              {emailPreferences.map((preference) => (
                <span key={preference.id} className={cx('size-2 rounded-full transition-colors duration-300', enabled[preference.id] ? 'bg-fg' : 'bg-fg/15')} />
              ))}
            </span>
            {enabledCount}/{emailPreferences.length}
          </span>
        </div>

        <ul className="grid gap-3 md:grid-cols-2">
          {emailPreferences.map((preference, index) => {
            const isOn = enabled[preference.id];
            return (
              <li
                key={preference.id}
                style={staggerStyle(index + 2, 90)}
                className={cx(
                  'flex animate-feed-in flex-col gap-3 rounded-[24px] p-4 transition-[background-color,box-shadow] duration-300 motion-reduce:animate-none',
                  isOn ? 'bg-fg/[0.05] ring-1 ring-line-strong' : 'ring-1 ring-line hover:ring-line-strong',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cx('grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-300', isOn ? 'bg-fg text-app' : 'text-fg-subtle ring-1 ring-line')}>
                    <Icon name={preference.icon} size={17} />
                  </span>
                  <p className={cx('min-w-0 flex-1 text-sm', isOn ? 'font-bold text-fg' : 'font-medium text-fg-muted')}>{preference.title}</p>
                  <Toggle
                    checked={isOn}
                    label={preference.title}
                    onChange={(next) => {
                      setSaved(false);
                      setEnabled((current) => ({ ...current, [preference.id]: next }));
                    }}
                  />
                </div>
                <div className="flex items-end gap-3 border-t border-dotted border-line-strong pt-3">
                  <p className="min-w-0 flex-1 text-xs text-fg-muted">{preference.description}</p>
                  <span className={cx('shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase', isOn ? 'bg-fg/10 text-fg' : 'text-fg-subtle ring-1 ring-line')}>
                    {isOn ? 'On' : 'Off'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section style={staggerStyle(4, 100)} className="relative flex animate-rise flex-col gap-4 overflow-hidden rounded-[28px] bg-[#0a1220] p-5 text-white shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 motion-reduce:animate-none lg:flex-row lg:items-center lg:gap-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-[size:12px_12px] [mask-image:linear-gradient(90deg,#000,transparent_70%)]" />
        <div className="relative flex items-start gap-3 lg:max-w-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#0a1220]">
            <Icon name="lock" size={17} />
          </span>
          <div>
            <h3 className="text-base font-bold">{emailCopy.alwaysOnHeading}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{emailCopy.alwaysOnBody}</p>
          </div>
        </div>
        <ul className="relative flex flex-1 flex-wrap gap-2 lg:justify-end">
          {alwaysOnEmails.map((item) => (
            <li key={item.label} className="flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pr-3 pl-1 text-xs text-white/80 ring-1 ring-white/10">
              <span className="grid size-7 place-items-center rounded-full bg-white/10">
                <Icon name={item.icon} size={13} />
              </span>
              {item.label}
              <Icon name="check" size={12} className="text-success" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}