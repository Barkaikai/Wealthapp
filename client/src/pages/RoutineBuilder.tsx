import { RoutineTimeBlock } from "@/components/RoutineTimeBlock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Download } from "lucide-react";

export default function RoutineBuilder() {
  //todo: remove mock functionality
  const routine = [
    { time: "05:00", title: "Morning Workout", description: "HIIT training and strength conditioning", category: "health" as const, duration: "60 min" },
    { time: "06:30", title: "Market Analysis", description: "Review overnight markets and news", category: "wealth" as const, duration: "45 min" },
    { time: "08:00", title: "Deep Work Session", description: "Strategic planning and high-priority tasks", category: "productivity" as const, duration: "120 min" },
    { time: "10:30", title: "Email & Communications", description: "Process inbox with AI assistance", category: "productivity" as const, duration: "30 min" },
    { time: "12:00", title: "Lunch & Learning", description: "Meal with educational podcast", category: "personal" as const, duration: "60 min" },
    { time: "13:00", title: "Investment Review", description: "Portfolio monitoring and adjustments", category: "wealth" as const, duration: "45 min" },
    { time: "14:00", title: "Focused Project Work", description: "Core business activities", category: "productivity" as const, duration: "180 min" },
    { time: "18:00", title: "Evening Exercise", description: "Yoga or light cardio", category: "health" as const, duration: "45 min" },
    { time: "19:30", title: "Family Time", description: "Dinner and quality time", category: "personal" as const, duration: "120 min" },
    { time: "22:00", title: "Reading & Reflection", description: "Book reading and journaling", category: "personal" as const, duration: "60 min" },
  ];

  const templates = [
    { name: "Jeff Bezos Morning", activities: 5, focus: "Deep work before meetings" },
    { name: "Elon Musk Schedule", activities: 8, focus: "Time-blocked efficiency" },
    { name: "Tim Cook Routine", activities: 6, focus: "Early rise, fitness first" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Routine Builder</h1>
          <p className="text-muted-foreground">Design your optimal daily schedule</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-routine">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="button-add-block">
            <Plus className="h-4 w-4 mr-2" />
            Add Block
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {routine.map((block, index) => (
            <RoutineTimeBlock key={index} {...block} />
          ))}
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Templates from Successful Leaders</h3>
            <div className="space-y-3">
              {templates.map((template, index) => (
                <Card key={index} className="p-4 hover-elevate cursor-pointer" data-testid={`template-${index}`}>
                  <h4 className="font-medium mb-1">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{template.activities} activities</p>
                  <p className="text-xs text-muted-foreground">{template.focus}</p>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">AI Recommendations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Based on your goals and lifestyle analysis, consider adding:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>15-min meditation (morning)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Weekly financial review session</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Power nap slot (post-lunch)</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
