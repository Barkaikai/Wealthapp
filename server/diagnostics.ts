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

export interface DiagnosticReport {
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

export async function runFullDiagnostics(): Promise<DiagnosticReport> {
  const startTime = Date.now();
  
  // Run all diagnostics in parallel for better performance
  const [
    dbResult,
    openaiResult,
    alphaVantageResult,
    coinGeckoResult,
    gmailResult,
    sessionResult,
    dbUrlResult,
    memoryResult,
    processResult,
  ] = await Promise.all([
    checkDatabase(),
    checkOpenAI(),
    checkAlphaVantage(),
    checkCoinGecko(),
    checkGmailOAuth(),
    checkSessionSecret(),
    checkDatabaseUrl(),
    checkMemoryUsage(),
    checkProcessHealth(),
  ]);

  const results = [
    dbResult,
    openaiResult,
    alphaVantageResult,
    coinGeckoResult,
    gmailResult,
    sessionResult,
    dbUrlResult,
    memoryResult,
    processResult,
  ];

  const summary = {
    total: results.length,
    success: results.filter(r => r.status === "success").length,
    warning: results.filter(r => r.status === "warning").length,
    error: results.filter(r => r.status === "error").length,
  };

  return {
    results,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary,
  };
}

async function checkDatabase(): Promise<DiagnosticResult> {
  try {
    await db.execute(sql`SELECT 1`);
    return {
      category: "Database",
      name: "PostgreSQL Connection",
      status: "success",
      message: "Database connection is healthy",
    };
  } catch (error: any) {
    return {
      category: "Database",
      name: "PostgreSQL Connection",
      status: "error",
      message: "Database connection failed",
      details: error.message,
    };
  }
}

async function checkOpenAI(): Promise<DiagnosticResult> {
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
      
      return {
        category: "API Keys",
        name: "OpenAI API Key",
        status: "success",
        message: "OpenAI API key is valid and working",
      };
    } catch (error: any) {
      return {
        category: "API Keys",
        name: "OpenAI API Key",
        status: "error",
        message: "OpenAI API key validation failed",
        details: error.message,
      };
    }
  } else {
    return {
      category: "API Keys",
      name: "OpenAI API Key",
      status: "error",
      message: "OpenAI API key is not configured",
      details: "OPENAI_API_KEY environment variable is missing",
    };
  }
}

async function checkAlphaVantage(): Promise<DiagnosticResult> {
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await response.json();
      
      if (data["Global Quote"]) {
        return {
          category: "API Keys",
          name: "Alpha Vantage API Key",
          status: "success",
          message: "Alpha Vantage API key is valid (stock data available)",
        };
      } else if (data.Note && data.Note.includes("API call frequency")) {
        return {
          category: "API Keys",
          name: "Alpha Vantage API Key",
          status: "warning",
          message: "Alpha Vantage rate limit reached (key is valid)",
          details: "API call frequency limit reached. Try again later.",
        };
      } else {
        return {
          category: "API Keys",
          name: "Alpha Vantage API Key",
          status: "error",
          message: "Alpha Vantage API key validation failed",
          details: JSON.stringify(data),
        };
      }
    } catch (error: any) {
      return {
        category: "API Keys",
        name: "Alpha Vantage API Key",
        status: "error",
        message: "Alpha Vantage API connection failed",
        details: error.message,
      };
    }
  } else {
    return {
      category: "API Keys",
      name: "Alpha Vantage API Key",
      status: "warning",
      message: "Alpha Vantage API key not configured",
      details: "Stock price sync will not work. ALPHA_VANTAGE_API_KEY is missing.",
    };
  }
}

async function checkCoinGecko(): Promise<DiagnosticResult> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.bitcoin) {
        return {
          category: "External APIs",
          name: "CoinGecko API",
          status: "success",
          message: "CoinGecko API is accessible (crypto data available)",
        };
      } else {
        return {
          category: "External APIs",
          name: "CoinGecko API",
          status: "warning",
          message: "CoinGecko API returned unexpected data",
          details: JSON.stringify(data),
        };
      }
    } else {
      return {
        category: "External APIs",
        name: "CoinGecko API",
        status: "error",
        message: `CoinGecko API returned HTTP ${response.status}`,
        details: await response.text(),
      };
    }
  } catch (error: any) {
    return {
      category: "External APIs",
      name: "CoinGecko API",
      status: "error",
      message: "CoinGecko API connection failed",
      details: error.message,
    };
  }
}

async function checkGmailOAuth(): Promise<DiagnosticResult> {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      category: "Integrations",
      name: "Gmail OAuth",
      status: "warning",
      message: "Gmail OAuth credentials configured but scope limitations exist",
      details: "Replit Gmail connector only provides add-on scopes, not gmail.readonly scope required for full inbox access.",
    };
  } else {
    return {
      category: "Integrations",
      name: "Gmail OAuth",
      status: "warning",
      message: "Gmail OAuth not fully configured",
      details: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing",
    };
  }
}

async function checkSessionSecret(): Promise<DiagnosticResult> {
  if (process.env.SESSION_SECRET) {
    return {
      category: "Security",
      name: "Session Secret",
      status: "success",
      message: "Session secret is configured",
    };
  } else {
    return {
      category: "Security",
      name: "Session Secret",
      status: "error",
      message: "Session secret is not configured",
      details: "SESSION_SECRET environment variable is missing",
    };
  }
}

async function checkDatabaseUrl(): Promise<DiagnosticResult> {
  if (process.env.DATABASE_URL) {
    return {
      category: "Configuration",
      name: "Database URL",
      status: "success",
      message: "Database URL is configured",
    };
  } else {
    return {
      category: "Configuration",
      name: "Database URL",
      status: "error",
      message: "Database URL is not configured",
      details: "DATABASE_URL environment variable is missing",
    };
  }
}

async function checkMemoryUsage(): Promise<DiagnosticResult> {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    let status: "success" | "warning" | "error" = "success";
    let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`;

    // Trigger garbage collection if available and heap usage is high
    if (heapUsagePercent > 85 && global.gc) {
      try {
        global.gc();
        message += " - GC triggered";
      } catch (e) {
        // GC failed, continue anyway
      }
    }

    if (heapUsagePercent > 90) {
      status = "error";
      message = `Critical: ${message} - Memory critically high`;
    } else if (heapUsagePercent > 75) {
      status = "warning";
      message = `Warning: ${message} - Memory usage high`;
    }

    return {
      category: "Performance",
      name: "Memory Usage",
      status,
      message,
      details: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB | RSS: ${rssMB}MB | External: ${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };
  } catch (error: any) {
    return {
      category: "Performance",
      name: "Memory Usage",
      status: "error",
      message: "Failed to check memory usage",
      details: error.message,
    };
  }
}

async function checkProcessHealth(): Promise<DiagnosticResult> {
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    let uptimeStr = "";
    if (uptimeDays > 0) {
      uptimeStr = `${uptimeDays}d ${uptimeHours % 24}h`;
    } else if (uptimeHours > 0) {
      uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m`;
    } else {
      uptimeStr = `${uptimeMinutes}m ${uptimeSeconds % 60}s`;
    }

    const pid = process.pid;
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;

    return {
      category: "System",
      name: "Process Health",
      status: "success",
      message: `Process healthy - Uptime: ${uptimeStr}`,
      details: `PID: ${pid} | Node: ${nodeVersion} | Platform: ${platform}-${arch}`,
    };
  } catch (error: any) {
    return {
      category: "System",
      name: "Process Health",
      status: "error",
      message: "Failed to check process health",
      details: error.message,
    };
  }
}
