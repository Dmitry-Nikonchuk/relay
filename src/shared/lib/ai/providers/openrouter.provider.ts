import { AiProvider } from '../provider';
import { AiProviderError } from '../errors';
import type { AiChatRequest, AiChatResponse } from '../types';

type OpenRouterConfig = {
  apiKey: string;
  baseUrl?: string; // default https://openrouter.ai/api/v1
  defaultModel: string;
  appUrl?: string; // for HTTP-Referer
  appTitle?: string; // for X-Title
};

const RETRYABLE_STATUSES = new Set([429, 502, 503]);
const DEFAULT_MAX_ATTEMPTS = 8;
const ABSOLUTE_MAX_ATTEMPTS = 25;
const BASE_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 60_000;

function resolveMaxAttempts(req: AiChatRequest): number {
  if (req.maxRetries != null && req.maxRetries > 0) {
    return Math.min(ABSOLUTE_MAX_ATTEMPTS, req.maxRetries);
  }
  const raw = process.env.OPENROUTER_MAX_RETRIES?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) {
      return Math.min(ABSOLUTE_MAX_ATTEMPTS, n);
    }
  }
  return DEFAULT_MAX_ATTEMPTS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(res: Response): number | null {
  const raw = res.headers.get('Retry-After');
  if (!raw) return null;
  const sec = Number.parseInt(raw, 10);
  if (!Number.isNaN(sec) && sec >= 0) {
    return Math.min(sec * 1000, MAX_BACKOFF_MS);
  }
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) {
    const ms = date - Date.now();
    return ms > 0 ? Math.min(ms, MAX_BACKOFF_MS) : null;
  }
  return null;
}

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

  private backoffMs(attempt: number, res: Response): number {
    const fromHeader = parseRetryAfterMs(res);
    if (fromHeader != null) {
      return Math.max(fromHeader, 500);
    }
    const exp = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
    const jitter = Math.floor(Math.random() * 400);
    return exp + jitter;
  }

  private async callChatCompletions(req: AiChatRequest): Promise<Response> {
    const maxAttempts = resolveMaxAttempts(req);
    const payload = {
      model: req.model ?? this.config.defaultModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: req.stream ?? false,
    };

    const url = `${this.baseUrl}/chat/completions`;
    const headers = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',

      'HTTP-Referer': this.config.appUrl ?? 'http://localhost:3000',
      'X-Title': this.config.appTitle ?? 'Relay',
    };

    let lastBody = '';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return res;
      }

      lastBody = await res.text().catch(() => '');

      if (RETRYABLE_STATUSES.has(res.status) && attempt < maxAttempts - 1) {
        const wait = this.backoffMs(attempt, res);
        await sleep(wait);
        continue;
      }

      throw new AiProviderError(`OpenRouter error ${res.status}`, res.status, this.name, lastBody);
    }

    throw new AiProviderError('OpenRouter: exhausted retries', undefined, this.name, lastBody);
  }
}
