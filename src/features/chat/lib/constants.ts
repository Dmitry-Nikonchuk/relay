/** Header when no chat is selected (empty state). */
export const DEFAULT_CHAT_TITLE = 'Relay Chat' as const;

/** Stored in DB until LLM or user sets the real title. */
export const PLACEHOLDER_CHAT_TITLE = 'New chat' as const;

/** Default page size for message history (last page first, then older on scroll). */
export const MESSAGE_PAGE_DEFAULT_LIMIT = 50;

/** Upper bound for `limit` query param on `/api/chat/history`. */
export const MESSAGE_PAGE_MAX_LIMIT = 100;

/** Initial `firstItemIndex` for Virtuoso when prepending older messages (inverse scroll). */
export const VIRTUOSO_FIRST_ITEM_INDEX = 1_000_000;
