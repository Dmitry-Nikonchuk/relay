const MAX_CREATE_TITLE_LENGTH = 80;
const MAX_GENERATED_TITLE_LENGTH = 80;
const MAX_GENERATED_TITLE_WORDS = 10;
const PLACEHOLDER_CHAT_TITLE = 'New chat';

type InitialTitleResolution =
  | { title: string; source: 'client_placeholder' }
  | { title: string; source: 'client_override_rejected' };

type GeneratedTitleResolution =
  | { title: string; reason: 'ok' }
  | { title: string; reason: 'empty' | 'too_long' | 'too_many_words' | 'prompt_echo' };

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeForCompare(value: string): string {
  return normalizeWhitespace(value).toLocaleLowerCase();
}

export function sanitizeCreateChatTitle(rawTitle: string): InitialTitleResolution {
  const normalized = normalizeWhitespace(rawTitle);
  const requestedIsPlaceholder =
    normalizeForCompare(normalized) === normalizeForCompare(PLACEHOLDER_CHAT_TITLE);

  if (requestedIsPlaceholder) {
    return { title: PLACEHOLDER_CHAT_TITLE, source: 'client_placeholder' };
  }

  // Guard against stale clients that accidentally send a full prompt as chat title.
  if (!normalized || normalized.length > MAX_CREATE_TITLE_LENGTH || normalized.includes('\n')) {
    return { title: PLACEHOLDER_CHAT_TITLE, source: 'client_override_rejected' };
  }

  return { title: PLACEHOLDER_CHAT_TITLE, source: 'client_override_rejected' };
}

export function sanitizeGeneratedChatTitle(
  generatedTitle: string,
  userMessage: string,
): GeneratedTitleResolution {
  const normalizedTitle = normalizeWhitespace(generatedTitle);
  if (!normalizedTitle) {
    return { title: PLACEHOLDER_CHAT_TITLE, reason: 'empty' };
  }

  if (normalizedTitle.length > MAX_GENERATED_TITLE_LENGTH) {
    return { title: PLACEHOLDER_CHAT_TITLE, reason: 'too_long' };
  }

  const wordCount = normalizedTitle.split(' ').filter(Boolean).length;
  if (wordCount > MAX_GENERATED_TITLE_WORDS) {
    return { title: PLACEHOLDER_CHAT_TITLE, reason: 'too_many_words' };
  }

  const comparableUserMessage = normalizeForCompare(userMessage);
  const comparableTitle = normalizeForCompare(normalizedTitle);
  if (comparableTitle && comparableTitle === comparableUserMessage) {
    return { title: PLACEHOLDER_CHAT_TITLE, reason: 'prompt_echo' };
  }

  return { title: normalizedTitle, reason: 'ok' };
}
