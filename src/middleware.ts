export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/chat/:path*', '/profile', '/profile/:path*', '/api/chat/:path*'],
};
