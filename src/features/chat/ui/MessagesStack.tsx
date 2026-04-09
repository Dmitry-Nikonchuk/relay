'use client';

import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Virtuoso, type ListProps, type VirtuosoHandle } from 'react-virtuoso';
import { ChatMessage } from '@/entities/chat';
import { cn } from '@/shared/lib/cn';

import type { ChatSendFailureState } from '../lib/sendFailure';
import { AssistantReplyLoader } from './AssistantReplyLoader';
import { ChatSendError } from './ChatSendError';
import { markdownComponents, markdownRemarkPlugins } from './messageMarkdown';
import ReactMarkdown from 'react-markdown';

/** Horizontal padding on the item list (`data-testid="virtuoso-item-list"`), not on the scroller. */
const MessagesVirtuosoList = forwardRef<HTMLDivElement, ListProps>(function MessagesVirtuosoList(
  { style, children, 'data-testid': dataTestId },
  ref,
) {
  return (
    <div ref={ref} data-testid={dataTestId} style={style} className="box-border px-5">
      {children}
    </div>
  );
});

export function MessagesStack({
  messages,
  isAssistantLoading = false,
  messagesScrollEpoch = 0,
  firstItemIndex,
  onLoadOlder,
  hasOlder = false,
  isLoadingOlder = false,
  sendFailure,
  onRetrySend,
}: {
  messages: ChatMessage[];
  isAssistantLoading?: boolean;
  /** Increments when the open chat changes — scroll list to bottom (not after each server refresh or stream end). */
  messagesScrollEpoch?: number;
  /** For prepending older messages without jumping scroll (Virtuoso inverse list). */
  firstItemIndex?: number;
  onLoadOlder?: () => void | Promise<void>;
  hasOlder?: boolean;
  isLoadingOlder?: boolean;
  sendFailure?: ChatSendFailureState | null;
  onRetrySend?: () => void | Promise<void>;
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

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevLoadingRef = useRef(false);

  const handleAtTopStateChange = useCallback(
    (atTop: boolean) => {
      if (!atTop || !hasOlder || isLoadingOlder || !onLoadOlder) {
        return;
      }
      void onLoadOlder();
    },
    [hasOlder, isLoadingOlder, onLoadOlder],
  );

  useLayoutEffect(() => {
    if (isAssistantLoading) {
      return;
    }
    const v = virtuosoRef.current;
    if (!v) {
      return;
    }
    if (listMessages.length > 0) {
      v.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'auto' });
    } else {
      v.autoscrollToBottom();
    }
    // Only messagesScrollEpoch in deps: scroll after chat switch, not when stream ends or initialMessages refresh.
  }, [messagesScrollEpoch]); // eslint-disable-line react-hooks/exhaustive-deps -- isAssistantLoading checked inside

  useLayoutEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isAssistantLoading;
    const becameLoading = isAssistantLoading && !wasLoading;

    if (!becameLoading) {
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const lmForScroll =
      isAssistantLoading && lastMsg?.role === 'assistant' ? messages.slice(0, -1) : messages;
    const lastIndex = lmForScroll.length - 1;
    if (lastIndex < 0) {
      return;
    }

    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({
        index: lastIndex,
        align: 'start',
        behavior: 'smooth',
      });
    });
  }, [isAssistantLoading, messages]);

  const components = useMemo(
    () => ({
      List: MessagesVirtuosoList,
      Header: () =>
        isLoadingOlder ? (
          <div className="box-border px-5 py-3 text-center text-xs text-muted">
            Loading earlier messages…
          </div>
        ) : null,
      Footer: () => (
        <div className="px-5">
          {sendFailure ? (
            <ChatSendError
              message={sendFailure.error}
              onResend={() => void onRetrySend?.()}
              disabled={isAssistantLoading}
            />
          ) : null}
          {isAssistantLoading ? (
            <div className="flex scroll-mt-5 flex-col overflow-hidden rounded-lg border border-border/80 bg-white/95 shadow-sm">
              {showThinkingLoader ? (
                <div className="shrink-0 border-b border-border/60">
                  <AssistantReplyLoader className="border-0 shadow-none" />
                </div>
              ) : null}

              <div className="flex min-h-[min(50vh,28rem)] flex-col px-4 pb-4 pt-4">
                {assistantStreamText ? (
                  <div className="max-w-none text-sm text-text">
                    <ReactMarkdown
                      remarkPlugins={markdownRemarkPlugins}
                      components={markdownComponents}
                    >
                      {assistantStreamText}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="h-px w-full shrink-0 scroll-mb-2" aria-hidden />
        </div>
      ),
    }),
    [
      assistantStreamText,
      isAssistantLoading,
      isLoadingOlder,
      showThinkingLoader,
      sendFailure,
      onRetrySend,
    ],
  );

  return (
    <div className="flex h-full min-h-0 flex-col py-7">
      <Virtuoso
        ref={virtuosoRef}
        className="min-h-0 flex-1"
        style={{ height: '100%' }}
        data={listMessages}
        {...(firstItemIndex != null ? { firstItemIndex } : {})}
        alignToBottom
        increaseViewportBy={{ top: 200, bottom: 400 }}
        components={components}
        atTopStateChange={onLoadOlder ? handleAtTopStateChange : undefined}
        itemContent={(index, message) => (
          <div
            key={message.id ?? `${message.role}-${index}-${message.content.slice(0, 32)}`}
            className="mb-7 flex w-full flex-col"
          >
            <div
              className={cn(
                'flex w-full',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'px-4 py-2 rounded-md shadow-sm',
                  message.role === 'user'
                    ? 'max-w-[50%] bg-gray-100 text-text'
                    : 'max-w-[85%] bg-white/95',
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="max-w-none text-sm text-text">
                    <ReactMarkdown
                      remarkPlugins={markdownRemarkPlugins}
                      components={markdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm">{message.content}</div>
                )}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
