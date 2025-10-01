import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface AIContent {
  id: number;
  slug: string;
  topic: string;
  content: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export default function LearnPage() {
  const [, params] = useRoute("/learn/:slug");
  const slug = params?.slug || "";
  const [content, setContent] = useState<AIContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      if (!slug) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Try to fetch existing content
        const response = await fetch(`/api/learn/${slug}`);
        
        if (response.ok) {
          const data = await response.json();
          setContent(data);
        } else if (response.status === 404) {
          // Content doesn't exist, generate it
          setIsGenerating(true);
          const topic = slug.replace(/-/g, ' '); // Convert slug back to topic
          const generatedResponse = await apiRequest("POST", "/api/learn/generate", { topic, slug });
          const generated = await generatedResponse.json();
          setContent(generated);
          setIsGenerating(false);
        } else {
          throw new Error("Failed to load content");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load content");
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, [slug]);

  if (isLoading || isGenerating) {
    return (
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <p>{isGenerating ? "Generating AI content..." : "Loading..."}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        
        <Card className="p-8">
          <div className="text-center">
            <p className="text-destructive mb-4">Error: {error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  // Simple markdown rendering - convert ## headings and bullet points
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-2xl font-semibold mt-8 mb-4 first:mt-0">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={key++} className="ml-6 mb-2">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={key++} className="mb-4 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="space-y-6" data-testid="learn-page">
      <Link href="/">
        <Button variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="learn-title">
          {content.topic}
        </h1>
        {content.summary && (
          <p className="text-lg text-muted-foreground" data-testid="learn-summary">
            {content.summary}
          </p>
        )}
      </div>

      <Card className="p-8">
        <div className="prose prose-invert max-w-none" data-testid="learn-content">
          {renderMarkdown(content.content)}
        </div>
      </Card>
    </div>
  );
}
