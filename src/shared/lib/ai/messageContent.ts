import type { AiAssistantMessage } from './types';

/** Picks the first string from common block shapes (e.g. text, content, markdown). */
function getBlockText(block: unknown): string {
  if (block == null) return '';
  if (typeof block === 'string') return block;
  if (typeof block !== 'object') return String(block);
  const o = block as Record<string, unknown>;
  const content = o.content ?? o.text ?? o.markdown;
  if (typeof content === 'string') return content;
  return '';
}

/**
 * Extracts displayable text from an assistant message.
 * Uses content first, then reasoning, then reasoning_details.
 * The result may contain Markdown; the UI can render it with a markdown component.
 */
export function getMessageContent(message: AiAssistantMessage | null | undefined): string {
  if (!message) return '';

  const content = message.content;
  if (typeof content === 'string' && content.length > 0) return content;

  const reasoning = message.reasoning;
  if (typeof reasoning === 'string' && reasoning.length > 0) return reasoning;

  const details = message.reasoning_details;
  if (details != null) {
    if (typeof details === 'string') return details;
    if (Array.isArray(details) && details.length > 0) {
      const parts = details.map(getBlockText).filter(Boolean);
      if (parts.length > 0) return parts.join('\n\n');
    }
    if (typeof details === 'object') return getBlockText(details);
  }

  return '';
}
