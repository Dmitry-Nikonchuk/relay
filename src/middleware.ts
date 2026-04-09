/**
 * Use `middleware` + Edge runtime for Cloudflare (OpenNext). `proxy.ts` targets the Node
 * middleware pipeline and fails deploy with “Node.js middleware is not currently supported”.
 * @see https://github.com/opennextjs/opennextjs-cloudflare/issues/962
 */
export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/chat/:path*', '/profile', '/profile/:path*', '/api/chat/:path*', '/api/user/:path*'],
};
