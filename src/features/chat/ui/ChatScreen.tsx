'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chat, ChatMessage } from '@/entities/chat';
import type { UserChatModelsResponseDto } from '@/features/user/model/userChatModels.types';
import { chatApi } from '../lib/chatApi';
import {
  DEFAULT_CHAT_TITLE,
  MESSAGE_PAGE_DEFAULT_LIMIT,
  PLACEHOLDER_CHAT_TITLE,
  VIRTUOSO_FIRST_ITEM_INDEX,
} from '../lib/constants';
import {
  type ChatSendFailureState,
  getChatSendErrorMessage,
  trimTrailingAssistant,
} from '../lib/sendFailure';
import { ChatForm, type ActiveChatModelInfo } from './ChatForm';
import { MessagesStack } from './MessagesStack';
import { ChatsList } from './ChatsList';
import { ChatSidebarProfile, type ChatSidebarUser } from './ChatSidebarProfile';

type Props = {
  initialChats: Chat[];
  initialMessages: ChatMessage[];
  initialMessagesHasMore: boolean;
  /** `?chatId=` from URL; `null` when absent or not in list */
  chatIdFromUrl: string | null;
  currentUser: ChatSidebarUser;
};

export function ChatScreen({
  initialChats,
  initialMessages,
  initialMessagesHasMore,
  chatIdFromUrl,
  currentUser,
}: Props) {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialMessagesHasMore);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(VIRTUOSO_FIRST_ITEM_INDEX);
  const [chatTitle, setChatTitle] = useState<string>(DEFAULT_CHAT_TITLE);
  const [isSendInProgress, setIsSendInProgress] = useState(false);
  const [messagesScrollEpoch, setMessagesScrollEpoch] = useState(0);
  const [streamModelId, setStreamModelId] = useState<string | undefined>(undefined);
  const [activeModelInfo, setActiveModelInfo] = useState<ActiveChatModelInfo | null>(null);
  const [userChatModels, setUserChatModels] = useState<UserChatModelsResponseDto | null>(null);
  const [isLoadingChatModel, setIsLoadingChatModel] = useState(true);
  const [sendFailure, setSendFailure] = useState<ChatSendFailureState | null>(null);
  const prevChatIdRef = useRef<string | null | undefined>(undefined);

  const applyChatModels = useCallback((d: UserChatModelsResponseDto) => {
    const id = d.selectedModel ?? d.deploymentDefault;
    const label = d.availableModels.find((m) => m.id === id)?.label ?? id;
    setStreamModelId(id);
    setActiveModelInfo({ id, label });
    setUserChatModels(d);
  }, []);

  const handleChatModelChange = useCallback(
    async (modelId: string) => {
      const updated = await chatApi.patchUserChatModel(modelId);
      applyChatModels(updated);
    },
    [applyChatModels],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoadingChatModel(true);
    chatApi
      .fetchUserChatModels()
      .then((d) => {
        if (!cancelled) applyChatModels(d);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingChatModel(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyChatModels]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void chatApi.fetchUserChatModels().then(applyChatModels);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [applyChatModels]);

  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);

  useEffect(() => {
    if (prevChatIdRef.current === undefined) {
      prevChatIdRef.current = chatIdFromUrl;
      return;
    }
    if (prevChatIdRef.current === chatIdFromUrl) {
      return;
    }
    prevChatIdRef.current = chatIdFromUrl;
    if (isSendInProgress) {
      return;
    }
    setMessages(initialMessages);
    setHasOlderMessages(initialMessagesHasMore);
    setFirstItemIndex(VIRTUOSO_FIRST_ITEM_INDEX);
    setSendFailure(null);
  }, [chatIdFromUrl, initialMessages, initialMessagesHasMore, isSendInProgress]);

  useEffect(() => {
    setMessagesScrollEpoch((n) => n + 1);
  }, [chatIdFromUrl]);

  useEffect(() => {
    if (!chatIdFromUrl) {
      setChatTitle(DEFAULT_CHAT_TITLE);
      return;
    }
    const chat = chats.find((c) => c.id === chatIdFromUrl);
    if (chat) {
      setChatTitle(chat.title);
    }
  }, [chatIdFromUrl, chats]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatIdFromUrl || !hasOlderMessages || isLoadingOlderMessages) {
      return;
    }
    const first = messages[0];
    if (!first?.id || !first?.createdAt) {
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const page = await chatApi.fetchMessagesPage(chatIdFromUrl, {
        limit: MESSAGE_PAGE_DEFAULT_LIMIT,
        before: { createdAt: first.createdAt, id: first.id },
      });
      const existingIds = new Set(messages.map((m) => m.id).filter(Boolean));
      const older = page.messages.filter((m) => m.id && !existingIds.has(m.id));
      setMessages((prev) => [...older, ...prev]);
      setHasOlderMessages(page.hasMore);
      setFirstItemIndex((i) => i - older.length);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [chatIdFromUrl, hasOlderMessages, isLoadingOlderMessages, messages]);

  const startNewChat = useCallback(() => {
    router.push('/chat');
  }, [router]);

  const selectChat = useCallback(
    (chatId: string) => {
      router.push(`/chat?chatId=${encodeURIComponent(chatId)}`);
    },
    [router],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      await chatApi.deleteChat(chatId);
      if (chatIdFromUrl === chatId) {
        router.push('/chat');
      } else {
        router.refresh();
      }
    },
    [chatIdFromUrl, router],
  );

  const renameChat = useCallback(
    async (chatId: string, newText: string) => {
      const title = newText.trim();
      if (!title) {
        return;
      }
      await chatApi.updateChatTitle(chatId, title);
      router.refresh();
      if (chatIdFromUrl === chatId) {
        setChatTitle(title);
      }
    },
    [chatIdFromUrl, router],
  );

  const runAssistantStream = async (
    chatId: string,
    userMessageForTitle: string,
    runTitle: boolean,
  ) => {
    let accumulated = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' } as ChatMessage]);

    const fullText = await chatApi.streamMessages(
      String(chatId),
      (chunk) => {
        accumulated += chunk;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: accumulated };
          } else {
            next.push({ role: 'assistant', content: accumulated } as ChatMessage);
          }
          return next;
        });
      },
      { model: streamModelId },
    );

    await chatApi.appendMessage(String(chatId), 'assistant', fullText);
    router.refresh();

    if (runTitle) {
      try {
        const title = await chatApi.generateChatTitle(userMessageForTitle, fullText);
        await chatApi.updateChatTitle(String(chatId), title);
        setChatTitle(title);
        router.refresh();
      } catch {
        // Title is optional
      }
    }
  };

  /** @returns whether send + stream completed successfully */
  const sendMessage = async (
    inputText: string,
    options?: { skipUserBubble?: boolean },
  ): Promise<boolean> => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      return false;
    }

    const skipUserBubble = options?.skipUserBubble ?? false;
    if (!skipUserBubble) {
      setMessages((prev) => [...prev, { role: 'user', content: trimmed } as ChatMessage]);
    }

    setSendFailure(null);

    const currentChatId = chatIdFromUrl;
    const isFirstMessageNewChat = !currentChatId;

    let effectiveChatId: string | null = currentChatId ? String(currentChatId) : null;
    let userRecordedInDb = false;

    setIsSendInProgress(true);
    try {
      if (!currentChatId) {
        const chat = await chatApi.createChat({ title: PLACEHOLDER_CHAT_TITLE });
        effectiveChatId = chat.id;
        setChatTitle(chat.title);
        router.replace(`/chat?chatId=${encodeURIComponent(effectiveChatId)}`);
        await chatApi.appendMessage(effectiveChatId, 'user', trimmed);
        userRecordedInDb = true;
      } else {
        await chatApi.appendMessage(String(currentChatId), 'user', trimmed);
        userRecordedInDb = true;
        effectiveChatId = String(currentChatId);
      }

      if (!effectiveChatId) {
        throw new Error('Chat could not be created');
      }

      await runAssistantStream(effectiveChatId, trimmed, isFirstMessageNewChat);
      return true;
    } catch (e) {
      setMessages((prev) => trimTrailingAssistant(prev));
      setSendFailure({
        userText: trimmed,
        error: getChatSendErrorMessage(e),
        userPersisted: userRecordedInDb,
        chatId: effectiveChatId,
        generateTitleAfterStream: isFirstMessageNewChat,
      });
      return false;
    } finally {
      setIsSendInProgress(false);
    }
  };

  const retryFailedSend = async () => {
    if (!sendFailure) {
      return;
    }
    const { userText, userPersisted, chatId, generateTitleAfterStream = false } = sendFailure;

    setSendFailure(null);
    setIsSendInProgress(true);

    let recorded = userPersisted;
    const cid = chatId;

    try {
      if (userPersisted && chatId) {
        await runAssistantStream(chatId, userText, generateTitleAfterStream);
        return;
      }

      if (chatId && !userPersisted) {
        await chatApi.appendMessage(chatId, 'user', userText);
        recorded = true;
        await runAssistantStream(chatId, userText, generateTitleAfterStream);
        return;
      }

      const ok = await sendMessage(userText, { skipUserBubble: true });
      if (!ok) {
        return;
      }
    } catch (e) {
      setMessages((prev) => trimTrailingAssistant(prev));
      setSendFailure({
        userText,
        error: getChatSendErrorMessage(e),
        userPersisted: recorded,
        chatId: cid,
        generateTitleAfterStream,
      });
    } finally {
      setIsSendInProgress(false);
    }
  };

  const isEmptyThread = messages.length === 0 && !isSendInProgress;

  const handleFormSubmit = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex justify-center py-6 px-3 bg-bg">
      <div className="w-full max-w-[1120px] flex gap-4 items-stretch">
        <aside className="flex min-h-0 w-[280px] shrink-0 flex-col self-stretch rounded-lg border border-border bg-gradient-to-br from-white to-[#f4f5ff] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04),0_0_0_1px_rgba(148,163,184,0.04)]">
          <div className="mb-4 flex shrink-0 items-center gap-2">
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
              selectedChatId={chatIdFromUrl}
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
                  onLoadOlder={chatIdFromUrl ? loadOlderMessages : undefined}
                  hasOlder={hasOlderMessages}
                  isLoadingOlder={isLoadingOlderMessages}
                  sendFailure={sendFailure}
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
