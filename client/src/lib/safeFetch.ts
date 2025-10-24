/**
 * Safe Fetch Wrapper - Client Side
 * Prevents JSON parsing errors when server returns HTML error pages
 * 
 * Usage:
 *   const result = await safeFetch('/api/data');
 *   if (!result.ok) {
 *     toast({ title: 'Error', description: result.error });
 *     if (result.htmlSnippet) console.error('Server returned HTML:', result.htmlSnippet);
 *   } else {
 *     const data = result.json;
 *     // use data
 *   }
 */

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  json?: any;
  html?: string;
  htmlSnippet?: string;
  text?: string;
  error?: string;
  contentType?: string;
}

export async function safeFetch(
  url: string, 
  opts: RequestInit = {}
): Promise<SafeFetchResult> {
  try {
    const res = await fetch(url, opts);
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    
    // Check if response is JSON
    if (ct.includes('application/json') || ct.includes('json')) {
      try {
        const json = JSON.parse(text);
        return { 
          ok: res.ok, 
          status: res.status, 
          json, 
          contentType: ct 
        };
      } catch (err) {
        // JSON parsing failed
        console.error('JSON parse error:', err, 'Text:', text.slice(0, 200));
        return { 
          ok: false, 
          status: res.status, 
          error: 'invalid_json', 
          text: text.slice(0, 1000),
          contentType: ct 
        };
      }
    } 
    
    // Check if response is HTML (error page)
    else if (ct.includes('text/html') || looksLikeHTML(text)) {
      const snippet = text.slice(0, 500);
      console.error(`Server returned HTML instead of JSON for ${url}:`, snippet);
      
      return { 
        ok: false, 
        status: res.status, 
        html: text,
        htmlSnippet: snippet,
        error: 'server_returned_html',
        contentType: ct 
      };
    } 
    
    // Other content type
    else {
      return { 
        ok: res.ok, 
        status: res.status, 
        text,
        contentType: ct 
        };
    }
  } catch (err: any) {
    console.error('Fetch error:', err);
    return { 
      ok: false, 
      status: 0, 
      error: err.message || 'fetch_failed' 
    };
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse<T = any>(text: string, defaultValue: T | null = null): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return defaultValue;
  }
}

/**
 * Validate that response is JSON before parsing
 */
export function isJSONResponse(contentType: string): boolean {
  return contentType.includes('application/json') || contentType.includes('json');
}

/**
 * Check if text looks like HTML
 */
export function looksLikeHTML(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML') ||
    trimmed.startsWith('<?xml')
  );
}

/**
 * Enhanced fetch wrapper that also handles response validation
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const result = await safeFetch(url, options);
  
  if (!result.ok) {
    const errorMessage = result.error || `Request failed with status ${result.status}`;
    
    if (result.htmlSnippet) {
      throw new Error(`${errorMessage} (Server returned HTML error page)`);
    }
    
    if (result.json?.error) {
      throw new Error(result.json.error);
    }
    
    if (result.json?.message) {
      throw new Error(result.json.message);
    }
    
    throw new Error(errorMessage);
  }
  
  return result.json as T;
}
