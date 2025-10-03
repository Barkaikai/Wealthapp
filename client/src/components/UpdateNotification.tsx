import { useServiceWorker } from "@/hooks/useServiceWorker";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function UpdateNotification() {
  const { updateAvailable, updateApp } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className="bg-card border-primary">
        <Download className="h-4 w-4 text-primary" />
        <AlertTitle>Update Available</AlertTitle>
        <AlertDescription className="mt-2">
          A new version of the app is available. Update now for the latest features and improvements.
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={updateApp}
            size="sm"
            data-testid="button-update-app"
          >
            Update Now
          </Button>
        </div>
      </Alert>
    </div>
  );
}
