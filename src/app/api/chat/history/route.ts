import { handleAppendMessage, handleGetMessages } from '@/features/chat/server/messages';

export async function GET(req: Request) {
  return handleGetMessages(req);
}

export async function POST(req: Request) {
  return handleAppendMessage(req);
}
