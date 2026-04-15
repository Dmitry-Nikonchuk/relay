const MAX_CREATE_TITLE_LENGTH = 80;
const MAX_GENERATED_TITLE_LENGTH = 80;
const MAX_GENERATED_TITLE_WORDS = 10;
const PLACEHOLDER_CHAT_TITLE = 'New chat';

type InitialTitleResolution =
  | { title: string; source: 'client_placeholder' }
  | { title: string; source: 'client_override_rejected' };

type GeneratedTitleResolution =
  | { title: string; reason: 'ok' }
  | { title: string; reason: 'empty' | 'too_long' | 'too_many_words' };

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeForCompare(value: string): string {
  return normalizeWhitespace(value).toLocaleLowerCase();
}

function buildTitleFromFirstMessage(userMessage: string): string {
  const normalized = normalizeWhitespace(userMessage);
  if (!normalized) {
    return PLACEHOLDER_CHAT_TITLE;
  }

  const words = normalized
    .replace(/[!?.,;:()[\]{}"']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (words.length === 0) {
    return PLACEHOLDER_CHAT_TITLE;
  }

  const title = words.join(' ');
  return title.length > MAX_GENERATED_TITLE_LENGTH
    ? title.slice(0, MAX_GENERATED_TITLE_LENGTH).trim()
    : title;
}

function truncateGeneratedTitle(title: string): string {
  const words = normalizeWhitespace(title)
    .split(' ')
    .filter(Boolean)
    .slice(0, MAX_GENERATED_TITLE_WORDS);
  if (words.length === 0) {
    return '';
  }
  const shortened = words.join(' ');
  return shortened.length > MAX_GENERATED_TITLE_LENGTH
    ? shortened.slice(0, MAX_GENERATED_TITLE_LENGTH).trim()
    : shortened;
}

function looksLikePromptInstruction(title: string): boolean {
  const normalized = normalizeForCompare(title);
  if (!normalized) {
    return false;
  }

  const instructionFragments = [
    'generate a concise chat title',
    'first user message',
    'return only the title',
    'return only the final title',
    'output must be',
    'rules:',
    'chat title',
    'we need to output',
  ];

  return instructionFragments.some((fragment) => normalized.includes(fragment));
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
    return { title: buildTitleFromFirstMessage(userMessage), reason: 'empty' };
  }

  if (normalizedTitle.length > MAX_GENERATED_TITLE_LENGTH) {
    const shortened = truncateGeneratedTitle(normalizedTitle);
    if (shortened) {
      return { title: shortened, reason: 'ok' };
    }
    return { title: buildTitleFromFirstMessage(userMessage), reason: 'too_long' };
  }

  const wordCount = normalizedTitle.split(' ').filter(Boolean).length;
  if (wordCount > MAX_GENERATED_TITLE_WORDS) {
    const shortened = truncateGeneratedTitle(normalizedTitle);
    if (shortened) {
      return { title: shortened, reason: 'ok' };
    }
    return { title: buildTitleFromFirstMessage(userMessage), reason: 'too_many_words' };
  }

  if (looksLikePromptInstruction(normalizedTitle)) {
    return { title: buildTitleFromFirstMessage(userMessage), reason: 'empty' };
  }

  return { title: normalizedTitle, reason: 'ok' };
}
