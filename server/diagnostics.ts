import { db } from "./db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

export interface DiagnosticResult {
  category: string;
  name: string;
  status: "success" | "warning" | "error";
  message: string;
  details?: string;
}

export async function runFullDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Database connectivity
  try {
    await db.execute(sql`SELECT 1`);
    results.push({
      category: "Database",
      name: "PostgreSQL Connection",
      status: "success",
      message: "Database connection is healthy",
    });
  } catch (error: any) {
    results.push({
      category: "Database",
      name: "PostgreSQL Connection",
      status: "error",
      message: "Database connection failed",
      details: error.message,
    });
  }

  // OpenAI API Key
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 10000,
      });
      
      // Test with a minimal request
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5,
      });
      
      results.push({
        category: "API Keys",
        name: "OpenAI API Key",
        status: "success",
        message: "OpenAI API key is valid and working",
      });
    } catch (error: any) {
      results.push({
        category: "API Keys",
        name: "OpenAI API Key",
        status: "error",
        message: "OpenAI API key validation failed",
        details: error.message,
      });
    }
  } else {
    results.push({
      category: "API Keys",
      name: "OpenAI API Key",
      status: "error",
      message: "OpenAI API key is not configured",
      details: "OPENAI_API_KEY environment variable is missing",
    });
  }

  // Alpha Vantage API Key
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await response.json();
      
      if (data["Global Quote"]) {
        results.push({
          category: "API Keys",
          name: "Alpha Vantage API Key",
          status: "success",
          message: "Alpha Vantage API key is valid (stock data available)",
        });
      } else if (data.Note && data.Note.includes("API call frequency")) {
        results.push({
          category: "API Keys",
          name: "Alpha Vantage API Key",
          status: "warning",
          message: "Alpha Vantage rate limit reached (key is valid)",
          details: "API call frequency limit reached. Try again later.",
        });
      } else {
        results.push({
          category: "API Keys",
          name: "Alpha Vantage API Key",
          status: "error",
          message: "Alpha Vantage API key validation failed",
          details: JSON.stringify(data),
        });
      }
    } catch (error: any) {
      results.push({
        category: "API Keys",
        name: "Alpha Vantage API Key",
        status: "error",
        message: "Alpha Vantage API connection failed",
        details: error.message,
      });
    }
  } else {
    results.push({
      category: "API Keys",
      name: "Alpha Vantage API Key",
      status: "warning",
      message: "Alpha Vantage API key not configured",
      details: "Stock price sync will not work. ALPHA_VANTAGE_API_KEY is missing.",
    });
  }

  // CoinGecko API (public endpoint)
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.bitcoin) {
        results.push({
          category: "External APIs",
          name: "CoinGecko API",
          status: "success",
          message: "CoinGecko API is accessible (crypto data available)",
        });
      } else {
        results.push({
          category: "External APIs",
          name: "CoinGecko API",
          status: "warning",
          message: "CoinGecko API returned unexpected data",
          details: JSON.stringify(data),
        });
      }
    } else {
      results.push({
        category: "External APIs",
        name: "CoinGecko API",
        status: "error",
        message: `CoinGecko API returned HTTP ${response.status}`,
        details: await response.text(),
      });
    }
  } catch (error: any) {
    results.push({
      category: "External APIs",
      name: "CoinGecko API",
      status: "error",
      message: "CoinGecko API connection failed",
      details: error.message,
    });
  }

  // Gmail/Google OAuth Connection
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    results.push({
      category: "Integrations",
      name: "Gmail OAuth",
      status: "warning",
      message: "Gmail OAuth credentials configured but scope limitations exist",
      details: "Replit Gmail connector only provides add-on scopes, not gmail.readonly scope required for full inbox access.",
    });
  } else {
    results.push({
      category: "Integrations",
      name: "Gmail OAuth",
      status: "warning",
      message: "Gmail OAuth not fully configured",
      details: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing",
    });
  }

  // Session secret
  if (process.env.SESSION_SECRET) {
    results.push({
      category: "Security",
      name: "Session Secret",
      status: "success",
      message: "Session secret is configured",
    });
  } else {
    results.push({
      category: "Security",
      name: "Session Secret",
      status: "error",
      message: "Session secret is not configured",
      details: "SESSION_SECRET environment variable is missing",
    });
  }

  // Database URL
  if (process.env.DATABASE_URL) {
    results.push({
      category: "Configuration",
      name: "Database URL",
      status: "success",
      message: "Database URL is configured",
    });
  } else {
    results.push({
      category: "Configuration",
      name: "Database URL",
      status: "error",
      message: "Database URL is not configured",
      details: "DATABASE_URL environment variable is missing",
    });
  }

  return results;
}
