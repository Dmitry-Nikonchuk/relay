import { mapChatListRowToChat } from '@/entities/chat';
import type { ChatMessage } from '@/entities/chat';
import { ChatScreen } from '@/features/chat';
import { listChatsForDevUser } from '@/features/chat/server/chat';
import { MESSAGE_PAGE_DEFAULT_LIMIT } from '@/features/chat/lib/constants';
import { listMessagesLatestPage } from '@/features/chat/server/messages';

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
  let initialMessagesHasMore = false;
  if (validChatId) {
    const page = await listMessagesLatestPage(validChatId, MESSAGE_PAGE_DEFAULT_LIMIT);
    if (page) {
      initialMessages = page.messages;
      initialMessagesHasMore = page.hasMore;
    }
  }

  return (
    <ChatScreen
      initialChats={initialChats}
      initialMessages={initialMessages}
      initialMessagesHasMore={initialMessagesHasMore}
      chatIdFromUrl={validChatId}
    />
  );
}
