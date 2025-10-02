import { config } from './config';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
}

export async function searchWeb(query: string): Promise<TavilySearchResult[]> {
  const apiKey = config.tavilyApiKey;

  if (!apiKey) {
    console.error('Tavily API key not configured - check TAVILY_API_KEY environment variable');
    throw new Error('Web search service not configured');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.trim(),
        search_depth: 'basic',
        include_answer: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavily API key');
      } else if (response.status === 429) {
        throw new Error('Search rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Search service error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();
    return data.results || [];
  } catch (error) {
    if (error instanceof Error) {
      console.error('Web search error:', error.message);
      throw error;
    }
    console.error('Unknown web search error:', error);
    throw new Error('Failed to perform web search');
  }
}
