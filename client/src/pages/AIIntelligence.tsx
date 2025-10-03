import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  FileText, 
  DollarSign,
  BarChart3,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Terminal as TerminalIcon,
  Loader2,
  ChevronRight,
  Video,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import type { PortfolioReport, TradingRecommendation, TaxEvent, RebalancingRecommendation, AnomalyDetection } from "@shared/schema";

interface TerminalOutput {
  id: number;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

interface VideoRecommendation {
  title: string;
  description: string;
  searchQuery: string;
  youtubeUrl: string;
}

export default function AIIntelligence() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("intelligence");
  const [intelligenceTab, setIntelligenceTab] = useState("portfolio-reports");

  const { data: portfolioReports = [], isLoading: reportsLoading } = useQuery<PortfolioReport[]>({
    queryKey: ["/api/portfolio-reports"],
  });

  const { data: tradingRecommendations = [], isLoading: recommendationsLoading } = useQuery<TradingRecommendation[]>({
    queryKey: ["/api/trading-recommendations"],
  });

  const { data: taxEvents = [], isLoading: taxEventsLoading } = useQuery<TaxEvent[]>({
    queryKey: ["/api/tax-events"],
  });

  const { data: rebalancingRecommendations = [], isLoading: rebalancingLoading } = useQuery<RebalancingRecommendation[]>({
    queryKey: ["/api/rebalancing-recommendations"],
  });

  const { data: anomalies = [], isLoading: anomaliesLoading } = useQuery<AnomalyDetection[]>({
    queryKey: ["/api/anomalies"],
  });

