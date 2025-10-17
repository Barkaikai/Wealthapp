import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useDeviceStorage } from "@/hooks/use-device-storage";
import { useToast } from "@/hooks/use-toast";
import { 
  HardDrive, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  Database,
  FileText,
  Brain,
  Briefcase,
  Package
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const typeIcons: Record<string, any> = {
  briefing: Briefcase,
  'ai-insight': Brain,
  portfolio: FileText,
  asset: Package,
  'user-data': Database,
  general: HardDrive,
};

const typeLabels: Record<string, string> = {
  briefing: 'Daily Briefings',
  'ai-insight': 'AI Insights',
  portfolio: 'Portfolio Data',
  asset: 'Asset Information',
  'user-data': 'User Data',
  general: 'General Cache',
};

export function StorageSettings() {
  const { stats, isLoading, refreshStats, clearExpiredCache, clearCacheByType, clearAll } = useDeviceStorage();
  const { toast } = useToast();

  const handleClearExpired = async () => {
    try {
      const deletedCount = await clearExpiredCache();
      toast({
        title: "Cache Cleared",
        description: `Removed ${deletedCount} expired cache entries`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear expired cache",
        variant: "destructive",
      });
    }
  };

  const handleClearType = async (type: string) => {
    try {
      const deletedCount = await clearCacheByType(type as any);
      toast({
        title: "Cache Cleared",
        description: `Removed ${deletedCount} ${typeLabels[type]} entries`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to clear ${typeLabels[type]}`,
        variant: "destructive",
      });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all cached data? This will remove all offline data and you may need to re-download content.')) {
      return;
    }

    try {
      await clearAll();
      toast({
        title: "Storage Cleared",
        description: "All cached data has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear all storage",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !stats) {
    return (
      <Card data-testid="card-storage-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Device Storage
          </CardTitle>
          <CardDescription>Managing your device storage...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card data-testid="card-storage-overview">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Device Storage
              </CardTitle>
              <CardDescription>
                Optimize your app performance with smart caching
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshStats}
              data-testid="button-refresh-storage"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Quota */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Storage Used</span>
              <span className="font-medium">
                {formatBytes(stats.quota.used)} / {formatBytes(stats.quota.total)}
              </span>
            </div>
            <Progress value={stats.quota.percentUsed} data-testid="progress-storage-quota" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{stats.quota.percentUsed.toFixed(1)}% used</span>
              <span>{formatBytes(stats.quota.available)} available</span>
            </div>
          </div>

          {/* Warning if near capacity */}
          {stats.isNearCapacity && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md" data-testid="alert-storage-warning">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-warning">Storage Nearly Full</p>
                <p className="text-muted-foreground mt-1">
                  Clear some cache to free up space and improve performance
                </p>
              </div>
            </div>
          )}

          {/* Cache Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold" data-testid="text-cache-entries">{stats.cache.totalEntries}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cache Size</p>
              <p className="text-2xl font-bold" data-testid="text-cache-size">{formatBytes(stats.cache.totalSize)}</p>
            </div>
          </div>

          {stats.cache.oldestEntry && (
            <p className="text-xs text-muted-foreground">
              Oldest cached item: {formatDistanceToNow(stats.cache.oldestEntry, { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cache by Type */}
      <Card data-testid="card-cache-types">
        <CardHeader>
          <CardTitle>Cached Data by Type</CardTitle>
          <CardDescription>
            Manage different types of cached content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.cache.byType).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No cached data available
            </p>
          ) : (
            Object.entries(stats.cache.byType).map(([type, data]) => {
              const Icon = typeIcons[type] || HardDrive;
              return (
                <div 
                  key={type} 
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`cache-type-${type}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{typeLabels[type] || type}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.count} {data.count === 1 ? 'item' : 'items'} • {formatBytes(data.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearType(type)}
                    data-testid={`button-clear-${type}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Storage Actions */}
      <Card data-testid="card-storage-actions">
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>
            Free up space and optimize performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleClearExpired}
            data-testid="button-clear-expired"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Expired Cache
            <Badge variant="secondary" className="ml-auto">Recommended</Badge>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleClearAll}
            data-testid="button-clear-all"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Cached Data
            <Badge variant="destructive" className="ml-auto">Caution</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Storage Benefits */}
      <Card data-testid="card-storage-benefits">
        <CardHeader>
          <CardTitle>How Device Storage Helps</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Faster Loading:</strong> Cached data loads instantly without waiting for the server</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Offline Access:</strong> View your data even when you're offline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Reduced Data Usage:</strong> Save bandwidth by using cached content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong>Better Performance:</strong> Less server load means faster response times</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
