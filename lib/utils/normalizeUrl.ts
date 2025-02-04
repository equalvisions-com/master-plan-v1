export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === parsed.protocol.slice(0,-1)) {
      throw new Error("Suspicious protocol-only hostname");
    }
    if (!parsed.protocol || !parsed.hostname) {
      throw new Error("URL missing protocol or hostname");
    }
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    
    const sortedParams = new URLSearchParams(parsed.search);
    const sortedKeys = Array.from(sortedParams.keys()).sort();
    const newParams = new URLSearchParams();
    for (const key of sortedKeys) {
      newParams.set(key, sortedParams.get(key)!);
    }
    parsed.search = newParams.toString();
    
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return "";
  }
} 