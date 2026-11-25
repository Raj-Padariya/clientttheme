'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

import { translate, type MessageKey } from '@/core/i18n';
import { useSession } from '@/core/session/useSession';
import { cx } from '../lib/cx';
import { pageTitles } from '../meta';
import { Avatar } from '../ui/Avatar';
import { BrandLogo } from '../ui/BrandLogo';
import { IconButton, iconButtonClass } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Toaster } from '../ui/Toast';
import { AppPromoPopup } from './AppPromoPopup';
import { NotificationBell } from './NotificationBell';
import { ThemeCustomizerDrawer } from './ThemeCustomizerDrawer';
import { PageSearch } from './PageSearch';
import {
  CLIENT_HOME,
  IB_HOME,
  ibNavItems,
  isIbPath,
  isNavGroupActive,
  isNavItemActive,
  navItems,
  type NavItem,
} from './navItems';

/*
 * Zenith shell: a flush graphite rail. The menu is split into small-caps sections divided by hairlines, every icon
 * sits in a dark rounded tile, and the active page is a lit graphite pill with a light sweeping across it.
 */
const navRowClass =
  'group relative isolate flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl px-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-sidebar-active motion-reduce:transition-none';

const navRowIdleClass = 'text-sidebar-muted hover:bg-white/[0.04] hover:text-sidebar-fg';
const navRowActiveClass =
  'bg-linear-to-r from-white/[0.1] to-white/[0.025] font-semibold text-sidebar-fg ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_12px_24px_-16px_rgb(0_0_0/0.9)]';

function NavTile({ icon, active }: { icon: IconName; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-8 shrink-0 place-items-center rounded-[10px] ring-1 transition-[background-color,color,transform] duration-300 group-hover:scale-105 motion-reduce:transition-none',
        active
          ? 'bg-linear-to-b from-white/[0.22] to-white/[0.06] text-sidebar-fg ring-white/15'
          : 'bg-linear-to-b from-white/[0.07] to-white/[0.015] text-sidebar-muted ring-white/[0.06] group-hover:text-sidebar-fg',
      )}
    >
      <Icon name={icon} size={15} />
    </span>
  );
}

// Light passing over the active pill, so the current page is never static.
function ActiveSheen() {
  return <span aria-hidden="true" className="zenith-shine pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-white/[0.09] to-transparent" />;
}

function CountBadge({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="grid h-6 min-w-6 place-items-center rounded-md px-1.5 font-mono text-[11px] text-sidebar-fg tabular-nums ring-1 ring-sidebar-line">
      {value}
    </span>
  );
}

