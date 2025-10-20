import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, trend, className, onClick }: StatCardProps) {
  return (
    <Card 
      className={cn(
        "p-6 group",
        onClick && "cursor-pointer hover-elevate active-elevate-2",
        className
      )} 
      data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {onClick && (
            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
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
