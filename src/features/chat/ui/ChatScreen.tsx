'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Chat, ChatFailedReply, ChatMessage } from '@/features/chat/model';
import type { UserChatModelsResponseDto } from '@/features/user/model/userChatModels.types';

import { chatApi } from '../lib/chatApi';
import {
  DEFAULT_CHAT_TITLE,
  MESSAGE_PAGE_DEFAULT_LIMIT,
  PLACEHOLDER_CHAT_TITLE,
  VIRTUOSO_FIRST_ITEM_INDEX,
} from '../lib/constants';
import { chatQueryKeys } from '../lib/queryKeys';
import {
  type ChatSendFailureState,
  canRetrySendError,
  getChatSendErrorMessage,
  toFailedReplyState,
  trimTrailingAssistant,
} from '../lib/sendFailure';
import { ChatForm, type ActiveChatModelInfo } from './ChatForm';
import { MessagesStack } from './MessagesStack';
import { ChatsList } from './ChatsList';
import { ChatSidebarProfile, type ChatSidebarUser } from './ChatSidebarProfile';

type ChatMessagesQueryData = {
  messages: ChatMessage[];
  hasMore: boolean;
  failedReply: ChatFailedReply | null;
};

type Props = {
  initialChats: Chat[];
  initialMessages: ChatMessage[];
  initialMessagesHasMore: boolean;
  initialFailedReply: ChatFailedReply | null;
  /** `?chatId=` from URL; `null` when absent or not in list */
  chatIdFromUrl: string | null;
  currentUser: ChatSidebarUser;
};

const EMPTY_MESSAGES_QUERY: ChatMessagesQueryData = {
  messages: [],
  hasMore: false,
  failedReply: null,
};

function toMessagesQueryData(input: {
  messages: ChatMessage[];
  hasMore: boolean;
  failedReply: ChatFailedReply | null;
}): ChatMessagesQueryData {
  return {
    messages: input.messages,
    hasMore: input.hasMore,
    failedReply: input.failedReply,
  };
}

function getActiveModelInfo(
  data: UserChatModelsResponseDto | null | undefined,
): ActiveChatModelInfo | null {
  if (!data) {
    return null;
  }

  const id = data.selectedModel ?? data.deploymentDefault;
  const label = data.availableModels.find((model) => model.id === id)?.label ?? id;

  return { id, label };
}

function upsertChat(chats: Chat[], nextChat: Chat): Chat[] {
  const withoutExisting = chats.filter((chat) => chat.id !== nextChat.id);
  return [nextChat, ...withoutExisting];
}

function updateChatTitle(chats: Chat[], chatId: string, title: string): Chat[] {
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) {
    return chats;
  }

  // Renames update ordering server-side, so move the chat to the top before the refetch confirms it.
  return upsertChat(chats, { ...chat, title });
}

function appendMessage(
  data: ChatMessagesQueryData | undefined,
  message: ChatMessage,
): ChatMessagesQueryData {
  const base = data ?? EMPTY_MESSAGES_QUERY;
  return {
    ...base,
    messages: [...base.messages, message],
    failedReply: null,
  };
}

function replaceMessage(
  data: ChatMessagesQueryData | undefined,
  messageId: string,
  patch: Partial<ChatMessage>,
): ChatMessagesQueryData {
  const base = data ?? EMPTY_MESSAGES_QUERY;

  return {
    ...base,
    messages: base.messages.map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    ),
  };
}

function updateLastAssistantMessage(
  data: ChatMessagesQueryData | undefined,
  content: string,
): ChatMessagesQueryData {
  const base = data ?? EMPTY_MESSAGES_QUERY;
  const nextMessages = [...base.messages];
  const last = nextMessages[nextMessages.length - 1];

  if (last?.role === 'assistant') {
    nextMessages[nextMessages.length - 1] = { ...last, content };
  } else {
    nextMessages.push({ role: 'assistant', content });
  }

  return { ...base, messages: nextMessages };
}

