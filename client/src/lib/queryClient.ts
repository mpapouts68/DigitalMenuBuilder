import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
  console.log('🌐 Frontend API Request:', {
    method,
    url,
    hasData: !!data,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 50) + '...' : 'none'
  });
  
  const headers: Record<string, string> = {};
  
  // Add content type for requests with data
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add authorization header if authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔑 Adding Authorization header:', `Bearer ${token.substring(0, 50)}...`);
  } else {
    console.log('❌ No token available for request');
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log('🌐 Frontend API Response:', {
    method,
    url,
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries())
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
