/**
 * Safe Fetch Wrapper - Server Side
 * Prevents JSON parsing errors when server returns HTML error pages
 * 
 * Usage:
 *   const result = await safeFetch('https://api.example.com/data');
 *   if (!result.ok) {
 *     console.error('API error:', result.error);
 *     if (result.html) console.error('HTML returned:', result.html.slice(0, 200));
 *   } else {
 *     const data = result.json;
 *     // use data
 *   }
 */

import fetch from 'node-fetch';

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  json?: any;
  html?: string;
  text?: string;
  error?: string;
  contentType?: string;
}

export async function safeFetch(
  url: string, 
  opts: any = {}
): Promise<SafeFetchResult> {
  try {
    const res = await fetch(url, {
      ...opts,
      timeout: opts.timeout || 10000, // 10s default timeout
    });
    
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
        return { 
          ok: false, 
          status: res.status, 
          error: 'invalid_json', 
          text,
          contentType: ct 
        };
      }
    } 
    
    // Check if response is HTML (error page)
    else if (ct.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      return { 
        ok: false, 
        status: res.status, 
        html: text,
        error: 'html_instead_of_json',
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