function NavGroup({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const groupActive = isNavGroupActive(pathname, item);
  const [open, setOpen] = useState(groupActive);
  const expanded = open || groupActive;
  const panelId = `nav-${item.labelKey}`;
  const childCount = item.children?.length ?? 0;

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setOpen(!expanded)}
        className={cx(navRowClass, groupActive ? 'font-semibold text-sidebar-fg' : navRowIdleClass)}
      >
        <NavTile icon={item.icon} active={groupActive} />
        <span className="flex-1 truncate text-left">{translate(item.labelKey)}</span>
        {!expanded && <CountBadge value={childCount} />}
        <span
          aria-hidden="true"
          className={cx(
            'grid size-6 place-items-center rounded-md text-sidebar-muted ring-1 ring-sidebar-line transition-transform duration-300 motion-reduce:transition-none',
            expanded && 'rotate-90 text-sidebar-fg',
          )}
        >
          <Icon name="chevronRight" size={12} />
        </span>
      </button>
      <div
        id={panelId}
        className={cx('grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden" inert={!expanded}>
          <ul className="relative ml-6 flex flex-col gap-0.5 border-l border-sidebar-line py-1.5 pl-3">
            {item.children?.map((child, index) => {
              const active = isNavItemActive(pathname, child.href);
              return (
                <li key={child.href} style={expanded ? { animationDelay: `${index * 45}ms` } : undefined} className={cx('relative', expanded && 'animate-dot-pop motion-reduce:animate-none')}>
                  {active && <span aria-hidden="true" className="absolute top-1/2 -left-[15px] size-[7px] -translate-y-1/2 rounded-full bg-sidebar-fg shadow-[0_0_8px_1px_rgb(255_255_255/0.5)]" />}
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'relative isolate flex h-9 items-center overflow-hidden rounded-lg px-3 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-active',
                      active ? 'bg-white/[0.07] font-semibold text-sidebar-fg' : 'text-sidebar-muted hover:bg-white/[0.04] hover:text-sidebar-fg',
                    )}
                  >
                    {active && <ActiveSheen />}
                    <span className="truncate">{translate(child.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

interface SidebarNavProps {
  pathname: string;
  items: NavItem[];
  onNavigate?: () => void;
}

function SidebarNav({ pathname, items, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={translate('nav.mainMenu')} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const sectionLabel = item.section && (
            <li key={`section-${item.section}`} aria-hidden="true" className={cx('px-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.16em] text-sidebar-muted/70 uppercase', index > 0 && 'mt-3 border-t border-sidebar-line pt-4')}>
              {item.section}
            </li>
          );
          if (item.children) {
            return [sectionLabel, <NavGroup key={item.labelKey} item={item} pathname={pathname} onNavigate={onNavigate} />];
          }
          const href = item.href ?? '/';
          const active = isNavItemActive(pathname, href);
          return [
            sectionLabel,
            <li key={href}>
              <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={cx(navRowClass, active ? navRowActiveClass : navRowIdleClass)}>
                {active && <ActiveSheen />}
                <NavTile icon={item.icon} active={active} />
                <span className="flex-1 truncate">{translate(item.labelKey)}</span>
                {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-(--hero-buy) shadow-[0_0_10px_2px_var(--hero-buy)]" />}
              </Link>
            </li>,
          ];
        })}
      </ul>
    </nav>
  );
}

// Profile footer styled like a premium card: glossy graphite, dot texture, a light passing over it.
function SidebarProfile() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="relative isolate m-3 mt-1 overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.1] via-white/[0.04] to-transparent p-3 ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]">
      <span aria-hidden="true" className="absolute inset-0 -z-10 [background-image:radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1.2px)] [background-size:4px_4px] [mask-image:linear-gradient(120deg,#000,transparent_70%)]" />
      <ActiveSheen />
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <Avatar name={fullName} size="md" />
          <span aria-hidden="true" className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-sidebar" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-sidebar-fg">{fullName}</p>
          <p className="truncate text-[11px] text-sidebar-muted">{user.email}</p>
        </div>
        <Link
          href="/login"
          aria-label={translate('common.logout')}
          title={translate('common.logout')}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-sidebar-muted ring-1 ring-sidebar-line transition-colors hover:bg-danger hover:text-white hover:ring-danger focus-visible:outline-2 focus-visible:outline-sidebar-active"
        >
          <Icon name="logout" size={15} />
        </Link>
      </div>
    </div>
  );
}

// A soft light falling on the top-left of the rail over a fine dot texture, breathing slowly.
function SidebarDotField() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 overflow-hidden">
      <span className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.1)_1px,transparent_1.2px)] [background-size:5px_5px] [mask-image:radial-gradient(80%_70%_at_0_0,#000,transparent)]" />
      <span className="zenith-spot absolute -top-24 -left-16 size-64 rounded-full bg-white/[0.1] blur-[70px]" />
    </span>
  );
}

const SWIPE_CLOSE_PX = 80;

type PortalSide = 'client' | 'ib';

interface PortalSwitchProps {
  side: PortalSide;
  onChange: (side: PortalSide) => void;
}

const portalSides: { id: PortalSide; label: string; icon: IconName }[] = [
  { id: 'client', label: 'Client', icon: 'user' },
  { id: 'ib', label: 'IB', icon: 'trendUp' },
];

