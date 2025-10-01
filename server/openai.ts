// From javascript_openai integration
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PortfolioAnalytics {
  totalWealth: number;
  assetCount: number;
  typeBreakdown: Record<string, { count: number; value: number; percentage: number }>;
  topPerformers: Array<{ name: string; symbol: string; changePercent: number }>;
  topDecliners: Array<{ name: string; symbol: string; changePercent: number }>;
  diversificationScore: number; // 0-100, higher is more diversified
  averageChange: number;
}

function calculatePortfolioAnalytics(assets: any[]): PortfolioAnalytics {
  const totalWealth = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  // Calculate breakdown by asset type
  const typeBreakdown: Record<string, { count: number; value: number; percentage: number }> = {};
  assets.forEach(asset => {
    if (!typeBreakdown[asset.assetType]) {
      typeBreakdown[asset.assetType] = { count: 0, value: 0, percentage: 0 };
    }
    typeBreakdown[asset.assetType].count++;
    typeBreakdown[asset.assetType].value += asset.value;
  });
  
  // Calculate percentages
  Object.keys(typeBreakdown).forEach(type => {
    typeBreakdown[type].percentage = totalWealth > 0 
      ? (typeBreakdown[type].value / totalWealth) * 100 
      : 0;
  });
  
  // Find top performers and decliners
  const assetsWithChange = assets.filter(a => a.changePercent != null);
  const topPerformers = [...assetsWithChange]
    .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
    .slice(0, 3)
    .map(a => ({ name: a.name, symbol: a.symbol, changePercent: a.changePercent }));
  
  const topDecliners = [...assetsWithChange]
    .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
    .slice(0, 3)
    .map(a => ({ name: a.name, symbol: a.symbol, changePercent: a.changePercent }));
  
  // Calculate diversification score (based on Herfindahl-Hirschman Index)
  const concentrationScore = Object.values(typeBreakdown)
    .reduce((sum, type) => sum + Math.pow(type.percentage / 100, 2), 0);
  const diversificationScore = Math.round((1 - concentrationScore) * 100);
  
  // Calculate average change
  const averageChange = assetsWithChange.length > 0
    ? assetsWithChange.reduce((sum, a) => sum + (a.changePercent || 0), 0) / assetsWithChange.length
    : 0;
  
  return {
    totalWealth,
    assetCount: assets.length,
    typeBreakdown,
    topPerformers,
    topDecliners,
    diversificationScore,
    averageChange,
  };
}

