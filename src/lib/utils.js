import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
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