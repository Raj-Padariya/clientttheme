import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { brandConfig } from '@/core/broker/config';
import { fontClassName, themeInitScript, themeViewport } from '@/theme/meta';
import './globals.css';

export const metadata: Metadata = {
  title: { default: brandConfig.brandName, template: `%s · ${brandConfig.brandName}` },
  icons: { icon: brandConfig.favicon, apple: brandConfig.appIcon },
};

export const viewport: Viewport = themeViewport;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme={brandConfig.defaultMode}
      className={`${fontClassName} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-app font-sans text-fg">{children}</body>
    </html>
  );
}
