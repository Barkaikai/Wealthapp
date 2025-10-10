import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { queueMutation } from "./offlineQueue";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        const errorData = await res.json();
        const error: any = new Error(errorData.message || res.statusText);
        error.status = res.status;
        error.action = errorData.action;
        throw error;
      } catch (e) {
        if (e instanceof Error && e.message !== res.statusText) {
          const err: any = e;
          err.status = res.status;
          throw err;
        }
      }
    }
    
    const text = (await res.text()) || res.statusText;
    const error: any = new Error(`${res.status}: ${text}`);
    error.status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if online
  if (!navigator.onLine && method !== 'GET') {
    // Queue mutation for later
    await queueMutation(url, method, data, {
      priority: getPriority(url),
      maxRetries: 3,
    });
    
    // Return synthetic response indicating queued
    const queuedResponse = new Response(
      JSON.stringify({ 
        queued: true,
        message: 'Request queued for when connection is restored'
      }),
      { 
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return queuedResponse;
  }

  try {
    // Get CSRF token from cookie for state-changing requests
    const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
    
    if (method !== 'GET') {
      // Extract CSRF token from __Host.x-csrf-token cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('__Host.x-csrf-token='))
        ?.split('=')[1];
      
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // If fetch fails and it's a mutation, queue it
    if (!navigator.onLine && method !== 'GET') {
      await queueMutation(url, method, data, {
        priority: getPriority(url),
        maxRetries: 3,
      });
      
      const queuedResponse = new Response(
        JSON.stringify({ 
          queued: true,
          message: 'Request queued for when connection is restored'
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return queuedResponse;
    }
    
    throw error;
  }
}

// Helper to determine priority based on URL
function getPriority(url: string): number {
  // Critical operations get higher priority
  if (url.includes('/health/')) return 10;
  if (url.includes('/accounting/')) return 9;
  if (url.includes('/crm/')) return 8;
  if (url.includes('/tasks/')) return 7;
  if (url.includes('/calendar/')) return 6;
  if (url.includes('/notes/')) return 5;
  return 0; // Default priority
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors (401, 403)
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Don't retry on client errors (400-499)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors (500+) and network errors  
        return failureCount < 2; // failureCount starts at 0, so < 2 allows retries at count 0 and 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s
    },
    mutations: {
      retry: false, // Don't auto-retry mutations to avoid duplicate operations
    },
  },
});
