'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Chat, ChatMessage } from '@/entities/chat';
import { chatApi } from '../lib/chatApi';
import { DEFAULT_CHAT_TITLE, PLACEHOLDER_CHAT_TITLE } from '../lib/constants';
import { ChatForm } from './ChatForm';
import { MessagesStack } from './MessagesStack';
import { ChatsList } from './ChatsList';

type Props = {
  initialChats: Chat[];
  initialMessages: ChatMessage[];
  /** `?chatId=` from URL; `null` when absent or not in list */
  chatIdFromUrl: string | null;
};

export function ChatScreen({ initialChats, initialMessages, chatIdFromUrl }: Props) {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatTitle, setChatTitle] = useState<string>(DEFAULT_CHAT_TITLE);
  const [isSendInProgress, setIsSendInProgress] = useState(false);
  const [messagesScrollEpoch, setMessagesScrollEpoch] = useState(0);

  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);

  useEffect(() => {
    if (isSendInProgress) {
      return;
    }
    setMessages(initialMessages);
  }, [initialMessages, isSendInProgress]);

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

  const sendMessage = async (inputText: string) => {
    if (!inputText.trim()) {
      return;
    }

    const trimmed = inputText.trim();
    const newMessages = [...messages, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(newMessages);

    const currentChatId = chatIdFromUrl;
    const isFirstMessageNewChat = !currentChatId;

    setIsSendInProgress(true);
    try {
      let accumulated = '';

      const streamPromise = chatApi.streamMessages(newMessages, (chunk) => {
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
      });

      const setupPromise = (async (): Promise<string | number> => {
        if (!currentChatId) {
          const chat = await chatApi.createChat({ title: PLACEHOLDER_CHAT_TITLE });
          const newChatId = chat.id;
          setChatTitle(chat.title);
          router.replace(`/chat?chatId=${encodeURIComponent(newChatId)}`);
          await chatApi.appendMessage(newChatId, 'user', trimmed);

          return newChatId;
        }

        await chatApi.appendMessage(String(currentChatId), 'user', trimmed);
        return currentChatId;
      })();

      const [chatIdForAssistant, fullText] = await Promise.all([setupPromise, streamPromise]);

      await chatApi.appendMessage(String(chatIdForAssistant), 'assistant', fullText);
      router.refresh();

      if (isFirstMessageNewChat) {
        const title = await chatApi.generateChatTitle(trimmed, fullText);
        await chatApi.updateChatTitle(String(chatIdForAssistant), title);
        setChatTitle(title);
        router.refresh();
      }
    } finally {
      setIsSendInProgress(false);
    }
  };

  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex justify-center py-6 px-3 bg-bg">
      <div className="w-full max-w-[1120px] flex gap-4 items-stretch">
        <aside className="w-[280px] shrink-0 flex flex-col rounded-lg border border-border bg-gradient-to-br from-white to-[#f4f5ff] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04),0_0_0_1px_rgba(148,163,184,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[42px] h-[42px] rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Relay logo" width={36} height={36} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold tracking-tight">Relay</span>
              <span className="text-[11px] text-muted">Your gateway to AI</span>
            </div>
          </div>

          <ChatsList
            chats={chats}
            onChatClick={selectChat}
            onCreateChat={startNewChat}
            onDeleteChat={deleteChat}
            onRenameChat={renameChat}
            selectedChatId={chatIdFromUrl}
          />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-surface shadow-[0_18px_45px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.08)] overflow-hidden pb-4">
          <header className="flex items-center justify-between pt-4 pb-3 px-5 border-b border-border">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-xl font-semibold tracking-tight">{chatTitle}</h1>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MessagesStack
              messages={messages}
              isAssistantLoading={isSendInProgress}
              messagesScrollEpoch={messagesScrollEpoch}
            />
          </div>

          <ChatForm onSubmit={sendMessage} disabled={isSendInProgress} />
        </div>
      </div>
    </div>
  );
}
