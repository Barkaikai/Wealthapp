import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface VideoRecommendation {
  title: string;
  description: string;
  searchQuery: string;
  youtubeUrl: string;
}

export default function Videos() {
  const { toast } = useToast();

  const { data: videos, isLoading } = useQuery<VideoRecommendation[]>({
    queryKey: ['/api/videos/recommendations'],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/videos/generate', {
        method: 'POST',
      });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            AI Video Recommendations
          </h1>
          <p className="text-muted-foreground mt-2">
            Personalized YouTube video recommendations generated from your Daily Briefing
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-videos"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
          {generateMutation.isPending ? 'Generating...' : 'Generate New'}
        </Button>
      </div>

      {isLoading ? (
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
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-videos-empty"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              {generateMutation.isPending ? 'Generating...' : 'Generate Recommendations'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