export async function generateDailyBriefing(
  assets: any[],
  events: any[],
  marketContext?: any,
  previousBriefing?: any
): Promise<{
  highlights: string[];
  risks: string[];
  actions: string[];
}> {
  // Calculate portfolio analytics
  const analytics = calculatePortfolioAnalytics(assets);
  
  // Format asset details with performance metrics
  const assetDetails = assets.slice(0, 20).map(a => {
    const parts = [`${a.name} (${a.symbol}): $${a.value.toLocaleString()}`];
    if (a.changePercent != null) {
      parts.push(`${a.changePercent >= 0 ? '+' : ''}${a.changePercent.toFixed(2)}%`);
    }
    if (a.lastSynced) {
      parts.push(`last synced ${new Date(a.lastSynced).toLocaleDateString()}`);
    }
    return parts.join(' ');
  }).join('\n');
  
  // Format allocation breakdown
  const allocationBreakdown = Object.entries(analytics.typeBreakdown)
    .map(([type, data]) => `${type}: ${data.percentage.toFixed(1)}% ($${data.value.toLocaleString()})`)
    .join(', ');
  
  // Format recent events
  const recentEvents = events.slice(0, 10).map(e => {
    const parts = [e.details];
    if (e.amount) parts.push(`$${e.amount.toLocaleString()}`);
    if (e.createdAt) parts.push(new Date(e.createdAt).toLocaleDateString());
    return parts.join(' - ');
  }).join('\n');
  
  // Format market context
  let marketInfo = '';
  if (marketContext) {
    marketInfo = `\n\nCurrent Market Conditions:
Crypto Market: ${marketContext.crypto?.slice(0, 5).map((c: any) => `${c.name} $${c.price.toLocaleString()} (${c.changePercent >= 0 ? '+' : ''}${c.changePercent?.toFixed(2)}%)`).join(', ') || 'No data'}
Stock Market: ${marketContext.stocks?.slice(0, 5).map((s: any) => `${s.symbol} $${s.price.toFixed(2)} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%)`).join(', ') || 'No data'}
Metals: ${marketContext.metals?.slice(0, 3).map((m: any) => `${m.name} $${m.price.toFixed(2)} (${m.changePercent >= 0 ? '+' : ''}${m.changePercent?.toFixed(2)}%)`).join(', ') || 'No data'}`;
  }
  
  // Format previous period comparison
  let historicalContext = '';
  if (previousBriefing) {
    historicalContext = `\n\nPrevious Briefing (${new Date(previousBriefing.date).toLocaleDateString()}):
Last highlights: ${previousBriefing.highlights?.join('; ') || 'None'}
Last recommended actions: ${previousBriefing.actions?.join('; ') || 'None'}`;
  }
  
  const prompt = `You are an elite wealth advisor for ultra-high-net-worth individuals. Generate a precise, actionable daily financial briefing based on real portfolio data and market conditions.

PORTFOLIO OVERVIEW:
━━━━━━━━━━━━━━━━
Total Net Worth: $${analytics.totalWealth.toLocaleString()}
Asset Count: ${analytics.assetCount}
Portfolio Diversification Score: ${analytics.diversificationScore}/100 (${analytics.diversificationScore >= 70 ? 'Well diversified' : analytics.diversificationScore >= 40 ? 'Moderately diversified' : 'Highly concentrated'})
24h Average Change: ${analytics.averageChange >= 0 ? '+' : ''}${analytics.averageChange.toFixed(2)}%

ALLOCATION BREAKDOWN:
${allocationBreakdown}

TOP PERFORMERS (24h):
${analytics.topPerformers.length > 0 ? analytics.topPerformers.map(p => `• ${p.name} (${p.symbol}): +${p.changePercent.toFixed(2)}%`).join('\n') : '• No performance data available'}

TOP DECLINERS (24h):
${analytics.topDecliners.length > 0 ? analytics.topDecliners.map(d => `• ${d.name} (${d.symbol}): ${d.changePercent.toFixed(2)}%`).join('\n') : '• No performance data available'}

ASSET DETAILS:
${assetDetails || 'No assets tracked'}

RECENT EVENTS:
${recentEvents || 'No recent events'}${marketInfo}${historicalContext}

━━━━━━━━━━━━━━━━

INSTRUCTIONS:
Generate a briefing with three sections. Be specific, quantitative, and actionable.

1. **highlights** (2-4 items): Positive observations, achievements, or opportunities
   - Reference specific assets, percentages, and dollar amounts
   - Highlight strong performers and portfolio strengths
   - Note beneficial market conditions or diversification improvements
   - Example: "Bitcoin position up 8.3% to $125,000, outperforming broader crypto market by 3.2%"

2. **risks** (1-3 items): Potential concerns, vulnerabilities, or threats
   - Identify concentrated positions (>30% in single asset type)
   - Note significant decliners with specific percentages
   - Highlight lack of diversification or recent market volatility
   - Example: "Tech stock allocation at 45% exceeds recommended 30% threshold, increasing sector risk exposure"

3. **actions** (2-4 items): Concrete, prioritized recommendations
   - Provide specific steps (rebalance percentages, sync prices, review positions)
   - Suggest portfolio adjustments based on allocation imbalances
   - Recommend timely actions based on market conditions
   - Example: "Rebalance portfolio by reducing crypto allocation from 35% to 25%, redirecting $50K to bonds"

TONE: Professional, confident, data-driven. Assume the user understands financial terminology.

Respond with JSON in this exact format:
{
  "highlights": ["...", "...", "..."],
  "risks": ["...", "..."],
  "actions": ["...", "...", "..."]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!);
}

export async function categorizeEmail(subject: string, preview: string): Promise<"personal" | "finance" | "investments"> {
  const prompt = `Categorize this email into one of: personal, finance, investments

Subject: ${subject}
Preview: ${preview}

Respond with JSON: { "category": "personal" | "finance" | "investments" }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content!);
  return result.category;
}

export async function draftEmailReply(emailBody: string): Promise<string> {
  const prompt = `Draft a professional, concise email reply to the following email. Keep it under 100 words:

${emailBody}

Respond with just the draft text, no JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content!;
}

export async function generateLifestyleRecommendations(
  routines: any[]
): Promise<string[]> {
  const currentRoutine = routines.map(r => `${r.time}: ${r.title} (${r.duration})`).join("\n");
  
  const prompt = `Based on this daily routine, suggest 3 improvements for health, wealth, or productivity:

${currentRoutine}

Respond with JSON: { "recommendations": ["...", "...", "..."] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content!);
  return result.recommendations;
}

export async function generateTopicArticle(topic: string): Promise<{
  title: string;
  summary: string;
  contentMarkdown: string;
}> {
  const prompt = `You are an expert AI assistant for a billionaire-level wealth automation platform. Create comprehensive educational content about: "${topic}"

The content should be:
- Professional and authoritative
- Focused on wealth management, financial automation, or lifestyle optimization
- Practical and actionable for high-net-worth individuals
- Well-structured with clear sections

Generate:
1. title: A compelling title (max 80 characters)
2. summary: A brief 1-2 sentence summary
3. contentMarkdown: Detailed article content in markdown format (500-800 words)

The markdown should include:
- Clear sections with ## headings
- Bullet points for key takeaways
- Practical examples or strategies
- Links to related concepts where relevant

Respond with JSON in this exact format:
{
  "title": "...",
  "summary": "...",
  "contentMarkdown": "..."
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!);
}
