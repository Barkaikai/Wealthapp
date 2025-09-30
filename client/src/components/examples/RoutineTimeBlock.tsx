import { RoutineTimeBlock } from "../RoutineTimeBlock";

export default function RoutineTimeBlockExample() {
  return (
    <div className="space-y-4 p-6 max-w-2xl">
      <RoutineTimeBlock
        time="05:00"
        title="Morning Workout"
        description="HIIT training and strength conditioning"
        category="health"
        duration="60 min"
      />
      <RoutineTimeBlock
        time="06:30"
        title="Market Analysis"
        description="Review overnight markets and news"
        category="wealth"
        duration="45 min"
      />
      <RoutineTimeBlock
        time="08:00"
        title="Deep Work Session"
        description="Strategic planning and high-priority tasks"
        category="productivity"
        duration="120 min"
      />
      <RoutineTimeBlock
        time="12:00"
        title="Lunch & Learning"
        description="Meal with educational podcast"
        category="personal"
        duration="60 min"
      />
    </div>
  );
}
