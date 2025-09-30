import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutineTimeBlockProps {
  time: string;
  title: string;
  description?: string;
  category: "health" | "wealth" | "productivity" | "personal";
  duration: string;
}

export function RoutineTimeBlock({ time, title, description, category, duration }: RoutineTimeBlockProps) {
  const categoryColors = {
    health: "bg-chart-3/10 text-chart-3 border-chart-3",
    wealth: "bg-chart-1/10 text-chart-1 border-chart-1",
    productivity: "bg-chart-2/10 text-chart-2 border-chart-2",
    personal: "bg-chart-4/10 text-chart-4 border-chart-4",
  };

  return (
    <Card className={cn("p-4 border-l-4", categoryColors[category])} data-testid={`routine-block-${time}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono font-medium text-muted-foreground">{time}</span>
            <Badge variant="secondary" className={cn("text-xs", categoryColors[category])}>
              {category}
            </Badge>
          </div>
          <h4 className="font-semibold mb-1">{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{duration}</span>
          </div>
        </div>
        <button className="text-muted-foreground hover-elevate p-1 rounded">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
