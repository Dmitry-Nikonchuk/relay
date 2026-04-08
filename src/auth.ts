import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { NextResponse } from 'next/server';

import { D1Adapter } from '@/shared/lib/auth/d1-adapter';
import { getDb } from '@/shared/lib/db/context';

/** 90 days — long-lived session; extended at most once per `updateAge` window. */
const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const db = getDb();

  return {
    adapter: D1Adapter(db),
    session: {
      strategy: 'database',
      maxAge: SESSION_MAX_AGE_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    providers: [
      Google({
        allowDangerousEmailAccountLinking: true,
      }),
    ],
    pages: {
      signIn: '/auth',
    },
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
      authorized({ auth: session, request }) {
        const { pathname } = request.nextUrl;
        const isAuthed = !!session?.user;

        const isProtectedAppRoute =
          pathname.startsWith('/chat') ||
          pathname.startsWith('/profile') ||
          pathname.startsWith('/api/chat');

        if (isProtectedAppRoute) {
          if (!isAuthed) {
            if (pathname.startsWith('/api')) {
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const signInUrl = new URL('/auth', request.url);
            signInUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
            return NextResponse.redirect(signInUrl);
          }
        }

        return true;
      },
    },
    trustHost: true,
  };
});
