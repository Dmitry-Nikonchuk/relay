import { AiProvider } from '../provider';
import { AiProviderError } from '../errors';
import { AiChatRequest, AiChatResponse } from '../types';

type OpenRouterConfig = {
  apiKey: string;
  baseUrl?: string; // default https://openrouter.ai/api/v1
  defaultModel: string;
  appUrl?: string; // for HTTP-Referer
  appTitle?: string; // for X-Title
};

export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter';

  private readonly baseUrl: string;

  constructor(private readonly config: OpenRouterConfig) {
    this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1';
    if (!config.apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  }

  async chat(req: AiChatRequest): Promise<AiChatResponse> {
    const res = await this.callChatCompletions({ ...req, stream: false });

    const data = (await res.json()) as AiChatResponse;

    return data;
  }

  async chatStream(req: AiChatRequest): Promise<ReadableStream<Uint8Array>> {
    const res = await this.callChatCompletions({ ...req, stream: true });

    if (!res.body) throw new AiProviderError('Upstream returned empty body', res.status, this.name);

    return res.body;
  }

  private async callChatCompletions(req: AiChatRequest): Promise<Response> {
    const payload = {
      model: req.model ?? this.config.defaultModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: req.stream ?? false,
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',

        'HTTP-Referer': this.config.appUrl ?? 'http://localhost:3000',
        'X-Title': this.config.appTitle ?? 'Relay',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AiProviderError(`OpenRouter error ${res.status}`, res.status, this.name, body);
    }

    return res;
  }
}
