import { HighlightCard } from "../HighlightCard";
import { Sparkles, AlertTriangle, Target } from "lucide-react";

export default function HighlightCardExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <HighlightCard
        icon={Sparkles}
        title="Highlights"
        items={[
          "Portfolio drift within target ranges",
          "New dividend received: $1,250",
          "Crypto rebalancing completed successfully"
        ]}
        variant="success"
      />
      <HighlightCard
        icon={AlertTriangle}
        title="Risks"
        items={[
          "Equity exposure elevated near volatility threshold",
          "3 unread financial emails requiring attention"
        ]}
        variant="warning"
      />
      <HighlightCard
        icon={Target}
        title="Recommended Actions"
        items={[
          "Review quarterly rebalancing thresholds",
          "Prepare tax-loss harvesting options",
          "Schedule meeting with CPA for Q4 review"
        ]}
      />
    </div>
  );
}
