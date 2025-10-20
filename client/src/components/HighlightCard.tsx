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
    <Card className={cn("glass-card p-6 hover-elevate transition-all duration-500 float-slow", glowColor)} data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-1 text-primary pulse-glow" />
        <div className="flex-1">
          <h3 className="font-semibold mb-3 neon-text">{title}</h3>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="flex-1">
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
