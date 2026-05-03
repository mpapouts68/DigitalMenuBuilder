import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/auth";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: auth.isAuthenticated(), // Only run query if we have a token
  });

  return {
    user,
    isLoading,
    isAuthenticated: auth.isAuthenticated() && !!user && !error,
  };
}