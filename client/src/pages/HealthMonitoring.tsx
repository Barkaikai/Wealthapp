import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Plus } from 'lucide-react';
import { format } from 'date-fns';

type HealthMetric = {
  id: number;
  metricType: string;
  value: number;
  unit: string;
  notes?: string;
  recordedAt: string;
};

export default function HealthMonitoring() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: metrics = [] } = useQuery<HealthMetric[]>({
    queryKey: ['/api/health/metrics'],
  });

  const createMetricMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/health/metrics', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health/metrics'] });
      toast({ title: "Health metric added successfully" });
      setDialogOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Health Monitoring</h1>
          <p className="text-muted-foreground">Track your health metrics and performance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-metric">
              <Plus className="mr-2 h-4 w-4" />
              Add Metric
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Health Metric</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMetricMutation.mutate({
                metricType: formData.get('metricType'),
                value: parseFloat(formData.get('value') as string),
                unit: formData.get('unit'),
                notes: formData.get('notes'),
                recordedAt: new Date().toISOString(),
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="metricType">Metric Type</Label>
                <Select name="metricType" defaultValue="weight">
                  <SelectTrigger data-testid="select-metric-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="blood_pressure">Blood Pressure</SelectItem>
                    <SelectItem value="heart_rate">Heart Rate</SelectItem>
                    <SelectItem value="sleep">Sleep</SelectItem>
                    <SelectItem value="steps">Steps</SelectItem>
                    <SelectItem value="exercise">Exercise</SelectItem>
                    <SelectItem value="nutrition">Nutrition</SelectItem>
                    <SelectItem value="mood">Mood</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input id="value" name="value" type="number" step="0.1" required data-testid="input-metric-value" />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" name="unit" placeholder="kg, bpm, hours..." required data-testid="input-metric-unit" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" name="notes" data-testid="input-metric-notes" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-save-metric">Add Metric</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {metrics.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No health metrics tracked yet. Start tracking your health!</p>
            </CardContent>
          </Card>
        ) : (
          metrics.map((metric) => (
            <Card key={metric.id} data-testid={`metric-${metric.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{metric.metricType.replace('_', ' ')}</span>
                  <span className="text-2xl font-bold text-primary">{metric.value} {metric.unit}</span>
                </CardTitle>
                <CardDescription>{format(new Date(metric.recordedAt), 'PPP p')}</CardDescription>
              </CardHeader>
              {metric.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{metric.notes}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
