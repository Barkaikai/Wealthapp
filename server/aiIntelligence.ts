import type { Asset, Transaction } from "@shared/schema";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Generate portfolio report with AI insights
 */
export async function generatePortfolioReport(
  assets: Asset[],
  transactions: Transaction[],
  periodStart: Date,
  periodEnd: Date
) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const assetBreakdown: Record<string, number> = {};
  
  // Calculate asset breakdown by type
  assets.forEach(asset => {
    assetBreakdown[asset.assetType] = (assetBreakdown[asset.assetType] || 0) + asset.value;
  });

  // Calculate total change in period
  const periodTransactions = transactions.filter(
    t => t.transactionDate >= periodStart && t.transactionDate <= periodEnd
  );
  
  const totalChange = periodTransactions.reduce((sum, t) => {
    return sum + (t.type === 'buy' ? -t.totalAmount : t.totalAmount);
  }, 0);

  const totalChangePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;

  // Identify top gainers and losers
  const sortedAssets = [...assets].sort((a, b) => 
    (b.changePercent || 0) - (a.changePercent || 0)
  );
  const topGainers = sortedAssets.slice(0, 3).map(a => `${a.symbol}: +${a.changePercent?.toFixed(2)}%`);
  const topLosers = sortedAssets.slice(-3).reverse().map(a => `${a.symbol}: ${a.changePercent?.toFixed(2)}%`);

  // Generate AI insights
  const prompt = `Analyze this investment portfolio and provide insights:

Portfolio Value: $${totalValue.toLocaleString()}
Period: ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}
Total Change: ${totalChangePercent > 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%

Asset Breakdown:
${Object.entries(assetBreakdown).map(([type, value]) => `- ${type}: $${value.toLocaleString()} (${((value/totalValue)*100).toFixed(1)}%)`).join('\n')}

Top Performers:
${topGainers.join(', ')}

Underperformers:
${topLosers.join(', ')}

Provide:
1. 3-5 key insights about portfolio performance
2. 2-3 specific recommendations for improvement
3. Risk score (0-100, where 0 is no risk and 100 is maximum risk)
4. Diversification score (0-100, where 0 is not diversified and 100 is perfectly diversified)

Format as JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "riskScore": <number>,
  "diversificationScore": <number>
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || "{}");

  return {
    totalValue,
    totalChange,
    totalChangePercent,
    assetBreakdown,
    topGainers,
    topLosers,
    insights: analysis.insights || [],
    recommendations: analysis.recommendations || [],
    riskScore: analysis.riskScore || 50,
    diversificationScore: analysis.diversificationScore || 50,
  };
}

/**
 * Generate AI-powered trading recommendations
 */
export async function generateTradingRecommendations(
  assets: Asset[],
  transactions: Transaction[],
  marketContext: any
) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const hasAssets = assets.length > 0;
  const hasTransactions = transactions.length > 0;

  const prompt = `As a financial analyst, analyze this portfolio and market conditions to generate trading recommendations:

Current Holdings:
${hasAssets ? assets.map(a => `${a.symbol} (${a.assetType}): ${a.quantity} @ $${a.value.toFixed(2)} (${a.changePercent?.toFixed(2)}% change)`).join('\n') : 'No current holdings'}

Recent Transactions (last 30 days):
${hasTransactions ? transactions.slice(0, 10).map(t => `${t.type.toUpperCase()}: ${t.symbol} ${t.quantity} @ $${t.pricePerUnit}`).join('\n') : 'No recent transactions'}

Market Context:
${marketContext ? JSON.stringify(marketContext, null, 2) : 'Not available'}

${hasAssets || hasTransactions ? 'Analyze the portfolio and generate 3-5 specific trading recommendations.' : 'Generate 3-5 beginner-friendly trading recommendations for someone starting to build a portfolio.'}

For each recommendation provide:
1. Symbol to trade
2. Asset type (stocks, crypto, bonds, real_estate, gold, silver)
3. Action (buy, sell, hold)
4. Confidence level (0-100)
5. Detailed reasoning
6. Target price (if applicable)
7. Current price
8. Potential return percentage
9. Risk level (low, medium, high)
10. Time horizon (short, medium, long)
11. Market sentiment (bullish, bearish, neutral)

Format as JSON object with recommendations array:
{
  "recommendations": [
    {
      "symbol": "AAPL",
      "assetType": "stocks",
      "action": "buy",
      "confidence": 75,
      "reasoning": "Strong earnings potential...",
      "targetPrice": 185.50,
      "currentPrice": 175.00,
      "potentialReturn": 6.0,
      "riskLevel": "medium",
      "timeHorizon": "medium",
      "marketSentiment": "bullish"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content || "{}");
  const recommendations = response.recommendations || [];
  
  console.log(`[AI Intelligence] Generated ${recommendations.length} trading recommendations for user`);
  
  return recommendations;
}

/**
 * Detect portfolio anomalies using AI
 */
export async function detectAnomalies(
  assets: Asset[],
  transactions: Transaction[],
  recentActivity: any[]
) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Analyze this portfolio data for anomalies and unusual patterns:

Current Assets:
${assets.map(a => `${a.symbol}: $${a.value} (${a.changePercent?.toFixed(2)}% change)`).join('\n')}

Recent Transactions:
${transactions.slice(0, 20).map(t => `${t.type}: ${t.symbol} ${t.quantity} @ $${t.pricePerUnit} on ${t.transactionDate}`).join('\n')}

Recent Activity:
${JSON.stringify(recentActivity, null, 2)}

Identify any anomalies such as:
1. Unusual transaction patterns
2. Unexpected price spikes or drops
3. Portfolio concentration risks
4. Suspicious activity patterns
5. Deviation from normal behavior

For each anomaly found, provide:
- Type (unusual_transaction, price_spike, pattern_break, account_activity)
- Severity (low, medium, high, critical)
- Description
- Affected entity (symbol/asset)
- Entity type (asset, transaction, etc)
- Detected value
- Expected value
- Deviation percentage
- AI analysis and explanation
- Recommendations to address it

Format as JSON array:
[
  {
    "anomalyType": "price_spike",
    "severity": "high",
    "description": "BTC experienced 15% drop in 24h",
    "affectedEntity": "BTC",
    "entityType": "asset",
    "detectedValue": 45000,
    "expectedValue": 52000,
    "deviation": 13.46,
    "aiAnalysis": "Significant market correction...",
    "recommendations": ["Consider rebalancing", "Review stop-loss orders"]
  },
  ...
]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content || "{}");
  return response.anomalies || [];
}

