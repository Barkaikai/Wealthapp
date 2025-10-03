import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";

interface Event {
  id: number;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: string;
  priority?: string;
}

interface DigitalCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DigitalCalendar({ open, onOpenChange }: DigitalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/calendar-events'],
    enabled: open,
  });

  const goToPrevious = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, -1));
    } else if (view === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.eventDate), date)
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold p-2 text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          
          return (
            <Card
              key={i}
              className={`min-h-24 p-2 ${!isCurrentMonth ? 'opacity-30' : ''} ${isToday(day) ? 'border-primary' : ''} hover-elevate cursor-pointer`}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
              data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1 mt-1">
                {dayEvents.slice(0, 2).map(event => (
                  <Badge
                    key={event.id}
                    variant="secondary"
                    className="text-xs truncate w-full block"
                    data-testid={`event-badge-${event.id}`}
                  >
                    {event.title}
                  </Badge>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDate(day);
          
          return (
            <Card 
              key={day.toISOString()} 
              className={`min-h-48 p-3 ${isToday(day) ? 'border-primary' : ''} hover-elevate cursor-pointer`}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
              data-testid={`week-day-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className={`text-center mb-2 ${isToday(day) ? 'text-primary' : ''}`}>
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div className="text-lg font-bold">{format(day, 'd')}</div>
              </div>
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <Badge
                    key={event.id}
                    variant="secondary"
                    className="text-xs truncate w-full block"
                    data-testid={`week-event-${event.id}`}
                  >
                    {event.startTime && <span className="font-mono">{event.startTime}</span>}
                    <span className="ml-1">{event.title}</span>
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="space-y-2">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</div>
        </div>
        {dayEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No events scheduled for this day</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {dayEvents.map(event => (
              <Card key={event.id} className="p-4 hover-elevate" data-testid={`day-event-${event.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{event.title}</div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                      {event.startTime && event.endTime && (
                        <span className="font-mono">{event.startTime} - {event.endTime}</span>
                      )}
                      {event.location && <span>📍 {event.location}</span>}
                    </div>
                  </div>
                  {event.priority && (
                    <Badge variant={event.priority === 'high' ? 'destructive' : 'secondary'}>
                      {event.priority}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span>Digital Calendar</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={goToPrevious}
                data-testid="button-calendar-previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={goToNext}
                data-testid="button-calendar-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                data-testid="button-calendar-today"
              >
                Today
              </Button>
            </div>

            <div className="text-lg font-semibold">
              {view === "month" && format(currentDate, 'MMMM yyyy')}
              {view === "week" && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
              {view === "day" && format(currentDate, 'MMMM d, yyyy')}
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-auto">
              <TabsList>
                <TabsTrigger value="month" data-testid="tab-month-view">Month</TabsTrigger>
                <TabsTrigger value="week" data-testid="tab-week-view">Week</TabsTrigger>
                <TabsTrigger value="day" data-testid="tab-day-view">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Calendar Views */}
          <div className="min-h-96">
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
