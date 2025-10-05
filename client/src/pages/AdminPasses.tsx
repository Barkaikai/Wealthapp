import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, QrCode, Check, X, Copy, Gift } from "lucide-react";
import type { FreePass } from "@shared/schema";

interface PassesResponse {
  passes: FreePass[];
  total: number;
  maxTotal: number;
}

export default function AdminPasses() {
  const { toast } = useToast();
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { data: passesData, isLoading } = useQuery<PassesResponse>({
    queryKey: ['/api/admin/passes'],
  });

  const { data: qrData } = useQuery({
    queryKey: ['/api/admin/passes', selectedCode, 'qrcode'],
    enabled: !!selectedCode,
  });

  const createPassesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/passes/create', { count, note });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/passes'] });
      setCount(1);
      setNote("");
      toast({
        title: "Success",
        description: `Created ${count} pass${count > 1 ? 'es' : ''} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create passes",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Pass code copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading passes...</p>
        </div>
      </div>
    );
  }

  const passes = passesData?.passes || [];
  const total = passesData?.total || 0;
  const maxTotal = passesData?.maxTotal || 400;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">
          Free Pass Management
        </h1>
        <p className="text-muted-foreground">Create and manage promotional access passes</p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pass Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Created</p>
              <p className="text-2xl font-bold" data-testid="text-total-passes">{total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Redeemed</p>
              <p className="text-2xl font-bold" data-testid="text-redeemed-passes">
                {passes.filter(p => p.redeemedAt).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold" data-testid="text-available-passes">
                {maxTotal - total}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Passes Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Create New Passes
          </CardTitle>
          <CardDescription>
            Generate new promotional passes (limit: {maxTotal} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="count">Number of Passes</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                data-testid="input-pass-count"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Input
                id="note"
                placeholder="e.g., Campaign 2024"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                data-testid="input-pass-note"
              />
            </div>
          </div>
          <Button
            onClick={() => createPassesMutation.mutate()}
            disabled={createPassesMutation.isPending || total >= maxTotal}
            data-testid="button-create-passes"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createPassesMutation.isPending ? 'Creating...' : `Create ${count} Pass${count > 1 ? 'es' : ''}`}
          </Button>
        </CardContent>
      </Card>

      {/* Passes List */}
      <Card>
        <CardHeader>
          <CardTitle>All Passes</CardTitle>
          <CardDescription>Click on a pass to view its QR code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {passes.map((pass) => (
              <div
                key={pass.id}
                className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                data-testid={`card-pass-${pass.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {pass.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(pass.code)}
                      data-testid={`button-copy-${pass.id}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {pass.note && (
                    <p className="text-sm text-muted-foreground mt-1">{pass.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(pass.createdAt!).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pass.redeemedAt ? (
                    <Badge className="bg-green-500/10 text-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Redeemed
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/10 text-blue-500">
                      <X className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCode(pass.code)}
                    data-testid={`button-qr-${pass.id}`}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {selectedCode && qrData?.dataUrl && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedCode(null)}
        >
          <Card className="max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>Scan to redeem pass</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <img src={qrData.dataUrl} alt="QR Code" className="w-64 h-64" />
              <code className="text-sm font-mono bg-muted px-3 py-2 rounded">
                {selectedCode}
              </code>
              <Button
                variant="outline"
                onClick={() => setSelectedCode(null)}
                className="w-full"
                data-testid="button-close-qr"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
