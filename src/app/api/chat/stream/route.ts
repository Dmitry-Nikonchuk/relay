import { handleStream } from '@/features/chat/server/stream';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleStream(req, userId);
}
