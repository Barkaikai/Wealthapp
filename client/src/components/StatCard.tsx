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
        "glass-card p-3 sm:p-4 md:p-6 group transition-all duration-500 pulse-glow-slow",
        onClick && "cursor-pointer hover-elevate active-elevate-2",
        className
      )} 
      data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1 sm:gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
          {onClick && (
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          )}
        </div>
        <p className="text-xl sm:text-2xl md:text-3xl font-mono font-semibold tracking-tight neon-text truncate">{value}</p>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-chart-3 flex-shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
            )}
            <span className={cn(
              "text-xs sm:text-sm font-medium truncate",
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
