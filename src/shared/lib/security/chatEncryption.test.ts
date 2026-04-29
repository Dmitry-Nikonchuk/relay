import assert from 'node:assert/strict';
import test from 'node:test';

process.env.CHAT_DATA_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');

let createUserChatCipher: typeof import('./chatEncryption').createUserChatCipher;
let isEncryptedChatValue: typeof import('./chatEncryption').isEncryptedChatValue;

test.before(async () => {
  ({ createUserChatCipher, isEncryptedChatValue } = await import('./chatEncryption'));
});

test('encrypts and decrypts user-scoped chat values', async () => {
  const cipher = await createUserChatCipher('user-1');
  const encrypted = await cipher.encrypt('hello world', 'message_content', 'chat-1');

  assert.equal(isEncryptedChatValue(encrypted), true);
  assert.notEqual(encrypted, 'hello world');
  assert.equal(await cipher.decrypt(encrypted, 'message_content', 'chat-1'), 'hello world');
});

test('keeps plaintext values readable during lazy migration', async () => {
  const cipher = await createUserChatCipher('user-1');
  assert.equal(
    await cipher.decrypt('legacy plaintext', 'chat_title', 'chat-1'),
    'legacy plaintext',
  );
  assert.equal(await cipher.decryptNullable(null, 'chat_title', 'chat-1'), null);
});

test('rejects decryption with the wrong user context', async () => {
  const authorCipher = await createUserChatCipher('user-1');
  const otherCipher = await createUserChatCipher('user-2');
  const encrypted = await authorCipher.encrypt('top secret', 'message_content', 'chat-1');

  await assert.rejects(
    () => otherCipher.decrypt(encrypted, 'message_content', 'chat-1'),
    /Failed to decrypt message_content/,
  );
});

test('rejects ciphertext replayed into a different scope or chat', async () => {
  const cipher = await createUserChatCipher('user-1');
  const encrypted = await cipher.encrypt('summary', 'chat_memory_summary_text', 'chat-1');

  await assert.rejects(
    () => cipher.decrypt(encrypted, 'chat_memory_summary_json', 'chat-1'),
    /Failed to decrypt chat_memory_summary_json/,
  );
  await assert.rejects(
    () => cipher.decrypt(encrypted, 'chat_memory_summary_text', 'chat-2'),
    /Failed to decrypt chat_memory_summary_text/,
  );
});
