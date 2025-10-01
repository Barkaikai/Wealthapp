import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckSquare, Plus, Sparkles, Mic } from 'lucide-react';
import { format } from 'date-fns';

type CalendarEvent = {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
};

type Task = {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  category?: string;
  aiSuggestions?: string;
};

export default function ProductivityHub() {
  const { toast } = useToast();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/calendar/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({ title: "Event created successfully" });
      setEventDialogOpen(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task created successfully" });
      setTaskDialogOpen(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => await apiRequest('PATCH', `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task updated successfully" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Productivity Hub</h1>
        <p className="text-muted-foreground">Manage your calendar, tasks, and AI-powered productivity</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Calendar Events</h2>
            <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createEventMutation.mutate({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    startTime: new Date(formData.get('startTime') as string).toISOString(),
                    endTime: new Date(formData.get('endTime') as string).toISOString(),
                    location: formData.get('location'),
                    isAllDay: 'false',
                    source: 'manual',
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required data-testid="input-event-title" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" data-testid="input-event-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" name="startTime" type="datetime-local" required data-testid="input-event-start" />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" name="endTime" type="datetime-local" required data-testid="input-event-end" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" data-testid="input-event-location" />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-save-event">Create Event</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No events scheduled. Create your first event!</p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id} data-testid={`event-${event.id}`}>
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(event.startTime), 'PPP p')} - {format(new Date(event.endTime), 'p')}
                    </CardDescription>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="text-sm">{event.description}</p>
                      {event.location && <p className="text-sm text-muted-foreground mt-2">📍 {event.location}</p>}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Tasks & To-Do</h2>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-task">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createTaskMutation.mutate({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    priority: formData.get('priority'),
                    category: formData.get('category'),
                    dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string).toISOString() : null,
                    status: 'pending',
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="task-title">Title</Label>
                    <Input id="task-title" name="title" required data-testid="input-task-title" />
                  </div>
                  <div>
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea id="task-description" name="description" data-testid="input-task-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select name="priority" defaultValue="medium">
                        <SelectTrigger data-testid="select-task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" defaultValue="personal">
                        <SelectTrigger data-testid="select-task-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="datetime-local" data-testid="input-task-due-date" />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-save-task">Create Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} data-testid={`task-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => updateTaskMutation.mutate({
                              id: task.id,
                              status: task.status === 'completed' ? 'pending' : 'completed',
                              completedAt: task.status === 'completed' ? null : new Date().toISOString(),
                            })}
                            className="h-4 w-4"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <CardTitle className={task.status === 'completed' ? 'line-through' : ''}>{task.title}</CardTitle>
                        </div>
                        {task.description && <CardDescription className="mt-2">{task.description}</CardDescription>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'urgent' ? 'bg-red-500 text-white' :
                          task.priority === 'high' ? 'bg-orange-500 text-white' :
                          task.priority === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>{task.priority}</span>
                        {task.category && <span className="text-xs text-muted-foreground">{task.category}</span>}
                      </div>
                    </div>
                  </CardHeader>
                  {task.dueDate && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Due: {format(new Date(task.dueDate), 'PPP')}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
