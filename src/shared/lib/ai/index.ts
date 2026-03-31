import { OpenRouterProvider } from './providers/openrouter.provider';
import { AiProvider } from './provider';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getAiProvider(): AiProvider {
  return new OpenRouterProvider({
    apiKey: requiredEnv('OPENROUTER_API_KEY'),
    defaultModel: process.env.OPENROUTER_MODEL ?? 'liquid/lfm-2.5-1.2b-thinking:free',
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    appTitle: 'Relay',
  });
}
