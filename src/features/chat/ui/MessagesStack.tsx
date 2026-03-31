'use client';

import { useLayoutEffect, useRef } from 'react';
import { ChatMessage } from '@/entities/chat';
import { cn } from '@/shared/lib/cn';

import { AssistantReplyLoader } from './AssistantReplyLoader';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-0 text-xl font-semibold text-text">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-lg font-semibold text-text first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-base font-semibold text-text first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-primary/40 pl-3 italic text-muted last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-slate-100 last:mb-0">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = (props as { inline?: boolean }).inline === false;
    if (isBlock) {
      return (
        <code className={cn('font-mono text-sm', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.875em] text-slate-800"
        {...props}
      >
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline decoration-primary/30 underline-offset-2 hover:text-primary-hover"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

export function MessagesStack({
  messages,
  isAssistantLoading = false,
  messagesScrollEpoch = 0,
}: {
  messages: ChatMessage[];
  isAssistantLoading?: boolean;
  /** Increments when chat history is loaded or cleared — scroll list to bottom (not on stream chunks). */
  messagesScrollEpoch?: number;
}) {
  const last = messages[messages.length - 1];

  const showThinkingLoader =
    isAssistantLoading &&
    (messages.length === 0 ||
      last?.role === 'user' ||
      (last?.role === 'assistant' && last.content.trim() === ''));

  /** During an active reply, render the last assistant only in the reply card (not as a duplicate bubble). */
  const listMessages =
    isAssistantLoading && last?.role === 'assistant' ? messages.slice(0, -1) : messages;

  const assistantStreamText =
    last?.role === 'assistant' && last.content.trim() !== '' ? last.content : '';

  const replyAnchorRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(false);

  useLayoutEffect(() => {
    if (isAssistantLoading) {
      return;
    }
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'auto' });
    // Only messagesScrollEpoch in deps: scroll after history load / chat clear, not when stream ends.
  }, [messagesScrollEpoch]); // eslint-disable-line react-hooks/exhaustive-deps -- isAssistantLoading checked inside

  useLayoutEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isAssistantLoading;
    const becameLoading = isAssistantLoading && !wasLoading;

    if (!becameLoading) {
      return;
    }

    const el = replyAnchorRef.current;
    if (!el) {
      return;
    }

    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }, [isAssistantLoading, messages.length]);

  return (
    <div className="flex flex-col gap-7 py-7 px-5">
      {listMessages.map((message, index) => (
        <div
          key={`${message.role}-${index}-${message.content.slice(0, 32)}`}
          className={cn(
            'px-4 py-2 rounded-md shadow-sm',
            message.role === 'user'
              ? 'self-end max-w-[50%] bg-gray-100 text-text'
              : 'self-start max-w-[85%] bg-white/95',
          )}
        >
          {message.role === 'assistant' ? (
            <div className="max-w-none text-sm text-text">
              <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm">{message.content}</div>
          )}
        </div>
      ))}

      {isAssistantLoading ? (
        <div
          ref={replyAnchorRef}
          className="flex scroll-mt-5 flex-col overflow-hidden rounded-lg border border-border/80 bg-white/95 shadow-sm"
        >
          {showThinkingLoader ? (
            <div className="shrink-0 border-b border-border/60">
              <AssistantReplyLoader className="border-0 shadow-none" />
            </div>
          ) : null}

          <div className="flex min-h-[min(50vh,28rem)] flex-col px-4 pb-4 pt-4">
            {assistantStreamText ? (
              <div className="max-w-none text-sm text-text">
                <ReactMarkdown components={markdownComponents}>{assistantStreamText}</ReactMarkdown>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div ref={endRef} className="h-px w-full shrink-0 scroll-mb-2" aria-hidden />
    </div>
  );
}
