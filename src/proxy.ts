export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/chat/:path*', '/profile', '/profile/:path*', '/api/chat/:path*', '/api/user/:path*'],
};
