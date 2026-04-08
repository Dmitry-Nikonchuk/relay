import { handleCreateChat, handleListChats } from '@/features/chat/server/chat';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleCreateChat(req, userId);
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleListChats(userId);
}
