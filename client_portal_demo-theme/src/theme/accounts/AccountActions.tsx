'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { TradingAccount } from '@/core/types';
import { cx } from '../lib/cx';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Field, Input, PasswordInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { useFloatingPosition } from '../ui/useFloatingPosition';

export type AccountAction = 'leverage' | 'nickname' | 'masterPassword' | 'investorPassword';

const SAVE_DELAY_MS = 700;
const NICKNAME_MAX = 50;
const PASSWORD_MAX = 16;
const LEVERAGE_OPTIONS = [1, 50, 100, 150, 200, 300, 400, 500];
const MAX_LEVERAGE = LEVERAGE_OPTIONS[LEVERAGE_OPTIONS.length - 1];
const MIN_BAR_PERCENT = 14;

const actionText = {
  menuLabel: 'Account options',
  accountNumber: 'Account Number',
  currentLeverage: 'Current Leverage',
  currentNickname: 'Current Nickname',
  notSet: 'Not set',
  type: 'Type',
  cancel: 'Cancel',
  leverageTitle: 'Change Leverage',
  selectLeverage: 'Select New Leverage',
  updateLeverage: 'Update Leverage',
  leverageUpdated: 'Leverage updated',
  nicknameTitle: 'Set Account Nickname',
  nicknameLabel: 'Account Nickname',
  nicknamePlaceholder: 'Enter nickname for this account',
  nicknameHint: 'Maximum 50 characters',
  setNickname: 'Set Nick Name',
  nicknameSaved: 'Nickname saved',
  confirmPassword: 'Confirm Password',
  passwordHint: '8-16 characters with uppercase, lowercase, numbers, and special characters',
  mismatch: 'Passwords do not match',
  match: 'Passwords match',
  investorWarning: 'The current investor (read-only) password will stop working immediately.',
};

const menuItems: { id: AccountAction; icon: IconName; label: string }[] = [
  { id: 'leverage', icon: 'trendUp', label: 'Change Max Leverage' },
  { id: 'nickname', icon: 'user', label: 'Set Nick Name' },
  { id: 'masterPassword', icon: 'lock', label: 'Change Master Password' },
  { id: 'investorPassword', icon: 'refresh', label: 'Reset Investor Password' },
];

const passwordCopy = {
  master: {
    title: 'Change Master Password',
    newLabel: 'New Master Password',
    newPlaceholder: 'Enter new master password (8-16 chars)',
    confirmPlaceholder: 'Confirm new master password',
    submit: 'Change Password',
    done: 'Master password changed',
  },
  investor: {
    title: 'Reset Investor Password',
    newLabel: 'New Investor Password',
    newPlaceholder: 'Enter new investor password (8-16 chars)',
    confirmPlaceholder: 'Confirm new investor password',
    submit: 'Reset Password',
    done: 'Investor password reset',
  },
};

