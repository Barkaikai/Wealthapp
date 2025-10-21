import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LearnLink } from "@/components/LearnLink";

interface HighlightCardProps {
  icon: LucideIcon;
  title: string;
  items: string[];
  variant?: "default" | "warning" | "success";
}

export function HighlightCard({ icon: Icon, title, items, variant = "default" }: HighlightCardProps) {
  const glowColor = {
    default: "cyber-glow",
    warning: "cyber-glow-yellow",
    success: "cyber-glow",
  }[variant];

  return (
    <Card className={cn("glass-card p-3 sm:p-4 md:p-6 hover-elevate transition-all duration-500 float-slow", glowColor)} data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 mt-1 text-primary pulse-glow flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-2 sm:mb-3 neon-text text-sm sm:text-base truncate">{title}</h3>
          <ul className="space-y-1 sm:space-y-2">
            {items.map((item, index) => (
              <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2 min-w-0">
                <span className="text-primary mt-1 flex-shrink-0">•</span>
                <span className="flex-1 min-w-0 break-words">
                  <LearnLink text={item} className="hover:underline" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
