import type { Metadata } from 'next';

import './globals.css';
import './(home)/marketing.css';

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
      {/* Keep the root layout server-only so public pages can stay as lean as possible. */}
      <body>{children}</body>
    </html>
  );
}
