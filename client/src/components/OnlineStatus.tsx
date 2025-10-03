import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveStatus = manualOverride !== null ? manualOverride : isOnline;

  const toggleStatus = () => {
    if (manualOverride === null) {
      // First click: set to opposite of current status
      setManualOverride(!isOnline);
    } else if (manualOverride === !isOnline) {
      // Second click: set to same as current status
      setManualOverride(isOnline);
    } else {
      // Third click: reset to automatic mode
      setManualOverride(null);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleStatus}
          className="relative"
          data-testid="button-online-status"
        >
          {effectiveStatus ? (
            <>
              <Wifi className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" data-testid="status-online" />
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" data-testid="status-offline" />
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{effectiveStatus ? "Online" : "Offline"} Mode {manualOverride !== null && "(Manual)"}</p>
        <p className="text-xs text-muted-foreground">Click to cycle modes</p>
      </TooltipContent>
    </Tooltip>
  );
}
