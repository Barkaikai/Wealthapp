import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimeDateProps {
  onClick?: () => void;
}

export function TimeDate({ onClick }: TimeDateProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const content = (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="h-4 w-4 text-primary" />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold" data-testid="current-time">{formatTime(currentTime)}</span>
        <span className="text-xs text-muted-foreground" data-testid="current-date">{formatDate(currentTime)}</span>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        className="h-auto p-2 hover-elevate"
        onClick={onClick}
        data-testid="button-time-date"
      >
        {content}
      </Button>
    );
  }

  return <div data-testid="time-date-display">{content}</div>;
}
