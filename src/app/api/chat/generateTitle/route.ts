import { handleGenerateChatTitle } from '@/features/chat/server/generateTitle';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

export async function POST(req: Request) {
  if (!(await getSessionUserId())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleGenerateChatTitle(req);
}
