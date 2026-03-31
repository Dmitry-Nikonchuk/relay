import { handleSend } from '@/features/chat/server/send';

export async function POST(req: Request) {
  return handleSend(req);
}
