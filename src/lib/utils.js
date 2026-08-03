import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Validate a redirect-after-login target as an INTERNAL path, or fall back.
 *
 * Why this exists rather than trusting the value: an unvalidated redirect
 * target on a login screen is an open redirect, which is a phishing primitive.
 * The attack is a genuine, correctly-spelled InReal login link that bounces the
 * investor to an attacker's lookalike the instant they authenticate — at which
 * point the credentials they type into the second screen were volunteered to a
 * link that really did start at our domain.
 *
 * Today the only caller passes a value set by our own ProtectedRoute through
 * router state, which an attacker cannot set from a link. This is deliberately
 * still validated: the check is nearly free, and the moment anyone adds a
 * `?next=` query parameter (the obvious next request) the input becomes
 * attacker-controlled with no other line of defence.
 *
 * Allow-list, not deny-list: a candidate must look like a site-relative path or
 * it is discarded entirely. Nothing is "cleaned up" and used anyway.
 */
export function safeInternalPath(candidate, fallback = '/') {
  if (typeof candidate !== 'string') return fallback;

  // Browsers strip tabs and newlines from URLs *before* resolving them, so
  // "/\t/evil.com" is fetched as "//evil.com" — a different origin. Validate
  // what the browser will actually act on, not what was written down.
  const path = candidate.replace(/[\t\n\r]/g, '');

  // Must be site-relative. This alone rejects "https://evil.com" and
  // "javascript:...", since neither begins with a slash.
  if (!path.startsWith('/')) return fallback;

  // "//evil.com" is protocol-relative and resolves to another origin. Windows
  // and several browsers treat a backslash as a path separator here too, so
  // "/\evil.com" is the same attack with one character changed.
  if (/^\/[/\\]/.test(path)) return fallback;

  return path;
}

// Return normalized API base URL from env or fallback
export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Trim whitespace and trailing slash
  let url = String(raw).trim().replace(/\/$/, '');

  // If running in production (deployed over HTTPS) and the URL uses http://, prefer https
  try {
    const loc = typeof window !== 'undefined' ? window.location : null;
    if (loc && loc.protocol === 'https:' && url.startsWith('http://')) {
      url = url.replace(/^http:\/\//i, 'https://');
    }
  } catch (e) {
    // ignore
  }

  return url;
}