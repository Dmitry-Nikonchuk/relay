import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chat, ChatMessage } from '@/entities/chat';
import { chatApi } from '../lib/chatApi';
import { chatQueryKeys } from '../lib/queryKeys';
import { DEFAULT_CHAT_TITLE, PLACEHOLDER_CHAT_TITLE } from '../lib/constants';

export const useChat = () => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatTitle, setChatTitle] = useState<string>(DEFAULT_CHAT_TITLE);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  /** Bumps when history is loaded or cleared so the message list can scroll to bottom (not on stream chunks). */
  const [messagesScrollEpoch, setMessagesScrollEpoch] = useState(0);
  /** Skips loading messages from API while the first reply is streaming (avoids overwriting UI). */
  const pendingStreamRef = useRef(false);

  const { data: chats = [] } = useQuery({
    queryKey: chatQueryKeys.list(),
    queryFn: () => chatApi.fetchChats(),
  });

  useEffect(() => {
    if (!selectedChatId) {
      setChatTitle(DEFAULT_CHAT_TITLE);
      return;
    }
    const chat = chats.find((c) => c.id === selectedChatId);
    if (chat) {
      setChatTitle(chat.title);
    }
  }, [selectedChatId, chats]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setMessagesScrollEpoch((n) => n + 1);
      return;
    }
    if (pendingStreamRef.current) {
      return;
    }
    void chatApi.fetchMessages(String(selectedChatId)).then((msgs) => {
      setMessages(msgs);
      setMessagesScrollEpoch((n) => n + 1);
    });
  }, [selectedChatId]);

  const startNewChat = useCallback(() => {
    setSelectedChatId(null);
    setMessages([]);
    setChatTitle(DEFAULT_CHAT_TITLE);
  }, []);

  const deleteChat = useCallback(
    async (chatId: string) => {
      await chatApi.deleteChat(chatId);

      if (selectedChatId === chatId) {
        startNewChat();
      }

      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.list() });
    },
    [selectedChatId, startNewChat, queryClient],
  );

  const renameChat = useCallback(
    async (chatId: string, newText: string) => {
      const title = newText.trim();
      if (!title) {
        return;
      }

      const queryKey = chatQueryKeys.list();
      await queryClient.cancelQueries({ queryKey });

      const previousChats = queryClient.getQueryData<Chat[]>(queryKey);

      queryClient.setQueryData<Chat[]>(queryKey, (current = []) =>
        current.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
      );

      if (selectedChatId === chatId) {
        setChatTitle(title);
      }

      try {
        await chatApi.updateChatTitle(chatId, title);
      } catch (error) {
        if (previousChats) {
          queryClient.setQueryData(queryKey, previousChats);
          if (selectedChatId === chatId) {
            const previousSelectedChatTitle = previousChats.find(
              (chat) => chat.id === chatId,
            )?.title;
            setChatTitle(previousSelectedChatTitle ?? DEFAULT_CHAT_TITLE);
          }
        }
        throw error;
      } finally {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, selectedChatId],
  );

  const sendMessage = async (inputText: string) => {
    if (!inputText.trim()) {
      return;
    }

    const trimmed = inputText.trim();
    const newMessages = [...messages, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(newMessages);

    const currentChatId = selectedChatId;
    const isFirstMessageNewChat = !currentChatId;

    pendingStreamRef.current = true;
    setIsAssistantLoading(true);
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
          setSelectedChatId(newChatId);
          setChatTitle(chat.title);
          await queryClient.invalidateQueries({ queryKey: chatQueryKeys.list() });
          await chatApi.appendMessage(newChatId, 'user', trimmed);

          return newChatId;
        }

        await chatApi.appendMessage(String(currentChatId), 'user', trimmed);
        return currentChatId;
      })();

      const [chatIdForAssistant, fullText] = await Promise.all([setupPromise, streamPromise]);

      setIsAssistantLoading(false);

      await chatApi.appendMessage(String(chatIdForAssistant), 'assistant', fullText);
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.list() });

      if (isFirstMessageNewChat) {
        const title = await chatApi.generateChatTitle(trimmed, fullText);
        await chatApi.updateChatTitle(String(chatIdForAssistant), title);
        setChatTitle(title);
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.list() });
      }
    } catch (error) {
      setIsAssistantLoading(false);
      throw error;
    } finally {
      pendingStreamRef.current = false;
    }
  };

  return {
    messages,
    chatTitle,
    sendMessage,
    chats,
    selectedChatId,
    setSelectedChatId,
    startNewChat,
    deleteChat,
    renameChat,
    isAssistantLoading,
    messagesScrollEpoch,
  };
};
