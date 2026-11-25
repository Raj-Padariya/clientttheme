import type { ReactNode } from 'react';
import { AppShell } from '@/theme/shell/AppShell';

export default function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
