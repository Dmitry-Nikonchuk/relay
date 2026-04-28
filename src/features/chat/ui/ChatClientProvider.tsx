'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

type Props = {
  children: ReactNode;
};

export function ChatClientProvider({ children }: Props) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Keep the query client local to chat flows so static pages do not hydrate a cache they never use.
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
