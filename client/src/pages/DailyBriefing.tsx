import { StatCard } from "@/components/StatCard";
import { HighlightCard } from "@/components/HighlightCard";
import { Sparkles, AlertTriangle, Target } from "lucide-react";

export default function DailyBriefing() {
  //todo: remove mock functionality
  const stats = [
    { title: "Total Wealth", value: "$2.45M", trend: { value: "+12.5%", isPositive: true } },
    { title: "Stocks", value: "$1.25M", trend: { value: "+8.2%", isPositive: true } },
    { title: "Crypto", value: "$450K", trend: { value: "-3.1%", isPositive: false } },
    { title: "Cash & Bonds", value: "$500K", trend: { value: "+1.5%", isPositive: true } },
  ];

  const highlights = [
    "Portfolio drift within target ranges",
    "New dividend received: $1,250",
    "Crypto rebalancing completed successfully"
  ];

  const risks = [
    "Equity exposure elevated near volatility threshold",
    "3 unread financial emails requiring attention",
    "Upcoming tax deadline: October 15th"
  ];

  const actions = [
    "Review quarterly rebalancing thresholds",
    "Prepare tax-loss harvesting options",
    "Schedule meeting with CPA for Q4 review"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Daily Briefing</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HighlightCard
          icon={Sparkles}
          title="Highlights"
          items={highlights}
          variant="success"
        />
        <HighlightCard
          icon={AlertTriangle}
          title="Risks"
          items={risks}
          variant="warning"
        />
        <HighlightCard
          icon={Target}
          title="Recommended Actions"
          items={actions}
        />
      </div>
    </div>
  );
}
