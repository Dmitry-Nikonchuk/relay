import type {
  Adapter,
  AdapterAccount,
  AdapterAccountType,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from 'next-auth/adapters';

import type { D1Database } from '@cloudflare/workers-types';

import { execute, queryOne } from '@/shared/lib/db/client';

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  email_verified: string | null;
  image: string | null;
  created_at: string;
};

type AccountRow = {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

type SessionRow = {
  id: string;
  session_token: string;
  user_id: string;
  expires: string;
};

function toDate(value: string | null | undefined): Date | null {
  if (value == null || value === '') {
    return null;
  }
  return new Date(value);
}

function rowToUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: toDate(row.email_verified),
    image: row.image,
  };
}

function rowToAccount(row: AccountRow): AdapterAccount {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as AdapterAccountType,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    refresh_token: row.refresh_token ?? undefined,
    access_token: row.access_token ?? undefined,
    expires_at: row.expires_at ?? undefined,
    token_type: row.token_type ?? undefined,
    scope: row.scope ?? undefined,
    id_token: row.id_token ?? undefined,
    session_state: row.session_state ?? undefined,
  } as AdapterAccount;
}

export function D1Adapter(db: D1Database): Adapter {
  return {
    async createUser(user: AdapterUser) {
      const id = user.id ?? crypto.randomUUID();
      const now = new Date().toISOString();
      await execute(
        `INSERT INTO users (id, name, email, email_verified, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          user.name ?? '',
          user.email ?? '',
          user.emailVerified?.toISOString() ?? null,
          user.image ?? null,
          now,
        ],
        db,
      );
      return {
        id,
        name: user.name,
        email: user.email ?? '',
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      };
    },

    async getUser(id: string) {
      const row = await queryOne<UserRow>(
        'SELECT id, name, email, email_verified, image, created_at FROM users WHERE id = ?',
        [id],
        db,
      );
      return row ? rowToUser(row) : null;
    },

    async getUserByEmail(email: string) {
      const row = await queryOne<UserRow>(
        'SELECT id, name, email, email_verified, image, created_at FROM users WHERE email = ?',
        [email],
        db,
      );
      return row ? rowToUser(row) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const row = await queryOne<UserRow>(
        `SELECT u.id, u.name, u.email, u.email_verified, u.image, u.created_at
         FROM users u
         INNER JOIN accounts a ON a.user_id = u.id
         WHERE a.provider = ? AND a.provider_account_id = ?`,
        [provider, providerAccountId],
        db,
      );
      return row ? rowToUser(row) : null;
    },

    async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) {
        fields.push('name = ?');
        values.push(data.name);
      }
      if (data.email !== undefined) {
        fields.push('email = ?');
        values.push(data.email);
      }
      if (data.emailVerified !== undefined) {
        fields.push('email_verified = ?');
        values.push(data.emailVerified?.toISOString() ?? null);
      }
      if (data.image !== undefined) {
        fields.push('image = ?');
        values.push(data.image);
      }

      if (fields.length < 1) {
        const u = await queryOne<UserRow>(
          'SELECT id, name, email, email_verified, image, created_at FROM users WHERE id = ?',
          [data.id],
          db,
        );
        if (!u) {
          throw new Error(`User not found: ${data.id}`);
        }
        return rowToUser(u);
      }

      values.push(data.id);
      await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, db);

      const row = await queryOne<UserRow>(
        'SELECT id, name, email, email_verified, image, created_at FROM users WHERE id = ?',
        [data.id],
        db,
      );
      if (!row) {
        throw new Error(`User not found after update: ${data.id}`);
      }
      return rowToUser(row);
    },

    async deleteUser(userId: string) {
      await execute('DELETE FROM users WHERE id = ?', [userId], db);
    },

    async linkAccount(account: AdapterAccount) {
      const id = account.id ?? crypto.randomUUID();
      await execute(
        `INSERT INTO accounts (
          id, user_id, type, provider, provider_account_id,
          refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ],
        db,
      );
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await execute(
        'DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?',
        [provider, providerAccountId],
        db,
      );
    },

    async getAccount(providerAccountId, provider) {
      const row = await queryOne<AccountRow>(
        'SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?',
        [provider, providerAccountId],
        db,
      );
      return row ? rowToAccount(row) : null;
    },

    async createSession({ sessionToken, userId, expires }) {
      const id = crypto.randomUUID();
      await execute(
        `INSERT INTO sessions (id, session_token, user_id, expires) VALUES (?, ?, ?, ?)`,
        [id, sessionToken, userId, expires.toISOString()],
        db,
      );
      return { sessionToken, userId, expires };
    },

    async getSessionAndUser(sessionToken: string) {
      const row = await queryOne<
        SessionRow & {
          u_id: string;
          u_name: string | null;
          u_email: string;
          u_email_verified: string | null;
          u_image: string | null;
          u_created_at: string;
        }
      >(
        `SELECT s.id, s.session_token, s.user_id, s.expires,
                u.id AS u_id, u.name AS u_name, u.email AS u_email,
                u.email_verified AS u_email_verified, u.image AS u_image, u.created_at AS u_created_at
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.session_token = ?`,
        [sessionToken],
        db,
      );

      if (!row) {
        return null;
      }

      const session: AdapterSession = {
        sessionToken: row.session_token,
        userId: row.user_id,
        expires: toDate(row.expires) ?? new Date(0),
      };

      const user: AdapterUser = rowToUser({
        id: row.u_id,
        name: row.u_name,
        email: row.u_email,
        email_verified: row.u_email_verified,
        image: row.u_image,
        created_at: row.u_created_at,
      });

      return { session, user };
    },

    async updateSession(data) {
      const expires = data.expires;
      if (expires !== undefined) {
        await execute(
          'UPDATE sessions SET expires = ? WHERE session_token = ?',
          [expires.toISOString(), data.sessionToken],
          db,
        );
      }

      const row = await queryOne<SessionRow>(
        'SELECT id, session_token, user_id, expires FROM sessions WHERE session_token = ?',
        [data.sessionToken],
        db,
      );

      if (!row) {
        return null;
      }

      return {
        sessionToken: row.session_token,
        userId: row.user_id,
        expires: toDate(row.expires) ?? new Date(0),
      };
    },

    async deleteSession(sessionToken: string) {
      await execute('DELETE FROM sessions WHERE session_token = ?', [sessionToken], db);
    },

    async createVerificationToken(verificationToken: VerificationToken) {
      await execute(
        'INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)',
        [
          verificationToken.identifier,
          verificationToken.token,
          verificationToken.expires.toISOString(),
        ],
        db,
      );
      return verificationToken;
    },

    async useVerificationToken({ identifier, token }) {
      const row = await queryOne<{ identifier: string; token: string; expires: string }>(
        'SELECT identifier, token, expires FROM verification_tokens WHERE identifier = ? AND token = ?',
        [identifier, token],
        db,
      );

      if (!row) {
        return null;
      }

      await execute('DELETE FROM verification_tokens WHERE identifier = ? AND token = ?', [
        identifier,
        token,
      ]);

      return {
        identifier: row.identifier,
        token: row.token,
        expires: toDate(row.expires) ?? new Date(0),
      };
    },
  };
}
