/**
 * Safe Fetch and JSON Parser Utility
 * Prevents "Unexpected token '<', <!doctype..." syntax errors when static hosts return HTML fallback pages.
 */

export async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`Endpoint '${url}' returned HTML instead of JSON. Backend service may not be running at this URL.`);
  }

  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype')) {
    throw new Error(`Endpoint '${url}' returned an HTML page instead of valid JSON.`);
  }

  return JSON.parse(text) as T;
}