const passwordRules: { label: string; test: (value: string) => boolean }[] = [
  { label: '8-16 chars', test: (value) => value.length >= 8 && value.length <= PASSWORD_MAX },
  { label: 'Uppercase', test: (value) => /[A-Z]/.test(value) },
  { label: 'Lowercase', test: (value) => /[a-z]/.test(value) },
  { label: 'Number', test: (value) => /\d/.test(value) },
  { label: 'Special', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

/** Fakes the server round trip: shows the spinner, then runs `done`. The timer is dropped if the modal unmounts. */
function useDelayedSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function save(done: () => void) {
    setSaving(true);
    timerRef.current = setTimeout(done, SAVE_DELAY_MS);
  }

  return { saving, save };
}

/** Sliders button that opens the account options menu in a portal, so the card's overflow does not clip it. */
export function AccountActionsMenu({ onSelect }: { onSelect: (action: AccountAction) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const floatingStyle = useFloatingPosition(buttonRef, panelRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[0]?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  function closeAndRefocus() {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRefocus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={actionText.menuLabel}
        title={actionText.menuLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cx(
          'group/opts grid aspect-square h-full min-h-9 place-items-center rounded-lg border transition-[border-color,background-color,color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isOpen
            ? 'border-primary bg-primary text-on-primary shadow-[0_0_18px_-4px_var(--brand-primary)]'
            : 'border-line text-fg-muted hover:border-primary/50 hover:bg-primary-soft hover:text-primary',
        )}
      >
        <Icon name="sliders" size={17} className={cx('transition-transform duration-300 motion-reduce:transition-none', isOpen ? 'rotate-90' : 'group-hover/opts:scale-110')} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={actionText.menuLabel}
            style={floatingStyle}
            onKeyDown={handleKeyDown}
            className="w-max max-w-[calc(100vw-16px)] min-w-64 animate-rise overflow-hidden rounded-2xl border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur-xl motion-reduce:animate-none"
          >
            <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 size-32 rounded-full bg-primary/15 blur-2xl" />
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                style={{ animationDelay: `${60 + index * 50}ms` }}
                onClick={() => {
                  setIsOpen(false);
                  onSelect(item.id);
                }}
                className="group/item relative flex w-full animate-rise items-center gap-3 overflow-hidden rounded-xl py-2 pr-3 pl-3.5 text-left text-sm font-medium text-fg-muted outline-none transition-colors hover:bg-primary-soft hover:text-fg focus-visible:bg-primary-soft focus-visible:text-fg motion-reduce:animate-none"
              >
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 scale-y-0 rounded-full bg-primary transition-transform duration-200 group-hover/item:scale-y-100 group-focus-visible/item:scale-y-100" />
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary ring-1 ring-line transition-transform duration-300 group-hover/item:scale-110 group-hover/item:-rotate-6">
                  <Icon name={item.icon} size={15} />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
                <Icon
                  name="chevronRight"
                  size={14}
                  className="ml-auto shrink-0 -translate-x-1 text-primary opacity-0 transition-[opacity,translate] duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100 group-focus-visible/item:opacity-100"
                />
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Account identity strip shared by every modal: the number up front, the facts the action changes beside it. */
function AccountStrip({ account, facts }: { account: TradingAccount; facts: { label: string; value: ReactNode }[] }) {
  return (
    <div className="glow-border relative animate-rise overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-surface-2 to-surface-2 p-4 motion-reduce:animate-none">
      <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />
      <dl className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl text-on-primary shadow-[0_8px_20px_-8px_var(--brand-primary)] [background-image:var(--brand-gradient)]">
            <Icon name="accounts" size={18} />
          </span>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{actionText.accountNumber}</dt>
            <dd className="truncate font-mono text-lg font-semibold text-fg">{account.login}</dd>
          </div>
        </div>
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
            <dt className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{fact.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-fg">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ModalFooter({ formId, saving, disabled, submitLabel, submitIcon, onCancel }: { formId: string; saving: boolean; disabled: boolean; submitLabel: string; submitIcon: IconName; onCancel: () => void }) {
  return (
    <>
      <Button variant="outline" onClick={onCancel} disabled={saving}>
        {actionText.cancel}
      </Button>
      <Button type="submit" form={formId} leftIcon={submitIcon} loading={saving} disabled={disabled} className="relative overflow-hidden">
        {!disabled && !saving && <span aria-hidden="true" className="wallet-sheen pointer-events-none absolute inset-0 animate-sheen motion-reduce:animate-none" />}
        <span className="relative">{submitLabel}</span>
      </Button>
    </>
  );
}

/** Leverage as a rising bar chart: every bar is one option, taller for more leverage, and the chosen one glows. */
export function LeverageModal({ account, current, onClose, onSaved }: { account: TradingAccount; current: number; onClose: () => void; onSaved: (leverage: number) => void }) {
  const formId = useId();
  const [selected, setSelected] = useState(current);
  const { saving, save } = useDelayedSave();
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === current) return;
    save(() => {
      onSaved(selected);
      toast(actionText.leverageUpdated, { description: `#${account.login} · 1:${current} → 1:${selected}` });
      onClose();
    });
  }

  function moveSelection(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = Math.min(Math.max(LEVERAGE_OPTIONS.indexOf(selected) + step, 0), LEVERAGE_OPTIONS.length - 1);
    setSelected(LEVERAGE_OPTIONS[index]);
    barRefs.current[index]?.focus();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={actionText.leverageTitle}
      footer={<ModalFooter formId={formId} saving={saving} disabled={selected === current} submitLabel={actionText.updateLeverage} submitIcon="trendUp" onCancel={onClose} />}
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
        <AccountStrip account={account} facts={[{ label: actionText.currentLeverage, value: `1:${current}` }]} />

        <div style={{ animationDelay: '100ms' }} className="animate-rise motion-reduce:animate-none">
          <div className="flex items-end justify-between gap-3">
            <p id={`${formId}-label`} className="text-sm font-medium text-fg">
              {actionText.selectLeverage}
            </p>
            <p className="flex items-center gap-2 font-mono text-sm tabular-nums">
              <span className="text-fg-subtle">1:{current}</span>
              <Icon name="arrowRight" size={13} className="text-primary" />
              <span key={selected} className="animate-rise text-lg font-bold text-primary motion-reduce:animate-none">
                1:{selected}
              </span>
            </p>
          </div>

          <div role="radiogroup" aria-labelledby={`${formId}-label`} onKeyDown={moveSelection} className="mt-3 grid h-40 grid-cols-8 items-end gap-1.5 rounded-2xl bg-surface-2/50 p-3 pb-2 ring-1 ring-line">
            {LEVERAGE_OPTIONS.map((option, index) => {
              const isSelected = option === selected;
              const isCurrent = option === current;
              const height = Math.max((option / MAX_LEVERAGE) * 100, MIN_BAR_PERCENT);
              return (
                <button
                  key={option}
                  ref={(node) => {
                    barRefs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`1:${option}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelected(option)}
                  className="group/bar flex h-full flex-col items-center justify-end gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    style={{ height: `${height}%`, animationDelay: `${150 + index * 50}ms` }}
                    className={cx(
                      'relative w-full origin-bottom animate-bar-rise rounded-md transition-[background-color,box-shadow,transform] duration-300 group-hover/bar:scale-x-110 motion-reduce:animate-none motion-reduce:transition-none',
                      isSelected ? 'shadow-[0_0_18px_-2px_var(--brand-primary)] [background-image:var(--brand-gradient)]' : 'bg-fg/10 group-hover/bar:bg-primary/30',
                    )}
                  >
                    {isCurrent && <span aria-hidden="true" className="absolute -top-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fg-muted" />}
                  </span>
                  <span className={cx('text-[11px] font-semibold tabular-nums transition-colors', isSelected ? 'text-primary' : 'text-fg-muted group-hover/bar:text-fg')}>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CharacterRing({ count, max }: { count: number; max: number }) {
  const fill = Math.round((count / max) * 100);
  return (
    <span className="relative mr-2 grid size-8 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={count >= max ? 'var(--danger)' : 'var(--brand-primary)'}
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${fill} 100`}
          className="transition-[stroke-dasharray] duration-300 motion-reduce:transition-none"
        />
      </svg>
      <span className="text-[9px] font-bold text-fg-muted tabular-nums">{max - count}</span>
    </span>
  );
}

/** Nickname with a live name-plate preview that updates as you type. */
export function NicknameModal({ account, current, onClose, onSaved }: { account: TradingAccount; current: string; onClose: () => void; onSaved: (nickname: string) => void }) {
  const formId = useId();
  const [value, setValue] = useState(current);
  const { saving, save } = useDelayedSave();
  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== current;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    save(() => {
      onSaved(trimmed);
      toast(actionText.nicknameSaved, { description: `#${account.login} · ${trimmed}` });
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={actionText.nicknameTitle}
      footer={<ModalFooter formId={formId} saving={saving} disabled={!canSubmit} submitLabel={actionText.setNickname} submitIcon="user" onCancel={onClose} />}
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
        <AccountStrip
          account={account}
          facts={[{ label: actionText.currentNickname, value: current || <span className="font-normal text-fg-subtle italic">{actionText.notSet}</span> }]}
        />

        <div style={{ animationDelay: '100ms' }} className="flex animate-rise items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/30 p-3 motion-reduce:animate-none">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary uppercase ring-1 ring-primary/30">
            {trimmed ? trimmed[0] : <Icon name="user" size={16} />}
          </span>
          <div className="min-w-0">
            <p key={trimmed ? 'named' : 'empty'} className={cx('animate-feed-in truncate text-base font-semibold motion-reduce:animate-none', trimmed ? 'text-fg' : 'text-fg-subtle italic')}>
              {trimmed || actionText.notSet}
            </p>
            <p className="font-mono text-xs text-fg-muted">
              #{account.login} · {account.group}
            </p>
          </div>
        </div>

        <Field label={actionText.nicknameLabel} htmlFor={`${formId}-nickname`} hint={actionText.nicknameHint} className="animate-rise [animation-delay:160ms] motion-reduce:animate-none">
          <Input
            id={`${formId}-nickname`}
            maxLength={NICKNAME_MAX}
            autoComplete="off"
            placeholder={actionText.nicknamePlaceholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rightSlot={<CharacterRing count={value.length} max={NICKNAME_MAX} />}
          />
        </Field>
      </form>
    </Modal>
  );
}

/** Shared by the master and investor password modals: rule chips light up as they are met, plus a match check. */
export function AccountPasswordModal({ account, kind, onClose }: { account: TradingAccount; kind: 'master' | 'investor'; onClose: () => void }) {
  const formId = useId();
  const copy = passwordCopy[kind];
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { saving, save } = useDelayedSave();
  const metCount = passwordRules.filter((rule) => rule.test(password)).length;
  const isStrong = metCount === passwordRules.length;
  const isMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = isStrong && confirm === password;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    save(() => {
      toast(copy.done, { description: `#${account.login}` });
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={copy.title}
      footer={<ModalFooter formId={formId} saving={saving} disabled={!canSubmit} submitLabel={copy.submit} submitIcon="lock" onCancel={onClose} />}
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
        <AccountStrip account={account} facts={[{ label: actionText.type, value: account.group }]} />

        {kind === 'investor' && (
          <p role="note" style={{ animationDelay: '80ms' }} className="flex animate-rise items-start gap-3 rounded-2xl bg-warning-soft p-3.5 text-sm text-warning ring-1 ring-warning/30 motion-reduce:animate-none">
            <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-warning/15">
              <span aria-hidden="true" className="absolute inset-0 animate-ping-soft rounded-full bg-warning/25 motion-reduce:hidden" />
              <Icon name="alert" size={14} className="relative" />
            </span>
            <span className="self-center">{actionText.investorWarning}</span>
          </p>
        )}

        <div style={{ animationDelay: '140ms' }} className="flex animate-rise flex-col gap-2.5 motion-reduce:animate-none">
          <Field label={copy.newLabel} htmlFor={`${formId}-new`} hint={actionText.passwordHint}>
            <PasswordInput
              id={`${formId}-new`}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              placeholder={copy.newPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <div aria-hidden="true" className="grid grid-cols-5 gap-1">
            {passwordRules.map((rule, index) => (
              <span key={rule.label} className={cx('h-1 rounded-full transition-colors duration-300', index < metCount ? (isStrong ? 'bg-success' : 'bg-primary') : 'bg-line')} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label={actionText.passwordHint}>
            {passwordRules.map((rule) => {
              const isMet = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={cx(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors duration-300',
                    isMet ? 'bg-success-soft text-success ring-success/30' : 'bg-surface-2 text-fg-subtle ring-line',
                  )}
                >
                  <Icon name={isMet ? 'check' : 'close'} size={11} className={cx('transition-transform duration-300', isMet && 'scale-110')} />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Field
          label={actionText.confirmPassword}
          htmlFor={`${formId}-confirm`}
          error={isMismatch ? actionText.mismatch : undefined}
          hint={
            confirm.length > 0 && !isMismatch ? (
              <span className="inline-flex animate-rise items-center gap-1.5 text-success motion-reduce:animate-none">
                <Icon name="checkCircle" size={12} />
                {actionText.match}
              </span>
            ) : undefined
          }
          className="animate-rise [animation-delay:200ms] motion-reduce:animate-none"
        >
          <PasswordInput
            id={`${formId}-confirm`}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            placeholder={copy.confirmPlaceholder}
            value={confirm}
            invalid={isMismatch}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
