export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly provider?: string,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
