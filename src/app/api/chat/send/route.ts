import { handleSend } from '@/features/chat/server/send';
import { getSessionUserId } from '@/shared/lib/auth/require-user';
import { unauthorizedResponse } from '@/shared/lib/api/errors';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorizedResponse();
  }
  return handleSend(req, userId);
}
