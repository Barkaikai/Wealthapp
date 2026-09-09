// From javascript_log_in_with_replit integration
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

const localDevAuth = import.meta.env.DEV || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

const LOCAL_DEV_USER = {
  id: 'local-dev-user',
  email: 'dev@localhost',
  firstName: 'Local',
  lastName: 'Developer',
  profileImageUrl: '',
  isAdmin: true,
};

export function useAuth() {
  const loginStarted = useRef(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: !localDevAuth,
  });

  useEffect(() => {
    if (!localDevAuth || loginStarted.current) return;
    loginStarted.current = true;
    void fetch('/api/login', { credentials: 'include' }).catch(() => {});
  }, []);

  if (localDevAuth) {
    return {
      user: (user as any) || (LOCAL_DEV_USER as any),
      isLoading: false,
      isAuthenticated: true,
    };
  }

  return {
    user,
    isLoading: !user,
    isAuthenticated: !!user,
  };
}
