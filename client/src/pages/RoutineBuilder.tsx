import { useQuery, useMutation } from "@tanstack/react-query";
import { RoutineTimeBlock } from "@/components/RoutineTimeBlock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoutineSchema, type Routine } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function RoutineBuilder() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["/api/routines"],
  });

  const { data: recommendations } = useQuery<{ recommendations: string[] }>({
    queryKey: ["/api/routines/recommendations"],
    enabled: routines.length > 0,
  });

  const form = useForm({
    resolver: zodResolver(insertRoutineSchema.omit({ userId: true })),
    defaultValues: {
      time: "",
      title: "",
      description: "",
      category: "productivity" as const,
      duration: "",
    },
  });

  const createRoutine = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/routines", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routines/recommendations"] });
      toast({
        title: "Success",
        description: "Routine added successfully",
      });
      form.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add routine",
        variant: "destructive",
      });
    },
  });

  const exportCalendar = () => {
    window.location.href = '/api/routines/export/ics';
  };

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
          <Button variant="outline" onClick={exportCalendar} data-testid="button-export-routine">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-block">
                <Plus className="h-4 w-4 mr-2" />
                Add Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Block</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createRoutine.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input placeholder="05:00" {...field} data-testid="input-routine-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Morning Workout" {...field} data-testid="input-routine-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="HIIT training and strength conditioning" {...field} data-testid="input-routine-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-routine-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="health">Health</SelectItem>
                            <SelectItem value="wealth">Wealth</SelectItem>
                            <SelectItem value="productivity">Productivity</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="60 min" {...field} data-testid="input-routine-duration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createRoutine.isPending} className="w-full" data-testid="button-submit-routine">
                    {createRoutine.isPending ? "Adding..." : "Add Time Block"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {routines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No routine blocks yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Block
              </Button>
            </div>
          ) : (
            routines.map((block) => (
              <RoutineTimeBlock key={block.id} {...block} />
            ))
          )}
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

          {recommendations && recommendations.recommendations.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI Recommendations</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your routine:
              </p>
              <ul className="space-y-2 text-sm">
                {recommendations.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
