import { queryOne } from '../db/client';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

export async function getUserById(id: string) {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
}
