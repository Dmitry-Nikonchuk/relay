import { handleGenerateChatTitle } from '@/features/chat/server/generateTitle';

export async function POST(req: Request) {
  return handleGenerateChatTitle(req);
}
