'use client';

import { cn } from '@/shared/lib/cn';

export function AssistantReplyLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 self-start rounded-md border border-border/60 bg-white/95 px-4 py-3 text-sm text-muted shadow-sm',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Assistant is replying"
    >
      <span
        className="inline-block size-4 shrink-0 rounded-full border-2 border-primary/25 border-t-primary animate-spin"
        aria-hidden
      />
      <span className="font-medium text-text/80">Thinking</span>
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-primary/50 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
