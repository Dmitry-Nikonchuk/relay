import { mapChatListRowToChat } from '@/entities/chat';
import type { ChatMessage } from '@/entities/chat';
import { ChatScreen } from '@/features/chat';
import { listChatsForDevUser } from '@/features/chat/server/chat';
import { listMessagesForChat } from '@/features/chat/server/messages';

type PageProps = {
  searchParams: Promise<{ chatId?: string }>;
};

export default async function ChatPage({ searchParams }: PageProps) {
  const { chatId: chatIdParam } = await searchParams;

  const rows = await listChatsForDevUser();
  const initialChats = rows.map(mapChatListRowToChat);

  const validChatId =
    chatIdParam && initialChats.some((c) => c.id === chatIdParam) ? chatIdParam : null;

  let initialMessages: ChatMessage[] = [];
  if (validChatId) {
    const loaded = await listMessagesForChat(validChatId);
    if (loaded) {
      initialMessages = loaded;
    }
  }

  return (
    <ChatScreen
      initialChats={initialChats}
      initialMessages={initialMessages}
      chatIdFromUrl={validChatId}
    />
  );
}
