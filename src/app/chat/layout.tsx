import type { ReactNode } from 'react';

import { ChatClientProvider } from '@/features/chat';

export default function ChatLayout({ children }: { children: ReactNode }) {
  // Scope React Query to the chat route so public pages stay server-first and JS-light.
  return <ChatClientProvider>{children}</ChatClientProvider>;
}
