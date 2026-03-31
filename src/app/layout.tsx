import type { Metadata } from 'next';

import { QueryProvider } from '@/shared/lib/query/QueryProvider';

import './globals.css';

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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
