import { handleAppendMessage, handleGetMessages } from '@/features/chat/server/messages';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleGetMessages(req, userId);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleAppendMessage(req, userId);
}