function trimTrailingAssistantFromData(
  data: ChatMessagesQueryData | undefined,
): ChatMessagesQueryData {
  const base = data ?? EMPTY_MESSAGES_QUERY;
  return {
    ...base,
    messages: trimTrailingAssistant(base.messages),
  };
}

function mergeOlderMessages(
  data: ChatMessagesQueryData | undefined,
  olderMessages: ChatMessage[],
  hasMore: boolean,
): ChatMessagesQueryData {
  const base = data ?? EMPTY_MESSAGES_QUERY;
  const existingIds = new Set(base.messages.map((message) => message.id).filter(Boolean));
  const dedupedOlder = olderMessages.filter(
    (message) => !message.id || !existingIds.has(message.id),
  );

  return {
    ...base,
    messages: [...dedupedOlder, ...base.messages],
    hasMore,
  };
}

function setFailedReply(
  data: ChatMessagesQueryData | undefined,
  failedReply: ChatFailedReply | null,
): ChatMessagesQueryData {
  const base = data ?? EMPTY_MESSAGES_QUERY;
  return {
    ...base,
    failedReply,
  };
}

export function ChatScreen({
  initialChats,
  initialMessages,
  initialMessagesHasMore,
  initialFailedReply,
  chatIdFromUrl,
  currentUser,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(chatIdFromUrl);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(VIRTUOSO_FIRST_ITEM_INDEX);
  const [isSendInProgress, setIsSendInProgress] = useState(false);
  const [messagesScrollEpoch, setMessagesScrollEpoch] = useState(0);
  const [sendFailure, setSendFailure] = useState<ChatSendFailureState | null>(null);

  const initialMessagesQueryData = useMemo(
    () =>
      toMessagesQueryData({
        messages: initialMessages,
        hasMore: initialMessagesHasMore,
        failedReply: initialFailedReply,
      }),
    [initialFailedReply, initialMessages, initialMessagesHasMore],
  );

  const chatsQuery = useQuery({
    queryKey: chatQueryKeys.chats,
    queryFn: chatApi.fetchChats,
    initialData: initialChats,
  });

  const userChatModelsQuery = useQuery({
    queryKey: chatQueryKeys.userChatModels,
    queryFn: chatApi.fetchUserChatModels,
  });

  const messagesQuery = useQuery({
    queryKey: activeChatId ? chatQueryKeys.chatMessages(activeChatId) : ['chatMessages', 'idle'],
    enabled: activeChatId != null,
    queryFn: async () => {
      if (!activeChatId) {
        return EMPTY_MESSAGES_QUERY;
      }

      return chatApi.fetchMessagesPage(activeChatId, {
        limit: MESSAGE_PAGE_DEFAULT_LIMIT,
      });
    },
    // Only hydrate from the server when the URL-backed chat matches the active chat on first load.
    initialData:
      activeChatId && activeChatId === chatIdFromUrl ? initialMessagesQueryData : undefined,
  });

  const renameChatMutation = useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      chatApi.updateChatTitle(chatId, title),
    onMutate: async ({ chatId, title }) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.chats });
      const previousChats = queryClient.getQueryData<Chat[]>(chatQueryKeys.chats) ?? [];

      queryClient.setQueryData<Chat[]>(chatQueryKeys.chats, (current = []) =>
        updateChatTitle(current, chatId, title),
      );

      return { previousChats };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(chatQueryKeys.chats, context.previousChats);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.chats });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => chatApi.deleteChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.chats });
      const previousChats = queryClient.getQueryData<Chat[]>(chatQueryKeys.chats) ?? [];
      const previousMessages = queryClient.getQueryData<ChatMessagesQueryData>(
        chatQueryKeys.chatMessages(chatId),
      );

      queryClient.setQueryData<Chat[]>(chatQueryKeys.chats, (current = []) =>
        current.filter((chat) => chat.id !== chatId),
      );
      queryClient.removeQueries({ queryKey: chatQueryKeys.chatMessages(chatId), exact: true });

      return { previousChats, previousMessages, chatId };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(chatQueryKeys.chats, context.previousChats);
      if (context.previousMessages) {
        queryClient.setQueryData(
          chatQueryKeys.chatMessages(context.chatId),
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.chats });
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: (modelId: string) => chatApi.patchUserChatModel(modelId),
    onMutate: async (modelId) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.userChatModels });
      const previousModels = queryClient.getQueryData<UserChatModelsResponseDto>(
        chatQueryKeys.userChatModels,
      );

      if (previousModels) {
        queryClient.setQueryData<UserChatModelsResponseDto>(chatQueryKeys.userChatModels, {
          ...previousModels,
          selectedModel: modelId,
        });
      }

      return { previousModels };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModels) {
        queryClient.setQueryData(chatQueryKeys.userChatModels, context.previousModels);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.userChatModels });
    },
  });

  const chats = chatsQuery.data ?? initialChats;
  const userChatModels = userChatModelsQuery.data ?? null;
  const activeModelInfo = useMemo(() => getActiveModelInfo(userChatModels), [userChatModels]);
  const seededMessagesData =
    activeChatId && activeChatId === chatIdFromUrl
      ? initialMessagesQueryData
      : EMPTY_MESSAGES_QUERY;
  const messagesData =
    activeChatId != null ? (messagesQuery.data ?? seededMessagesData) : EMPTY_MESSAGES_QUERY;
  const messages = messagesData.messages;
  const hasOlderMessages = messagesData.hasMore;
  const failedReply = messagesData.failedReply;
  const isLoadingChatModel = userChatModelsQuery.isLoading;
  const currentChat = activeChatId ? chats.find((chat) => chat.id === activeChatId) : null;
  const chatTitle = currentChat?.title ?? DEFAULT_CHAT_TITLE;

  const updateMessagesCache = useCallback(
    (
      chatId: string,
      updater: (current: ChatMessagesQueryData | undefined) => ChatMessagesQueryData,
    ) => {
      queryClient.setQueryData<ChatMessagesQueryData>(chatQueryKeys.chatMessages(chatId), updater);
    },
    [queryClient],
  );

  useEffect(() => {
    if (isSendInProgress || chatIdFromUrl === activeChatId) {
      return;
    }

    setActiveChatId(chatIdFromUrl);
  }, [activeChatId, chatIdFromUrl, isSendInProgress]);

  useEffect(() => {
    setFirstItemIndex(VIRTUOSO_FIRST_ITEM_INDEX);
    setMessagesScrollEpoch((value) => value + 1);
    setSendFailure(null);
  }, [activeChatId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.userChatModels });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [queryClient]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeChatId || !hasOlderMessages || isLoadingOlderMessages) {
      return;
    }

    const first = messages[0];
    if (!first?.id || !first?.createdAt) {
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const page = await chatApi.fetchMessagesPage(activeChatId, {
        limit: MESSAGE_PAGE_DEFAULT_LIMIT,
        before: { createdAt: first.createdAt, id: first.id },
      });

      updateMessagesCache(activeChatId, (current) =>
        mergeOlderMessages(current, page.messages, page.hasMore),
      );
      setFirstItemIndex((index) => index - page.messages.length);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [activeChatId, hasOlderMessages, isLoadingOlderMessages, messages, updateMessagesCache]);

  const startNewChat = useCallback(() => {
    if (isSendInProgress) {
      return;
    }

    setActiveChatId(null);
    router.push('/chat');
  }, [isSendInProgress, router]);

  const selectChat = useCallback(
    (chatId: string) => {
      if (isSendInProgress) {
        return;
      }

      setActiveChatId(chatId);
      router.push(`/chat?chatId=${encodeURIComponent(chatId)}`);
    },
    [isSendInProgress, router],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      await deleteChatMutation.mutateAsync(chatId);

      if (activeChatId === chatId) {
        setActiveChatId(null);
        router.push('/chat');
      }
    },
    [activeChatId, deleteChatMutation, router],
  );

  const renameChat = useCallback(
    async (chatId: string, newText: string) => {
      const title = newText.trim();
      if (!title) {
        return;
      }

      await renameChatMutation.mutateAsync({ chatId, title });
    },
    [renameChatMutation],
  );

  const handleChatModelChange = useCallback(
    async (modelId: string) => {
      await updateModelMutation.mutateAsync(modelId);
    },
    [updateModelMutation],
  );

  const runAssistantStream = useCallback(
    async (
      chatId: string,
      userMessageId: string,
      userMessageForTitle: string,
      runTitle: boolean,
    ) => {
      const requestId = crypto.randomUUID();
      let accumulated = '';

      updateMessagesCache(chatId, (current) =>
        appendMessage(current, { role: 'assistant', content: '' }),
      );

      const titlePromise = runTitle
        ? (async () => {
            try {
              const generated = await chatApi.generateChatTitle(userMessageForTitle);
              const updated = await chatApi.updateChatTitle(String(chatId), generated);

              queryClient.setQueryData<Chat[]>(chatQueryKeys.chats, (current = []) =>
                updateChatTitle(current, chatId, updated.title),
              );
            } catch {
              // Title generation is helpful but not required for a successful reply.
            }
          })()
        : null;

      await chatApi.streamMessages(
        String(chatId),
        userMessageId,
        (chunk) => {
          accumulated += chunk;
          updateMessagesCache(chatId, (current) =>
            updateLastAssistantMessage(current, accumulated),
          );
        },
        { model: activeModelInfo?.id, requestId },
      );

      if (titlePromise) {
        await titlePromise;
      }

      // Invalidate only the chat resources touched by the mutation instead of refreshing the whole route.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.chatMessages(chatId) }),
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.chats }),
      ]);
    },
    [activeModelInfo?.id, queryClient, updateMessagesCache],
  );

  /** @returns whether send + stream completed successfully */
  const sendMessage = useCallback(
    async (inputText: string, options?: { skipUserBubble?: boolean }): Promise<boolean> => {
      const trimmed = inputText.trim();
      if (!trimmed) {
        return false;
      }

      const skipUserBubble = options?.skipUserBubble ?? false;
      const requestId = crypto.randomUUID();
      const optimisticUserMessageId = `temp-user:${requestId}`;
      const currentChatId = activeChatId;
      const isFirstMessageNewChat = !currentChatId;

      let effectiveChatId: string | null = currentChatId ? String(currentChatId) : null;
      let userRecordedInDb = false;
      let userMessageId: string | null = null;
      const tempMessageId: string | null = skipUserBubble ? null : optimisticUserMessageId;

      setSendFailure(null);
      setIsSendInProgress(true);

      try {
        if (!effectiveChatId) {
          const chat = await chatApi.createChat({ title: PLACEHOLDER_CHAT_TITLE }, { requestId });
          effectiveChatId = chat.id;

          queryClient.setQueryData<Chat[]>(chatQueryKeys.chats, (current = []) =>
            upsertChat(current, chat),
          );
          queryClient.setQueryData<ChatMessagesQueryData>(
            chatQueryKeys.chatMessages(chat.id),
            skipUserBubble
              ? EMPTY_MESSAGES_QUERY
              : toMessagesQueryData({
                  messages: [{ id: optimisticUserMessageId, role: 'user', content: trimmed }],
                  hasMore: false,
                  failedReply: null,
                }),
          );

          setActiveChatId(chat.id);
          router.replace(`/chat?chatId=${encodeURIComponent(chat.id)}`);
        } else if (!skipUserBubble) {
          updateMessagesCache(effectiveChatId, (current) =>
            appendMessage(current, { id: optimisticUserMessageId, role: 'user', content: trimmed }),
          );
        }

        if (!effectiveChatId) {
          throw new Error('Chat could not be created');
        }

        const persisted = await chatApi.appendMessage(effectiveChatId, 'user', trimmed, {
          requestId,
        });
        userMessageId = persisted.id;
        userRecordedInDb = true;

        if (!skipUserBubble) {
          updateMessagesCache(effectiveChatId, (current) =>
            replaceMessage(current, optimisticUserMessageId, {
              id: persisted.id,
              createdAt: persisted.createdAt,
            }),
          );
        }

        await runAssistantStream(effectiveChatId, persisted.id, trimmed, isFirstMessageNewChat);
        return true;
      } catch (error) {
        if (effectiveChatId) {
          updateMessagesCache(effectiveChatId, (current) => trimTrailingAssistantFromData(current));
        }

        if (userRecordedInDb && userMessageId && effectiveChatId) {
          const persistedUserMessageId = userMessageId;
          updateMessagesCache(effectiveChatId, (current) =>
            setFailedReply(
              current,
              toFailedReplyState({
                userMessageId: persistedUserMessageId,
                userText: trimmed,
                error: getChatSendErrorMessage(error),
                canRetry: canRetrySendError(error),
              }),
            ),
          );
        } else {
          setSendFailure({
            userText: trimmed,
            error: getChatSendErrorMessage(error),
            canRetry: canRetrySendError(error),
            userPersisted: userRecordedInDb,
            chatId: effectiveChatId,
            userMessageId,
            tempMessageId,
            generateTitleAfterStream: isFirstMessageNewChat,
          });
        }

        return false;
      } finally {
        setIsSendInProgress(false);
      }
    },
    [activeChatId, queryClient, router, runAssistantStream, updateMessagesCache],
  );

  const retryFailedSend = useCallback(async () => {
    if (failedReply && activeChatId) {
      if (!failedReply.canRetry) {
        return;
      }

      updateMessagesCache(activeChatId, (current) => setFailedReply(current, null));
      setIsSendInProgress(true);

      try {
        const shouldGenerateTitle = chatTitle === PLACEHOLDER_CHAT_TITLE;
        await runAssistantStream(
          activeChatId,
          failedReply.userMessageId,
          failedReply.userText,
          shouldGenerateTitle,
        );
      } catch (error) {
        updateMessagesCache(activeChatId, (current) =>
          setFailedReply(current, {
            ...failedReply,
            errorMessage: getChatSendErrorMessage(error),
          }),
        );
      } finally {
        setIsSendInProgress(false);
      }

      return;
    }

    if (!sendFailure) {
      return;
    }

    const {
      userText,
      userPersisted,
      chatId,
      tempMessageId,
      generateTitleAfterStream = false,
    } = sendFailure;

    setSendFailure(null);
    setIsSendInProgress(true);

    try {
      if (userPersisted && chatId) {
        if (!sendFailure.userMessageId) {
          throw new Error('Missing user message id');
        }

        await runAssistantStream(
          chatId,
          sendFailure.userMessageId,
          userText,
          generateTitleAfterStream,
        );
        return;
      }

      if (chatId && !userPersisted) {
        const requestId = crypto.randomUUID();
        const persisted = await chatApi.appendMessage(chatId, 'user', userText, { requestId });

        updateMessagesCache(chatId, (current) => {
          const base = current ?? EMPTY_MESSAGES_QUERY;
          const optimisticIndex = base.messages.findIndex(
            (message) =>
              message.role === 'user' &&
              (message.id === tempMessageId || (!message.id && message.content === userText)),
          );

          if (optimisticIndex < 0) {
            return appendMessage(base, {
              id: persisted.id,
              role: 'user',
              content: userText,
              createdAt: persisted.createdAt,
            });
          }

          const nextMessages = [...base.messages];
          nextMessages[optimisticIndex] = {
            ...nextMessages[optimisticIndex],
            id: persisted.id,
            createdAt: persisted.createdAt,
          };

          return {
            ...base,
            messages: nextMessages,
          };
        });

        await runAssistantStream(chatId, persisted.id, userText, generateTitleAfterStream);
        return;
      }

      const ok = await sendMessage(userText, { skipUserBubble: true });
      if (!ok) {
        return;
      }
    } catch (error) {
      if (chatId) {
        updateMessagesCache(chatId, (current) => trimTrailingAssistantFromData(current));
      }

      setSendFailure({
        userText,
        error: getChatSendErrorMessage(error),
        canRetry: canRetrySendError(error),
        userPersisted,
        chatId,
        userMessageId: sendFailure.userMessageId,
        tempMessageId,
        generateTitleAfterStream,
      });
    } finally {
      setIsSendInProgress(false);
    }
  }, [
    activeChatId,
    chatTitle,
    failedReply,
    runAssistantStream,
    sendFailure,
    sendMessage,
    updateMessagesCache,
  ]);

  const handleFormSubmit = useCallback(
    async (text: string) => {
      await sendMessage(text);
    },
    [sendMessage],
  );

  const isEmptyThread = messages.length === 0 && !isSendInProgress;

  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex justify-center py-6 px-3 bg-bg">
      <div className="w-full max-w-[1120px] flex gap-4 items-stretch">
        <aside className="flex min-h-0 w-[280px] shrink-0 flex-col self-stretch rounded-lg border border-border bg-gradient-to-br from-white to-[#f4f5ff] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04),0_0_0_1px_rgba(148,163,184,0.04)]">
          <div
            className="mb-4 flex shrink-0 items-center gap-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <div className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-lg">
              <Image src="/logo.png" alt="Relay logo" width={36} height={36} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold tracking-tight">Relay</span>
              <span className="text-[11px] text-muted">Your gateway to AI</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <ChatsList
              chats={chats}
              onChatClick={selectChat}
              onCreateChat={startNewChat}
              onDeleteChat={deleteChat}
              onRenameChat={renameChat}
              selectedChatId={activeChatId}
            />
            <ChatSidebarProfile user={currentUser} />
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-surface shadow-[0_18px_45px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.08)] overflow-hidden pb-4">
          <header className="flex items-center justify-between pt-4 pb-3 px-5 border-b border-border">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-xl font-semibold tracking-tight">{chatTitle}</h1>
            </div>
          </header>

          {isEmptyThread ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-6 pt-2 sm:px-5">
              <div className="w-full max-w-[560px]">
                <ChatForm
                  variant="empty"
                  onSubmit={handleFormSubmit}
                  disabled={isSendInProgress}
                  isSubmitting={isSendInProgress}
                  activeModel={activeModelInfo}
                  isLoadingModel={isLoadingChatModel}
                  availableModels={userChatModels?.availableModels ?? []}
                  onModelChange={handleChatModelChange}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <MessagesStack
                  messages={messages}
                  isAssistantLoading={isSendInProgress}
                  messagesScrollEpoch={messagesScrollEpoch}
                  firstItemIndex={firstItemIndex}
                  onLoadOlder={activeChatId ? loadOlderMessages : undefined}
                  hasOlder={hasOlderMessages}
                  isLoadingOlder={isLoadingOlderMessages}
                  sendFailure={sendFailure}
                  failedReply={failedReply}
                  onRetrySend={retryFailedSend}
                />
              </div>

              <ChatForm
                onSubmit={handleFormSubmit}
                disabled={isSendInProgress}
                isSubmitting={isSendInProgress}
                activeModel={activeModelInfo}
                isLoadingModel={isLoadingChatModel}
                availableModels={userChatModels?.availableModels ?? []}
                onModelChange={handleChatModelChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
