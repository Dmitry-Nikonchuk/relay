import { getEnv } from '@/shared/lib/db/context';

const CHAT_ENCRYPTION_PREFIX = 'enc:v1:';
const CHAT_ENCRYPTION_INFO = 'relay/chat-data/v1';
const CHAT_ENCRYPTION_SALT = 'relay/chat-data/salt/v1';
const IV_LENGTH_BYTES = 12;
const MASTER_KEY_ENV_NAME = 'CHAT_DATA_MASTER_KEY';

export type ChatEncryptionScope =
  | 'chat_title'
  | 'message_content'
  | 'chat_memory_summary_text'
  | 'chat_memory_summary_json'
  | 'pending_reply_user_message_text';

type ChatEncryptionContext = {
  userId: string;
  scope: ChatEncryptionScope;
  chatId?: string;
};

type UserChatCipher = {
  encrypt(value: string, scope: ChatEncryptionScope, chatId?: string): Promise<string>;
  decrypt(value: string, scope: ChatEncryptionScope, chatId?: string): Promise<string>;
  encryptNullable(
    value: string | null,
    scope: ChatEncryptionScope,
    chatId?: string,
  ): Promise<string | null>;
  decryptNullable(
    value: string | null,
    scope: ChatEncryptionScope,
    chatId?: string,
  ): Promise<string | null>;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedMasterKeyMaterial: Promise<CryptoKey> | null = null;

function asBufferSource(value: Uint8Array): BufferSource {
  return value as BufferSource;
}

function getMasterKeyValue(): string {
  const processEnvValue = process.env[MASTER_KEY_ENV_NAME]?.trim();
  if (processEnvValue) {
    return processEnvValue;
  }

  try {
    const envValue = getEnv().CHAT_DATA_MASTER_KEY?.trim();
    if (envValue) {
      return envValue;
    }
  } catch {
    // Ignore missing Cloudflare context and fall through to a helpful error.
  }

  throw new Error(`${MASTER_KEY_ENV_NAME} is not configured.`);
}

function decodeMasterKey(raw: string): Uint8Array {
  const normalized = raw.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error(`${MASTER_KEY_ENV_NAME} must be a base64-encoded 32-byte secret.`);
  }

  const bytes = Uint8Array.from(Buffer.from(normalized, 'base64'));
  if (bytes.length !== 32) {
    throw new Error(`${MASTER_KEY_ENV_NAME} must decode to exactly 32 bytes.`);
  }

  return bytes;
}

async function getMasterKeyMaterial(): Promise<CryptoKey> {
  cachedMasterKeyMaterial ??= crypto.subtle.importKey(
    'raw',
    asBufferSource(decodeMasterKey(getMasterKeyValue())),
    'HKDF',
    false,
    ['deriveKey'],
  );

  return cachedMasterKeyMaterial;
}

async function deriveUserKey(userId: string): Promise<CryptoKey> {
  const material = await getMasterKeyMaterial();
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: asBufferSource(encoder.encode(CHAT_ENCRYPTION_SALT)),
      info: asBufferSource(encoder.encode(`${CHAT_ENCRYPTION_INFO}:${userId}`)),
    },
    material,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(raw: string): Uint8Array {
  const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Uint8Array.from(Buffer.from(`${normalized}${padding}`, 'base64'));
}

function buildAdditionalAuthenticatedData(context: ChatEncryptionContext): Uint8Array {
  return encoder.encode(
    JSON.stringify({
      version: 1,
      userId: context.userId,
      scope: context.scope,
      chatId: context.chatId ?? null,
    }),
  );
}

function splitCiphertext(value: string): { iv: Uint8Array; ciphertext: Uint8Array } {
  if (!value.startsWith(CHAT_ENCRYPTION_PREFIX)) {
    throw new Error('Value is not encrypted.');
  }

  const payload = value.slice(CHAT_ENCRYPTION_PREFIX.length);
  const [ivPart, ciphertextPart] = payload.split('.');
  if (!ivPart || !ciphertextPart) {
    throw new Error('Encrypted value is malformed.');
  }

  const iv = decodeBase64Url(ivPart);
  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error('Encrypted value has an invalid IV.');
  }

  const ciphertext = decodeBase64Url(ciphertextPart);
  if (ciphertext.length < 16) {
    throw new Error('Encrypted value has an invalid payload.');
  }

  return { iv, ciphertext };
}

async function encryptValue(
  key: CryptoKey,
  value: string,
  context: ChatEncryptionContext,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: asBufferSource(iv),
      additionalData: asBufferSource(buildAdditionalAuthenticatedData(context)),
    },
    key,
    asBufferSource(encoder.encode(value)),
  );

  return `${CHAT_ENCRYPTION_PREFIX}${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(ciphertext))}`;
}

async function decryptValue(
  key: CryptoKey,
  value: string,
  context: ChatEncryptionContext,
): Promise<string> {
  if (!value.startsWith(CHAT_ENCRYPTION_PREFIX)) {
    return value;
  }

  const { iv, ciphertext } = splitCiphertext(value);

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: asBufferSource(iv),
        additionalData: asBufferSource(buildAdditionalAuthenticatedData(context)),
      },
      key,
      asBufferSource(ciphertext),
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error(`Failed to decrypt ${context.scope}.`);
  }
}

export async function createUserChatCipher(userId: string): Promise<UserChatCipher> {
  const key = await deriveUserKey(userId);

  return {
    encrypt(value, scope, chatId) {
      return encryptValue(key, value, { userId, scope, chatId });
    },
    decrypt(value, scope, chatId) {
      return decryptValue(key, value, { userId, scope, chatId });
    },
    encryptNullable(value, scope, chatId) {
      if (value == null) {
        return Promise.resolve(null);
      }
      return encryptValue(key, value, { userId, scope, chatId });
    },
    decryptNullable(value, scope, chatId) {
      if (value == null) {
        return Promise.resolve(null);
      }
      return decryptValue(key, value, { userId, scope, chatId });
    },
  };
}

export function isEncryptedChatValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(CHAT_ENCRYPTION_PREFIX);
}
