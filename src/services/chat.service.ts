import { AiChatRequest, AiChatResponse } from '@/lib/ai/types';
import { getAiProvider } from '@/lib/ai';

export class ChatService {
  async complete(req: AiChatRequest): Promise<AiChatResponse> {
    const provider = getAiProvider();
    return provider.chat(req);
  }

  async stream(req: AiChatRequest): Promise<ReadableStream<Uint8Array>> {
    const provider = getAiProvider();
    return provider.chatStream(req);
  }
}

export const chatService = new ChatService();
