import { mapChatListRowToChat } from '@/entities/chat';
import type { ChatMessage } from '@/entities/chat';
import { ChatScreen } from '@/features/chat';
import { listChatsForUser } from '@/features/chat/server/chat';
import { MESSAGE_PAGE_DEFAULT_LIMIT } from '@/features/chat/lib/constants';
import { listMessagesLatestPage } from '@/features/chat/server/messages';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<{ chatId?: string }>;
};

export default async function ChatPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth');
  }

  const userId = session.user.id;
  const { chatId: chatIdParam } = await searchParams;

  const rows = await listChatsForUser(userId);
  const initialChats = rows.map(mapChatListRowToChat);

  const validChatId =
    chatIdParam && initialChats.some((c) => c.id === chatIdParam) ? chatIdParam : null;

  let initialMessages: ChatMessage[] = [];
  let initialMessagesHasMore = false;
  if (validChatId) {
    const page = await listMessagesLatestPage(validChatId, MESSAGE_PAGE_DEFAULT_LIMIT, userId);
    if (page) {
      initialMessages = page.messages;
      initialMessagesHasMore = page.hasMore;
    }
  }

  const currentUser = {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };

  return (
    <ChatScreen
      initialChats={initialChats}
      initialMessages={initialMessages}
      initialMessagesHasMore={initialMessagesHasMore}
      chatIdFromUrl={validChatId}
      currentUser={currentUser}
    />
  );
}
