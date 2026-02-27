import { AiChatRequest, AiChatResponse } from './types';

export interface AiProvider {
  readonly name: string;

  chat(req: AiChatRequest): Promise<AiChatResponse>;

  chatStream(req: AiChatRequest): Promise<ReadableStream<Uint8Array>>;
}
