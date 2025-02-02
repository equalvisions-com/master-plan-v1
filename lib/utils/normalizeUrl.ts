export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Standardize protocol and hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    // Remove trailing slash and hash
    parsed.pathname = parsed.pathname.replace(/\/$/, '');
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url; // Fallback for invalid URLs
  }
} 