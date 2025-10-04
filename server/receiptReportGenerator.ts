import OpenAI from "openai";
import type { Receipt, ReceiptReport, InsertReceiptReport } from "@shared/schema";

const apiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;

if (apiKey) {
  openai = new OpenAI({ apiKey });
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  merchant?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: string;
}

export interface GeneratedReportData {
  aiSummary: string;
  insights: string[];
  recommendations: string[];
  categoryBreakdown: Record<string, number>;
  merchantBreakdown: Record<string, number>;
  trends: any;
}

export async function generateReceiptReport(
  receipts: Receipt[],
  reportType: string,
  filters: ReportFilters
): Promise<GeneratedReportData> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  if (receipts.length === 0) {
    return {
      aiSummary: "No receipts found matching the specified criteria.",
      insights: [],
      recommendations: [],
      categoryBreakdown: {},
      merchantBreakdown: {},
      trends: {},
    };
  }

  // Calculate statistics
  const totalAmount = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const categoryBreakdown: Record<string, number> = {};
  const merchantBreakdown: Record<string, number> = {};

  receipts.forEach((receipt) => {
    if (receipt.category) {
      categoryBreakdown[receipt.category] = 
        (categoryBreakdown[receipt.category] || 0) + (receipt.amount || 0);
    }
    if (receipt.merchant) {
      merchantBreakdown[receipt.merchant] = 
        (merchantBreakdown[receipt.merchant] || 0) + (receipt.amount || 0);
    }
  });

  // Prepare data for AI analysis
  const receiptSummary = receipts.slice(0, 50).map((r) => ({
    date: r.receiptDate,
    merchant: r.merchant,
    amount: r.amount,
    currency: r.currency,
    category: r.category,
    items: r.items?.slice(0, 5), // Limit items to save tokens
  }));

  const prompt = `Analyze the following receipt data and provide insights:

Report Type: ${reportType}
Date Range: ${filters.startDate ? filters.startDate.toDateString() : 'N/A'} to ${filters.endDate ? filters.endDate.toDateString() : 'N/A'}
Total Receipts: ${receipts.length}
Total Amount: $${totalAmount.toFixed(2)}

Category Breakdown:
${Object.entries(categoryBreakdown).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join('\n')}

Top Merchants:
${Object.entries(merchantBreakdown)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([merch, amt]) => `- ${merch}: $${amt.toFixed(2)}`)
  .join('\n')}

Sample Receipts (first ${receiptSummary.length}):
${JSON.stringify(receiptSummary, null, 2)}

Please provide:
1. A comprehensive summary (2-3 paragraphs) analyzing spending patterns
2. 5-7 key insights about the spending data
3. 3-5 actionable recommendations for optimizing expenses

Return as JSON with this structure:
{
  "summary": "...",
  "insights": ["insight1", "insight2", ...],
  "recommendations": ["rec1", "rec2", ...]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst specializing in expense analysis and optimization. Provide factual, data-driven insights based only on the provided receipt data.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");

    // Calculate trends (simple month-over-month if data spans multiple months)
    const trends = calculateTrends(receipts);

    return {
      aiSummary: analysis.summary || "Analysis completed successfully.",
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      categoryBreakdown,
      merchantBreakdown,
      trends,
    };
  } catch (error: any) {
    console.error("Error generating receipt report:", error);
    throw new Error(`Failed to generate AI report: ${error.message}`);
  }
}

function calculateTrends(receipts: Receipt[]): any {
  // Group receipts by month
  const monthlyData: Record<string, { count: number; total: number }> = {};

  receipts.forEach((receipt) => {
    if (receipt.receiptDate) {
      const date = new Date(receipt.receiptDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, total: 0 };
      }
      
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].total += receipt.amount || 0;
    }
  });

  const months = Object.keys(monthlyData).sort();
  
  return {
    monthly: months.map((month) => ({
      month,
      count: monthlyData[month].count,
      total: monthlyData[month].total,
      average: monthlyData[month].total / monthlyData[month].count,
    })),
    overallAverage: receipts.reduce((sum, r) => sum + (r.amount || 0), 0) / receipts.length,
  };
}
