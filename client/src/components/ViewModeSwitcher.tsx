import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { useViewMode } from "./ViewModeProvider";

export function ViewModeSwitcher() {
  const { viewMode, toggleViewMode } = useViewMode();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleViewMode}
      data-testid="button-toggle-view-mode"
      className="gap-2"
    >
      {viewMode === "mobile" ? (
        <>
          <Smartphone className="h-4 w-4" />
          <span className="hidden sm:inline">Mobile View</span>
        </>
      ) : (
        <>
          <Monitor className="h-4 w-4" />
          <span className="hidden sm:inline">Desktop View</span>
        </>
      )}
    </Button>
  );
}
