export const AI = {
  baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  model: process.env.OPENROUTER_MODEL ?? 'liquid/lfm-2.5-1.2b-thinking:free',
};

export function assertAiConfig() {
  if (!AI.apiKey) throw new Error('Missing OPENROUTER_API_KEY');
}
