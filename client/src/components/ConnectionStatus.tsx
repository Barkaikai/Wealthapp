import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Poll the status endpoint every 30 seconds
  const { data: status, isError, isLoading } = useQuery({
    queryKey: ["/api/admin/status"],
    refetchInterval: 30000, // 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  // Also listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isConnected = !isError && !isLoading && status?.status === "ok" && isOnline;

  return (
    <Badge
      variant={isConnected ? "default" : "destructive"}
      className="gap-1.5 font-normal text-xs"
      data-testid="badge-connection-status"
    >
      {isConnected ? (
        <>
          <Activity className="h-3 w-3 animate-pulse" />
          Connected
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3" />
          Disconnected
        </>
      )}
    </Badge>
  );
}
