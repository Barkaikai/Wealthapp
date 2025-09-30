import { PortfolioTimeline } from "../PortfolioTimeline";

export default function PortfolioTimelineExample() {
  const data = [
    { date: "Jan", value: 1800000 },
    { date: "Feb", value: 1950000 },
    { date: "Mar", value: 1875000 },
    { date: "Apr", value: 2100000 },
    { date: "May", value: 2250000 },
    { date: "Jun", value: 2200000 },
    { date: "Jul", value: 2350000 },
    { date: "Aug", value: 2400000 },
    { date: "Sep", value: 2450000 },
  ];

  return (
    <div className="p-6">
      <PortfolioTimeline data={data} title="Portfolio Growth (YTD)" />
    </div>
  );
}
