import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  User, Shield, Bell, Palette, Code, Info, 
  CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Activity, Play, Pause, Clock,
  Moon, Sun, Monitor
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

interface DiagnosticResult {
  category: string;
  name: string;
  status: "success" | "warning" | "error";
  message: string;
  details?: string;
}

interface DiagnosticReport {
  results: DiagnosticResult[];
  timestamp: string;
  durationMs: number;
  summary: {
    total: number;
    success: number;
    warning: number;
    error: number;
  };
}

interface MonitorStatus {
  enabled: boolean;
  running: boolean;
  lastRunTime: string | null;
  consecutiveFailures: number;
  config: {
    enabled: boolean;
    autoFixEnabled: boolean;
    intervalMs: number;
    maxHistorySize: number;
  };
}

interface DiagnosticRunHistory {
  id: number;
  runId: string;
  status: 'success' | 'partial' | 'failure';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  checksTotal: number;
  checksSuccess: number;
  checksWarning: number;
  checksError: number;
  fixesAttempted: number;
  fixesSucceeded: number;
  results: any;
  triggeredBy: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    dailyBriefing: true,
    priceAlerts: true,
    emailSummaries: true,
    portfolioUpdates: false,
    newsAlerts: false,
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/user/profile', profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: diagnosticReport, isLoading: diagnosticsLoading, isError: diagnosticsError, refetch: refetchDiagnostics } = useQuery<DiagnosticReport>({
    queryKey: ['/api/diagnostics'],
    enabled: false,
  });

  const { data: monitorStatus, refetch: refetchStatus } = useQuery<MonitorStatus>({
    queryKey: ['/api/health-monitor/status'],
    refetchInterval: 5000,
  });

  const { data: monitorHistory } = useQuery<DiagnosticRunHistory[]>({
    queryKey: ['/api/health-monitor/history'],
    enabled: !!monitorStatus?.enabled,
    refetchInterval: 30000,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<MonitorStatus['config']>) => {
      const response = await fetch('/api/health-monitor/config', {
        method: 'POST',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-monitor/status'] });
      toast({
        title: "Configuration Updated",
        description: "Health monitor settings have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update",
        description: error.message || "Could not update configuration",
        variant: "destructive",
      });
    },
  });

  const diagnostics = diagnosticReport?.results;

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
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="account" data-testid="tab-account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="diagnostics" data-testid="tab-diagnostics">
            <Activity className="h-4 w-4 mr-2" />
            Diagnostics
          </TabsTrigger>
          <TabsTrigger value="about" data-testid="tab-about">
            <Info className="h-4 w-4 mr-2" />
            About
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Profile Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profileData.email}
                  disabled
                  className="bg-muted"
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Button 
                onClick={() => saveProfileMutation.mutate()}
                disabled={saveProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {saveProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Language & Region</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger id="language" data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="america_new_york">
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_new_york">Eastern Time (ET)</SelectItem>
                    <SelectItem value="america_chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="america_denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="america_los_angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="europe_london">London (GMT)</SelectItem>
                    <SelectItem value="asia_tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Authentication</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Two-Factor Authentication (2FA)</h4>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Biometric Authentication</h4>
                  <p className="text-sm text-muted-foreground">Use fingerprint or Face ID to login</p>
                </div>
                <Switch data-testid="switch-biometric" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Privacy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Data Collection</h4>
                  <p className="text-sm text-muted-foreground">Allow anonymous usage analytics</p>
                </div>
                <Switch defaultChecked data-testid="switch-analytics" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Third-party Cookies</h4>
                  <p className="text-sm text-muted-foreground">Enable cookies for integrations</p>
                </div>
                <Switch defaultChecked data-testid="switch-cookies" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Sessions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">Active now • Last login: {new Date().toLocaleDateString()}</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-revoke-sessions">
                Revoke All Other Sessions
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Email Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Daily Briefing</h4>
                  <p className="text-sm text-muted-foreground">Morning summary of your portfolio and market insights</p>
                </div>
                <Switch 
                  checked={notificationPrefs.dailyBriefing}
                  onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, dailyBriefing: checked })}
                  data-testid="switch-briefing"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Price Alerts</h4>
                  <p className="text-sm text-muted-foreground">Notifications when assets hit your target prices</p>
                </div>
                <Switch 
                  checked={notificationPrefs.priceAlerts}
                  onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, priceAlerts: checked })}
                  data-testid="switch-price-alerts"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Email Summaries</h4>
                  <p className="text-sm text-muted-foreground">Important email highlights and AI insights</p>
                </div>
                <Switch 
                  checked={notificationPrefs.emailSummaries}
                  onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, emailSummaries: checked })}
                  data-testid="switch-email-summaries"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Portfolio Updates</h4>
                  <p className="text-sm text-muted-foreground">Weekly performance reports and rebalancing suggestions</p>
                </div>
                <Switch 
                  checked={notificationPrefs.portfolioUpdates}
                  onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, portfolioUpdates: checked })}
                  data-testid="switch-portfolio-updates"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">News Alerts</h4>
                  <p className="text-sm text-muted-foreground">Breaking financial news affecting your portfolio</p>
                </div>
                <Switch 
                  checked={notificationPrefs.newsAlerts}
                  onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, newsAlerts: checked })}
                  data-testid="switch-news-alerts"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Push Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Desktop Notifications</h4>
                  <p className="text-sm text-muted-foreground">Receive push notifications on your desktop</p>
                </div>
                <Switch defaultChecked data-testid="switch-desktop-notif" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Mobile Notifications</h4>
                  <p className="text-sm text-muted-foreground">Receive push notifications on your mobile device</p>
                </div>
                <Switch defaultChecked data-testid="switch-mobile-notif" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Theme</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition ${
                    theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  data-testid="button-theme-light"
                >
                  <Sun className="h-6 w-6" />
                  <span className="font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition ${
                    theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  data-testid="button-theme-dark"
                >
                  <Moon className="h-6 w-6" />
                  <span className="font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition ${
                    theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  data-testid="button-theme-system"
                >
                  <Monitor className="h-6 w-6" />
                  <span className="font-medium">System</span>
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme. System will match your operating system settings.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Display</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Compact Mode</h4>
                  <p className="text-sm text-muted-foreground">Reduce spacing for denser information display</p>
                </div>
                <Switch data-testid="switch-compact" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">Animations</h4>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
                </div>
                <Switch defaultChecked data-testid="switch-animations" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold mb-1">Continuous Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic health checks running in the background
                </p>
                {monitorStatus && (
                  <div className="flex gap-3 mt-2 items-center">
                    <Badge className={monitorStatus.running ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"}>
                      {monitorStatus.running ? (
                        <>
                          <Activity className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3 mr-1" />
                          Paused
                        </>
                      )}
                    </Badge>
                    {monitorStatus.lastRunTime && (
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Last: {new Date(monitorStatus.lastRunTime).toLocaleTimeString()}
                      </span>
                    )}
                    {monitorStatus.consecutiveFailures > 0 && (
                      <Badge className="bg-red-500/10 text-red-500">
                        {monitorStatus.consecutiveFailures} consecutive failures
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="monitoring-enabled">Enable Continuous Monitoring</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically check system health every {monitorStatus ? Math.round(monitorStatus.config.intervalMs / 60000) : 10} minutes
                  </p>
                </div>
                <Switch
                  id="monitoring-enabled"
                  checked={monitorStatus?.config.enabled ?? false}
                  onCheckedChange={(enabled) => updateConfigMutation.mutate({ enabled })}
                  data-testid="switch-monitoring-enabled"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autofix-enabled">Enable Auto-Fix</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically attempt to fix detected issues
                  </p>
                </div>
                <Switch
                  id="autofix-enabled"
                  checked={monitorStatus?.config.autoFixEnabled ?? false}
                  onCheckedChange={(autoFixEnabled) => updateConfigMutation.mutate({ autoFixEnabled })}
                  data-testid="switch-autofix-enabled"
                />
              </div>
            </div>
          </Card>

          {monitorHistory && monitorHistory.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monitorHistory.slice(0, 10).map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {run.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {run.status === 'partial' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {run.status === 'failure' && <XCircle className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(run.startedAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {run.checksSuccess} OK, {run.checksWarning} warnings, {run.checksError} errors
                          {run.fixesAttempted > 0 && ` · ${run.fixesSucceeded}/${run.fixesAttempted} fixes applied`}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      run.status === 'success' ? "bg-green-500/10 text-green-500" :
                      run.status === 'partial' ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    }>
                      {run.triggeredBy}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold mb-1">Manual Diagnostics</h3>
                <p className="text-sm text-muted-foreground">
                  Run an immediate health check on demand
                </p>
                {diagnosticReport && (
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Last run: {new Date(diagnosticReport.timestamp).toLocaleString()}</span>
                    <span>Duration: {(diagnosticReport.durationMs / 1000).toFixed(2)}s</span>
                    <span>
                      {diagnosticReport.summary.success} OK, 
                      {diagnosticReport.summary.warning} warnings, 
                      {diagnosticReport.summary.error} errors
                    </span>
                  </div>
                )}
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
                    Run Now
                  </>
                )}
              </Button>
            </div>

            {diagnosticsError && (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <p className="text-muted-foreground mb-4">Failed to run diagnostics</p>
                <Button onClick={() => refetchDiagnostics()} variant="outline">
                  Try Again
                </Button>
              </div>
            )}

            {!diagnostics && !diagnosticsLoading && !diagnosticsError && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Run Now" to check system health</p>
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

        {/* About Tab */}
        <TabsContent value="about" className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Application Information</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build</span>
                <span className="font-medium">2025.10.03</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge>Production</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Legal & Support</h3>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start" data-testid="button-terms">
                Terms of Service
              </Button>
              <Button variant="ghost" className="w-full justify-start" data-testid="button-privacy">
                Privacy Policy
              </Button>
              <Button variant="ghost" className="w-full justify-start" data-testid="button-help">
                Help Center
              </Button>
              <Button variant="ghost" className="w-full justify-start" data-testid="button-contact">
                Contact Support
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Data & Account</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full" data-testid="button-export-data">
                Export My Data
              </Button>
              <Button variant="outline" className="w-full text-red-500 hover:text-red-600" data-testid="button-delete-account">
                Delete Account
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
