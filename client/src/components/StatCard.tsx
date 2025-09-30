import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-6", className)} data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-mono font-semibold tracking-tight">{value}</p>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-chart-3" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-chart-3" : "text-destructive"
            )}>
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
