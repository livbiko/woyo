import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // delete-account excluded: it's a static public/ HTML page rewritten in
  // next.config.ts, not a locale-aware App Router page -- letting the intl
  // middleware redirect it first would 404 before the rewrite ever runs.
  matcher: ['/((?!api|_next|_vercel|delete-account|.*\\..*).*)'],
};