/**
 * Generate portfolio rebalancing recommendations
 */
export async function generateRebalancingRecommendations(
  assets: Asset[],
  targetAllocation?: Record<string, number>
) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const currentAllocation: Record<string, number> = {};
  
  // Calculate current allocation
  assets.forEach(asset => {
    const percent = (asset.value / totalValue) * 100;
    currentAllocation[asset.assetType] = (currentAllocation[asset.assetType] || 0) + percent;
  });

  // Default target allocation if not provided (balanced portfolio)
  const defaultTarget = {
    stocks: 40,
    crypto: 15,
    bonds: 25,
    real_estate: 10,
    gold: 5,
    silver: 3,
    cash: 2
  };

  const target = targetAllocation || defaultTarget;

  const prompt = `As a portfolio manager, analyze this portfolio allocation and recommend rebalancing:

Current Allocation:
${Object.entries(currentAllocation).map(([type, pct]) => `${type}: ${pct.toFixed(1)}%`).join('\n')}

Target Allocation:
${Object.entries(target).map(([type, pct]) => `${type}: ${pct.toFixed(1)}%`).join('\n')}

Total Portfolio Value: $${totalValue.toLocaleString()}

Current Holdings:
${assets.map(a => `${a.symbol} (${a.assetType}): $${a.value.toFixed(2)}`).join('\n')}

Provide:
1. Recommended target allocation percentages for each asset class
2. Specific actions to rebalance (what to buy/sell and how much)
3. Reasoning for recommendations
4. Expected benefits
5. Risk reduction percentage
6. Diversification improvement percentage
7. Estimated transaction costs
8. Priority level (low, medium, high)

Format as JSON:
{
  "targetAllocation": {"stocks": 40, "crypto": 15, ...},
  "actions": [
    {"symbol": "AAPL", "action": "sell", "amount": 5000, "reasoning": "Reduce stock concentration"},
    {"symbol": "BTC", "action": "buy", "amount": 2000, "reasoning": "Increase crypto exposure"},
    ...
  ],
  "reasoning": "Overall portfolio strategy explanation...",
  "expectedBenefit": "Improved diversification and risk-adjusted returns...",
  "riskReduction": 12.5,
  "diversificationImprovement": 15.0,
  "estimatedCost": 50,
  "priority": "high"
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const recommendation = JSON.parse(completion.choices[0].message.content || "{}");
  
  return {
    currentAllocation,
    targetAllocation: recommendation.targetAllocation || target,
    actions: recommendation.actions || [],
    reasoning: recommendation.reasoning || "",
    expectedBenefit: recommendation.expectedBenefit || "",
    riskReduction: recommendation.riskReduction || 0,
    diversificationImprovement: recommendation.diversificationImprovement || 0,
    estimatedCost: recommendation.estimatedCost || 0,
    priority: recommendation.priority || "medium",
  };
}

/**
 * Analyze transaction for tax implications
 */
export async function analyzeTaxImplications(transaction: Transaction, costBasis?: number) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const currentYear = new Date().getFullYear();
  const holdingPeriod = costBasis ? "long_term" : "short_term"; // Simplified - should calculate actual holding period

  const prompt = `Analyze this transaction for tax implications:

Transaction Type: ${transaction.type}
Symbol: ${transaction.symbol}
Asset Type: ${transaction.assetType}
Quantity: ${transaction.quantity}
Price Per Unit: $${transaction.pricePerUnit}
Total Amount: $${transaction.totalAmount}
Date: ${transaction.transactionDate}
Cost Basis: ${costBasis ? `$${costBasis}` : 'Unknown'}

Determine:
1. Event type (capital_gain, capital_loss, dividend, interest, wash_sale)
2. Taxable amount
3. Gain/loss amount
4. Holding period (short_term < 1 year, long_term >= 1 year)
5. Description of tax event
6. Recommendations for tax optimization

Format as JSON:
{
  "eventType": "capital_gain",
  "taxableAmount": 5000,
  "gainLoss": 1500,
  "holdingPeriod": "long_term",
  "description": "Long-term capital gain on AAPL sale",
  "notes": "Consider tax-loss harvesting opportunities..."
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || "{}");
  
  return {
    eventType: analysis.eventType || 'capital_gain',
    taxYear: currentYear,
    symbol: transaction.symbol,
    assetType: transaction.assetType,
    costBasis: costBasis || 0,
    proceeds: transaction.type === 'sell' ? transaction.totalAmount : 0,
    gainLoss: analysis.gainLoss || 0,
    holdingPeriod: analysis.holdingPeriod || holdingPeriod,
    taxableAmount: analysis.taxableAmount || 0,
    description: analysis.description || `${transaction.type} of ${transaction.symbol}`,
    notes: analysis.notes || '',
  };
}
