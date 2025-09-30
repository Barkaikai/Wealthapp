import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HighlightCardProps {
  icon: LucideIcon;
  title: string;
  items: string[];
  variant?: "default" | "warning" | "success";
}

export function HighlightCard({ icon: Icon, title, items, variant = "default" }: HighlightCardProps) {
  const borderColor = {
    default: "border-l-primary",
    warning: "border-l-chart-4",
    success: "border-l-chart-3",
  }[variant];

  return (
    <Card className={cn("p-6 border-l-4", borderColor)} data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-1 text-muted-foreground" />
        <div className="flex-1">
          <h3 className="font-semibold mb-3">{title}</h3>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
