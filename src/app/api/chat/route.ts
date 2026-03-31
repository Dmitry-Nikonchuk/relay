import { handleCreateChat, handleListChats } from '@/features/chat/server/chat';

export async function POST(req: Request) {
  return handleCreateChat(req);
}

export async function GET() {
  return handleListChats();
}