// Header capsule switch: a white puck with a red live dot slides under the active portal; phones show icons only.
function PortalSwitch({ side, onChange }: PortalSwitchProps) {
  return (
    <span role="radiogroup" aria-label="Portal" className="relative grid shrink-0 grid-cols-2 rounded-full bg-fg/5 p-0.5 ring-1 ring-line">
      <span
        aria-hidden="true"
        className={cx(
          'absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-fg shadow-[0_6px_14px_-8px_rgb(0_0_0/0.8)] transition-transform duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none',
          side === 'ib' && 'translate-x-full',
        )}
      />
      {portalSides.map((portal) => {
        const isActive = portal.id === side;
        return (
          <button
            key={portal.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${portal.label} portal`}
            title={isActive ? `${portal.label} portal` : `Switch to ${portal.label}`}
            onClick={() => {
              if (!isActive) onChange(portal.id);
            }}
            className={cx(
              'relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold tracking-wide uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg sm:px-3.5',
              isActive ? 'cursor-default text-app' : 'text-fg-muted hover:text-fg',
            )}
          >
            {isActive ? (
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-[var(--zenith-red)] motion-reduce:hidden" />
                <span className="relative size-1.5 rounded-full bg-[var(--zenith-red)]" />
              </span>
            ) : (
              <Icon name={portal.icon} size={12} className="max-sm:hidden" />
            )}
            <span>{portal.label}</span>
          </button>
        );
      })}
    </span>
  );
}

function SidebarBody({ pathname, items, onNavigate }: SidebarNavProps) {
  return (
    <>
      <SidebarNav pathname={pathname} items={items} onNavigate={onNavigate} />
      <div className="shrink-0">
        <SidebarProfile />
      </div>
    </>
  );
}

// Compact account capsule for the top bar below lg, where the sidebar (and its profile card) is hidden.
function UserChip() {
  const { user } = useSession();
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {/* Phones keep only the logout button here; the avatar returns from sm up. */}
      <span className="shrink-0 max-sm:hidden">
        <Avatar name={fullName} size="md" />
      </span>
      <div className="hidden min-w-0 flex-col leading-tight md:flex">
        <span className="max-w-40 truncate text-sm font-semibold text-fg">{fullName}</span>
        <span className="max-w-36 truncate text-[11px] text-fg-subtle">{user.email}</span>
      </div>
      <Link
        href="/login"
        aria-label={translate('common.logout')}
        title={translate('common.logout')}
        className={cx(iconButtonClass, 'rounded-xl hover:bg-danger/10 hover:text-danger')}
      >
        <Icon name="logout" size={18} />
      </Link>
    </div>
  );
}

// The sidebar entry for a page: its icon, plus the group label when the page sits in a submenu.
function findPageNav(pathname: string): { icon: IconName; groupKey?: MessageKey } | undefined {
  for (const item of [...navItems, ...ibNavItems]) {
    if (item.href && isNavItemActive(pathname, item.href)) return { icon: item.icon };
    const child = item.children?.find((link) => isNavItemActive(pathname, link.href));
    if (child) return { icon: child.icon, groupKey: item.labelKey };
  }
  return undefined;
}

/*
 * Zenith header: one flush graphite bar. A soft light breathes behind its middle, the page sits as a
 * "Portal / Group / Page" breadcrumb on the left, the command search pill is centred and the controls form a quiet
 * icon cluster on the right. The bar firms up (more opaque) once the page scrolls under it.
 */
function TopBar({
  pathname,
  portal,
  leading,
  center,
  actions,
}: {
  pathname: string;
  portal: PortalSwitchProps;
  leading: ReactNode;
  center: ReactNode;
  actions: ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const title = pageTitles[pathname] ?? '';
  const pageNav = findPageNav(pathname);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      data-scrolled={isScrolled}
      className="group/bar sticky top-0 z-20 h-(--topbar-height) border-b border-line bg-app/70 backdrop-blur-xl transition-colors duration-300 data-[scrolled=true]:bg-app/90 motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="zenith-spot absolute -top-28 left-[42%] h-60 w-[46%] rounded-full bg-fg/[0.1] blur-[80px]" />
        <span className="absolute inset-0 [background-image:radial-gradient(color-mix(in_srgb,var(--color-fg)_9%,transparent)_1px,transparent_1.2px)] [background-size:5px_5px] [mask-image:radial-gradient(40%_120%_at_60%_0,#000,transparent)]" />
      </span>

      <div className="relative flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading}
          {/* The portal switch heads the breadcrumb, so it reads as "Client | IB / Group / Page". */}
          <PortalSwitch {...portal} />
          {/* Keyed on the page so each navigation replays the entrance. */}
          <nav key={pathname} aria-label="Breadcrumb" className="flex min-w-0 animate-feed-in items-center gap-1.5 text-[15px] motion-reduce:animate-none">
            <span aria-hidden="true" className="shrink-0 text-fg-subtle max-sm:hidden">
              /
            </span>
            {pageNav?.groupKey && (
              <>
                <span className="truncate text-fg-subtle max-md:hidden">{translate(pageNav.groupKey)}</span>
                <span aria-hidden="true" className="shrink-0 text-fg-subtle max-md:hidden">
                  /
                </span>
              </>
            )}
            <h1 className="truncate font-semibold tracking-[-0.01em] text-fg">{title}</h1>
          </nav>
        </div>

        <div className="flex shrink-0 justify-center md:w-[min(440px,36vw)]">{center}</div>

        <div className="flex shrink-0 items-center justify-end gap-1 md:flex-1">{actions}</div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  // The portal is decided by the URL: everything under /ib is the IB portal, the rest is the client portal.
  const isIb = isIbPath(pathname);
  const menuItems = isIb ? ibNavItems : navItems;
  const portal: PortalSwitchProps = {
    side: isIb ? 'ib' : 'client',
    onChange: (side) => router.push(side === 'ib' ? IB_HOME : CLIENT_HOME),
  };

  const closeDrawer = () => setDrawerOpen(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  // Stable so the drawer's Escape / focus effect doesn't re-run (and steal focus) on every shell render.
  const closeCustomizer = useCallback(() => setCustomizerOpen(false), []);

  const drawerCloseRef = useRef<HTMLSpanElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);

  // The panel is always mounted now, so autoFocus no longer fires; move focus to its close button on each open.
  useEffect(() => {
    if (drawerOpen) drawerCloseRef.current?.querySelector('button')?.focus();
  }, [drawerOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') closeDrawer();
  }

  function handleSwipeStart(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse') return;
    swipeStartX.current = event.clientX;
  }

  function handleSwipeMove(event: PointerEvent<HTMLElement>) {
    if (swipeStartX.current === null) return;
    // Only leftward drags move the panel; it never pulls past its open position.
    setSwipeX(Math.min(0, event.clientX - swipeStartX.current));
  }

  function resetSwipe() {
    swipeStartX.current = null;
    setSwipeX(0);
  }

  function handleSwipeEnd() {
    if (swipeX < -SWIPE_CLOSE_PX) closeDrawer();
    resetSwipe();
  }

  return (
    <div className="min-h-dvh bg-app text-fg">
      {/* Flush rail: runs edge to edge with a hairline on its right; a soft light falls on its top-left corner. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) lg:flex">
        <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden border-r border-sidebar-line bg-sidebar">
          <SidebarDotField />
          <div className="flex h-(--topbar-height) shrink-0 items-center border-b border-sidebar-line px-6">
            <BrandLogo height={28} />
          </div>
          <div className="h-4 shrink-0" />
          <SidebarBody pathname={pathname} items={menuItems} />
        </div>
      </aside>

      {/*
        Mobile menu stays mounted so it can slide in from the left and back out; `inert` keeps it out of the tab
        order and away from screen readers while it is parked off-screen. A left swipe on the panel also closes it.
      */}
      <div
        className={cx('fixed inset-0 z-40 lg:hidden', !drawerOpen && 'pointer-events-none')}
        role="dialog"
        aria-modal="true"
        aria-label={translate('common.openMenu')}
        inert={!drawerOpen}
        onKeyDown={handleDrawerKeyDown}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={translate('common.closeMenu')}
          className={cx(
            'absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={closeDrawer}
        />
        <aside
          onPointerDown={handleSwipeStart}
          onPointerMove={handleSwipeMove}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={resetSwipe}
          style={swipeX ? { transform: `translateX(${swipeX}px)`, transition: 'none' } : undefined}
          className={cx(
            'absolute inset-y-0 left-0 isolate flex w-[min(85vw,var(--sidebar-width))] touch-pan-y flex-col overflow-hidden border-r border-sidebar-line bg-sidebar shadow-pop transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarDotField />
          <div className="flex shrink-0 items-center justify-between gap-3 pt-4 pr-3 pb-4 pl-5">
            <BrandLogo height={30} />
            <span ref={drawerCloseRef} className="flex">
              <IconButton
                icon="close"
                label={translate('common.closeMenu')}
                onClick={closeDrawer}
                className="text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg"
              />
            </span>
          </div>
          <SidebarBody pathname={pathname} items={menuItems} onNavigate={closeDrawer} />
        </aside>
      </div>

      <div className="lg:pl-(--sidebar-width)">
        <TopBar
          center={<PageSearch />}
          pathname={pathname}
          portal={portal}
          leading={
            <IconButton
              icon="menu"
              label={translate('common.openMenu')}
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden"
            />
          }
          actions={
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">

              <span aria-hidden="true" className="mx-0.5 hidden size-1 rounded-full bg-fg/25 sm:block" />
              {/* Phones drop the mode toggle from the bar; Light / Dark lives in the customizer drawer. */}
              <ThemeToggle variant="switch" className="hidden sm:inline-flex" />
              <IconButton icon="palette" label={translate('customizer.open')} onClick={() => setCustomizerOpen(true)} className="rounded-full" />
              <NotificationBell />
              {/* From lg up the profile lives at the foot of the sidebar. */}
              <span className="flex border-l border-dotted border-line-strong pl-2 lg:hidden">
                <UserChip />
              </span>
            </div>
          }
        />

        <main className="mx-auto w-full max-w-(--content-max) px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Customizer launcher: a squircle with a sweeping aurora rim, bottom-right on wide screens. */}
      <button
        type="button"
        onClick={() => setCustomizerOpen(true)}
        aria-label={translate('customizer.open')}
        title={translate('customizer.tab')}
        className="group fixed right-5 bottom-5 z-30 hidden size-12 overflow-hidden rounded-2xl p-px shadow-pop transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:block"
      >
        <span aria-hidden="true" className="absolute -inset-4 animate-orbit-spin bg-[conic-gradient(from_0deg,var(--brand-primary),transparent_35%,var(--orbit-violet)_60%,transparent_85%,var(--brand-primary))] [animation-duration:4s] motion-reduce:animate-none" />
        <span className="relative grid size-full place-items-center rounded-[15px] bg-surface text-primary">
          <Icon name="palette" size={18} className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none" />
        </span>
      </button>
      <ThemeCustomizerDrawer open={customizerOpen} onClose={closeCustomizer} />

      <AppPromoPopup />
      <Toaster />
    </div>
  );
}
