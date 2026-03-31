import { handleStream } from '@/features/chat/server/stream';

export async function POST(req: Request) {
  return handleStream(req);
}
