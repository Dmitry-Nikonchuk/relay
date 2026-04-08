import { auth } from '@/auth';

/** Returns authenticated user id, or `null` if there is no session. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
