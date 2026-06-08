import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;

    if (text) {
      try {
        const payload = JSON.parse(text) as { message?: unknown; error?: unknown };
        const payloadMessage = payload.message ?? payload.error;
        if (typeof payloadMessage === "string" && payloadMessage.trim()) {
          message = payloadMessage;
        }
      } catch {
        // Keep the raw response body for non-JSON errors.
      }
    }

    throw new Error(`${res.status}: ${message}`);
  }
}

async function handleBannerResponse(res: Response) {
  if (res.status === 404) {
    return null;
  }
  await throwIfResNotOk(res);
  return res;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = auth.getToken();

  const headers: Record<string, string> = {};

  // Add content type for requests with data
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // Add authorization header if authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = auth.getToken();
    const headers: Record<string, string> = {};
    
    // Add authorization header if authenticated
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
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
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
