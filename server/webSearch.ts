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
    throw new Error('Tavily API key not configured');
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily API error:', errorText);
      throw new Error(`Search API error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Web search error:', error);
    throw error;
  }
}
