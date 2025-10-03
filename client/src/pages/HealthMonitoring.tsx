import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Activity, Footprints, Dumbbell, Heart, Brain, Moon, Utensils, Sparkles, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import type { 
  StepRecord, 
  ExerciseRecord, 
  VitalRecord, 
  MindfulnessSession, 
  SleepLog, 
  FoodLog,
  AISyncLog 
} from '@shared/schema';

export default function HealthMonitoring() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: steps = [], isLoading: stepsLoading } = useQuery<StepRecord[]>({
    queryKey: ['/api/health/steps'],
  });

  const { data: exercises = [], isLoading: exercisesLoading } = useQuery<ExerciseRecord[]>({
    queryKey: ['/api/health/exercise'],
  });

  const { data: vitals = [], isLoading: vitalsLoading } = useQuery<VitalRecord[]>({
    queryKey: ['/api/health/vitals'],
  });

  const { data: mindfulness = [], isLoading: mindfulnessLoading } = useQuery<MindfulnessSession[]>({
    queryKey: ['/api/health/mindfulness'],
  });

  const { data: sleep = [], isLoading: sleepLoading } = useQuery<SleepLog[]>({
    queryKey: ['/api/health/sleep'],
  });

  const { data: food = [], isLoading: foodLoading } = useQuery<FoodLog[]>({
    queryKey: ['/api/health/food'],
  });

  const { data: syncHistory = [], isLoading: syncHistoryLoading } = useQuery<AISyncLog[]>({
    queryKey: ['/api/health/sync/history'],
  });

  const syncMutation = useMutation({
    mutationFn: async (syncType: string) => 
      await apiRequest('POST', '/api/health/sync', { syncType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/sync/history'] });
      toast({ title: "Health data synced with AI successfully" });
    },
  });

  const latestSync = syncHistory[0];
  const healthScore = latestSync?.healthScore || 0;

  const totalSteps = steps.reduce((sum, s) => sum + s.steps, 0);
  const totalExercises = exercises.length;
  const avgSleep = sleep.length > 0 
    ? Math.round(sleep.reduce((sum, s) => sum + s.totalSleepMinutes, 0) / sleep.length / 60 * 10) / 10 
    : 0;
  const totalMeals = food.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Health Monitoring</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Comprehensive health tracking with AI-powered insights
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="steps" data-testid="tab-steps">
            <Footprints className="h-4 w-4 mr-2" />
            Steps
          </TabsTrigger>
          <TabsTrigger value="exercise" data-testid="tab-exercise">
            <Dumbbell className="h-4 w-4 mr-2" />
            Exercise
          </TabsTrigger>
          <TabsTrigger value="vitals" data-testid="tab-vitals">
            <Heart className="h-4 w-4 mr-2" />
            Vitals
          </TabsTrigger>
          <TabsTrigger value="mindfulness" data-testid="tab-mindfulness">
            <Brain className="h-4 w-4 mr-2" />
            Mindfulness
          </TabsTrigger>
          <TabsTrigger value="sleep" data-testid="tab-sleep">
            <Moon className="h-4 w-4 mr-2" />
            Sleep
          </TabsTrigger>
          <TabsTrigger value="food" data-testid="tab-food">
            <Utensils className="h-4 w-4 mr-2" />
            Food
          </TabsTrigger>
          <TabsTrigger value="ai-sync" data-testid="tab-ai-sync">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
                <Footprints className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-steps">{totalSteps.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{steps.length} records</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workouts</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-exercises">{totalExercises}</div>
                <p className="text-xs text-muted-foreground">Exercise sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Sleep</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-sleep">{avgSleep}h</div>
                <p className="text-xs text-muted-foreground">{sleep.length} nights tracked</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-health-score">{healthScore}/100</div>
                <p className="text-xs text-muted-foreground">AI-powered assessment</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.slice(0, 3).map((step) => (
                  <div key={step.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{step.steps.toLocaleString()} steps</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(step.startTime), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.calories?.toFixed(0)} cal</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {latestSync?.insights && latestSync.insights.length > 0 ? (
                  <ul className="space-y-2">
                    {latestSync.insights.slice(0, 3).map((insight, i) => (
                      <li key={i} className="text-sm">{insight}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No insights yet. Sync your health data to get AI-powered insights.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="steps">
          <StepsTab steps={steps} isLoading={stepsLoading} />
        </TabsContent>

        <TabsContent value="exercise">
          <ExerciseTab exercises={exercises} isLoading={exercisesLoading} />
        </TabsContent>

        <TabsContent value="vitals">
          <VitalsTab vitals={vitals} isLoading={vitalsLoading} />
        </TabsContent>

        <TabsContent value="mindfulness">
          <MindfulnessTab sessions={mindfulness} isLoading={mindfulnessLoading} />
        </TabsContent>

        <TabsContent value="sleep">
          <SleepTab logs={sleep} isLoading={sleepLoading} />
        </TabsContent>

        <TabsContent value="food">
          <FoodTab logs={food} isLoading={foodLoading} />
        </TabsContent>

        <TabsContent value="ai-sync">
          <AISyncTab 
            syncHistory={syncHistory} 
            isLoading={syncHistoryLoading}
            onSync={(type) => syncMutation.mutate(type)}
            isSyncing={syncMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StepsTab({ steps, isLoading }: { steps: StepRecord[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/steps', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/steps'] });
      toast({ title: "Step record added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Steps Tracking</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-steps">
              <Plus className="mr-2 h-4 w-4" />
              Add Steps
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Step Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const date = new Date(formData.get('date') as string);
              createMutation.mutate({
                startTime: new Date(date.setHours(0, 0, 0, 0)).toISOString(),
                endTime: new Date(date.setHours(23, 59, 59, 999)).toISOString(),
                steps: parseInt(formData.get('steps') as string),
                distanceMeters: parseFloat(formData.get('distanceMeters') as string) || undefined,
                device: formData.get('device') || 'manual',
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required data-testid="input-step-date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <Label htmlFor="steps">Steps</Label>
                <Input id="steps" name="steps" type="number" required data-testid="input-steps" />
              </div>
              <div>
                <Label htmlFor="distanceMeters">Distance (meters)</Label>
                <Input id="distanceMeters" name="distanceMeters" type="number" step="0.01" data-testid="input-distance" />
              </div>
              <div>
                <Label htmlFor="device">Device</Label>
                <Input id="device" name="device" placeholder="e.g., iPhone, Fitbit" data-testid="input-device" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-steps">
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : steps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Footprints className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No step records yet. Start tracking your daily steps!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {steps.map((step) => (
            <Card key={step.id} data-testid={`step-${step.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{step.steps.toLocaleString()} steps</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {format(new Date(step.startTime), 'PPP')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {step.distanceMeters && (
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium">{(step.distanceMeters / 1000).toFixed(2)} km</p>
                    </div>
                  )}
                  {step.calories && (
                    <div>
                      <p className="text-muted-foreground">Calories</p>
                      <p className="font-medium">{step.calories.toFixed(0)} cal</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseTab({ exercises, isLoading }: { exercises: ExerciseRecord[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/exercise', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/exercise'] });
      toast({ title: "Exercise record added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exercise Sessions</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-exercise">
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exercise Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const date = new Date(formData.get('date') as string);
              const durationMinutes = parseInt(formData.get('durationMinutes') as string);
              createMutation.mutate({
                activityType: formData.get('activityType'),
                durationMinutes,
                date: date.toISOString(),
                distanceMeters: parseFloat(formData.get('distanceMeters') as string) || undefined,
                calories: parseFloat(formData.get('calories') as string) || undefined,
                intensity: formData.get('intensity') || undefined,
                notes: formData.get('notes') || undefined,
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="activityType">Activity Type</Label>
                <Select name="activityType" required>
                  <SelectTrigger data-testid="select-activity-type">
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cycling">Cycling</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="swimming">Swimming</SelectItem>
                    <SelectItem value="workout">Workout</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" required data-testid="input-exercise-date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <Label htmlFor="durationMinutes">Duration (min)</Label>
                  <Input id="durationMinutes" name="durationMinutes" type="number" required data-testid="input-duration" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distanceMeters">Distance (m)</Label>
                  <Input id="distanceMeters" name="distanceMeters" type="number" step="0.01" data-testid="input-exercise-distance" />
                </div>
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input id="calories" name="calories" type="number" step="0.01" data-testid="input-exercise-calories" />
                </div>
              </div>
              <div>
                <Label htmlFor="intensity">Intensity</Label>
                <Select name="intensity">
                  <SelectTrigger data-testid="select-intensity">
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" data-testid="input-exercise-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-exercise">
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No exercise records yet. Start tracking your workouts!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exercises.map((exercise) => (
            <Card key={exercise.id} data-testid={`exercise-${exercise.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{exercise.activityType}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {format(new Date(exercise.startTime), 'PPP')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{exercise.durationMinutes} min</p>
                  </div>
                  {exercise.distanceMeters && (
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium">{(exercise.distanceMeters / 1000).toFixed(2)} km</p>
                    </div>
                  )}
                  {exercise.calories && (
                    <div>
                      <p className="text-muted-foreground">Calories</p>
                      <p className="font-medium">{exercise.calories.toFixed(0)} cal</p>
                    </div>
                  )}
                  {exercise.intensity && (
                    <div>
                      <p className="text-muted-foreground">Intensity</p>
                      <p className="font-medium capitalize">{exercise.intensity}</p>
                    </div>
                  )}
                </div>
                {exercise.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{exercise.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VitalsTab({ vitals, isLoading }: { vitals: VitalRecord[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/vitals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/vitals'] });
      toast({ title: "Vital record added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vital Signs</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vitals">
              <Plus className="mr-2 h-4 w-4" />
              Add Vitals
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vital Signs</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMutation.mutate({
                recordedAt: new Date(formData.get('recordedAt') as string).toISOString(),
                systolic: formData.get('systolic') ? parseInt(formData.get('systolic') as string) : undefined,
                diastolic: formData.get('diastolic') ? parseInt(formData.get('diastolic') as string) : undefined,
                heartRate: formData.get('heartRate') ? parseInt(formData.get('heartRate') as string) : undefined,
                bodyWeightKg: formData.get('bodyWeightKg') ? parseFloat(formData.get('bodyWeightKg') as string) : undefined,
                bodyTemperature: formData.get('bodyTemperature') ? parseFloat(formData.get('bodyTemperature') as string) : undefined,
                oxygenSaturation: formData.get('oxygenSaturation') ? parseInt(formData.get('oxygenSaturation') as string) : undefined,
                notes: formData.get('notes') || undefined,
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="recordedAt">Date & Time</Label>
                <Input id="recordedAt" name="recordedAt" type="datetime-local" required data-testid="input-vitals-date" defaultValue={new Date().toISOString().slice(0, 16)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="systolic">Systolic BP (mmHg)</Label>
                  <Input id="systolic" name="systolic" type="number" data-testid="input-systolic" />
                </div>
                <div>
                  <Label htmlFor="diastolic">Diastolic BP (mmHg)</Label>
                  <Input id="diastolic" name="diastolic" type="number" data-testid="input-diastolic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input id="heartRate" name="heartRate" type="number" data-testid="input-heart-rate" />
                </div>
                <div>
                  <Label htmlFor="oxygenSaturation">SpO2 (%)</Label>
                  <Input id="oxygenSaturation" name="oxygenSaturation" type="number" data-testid="input-spo2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bodyWeightKg">Weight (kg)</Label>
                  <Input id="bodyWeightKg" name="bodyWeightKg" type="number" step="0.1" data-testid="input-weight" />
                </div>
                <div>
                  <Label htmlFor="bodyTemperature">Temperature (°C)</Label>
                  <Input id="bodyTemperature" name="bodyTemperature" type="number" step="0.1" data-testid="input-temperature" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" data-testid="input-vitals-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-vitals">
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : vitals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No vital records yet. Start tracking your health vitals!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {vitals.map((vital) => (
            <Card key={vital.id} data-testid={`vital-${vital.id}`}>
              <CardHeader>
                <CardTitle className="text-base">
                  {format(new Date(vital.recordedAt), 'PPP p')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {vital.systolic && vital.diastolic && (
                    <div>
                      <p className="text-muted-foreground">Blood Pressure</p>
                      <p className="font-medium">{vital.systolic}/{vital.diastolic} mmHg</p>
                    </div>
                  )}
                  {vital.heartRate && (
                    <div>
                      <p className="text-muted-foreground">Heart Rate</p>
                      <p className="font-medium">{vital.heartRate} bpm</p>
                    </div>
                  )}
                  {vital.oxygenSaturation && (
                    <div>
                      <p className="text-muted-foreground">SpO2</p>
                      <p className="font-medium">{vital.oxygenSaturation}%</p>
                    </div>
                  )}
                  {vital.bodyWeightKg && (
                    <div>
                      <p className="text-muted-foreground">Weight</p>
                      <p className="font-medium">{vital.bodyWeightKg} kg</p>
                    </div>
                  )}
                  {vital.bmi && (
                    <div>
                      <p className="text-muted-foreground">BMI</p>
                      <p className="font-medium">{vital.bmi.toFixed(1)}</p>
                    </div>
                  )}
                  {vital.bodyTemperature && (
                    <div>
                      <p className="text-muted-foreground">Temperature</p>
                      <p className="font-medium">{vital.bodyTemperature}°C</p>
                    </div>
                  )}
                </div>
                {vital.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{vital.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MindfulnessTab({ sessions, isLoading }: { sessions: MindfulnessSession[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/mindfulness', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/mindfulness'] });
      toast({ title: "Mindfulness session added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mindfulness & Meditation</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-mindfulness">
              <Plus className="mr-2 h-4 w-4" />
              Add Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Mindfulness Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const endedAt = new Date(formData.get('endedAt') as string);
              const durationMinutes = parseInt(formData.get('durationMinutes') as string);
              const startedAt = new Date(endedAt.getTime() - durationMinutes * 60000);
              
              createMutation.mutate({
                type: formData.get('type'),
                startedAt: startedAt.toISOString(),
                endedAt: endedAt.toISOString(),
                durationMinutes,
                moodBefore: formData.get('moodBefore') ? parseInt(formData.get('moodBefore') as string) : undefined,
                moodAfter: formData.get('moodAfter') ? parseInt(formData.get('moodAfter') as string) : undefined,
                stressLevelBefore: formData.get('stressLevelBefore') ? parseInt(formData.get('stressLevelBefore') as string) : undefined,
                stressLevelAfter: formData.get('stressLevelAfter') ? parseInt(formData.get('stressLevelAfter') as string) : undefined,
                notes: formData.get('notes') || undefined,
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="type">Session Type</Label>
                <Select name="type" required>
                  <SelectTrigger data-testid="select-mindfulness-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meditation">Meditation</SelectItem>
                    <SelectItem value="breathing">Breathing Exercise</SelectItem>
                    <SelectItem value="checkin">Check-in</SelectItem>
                    <SelectItem value="visualization">Visualization</SelectItem>
                    <SelectItem value="body_scan">Body Scan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endedAt">Date & Time</Label>
                  <Input id="endedAt" name="endedAt" type="datetime-local" required data-testid="input-mindfulness-date" defaultValue={new Date().toISOString().slice(0, 16)} />
                </div>
                <div>
                  <Label htmlFor="durationMinutes">Duration (min)</Label>
                  <Input id="durationMinutes" name="durationMinutes" type="number" required data-testid="input-mindfulness-duration" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="moodBefore">Mood Before (1-10)</Label>
                  <Input id="moodBefore" name="moodBefore" type="number" min="1" max="10" data-testid="input-mood-before" />
                </div>
                <div>
                  <Label htmlFor="moodAfter">Mood After (1-10)</Label>
                  <Input id="moodAfter" name="moodAfter" type="number" min="1" max="10" data-testid="input-mood-after" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stressLevelBefore">Stress Before (1-10)</Label>
                  <Input id="stressLevelBefore" name="stressLevelBefore" type="number" min="1" max="10" data-testid="input-stress-before" />
                </div>
                <div>
                  <Label htmlFor="stressLevelAfter">Stress After (1-10)</Label>
                  <Input id="stressLevelAfter" name="stressLevelAfter" type="number" min="1" max="10" data-testid="input-stress-after" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" data-testid="input-mindfulness-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-mindfulness">
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No mindfulness sessions yet. Start your meditation practice!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} data-testid={`mindfulness-${session.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{session.type}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {format(new Date(session.startedAt), 'PPP p')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{session.durationMinutes} min</p>
                  </div>
                  {session.moodBefore !== null && session.moodAfter !== null && (
                    <div>
                      <p className="text-muted-foreground">Mood Change</p>
                      <p className="font-medium flex items-center gap-1">
                        {session.moodBefore} → {session.moodAfter}
                        {session.moodAfter > session.moodBefore ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : session.moodAfter < session.moodBefore ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : null}
                      </p>
                    </div>
                  )}
                  {session.stressLevelBefore !== null && session.stressLevelAfter !== null && (
                    <div>
                      <p className="text-muted-foreground">Stress Change</p>
                      <p className="font-medium flex items-center gap-1">
                        {session.stressLevelBefore} → {session.stressLevelAfter}
                        {session.stressLevelAfter < session.stressLevelBefore ? (
                          <TrendingDown className="h-3 w-3 text-green-500" />
                        ) : session.stressLevelAfter > session.stressLevelBefore ? (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        ) : null}
                      </p>
                    </div>
                  )}
                </div>
                {session.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{session.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SleepTab({ logs, isLoading }: { logs: SleepLog[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/sleep', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/sleep'] });
      toast({ title: "Sleep log added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sleep Tracking</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-sleep">
              <Plus className="mr-2 h-4 w-4" />
              Add Sleep Log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sleep Log</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMutation.mutate({
                bedtime: new Date(formData.get('bedtime') as string).toISOString(),
                wakeTime: new Date(formData.get('wakeTime') as string).toISOString(),
                sleepQuality: formData.get('sleepQuality') ? parseInt(formData.get('sleepQuality') as string) : undefined,
                notes: formData.get('notes') || undefined,
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="bedtime">Bedtime</Label>
                <Input id="bedtime" name="bedtime" type="datetime-local" required data-testid="input-bedtime" />
              </div>
              <div>
                <Label htmlFor="wakeTime">Wake Time</Label>
                <Input id="wakeTime" name="wakeTime" type="datetime-local" required data-testid="input-wake-time" />
              </div>
              <div>
                <Label htmlFor="sleepQuality">Sleep Quality (1-10)</Label>
                <Input id="sleepQuality" name="sleepQuality" type="number" min="1" max="10" data-testid="input-sleep-quality" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" data-testid="input-sleep-notes" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-sleep">
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Moon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sleep logs yet. Start tracking your sleep!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <Card key={log.id} data-testid={`sleep-${log.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{(log.totalSleepMinutes / 60).toFixed(1)}h sleep</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {format(new Date(log.bedtime), 'MMM d')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bedtime</p>
                    <p className="font-medium">{format(new Date(log.bedtime), 'p')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Wake Time</p>
                    <p className="font-medium">{format(new Date(log.wakeTime), 'p')}</p>
                  </div>
                  {log.sleepQuality && (
                    <div>
                      <p className="text-muted-foreground">Quality</p>
                      <p className="font-medium">{log.sleepQuality}/10</p>
                    </div>
                  )}
                </div>
                {log.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{log.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FoodTab({ logs, isLoading }: { logs: FoodLog[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/food', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/food'] });
      toast({ title: "Food log added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Food & Nutrition</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-food">
              <Plus className="mr-2 h-4 w-4" />
              Add Meal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Food Log</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMutation.mutate({
                loggedAt: new Date(formData.get('loggedAt') as string).toISOString(),
                mealType: formData.get('mealType'),
                foodName: formData.get('foodName'),
                description: formData.get('description') || undefined,
                calories: formData.get('calories') ? parseFloat(formData.get('calories') as string) : undefined,
                protein: formData.get('protein') ? parseFloat(formData.get('protein') as string) : undefined,
                carbs: formData.get('carbs') ? parseFloat(formData.get('carbs') as string) : undefined,
                fat: formData.get('fat') ? parseFloat(formData.get('fat') as string) : undefined,
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="loggedAt">Date & Time</Label>
                <Input id="loggedAt" name="loggedAt" type="datetime-local" required data-testid="input-food-date" defaultValue={new Date().toISOString().slice(0, 16)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mealType">Meal Type</Label>
                  <Select name="mealType">
                    <SelectTrigger data-testid="select-meal-type">
                      <SelectValue placeholder="Select meal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="foodName">Food Name</Label>
                  <Input id="foodName" name="foodName" required data-testid="input-food-name" />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" data-testid="input-food-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input id="calories" name="calories" type="number" step="0.1" data-testid="input-calories" />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input id="protein" name="protein" type="number" step="0.1" data-testid="input-protein" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input id="carbs" name="carbs" type="number" step="0.1" data-testid="input-carbs" />
                </div>
                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input id="fat" name="fat" type="number" step="0.1" data-testid="input-fat" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-food">
                {createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Utensils className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No food logs yet. Start tracking your nutrition!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <Card key={log.id} data-testid={`food-${log.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{log.foodName}</p>
                    {log.mealType && (
                      <p className="text-sm font-normal text-muted-foreground capitalize">{log.mealType}</p>
                    )}
                  </div>
                  <span className="text-sm font-normal text-muted-foreground">
                    {format(new Date(log.loggedAt), 'PPP p')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {log.calories && (
                    <div>
                      <p className="text-muted-foreground">Calories</p>
                      <p className="font-medium">{log.calories.toFixed(0)} cal</p>
                    </div>
                  )}
                  {log.protein && (
                    <div>
                      <p className="text-muted-foreground">Protein</p>
                      <p className="font-medium">{log.protein.toFixed(1)}g</p>
                    </div>
                  )}
                  {log.carbs && (
                    <div>
                      <p className="text-muted-foreground">Carbs</p>
                      <p className="font-medium">{log.carbs.toFixed(1)}g</p>
                    </div>
                  )}
                  {log.fat && (
                    <div>
                      <p className="text-muted-foreground">Fat</p>
                      <p className="font-medium">{log.fat.toFixed(1)}g</p>
                    </div>
                  )}
                </div>
                {log.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{log.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AISyncTab({ 
  syncHistory, 
  isLoading, 
  onSync,
  isSyncing 
}: { 
  syncHistory: AISyncLog[]; 
  isLoading: boolean;
  onSync: (type: string) => void;
  isSyncing: boolean;
}) {
  const latestSync = syncHistory[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Health Sync</h2>
        <Button 
          onClick={() => onSync('all')} 
          disabled={isSyncing}
          data-testid="button-sync-all"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isSyncing ? 'Syncing...' : 'Sync with AI'}
        </Button>
      </div>

      {latestSync && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="text-ai-health-score">
                {latestSync.healthScore || 0}/100
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Last synced: {format(new Date(latestSync.startedAt), 'PPP p')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Records Processed</span>
                <span className="font-medium" data-testid="text-records-processed">{latestSync.recordsProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize" data-testid="text-sync-status">{latestSync.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Model</span>
                <span className="font-medium" data-testid="text-ai-model">{latestSync.aiModel}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {latestSync?.insights && latestSync.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {latestSync.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2" data-testid={`insight-${i}`}>
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {latestSync?.recommendations && latestSync.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {latestSync.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2" data-testid={`recommendation-${i}`}>
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : syncHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sync history yet. Click "Sync with AI" to get started.</p>
          ) : (
            <div className="space-y-2">
              {syncHistory.map((sync) => (
                <div key={sync.id} className="flex justify-between items-center py-2 border-b last:border-0" data-testid={`sync-${sync.id}`}>
                  <div>
                    <p className="font-medium capitalize">{sync.syncType} sync</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(sync.startedAt), 'PPP p')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{sync.recordsProcessed} records</p>
                    <p className="text-sm text-muted-foreground capitalize">{sync.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
