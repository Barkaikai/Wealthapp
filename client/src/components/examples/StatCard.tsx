import { StatCard } from "../StatCard";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <StatCard
        title="Total Wealth"
        value="$2.45M"
        trend={{ value: "+12.5%", isPositive: true }}
      />
      <StatCard
        title="Stocks"
        value="$1.25M"
        trend={{ value: "+8.2%", isPositive: true }}
      />
      <StatCard
        title="Crypto"
        value="$450K"
        trend={{ value: "-3.1%", isPositive: false }}
      />
      <StatCard
        title="Cash"
        value="$200K"
      />
    </div>
  );
}
