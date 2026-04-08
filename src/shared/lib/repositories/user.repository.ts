import { queryOne } from '../db/client';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  email_verified: string | null;
  image: string | null;
}

export async function getUserById(id: string) {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
}
