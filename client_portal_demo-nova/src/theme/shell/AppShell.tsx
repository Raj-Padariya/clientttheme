'use client';

import { Suspense, type ReactNode } from 'react';

import { AppShell as SidebarShell } from './SidebarShell';

// Orbit builds with Cache Components: the sidebar shell reads usePathname, so it must stream inside
// Suspense or prerendering of dynamic routes fails (CLIENT_HOOK_DYNAMIC).
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <SidebarShell>{children}</SidebarShell>
    </Suspense>
  );
}