  const generatePortfolioReport = useMutation({
    mutationFn: async (reportType: string) => {
      return await apiRequest("POST", "/api/portfolio-reports/generate", { reportType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-reports"] });
      toast({
        title: "Report Generated",
        description: "Your portfolio report has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  const generateTradingRecommendations = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/trading-recommendations/generate", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-recommendations"] });
      toast({
        title: "Recommendations Generated",
        description: "New trading recommendations have been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate recommendations",
        variant: "destructive",
      });
    },
  });

  const generateRebalancing = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/rebalancing-recommendations/generate", { targetAllocation: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rebalancing-recommendations"] });
      toast({
        title: "Rebalancing Analysis Complete",
        description: "Portfolio rebalancing recommendations generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate rebalancing recommendations",
        variant: "destructive",
      });
    },
  });

  const detectAnomalies = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/anomalies/detect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      toast({
        title: "Anomaly Detection Complete",
        description: "AI has analyzed your portfolio for unusual patterns.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Detection Failed",
        description: error.message || "Failed to detect anomalies",
        variant: "destructive",
      });
    },
  });

  const updateRecommendationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/trading-recommendations/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-recommendations"] });
      toast({
        title: "Status Updated",
        description: "Recommendation status has been updated.",
      });
    },
  });

  const updateAnomalyStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/anomalies/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      toast({
        title: "Anomaly Updated",
        description: "Anomaly status has been updated.",
      });
    },
  });

  const [command, setCommand] = useState("");
  const [outputs, setOutputs] = useState<TerminalOutput[]>([
    {
      id: 0,
      type: 'output',
      content: 'Welcome to Wealth Automation Terminal v1.0',
      timestamp: new Date(),
    },
    {
      id: 1,
      type: 'output',
      content: 'Type "help" for available commands',
      timestamp: new Date(),
    },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  const addOutput = (type: 'command' | 'output' | 'error', content: string) => {
    setOutputs(prev => [
      ...prev,
      {
        id: Date.now(),
        type,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    setCommandHistory(prev => [...prev, trimmedCmd]);
    setHistoryIndex(-1);
    addOutput('command', `$ ${trimmedCmd}`);
    setIsExecuting(true);

    try {
      const response = await apiRequest('POST', '/api/terminal/execute', { command: trimmedCmd });
      const data = await response.json();
      
      if (data.output) {
        addOutput('output', data.output);
      }
      if (data.error) {
        addOutput('error', data.error);
      }
    } catch (error: any) {
      addOutput('error', `Error: ${error.message || 'Command execution failed'}`);
    } finally {
      setIsExecuting(false);
      setCommand("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(command);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const clearTerminal = () => {
    setOutputs([
      {
        id: Date.now(),
        type: 'output',
        content: 'Terminal cleared',
        timestamp: new Date(),
      },
    ]);
  };

  const { data: videos, isLoading: videosLoading } = useQuery<VideoRecommendation[]>({
    queryKey: ['/api/videos/recommendations'],
  });

  const generateVideosMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/videos/generate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos/recommendations'] });
      toast({
        title: "Success",
        description: "New video recommendations generated based on your latest briefing.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate video recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered insights, analysis, and recommendations
        </p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="intelligence" data-testid="tab-intelligence">
            <Brain className="h-4 w-4 mr-2" />
            Intelligence Hub
          </TabsTrigger>
          <TabsTrigger value="terminal" data-testid="tab-terminal">
            <TerminalIcon className="h-4 w-4 mr-2" />
            Terminal
          </TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Video className="h-4 w-4 mr-2" />
            AI Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="space-y-4">
          <Tabs value={intelligenceTab} onValueChange={setIntelligenceTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="portfolio-reports" data-testid="tab-portfolio-reports">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="trading" data-testid="tab-trading">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trading
              </TabsTrigger>
              <TabsTrigger value="tax" data-testid="tab-tax">
                <DollarSign className="h-4 w-4 mr-2" />
                Tax
              </TabsTrigger>
              <TabsTrigger value="rebalancing" data-testid="tab-rebalancing">
                <Target className="h-4 w-4 mr-2" />
                Rebalancing
              </TabsTrigger>
              <TabsTrigger value="anomalies" data-testid="tab-anomalies">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Anomalies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio-reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Portfolio Reports</CardTitle>
                      <CardDescription>
                        AI-generated analysis of your portfolio performance
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => generatePortfolioReport.mutate("daily")}
                      disabled={generatePortfolioReport.isPending}
                      data-testid="button-generate-report"
                    >
                      {generatePortfolioReport.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : portfolioReports.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No reports generated yet. Click "Generate Report" to create your first AI-powered analysis.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {portfolioReports.map((report) => (
                        <Card key={report.id} className="hover-elevate" data-testid={`report-${report.id}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report
                                </CardTitle>
                                <CardDescription>
                                  {format(new Date(report.periodStart), "MMM d")} - {format(new Date(report.periodEnd), "MMM d, yyyy")}
                                </CardDescription>
                              </div>
                              <Badge variant={report.totalChangePercent >= 0 ? "default" : "destructive"}>
                                {report.totalChangePercent >= 0 ? "+" : ""}{report.totalChangePercent.toFixed(2)}%
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Total Value</p>
                                <p className="text-xl font-semibold">${report.totalValue.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Change</p>
                                <p className={`text-xl font-semibold ${report.totalChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                  ${report.totalChange.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Separator />
                            {report.insights && report.insights.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Key Insights</p>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                  {report.insights.map((insight: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {report.recommendations && report.recommendations.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-sm font-medium mb-2">Recommendations</p>
                                  <ul className="space-y-1 text-sm text-muted-foreground">
                                    {report.recommendations.map((rec: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-primary">→</span>
                                        {rec}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trading" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Trading Recommendations</CardTitle>
                      <CardDescription>
                        AI-powered trading suggestions based on market analysis (view-only, no auto-execution)
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => generateTradingRecommendations.mutate()}
                      disabled={generateTradingRecommendations.isPending}
                      data-testid="button-generate-trading"
                    >
                      {generateTradingRecommendations.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recommendationsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : tradingRecommendations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No recommendations available. Generate AI-powered trading insights.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tradingRecommendations.map((rec) => (
                        <Card key={rec.id} className="hover-elevate" data-testid={`recommendation-${rec.id}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={rec.action === "buy" ? "default" : rec.action === "sell" ? "destructive" : "secondary"}>
                                    {rec.action.toUpperCase()}
                                  </Badge>
                                  <span className="font-semibold">{rec.symbol}</span>
                                  <Badge variant="outline">{rec.confidence}% confidence</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                              {rec.targetPrice && (
                                <div>
                                  <p className="text-muted-foreground">Target Price</p>
                                  <p className="font-medium">${rec.targetPrice.toFixed(2)}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">Current Price</p>
                                <p className="font-medium">${rec.currentPrice.toFixed(2)}</p>
                              </div>
                              {rec.timeHorizon && (
                                <div>
                                  <p className="text-muted-foreground">Time Horizon</p>
                                  <p className="font-medium">{rec.timeHorizon}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={rec.status === "executed" ? "default" : "outline"}
                                onClick={() => updateRecommendationStatus.mutate({ id: rec.id, status: "executed" })}
                                disabled={rec.status === "executed"}
                                data-testid={`button-execute-${rec.id}`}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {rec.status === "executed" ? "Executed" : "Mark Executed"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateRecommendationStatus.mutate({ id: rec.id, status: "dismissed" })}
                                disabled={rec.status === "dismissed"}
                                data-testid={`button-dismiss-${rec.id}`}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                {rec.status === "dismissed" ? "Dismissed" : "Dismiss"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tax Event Tracking</CardTitle>
                  <CardDescription>
                    Monitor capital gains, losses, and tax implications of your transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {taxEventsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : taxEvents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No tax events tracked yet. Tax implications will be automatically tracked on transactions.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {taxEvents.map((event) => (
                        <Card key={event.id} className="hover-elevate" data-testid={`tax-event-${event.id}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={event.eventType === "capital_gain" ? "default" : "destructive"}>
                                    {event.eventType.replace("_", " ").toUpperCase()}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(event.eventDate), "MMM d, yyyy")}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Taxable Amount</p>
                                    <p className={`font-semibold ${event.taxableAmount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                      ${Math.abs(event.taxableAmount).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Tax Year</p>
                                    <p className="font-medium">{event.taxYear}</p>
                                  </div>
                                </div>
                                {event.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">{event.notes}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rebalancing" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Portfolio Rebalancing</CardTitle>
                      <CardDescription>
                        AI-powered recommendations to optimize your portfolio allocation
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => generateRebalancing.mutate()}
                      disabled={generateRebalancing.isPending}
                      data-testid="button-generate-rebalancing"
                    >
                      {generateRebalancing.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Analyze
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rebalancingLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : rebalancingRecommendations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No rebalancing analysis available. Generate AI recommendations to optimize your portfolio.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rebalancingRecommendations.map((rec) => (
                        <Card key={rec.id} className="hover-elevate" data-testid={`rebalancing-${rec.id}`}>
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">Rebalancing Strategy</h3>
                              {rec.createdAt && (
                                <Badge variant="outline">
                                  {format(new Date(rec.createdAt), "MMM d, yyyy")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                            <Separator />
                            <div>
                              <p className="text-sm font-medium mb-2">Recommended Actions</p>
                              <div className="space-y-2">
                                {Array.isArray(rec.actions) && rec.actions.map((action: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-primary">→</span>
                                    <span>{typeof action === 'string' ? action : JSON.stringify(action)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm pt-3">
                              <div>
                                <p className="text-muted-foreground">Priority</p>
                                <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                                  {rec.priority}
                                </Badge>
                              </div>
                              {rec.expiresAt && (
                                <div>
                                  <p className="text-muted-foreground">Expires</p>
                                  <p className="font-medium">{format(new Date(rec.expiresAt), "MMM d, yyyy")}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anomalies" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Anomaly Detection</CardTitle>
                      <CardDescription>
                        AI-powered detection of unusual patterns in your portfolio
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => detectAnomalies.mutate()}
                      disabled={detectAnomalies.isPending}
                      data-testid="button-detect-anomalies"
                    >
                      {detectAnomalies.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Scan for Anomalies
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {anomaliesLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : anomalies.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                      <p>No anomalies detected. Your portfolio looks healthy!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {anomalies.map((anomaly) => (
                        <Card key={anomaly.id} className="hover-elevate border-l-4 border-l-destructive" data-testid={`anomaly-${anomaly.id}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  <Badge variant={anomaly.severity === "high" ? "destructive" : anomaly.severity === "medium" ? "default" : "secondary"}>
                                    {anomaly.severity.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm font-medium">{anomaly.anomalyType}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                                {anomaly.recommendations && anomaly.recommendations.length > 0 && (
                                  <div className="bg-muted p-3 rounded-md">
                                    <p className="text-sm font-medium mb-1">Recommendations:</p>
                                    <ul className="space-y-1">
                                      {anomaly.recommendations.map((rec: string, idx: number) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                          <span className="text-primary">→</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-3">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {anomaly.detectedAt ? format(new Date(anomaly.detectedAt), "MMM d, yyyy 'at' h:mm a") : "Unknown"}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={anomaly.status === "resolved" ? "default" : "outline"}
                                  onClick={() => updateAnomalyStatus.mutate({ id: anomaly.id, status: "resolved" })}
                                  disabled={anomaly.status === "resolved"}
                                  data-testid={`button-resolve-${anomaly.id}`}
                                >
                                  {anomaly.status === "resolved" ? "Resolved" : "Resolve"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateAnomalyStatus.mutate({ id: anomaly.id, status: "dismissed" })}
                                  disabled={anomaly.status === "dismissed"}
                                  data-testid={`button-dismiss-anomaly-${anomaly.id}`}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="terminal" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TerminalIcon className="h-6 w-6 text-primary" />
                Terminal
              </h2>
              <p className="text-muted-foreground">Execute commands and interact with the system</p>
            </div>
            <Button 
              variant="outline" 
              onClick={clearTerminal}
              data-testid="button-clear-terminal"
            >
              Clear
            </Button>
          </div>

          <Card className="bg-black/90 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary font-mono">Terminal Session</CardTitle>
              <CardDescription className="text-muted-foreground">
                Interactive command-line interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea 
                ref={scrollRef}
                className="h-[400px] w-full rounded-md border border-primary/20 bg-black/50 p-4 font-mono text-sm"
              >
                <div className="space-y-1">
                  {outputs.map((output) => (
                    <div 
                      key={output.id} 
                      className={`${
                        output.type === 'command' 
                          ? 'text-primary font-bold' 
                          : output.type === 'error'
                          ? 'text-red-400'
                          : 'text-green-400'
                      }`}
                      data-testid={`terminal-output-${output.type}`}
                    >
                      {output.content}
                    </div>
                  ))}
                  {isExecuting && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Executing...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center gap-2 bg-black/50 rounded-md border border-primary/20 p-3">
                <ChevronRight className="h-4 w-4 text-primary" />
                <span className="text-primary font-mono">$</span>
                <Input
                  ref={inputRef}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isExecuting}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 font-mono text-green-400 placeholder:text-muted-foreground"
                  data-testid="input-terminal-command"
                />
                <Button
                  onClick={() => executeCommand(command)}
                  disabled={isExecuting || !command.trim()}
                  size="sm"
                  data-testid="button-execute-command"
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Execute'
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Press Enter to execute command</div>
                <div>• Use ↑/↓ arrows to navigate command history</div>
                <div>• Type "help" to see available commands</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Reference</CardTitle>
              <CardDescription>Common commands and their usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm font-mono">
                <div className="flex justify-between p-2 rounded hover-elevate">
                  <code className="text-primary">help</code>
                  <span className="text-muted-foreground">Display available commands</span>
                </div>
                <div className="flex justify-between p-2 rounded hover-elevate">
                  <code className="text-primary">status</code>
                  <span className="text-muted-foreground">Show system status</span>
                </div>
                <div className="flex justify-between p-2 rounded hover-elevate">
                  <code className="text-primary">wallet</code>
                  <span className="text-muted-foreground">Display wallet balance</span>
                </div>
                <div className="flex justify-between p-2 rounded hover-elevate">
                  <code className="text-primary">portfolio</code>
                  <span className="text-muted-foreground">Show portfolio summary</span>
                </div>
                <div className="flex justify-between p-2 rounded hover-elevate">
                  <code className="text-primary">health</code>
                  <span className="text-muted-foreground">Check system health</span>
                </div>
                <div className="flex justify-between p-2 rounded hover-elevate">
                  <code className="text-primary">clear</code>
                  <span className="text-muted-foreground">Clear terminal output</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Video className="h-6 w-6 text-primary" />
                AI Video Recommendations
              </h2>
              <p className="text-muted-foreground mt-1">
                Personalized YouTube video recommendations generated from your Daily Briefing
              </p>
            </div>
            <Button
              onClick={() => generateVideosMutation.mutate()}
              disabled={generateVideosMutation.isPending}
              data-testid="button-generate-videos"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateVideosMutation.isPending ? 'animate-spin' : ''}`} />
              {generateVideosMutation.isPending ? 'Generating...' : 'Generate New'}
            </Button>
          </div>

          {videosLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video, index) => (
                <Card key={index} className="hover-elevate" data-testid={`video-card-${index}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                      <Video className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <span className="line-clamp-2">{video.title}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{video.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Search: <span className="font-medium">{video.searchQuery}</span>
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(video.youtubeUrl, '_blank')}
                      data-testid={`button-watch-video-${index}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Watch on YouTube
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Videos Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Generate personalized video recommendations based on your Daily Briefing
                </p>
                <Button
                  onClick={() => generateVideosMutation.mutate()}
                  disabled={generateVideosMutation.isPending}
                  data-testid="button-generate-videos-empty"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generateVideosMutation.isPending ? 'animate-spin' : ''}`} />
                  {generateVideosMutation.isPending ? 'Generating...' : 'Generate Recommendations'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
