import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiagnosticResult {
  category: string;
  name: string;
  status: "success" | "warning" | "error";
  message: string;
  details?: string;
}

export default function Settings() {
  const { data: diagnostics, isLoading: diagnosticsLoading, refetch: refetchDiagnostics } = useQuery<DiagnosticResult[]>({
    queryKey: ['/api/diagnostics'],
    enabled: false, // Only run when explicitly triggered
  });

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult["status"]) => {
    const variants = {
      success: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      error: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    };
    return variants[status];
  };

  const groupedDiagnostics = diagnostics?.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, DiagnosticResult[]>);

  const getCategorySummary = (category: string) => {
    const results = groupedDiagnostics?.[category] || [];
    const errors = results.filter(r => r.status === "error").length;
    const warnings = results.filter(r => r.status === "warning").length;
    const success = results.filter(r => r.status === "success").length;
    return { errors, warnings, success, total: results.length };
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and integrations</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="diagnostics" data-testid="tab-diagnostics">
            <Activity className="h-4 w-4 mr-2" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-6">General Settings</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="John Doe" data-testid="input-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" data-testid="input-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" defaultValue="America/New_York" data-testid="input-timezone" />
              </div>
              <Button data-testid="button-save-general">Save Changes</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">Gmail</h4>
                  <p className="text-sm text-muted-foreground">Email automation and categorization</p>
                </div>
                <Switch defaultChecked data-testid="switch-gmail" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">OpenAI</h4>
                  <p className="text-sm text-muted-foreground">AI-powered insights and drafting</p>
                </div>
                <Switch defaultChecked data-testid="switch-openai" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">Financial APIs</h4>
                  <p className="text-sm text-muted-foreground">Connect brokerages and banks</p>
                </div>
                <Button variant="outline" data-testid="button-configure-apis">Configure</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-6">Security Settings</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Biometric Lock</h4>
                  <p className="text-sm text-muted-foreground">Use fingerprint or Face ID</p>
                </div>
                <Switch data-testid="switch-biometric" />
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" data-testid="button-change-password">Change Password</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-6">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Daily Briefing</h4>
                  <p className="text-sm text-muted-foreground">Morning wealth summary</p>
                </div>
                <Switch defaultChecked data-testid="switch-briefing" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Price Alerts</h4>
                  <p className="text-sm text-muted-foreground">Asset price notifications</p>
                </div>
                <Switch defaultChecked data-testid="switch-price-alerts" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Email Summaries</h4>
                  <p className="text-sm text-muted-foreground">Important email highlights</p>
                </div>
                <Switch defaultChecked data-testid="switch-email-summaries" />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold mb-1">System Diagnostics</h3>
                <p className="text-sm text-muted-foreground">
                  Run comprehensive health checks on your automation platform
                </p>
              </div>
              <Button 
                onClick={() => refetchDiagnostics()}
                disabled={diagnosticsLoading}
                data-testid="button-run-diagnostics"
              >
                {diagnosticsLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Run Diagnostics
                  </>
                )}
              </Button>
            </div>

            {!diagnostics && !diagnosticsLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Run Diagnostics" to check system health</p>
              </div>
            )}

            {diagnosticsLoading && (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Running system diagnostics...</p>
              </div>
            )}

            {diagnostics && !diagnosticsLoading && (
              <div className="space-y-6">
                {Object.entries(groupedDiagnostics || {}).map(([category, results]) => {
                  const summary = getCategorySummary(category);
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="font-semibold text-lg">{category}</h4>
                        <div className="flex gap-2">
                          {summary.errors > 0 && (
                            <Badge className={getStatusBadge("error")}>
                              {summary.errors} Error{summary.errors > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {summary.warnings > 0 && (
                            <Badge className={getStatusBadge("warning")}>
                              {summary.warnings} Warning{summary.warnings > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {summary.success > 0 && (
                            <Badge className={getStatusBadge("success")}>
                              {summary.success} OK
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {results.map((result, idx) => (
                          <Card key={idx} className="p-4">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(result.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium">{result.name}</h5>
                                  <Badge className={getStatusBadge(result.status)}>
                                    {result.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{result.message}</p>
                                {result.details && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                      Show details
                                    </summary>
                                    <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
                                      {result.details}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
