import type { Metadata } from 'next';

import './globals.css';
import './(home)/marketing.css';

import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Relay',
  description: 'AI chat',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
