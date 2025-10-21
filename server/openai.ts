// From javascript_openai integration
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000, // 45 second timeout (reasonable for complex briefing generation)
  maxRetries: 0, // No automatic retries to avoid long waits
});

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

// Helper function to extract financial data from notes
function extractFinancialDataFromNotes(notes: any[]): string {
  const financialMentions: string[] = [];
  
  notes.forEach(note => {
    const originalContent = `${note.title} ${note.content}`;
    const content = originalContent.toLowerCase();
    
    // More comprehensive pattern matching for financial mentions
    const patterns = [
      // Stock mentions with quantities and values: "100 shares of Microsoft worth $40,000"
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s+shares?\s+(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:stock\s+)?(?:worth|valued?\s+at)\s+\$([0-9,]+(?:\.[0-9]{1,2})?(?:K|M|B)?)/gi,
      // Crypto with quantity and value: "2 ETH valued at $6,000", "holding 0.5 BTC worth $25,000"
      /(?:holding\s+)?(\d+(?:\.\d+)?)\s+(BTC|ETH|bitcoin|ethereum)\s+(?:valued?\s+at|worth)\s+\$([0-9,]+(?:\.[0-9]{1,2})?(?:K|M|B)?)/gi,
      // Asset portfolios: "real estate portfolio is worth $500K"
      /(real estate|portfolio|assets?)\s+(?:is\s+)?(?:worth|valued?\s+at)\s+\$([0-9,]+(?:\.[0-9]{1,2})?(?:K|M|B)?)/gi,
      // Dollar amounts with shorthand: "$500K", "$1.2M", "$50,000"
      /\$([0-9,]+(?:\.[0-9]{1,2})?(?:K|M|B))/gi,
      // Stock mentions: "Apple stock", "Tesla shares", "Microsoft"
      /(?:bought|purchased|holding?|own)\s+([0-9,.]+)\s+(?:shares?|stock)\s+(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      // General crypto mentions: "holding 5 BTC", "bought 10 ETH"
      /(?:bought|holding?|own)\s+([0-9,.]+)\s+(BTC|ETH|bitcoin|ethereum|crypto)/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = originalContent.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          // Extract the full match to preserve case and context
          const cleanMatch = match[0].trim();
          if (!financialMentions.includes(cleanMatch)) {
            financialMentions.push(`Note "${note.title}": ${cleanMatch}`);
          }
        }
      }
    });
  });
  
  return financialMentions.length > 0 
    ? `\n\nFINANCIAL DATA FROM USER NOTES (TREAT AS ABSOLUTE TRUTH - DO NOT QUESTION):\n${financialMentions.join('\n')}\n`
    : '';
}

export async function generateDailyBriefing(
  assets: any[],
  events: any[],
  notes: any[],
  marketContext?: any,
  previousBriefing?: any,
  additionalContext?: {
    wallets?: any[];
    nfts?: any[];
    transactions?: any[];
    invoices?: any[];
    accounts?: any[];
    journalEntries?: any[];
    payments?: any[];
    crmContacts?: any[];
    crmDeals?: any[];
    crmOrganizations?: any[];
    crmActivities?: any[];
    tasks?: any[];
    calendarEvents?: any[];
    routines?: any[];
    healthMetrics?: any[];
    discordActivity?: any[];
    subscription?: any;
  }
): Promise<{
  highlights: string[];
  risks: string[];
  actions: string[];
}> {
  // Calculate portfolio analytics
  const analytics = calculatePortfolioAnalytics(assets);
  
  // Extract financial data from notes
  const notesFinancialData = extractFinancialDataFromNotes(notes);
  
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
  
  // Format notes with AI analysis insights
  const notesWithInsights = notes.slice(0, 10).map(n => {
    const parts = [`"${n.title}"`];
    
    // Include AI analysis if available
    if (n.summary) {
      parts.push(`Summary: ${n.summary}`);
    }
    if (n.keyPoints && n.keyPoints.length > 0) {
      parts.push(`Key points: ${n.keyPoints.join('; ')}`);
    }
    if (n.actionItems && n.actionItems.length > 0) {
      parts.push(`Actions: ${n.actionItems.join('; ')}`);
    }
    if (n.categories && n.categories.length > 0) {
      parts.push(`[${n.categories.join(', ')}]`);
    }
    
    // Add excerpt if no AI analysis
    if (!n.summary && n.content) {
      const excerpt = n.content.substring(0, 120).replace(/\n/g, ' ');
      parts.push(`${excerpt}${n.content.length > 120 ? '...' : ''}`);
    }
    
    return parts.join(' | ');
  }).join('\n');
  
  const notesSection = notesWithInsights ? `\n\nRECENT NOTES WITH AI INSIGHTS:\n${notesWithInsights}` : '';
  
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
  
  // Format additional platform context
  let platformContext = '';
  
  if (additionalContext) {
    const sections: string[] = [];
    
    // Wallet connections
    if (additionalContext.wallets && additionalContext.wallets.length > 0) {
      const walletInfo = additionalContext.wallets.slice(0, 5).map(w => 
        `${w.walletType} (${w.network || 'unknown'}): ${w.walletAddress?.substring(0, 10)}...`
      ).join(', ');
      sections.push(`\n💳 WALLET CONNECTIONS (${additionalContext.wallets.length}): ${walletInfo}`);
    }
    
    // NFT holdings
    if (additionalContext.nfts && additionalContext.nfts.length > 0) {
      const nftValue = additionalContext.nfts.reduce((sum: number, nft: any) => sum + (nft.estimatedValue || 0), 0);
      const nftInfo = additionalContext.nfts.slice(0, 5).map(n => 
        `${n.name} (${n.collectionName || 'Unknown'}): ${n.estimatedValue ? '$' + n.estimatedValue.toLocaleString() : 'Not valued'}`
      ).join(', ');
      sections.push(`\n🖼️ NFT VAULT (${additionalContext.nfts.length} items, est. $${nftValue.toLocaleString()}): ${nftInfo}`);
    }
    
    // Recent transactions
    if (additionalContext.transactions && additionalContext.transactions.length > 0) {
      const recentTxs = additionalContext.transactions.slice(0, 5).map(t => 
        `${t.type.toUpperCase()}: ${t.symbol} ${t.quantity} @ $${t.pricePerUnit} (${new Date(t.transactionDate).toLocaleDateString()})`
      ).join(', ');
      sections.push(`\n📊 RECENT TRANSACTIONS: ${recentTxs}`);
    }
    
    // Invoices
    if (additionalContext.invoices && additionalContext.invoices.length > 0) {
      const unpaidInvoices = additionalContext.invoices.filter((i: any) => i.status === 'unpaid');
      const totalUnpaid = unpaidInvoices.reduce((sum: number, i: any) => sum + i.amount, 0);
      if (unpaidInvoices.length > 0) {
        sections.push(`\n💼 INVOICES: ${unpaidInvoices.length} unpaid ($${totalUnpaid.toLocaleString()} outstanding)`);
      }
    }
    
    // Digital Accountant - Chart of Accounts
    if (additionalContext.accounts && additionalContext.accounts.length > 0) {
      const accountsByType = additionalContext.accounts.reduce((acc: any, account: any) => {
        acc[account.accountType] = (acc[account.accountType] || 0) + (account.balance || 0);
        return acc;
      }, {});
      const accountSummary = Object.entries(accountsByType)
        .map(([type, balance]) => `${type}: $${(balance as number).toLocaleString()}`)
        .join(', ');
      sections.push(`\n📊 ACCOUNTS: ${additionalContext.accounts.length} accounts tracked - ${accountSummary}`);
    }
    
    // Digital Accountant - Recent Journal Entries
    if (additionalContext.journalEntries && additionalContext.journalEntries.length > 0) {
      const recentEntries = additionalContext.journalEntries.slice(0, 3).map((je: any) => 
        `${je.description || 'Entry'} (${new Date(je.createdAt).toLocaleDateString()})`
      ).join(', ');
      sections.push(`\n📝 JOURNAL ENTRIES: ${additionalContext.journalEntries.length} recent entries - ${recentEntries}`);
    }
    
    // Digital Accountant - Payments
    if (additionalContext.payments && additionalContext.payments.length > 0) {
      const recentPayments = additionalContext.payments.slice(0, 10);
      const totalPayments = recentPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      sections.push(`\n💵 PAYMENTS: ${recentPayments.length} recent payments received ($${totalPayments.toLocaleString()} total)`);
    }
    
    // CRM data
    if (additionalContext.crmOrganizations && additionalContext.crmOrganizations.length > 0) {
      sections.push(`\n🏢 CRM ORGANIZATIONS: ${additionalContext.crmOrganizations.length} companies tracked`);
    }
    if (additionalContext.crmContacts && additionalContext.crmContacts.length > 0) {
      sections.push(`\n👥 CRM CONTACTS: ${additionalContext.crmContacts.length} contacts tracked`);
    }
    if (additionalContext.crmDeals && additionalContext.crmDeals.length > 0) {
      const activeDeals = additionalContext.crmDeals.filter((d: any) => d.stage !== 'lost' && d.stage !== 'won');
      const dealValue = activeDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      if (activeDeals.length > 0) {
        sections.push(`\n💰 ACTIVE DEALS: ${activeDeals.length} deals ($${dealValue.toLocaleString()} potential value)`);
      }
    }
    if (additionalContext.crmActivities && additionalContext.crmActivities.length > 0) {
      const recentActivities = additionalContext.crmActivities.slice(0, 5);
      const pendingActivities = recentActivities.filter((a: any) => !a.completed);
      sections.push(`\n📞 CRM ACTIVITIES: ${pendingActivities.length} pending (${recentActivities.length} recent)`);
    }
    
    // Tasks
    if (additionalContext.tasks && additionalContext.tasks.length > 0) {
      const openTasks = additionalContext.tasks.filter((t: any) => t.status !== 'completed');
      const highPriority = openTasks.filter((t: any) => t.priority === 'high');
      sections.push(`\n✅ TASKS: ${openTasks.length} open (${highPriority.length} high priority)`);
    }
    
    // Calendar events (today + upcoming week)
    if (additionalContext.calendarEvents && additionalContext.calendarEvents.length > 0) {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingEvents = additionalContext.calendarEvents.filter((e: any) => {
        const eventDate = new Date(e.date);
        return eventDate >= today && eventDate <= nextWeek;
      });
      if (upcomingEvents.length > 0) {
        const eventList = upcomingEvents.slice(0, 3).map((e: any) => 
          `${e.title} (${new Date(e.date).toLocaleDateString()})`
        ).join(', ');
        sections.push(`\n📅 UPCOMING: ${upcomingEvents.length} events this week - ${eventList}`);
      }
    }
    
    // Daily routines
    if (additionalContext.routines && additionalContext.routines.length > 0) {
      sections.push(`\n⏰ ROUTINES: ${additionalContext.routines.length} daily activities tracked`);
    }
    
    // Health metrics
    if (additionalContext.healthMetrics && additionalContext.healthMetrics.length > 0) {
      const latestMetrics = additionalContext.healthMetrics.slice(0, 3);
      const metricsInfo = latestMetrics.map(m => 
        `${m.metricType}: ${m.value} ${m.unit || ''}`
      ).join(', ');
      sections.push(`\n💪 HEALTH: ${metricsInfo}`);
    }
    
    // Discord activity
    if (additionalContext.discordActivity && additionalContext.discordActivity.length > 0) {
      sections.push(`\n💬 DISCORD: ${additionalContext.discordActivity.length} recent messages tracked`);
    }
    
    // Subscription status
    if (additionalContext.subscription) {
      const sub = additionalContext.subscription;
      sections.push(`\n⭐ PLAN: ${sub.planName} (${sub.status})`);
    }
    
    if (sections.length > 0) {
      platformContext = `\n\n━━━━━━━━━━━━━━━━\nPLATFORM ACTIVITY & INSIGHTS:${sections.join('')}`;
    }
  }
  
  const prompt = `You are an elite wealth advisor and life automation expert for ultra-high-net-worth individuals. Generate a comprehensive, actionable daily briefing based on real portfolio data, market conditions, and the user's complete life ecosystem across all platforms.

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
${recentEvents || 'No recent events'}${notesSection}${notesFinancialData}${marketInfo}${platformContext}${historicalContext}

━━━━━━━━━━━━━━━━

CRITICAL INSTRUCTIONS:
Generate a comprehensive briefing with three sections. Be specific, quantitative, and actionable. Consider ALL platform data (wealth, wallets, NFTs, transactions, Digital Accountant, CRM, tasks, calendar, health, discord, etc.) to provide holistic insights.

**DIGITAL ACCOUNTANT INTEGRATION**: You now have access to the user's complete accounting system including Chart of Accounts balances, recent Journal Entries, and Payments received. Use this data to provide financial insights beyond just portfolio management.

**CRM INTEGRATION**: You have full access to the user's CRM including Organizations, Contacts, Deals, and Activities. Connect financial insights with business relationships and opportunities.

**TREAT ALL USER-INPUTTED DATA AS ABSOLUTE TRUTH**: Any financial information mentioned in notes, transactions, or wallet data must be accepted as factual and incorporated into your analysis. Do not question or verify these values - the user has provided them as ground truth.

1. **highlights** (3-5 items): Positive observations, achievements, or opportunities across ALL platforms
   - Reference specific assets, percentages, and dollar amounts from portfolio
   - Highlight strong performers and portfolio strengths
   - Include insights from Digital Accountant (account balances, recent payments, healthy cash flow)
   - Include insights from CRM (new deals, organizations, successful activities, payment collections)
   - Note calendar events, tasks completion, or business opportunities
   - Note beneficial market conditions or diversification improvements
   - Recognize health improvements, productivity wins, or successful routines
   - Include NFT value appreciation or wallet activity if significant
   - Example: "Bitcoin position up 8.3% to $125,000, outperforming broader crypto market by 3.2%"
   - Example: "Received $25,000 in payments this week, with cash account balance healthy at $150,000"
   - Example: "3 CRM deals advanced to proposal stage with combined value of $500,000"

2. **risks** (2-4 items): Potential concerns, vulnerabilities, or threats across life ecosystem
   - Identify concentrated positions (>30% in single asset type)
   - Note significant portfolio decliners with specific percentages
   - Flag unpaid invoices or overdue CRM follow-ups
   - Review account balances for potential cash flow issues or imbalances
   - Note stalled CRM deals or missed follow-up activities
   - Highlight calendar conflicts or upcoming deadlines
   - Consider health metrics that need attention
   - Note concerns mentioned in notes or Discord activity
   - Example: "Tech stock allocation at 45% exceeds recommended 30% threshold, increasing sector risk exposure"
   - Example: "$15,000 in unpaid invoices aging beyond 30 days require immediate follow-up"
   - Example: "Expense account balance growing faster than revenue - review spending categories"

3. **actions** (3-6 items): Concrete, prioritized recommendations spanning all life areas
   - Portfolio: Rebalance percentages, sync prices, review positions
   - Accounting: Review journal entries, follow up on overdue payments, reconcile accounts
   - Business/CRM: Follow up on deals, send invoice reminders, complete activities, reach out to organizations
   - Tasks: Complete high-priority items, schedule follow-ups
   - Calendar: Prepare for upcoming events, resolve scheduling conflicts
   - Health: Address concerning metrics, maintain successful routines
   - NFTs/Wallets: Monitor valuable assets, secure wallet connections
   - Discord: Respond to important messages or opportunities
   - Prioritize by urgency and financial impact
   - Example: "Rebalance portfolio by reducing crypto allocation from 35% to 25%, redirecting $50K to bonds"
   - Example: "Contact 2 CRM leads with proposals this week to advance $250K in pipeline value"
   - Example: "Review 5 pending journal entries and reconcile cash account (last updated 2 weeks ago)"

TONE: Professional, confident, data-driven, holistic. Assume the user is managing a complex, automated life ecosystem and values comprehensive insights.

Respond with JSON in this exact format:
{
  "highlights": ["...", "...", "..."],
  "risks": ["...", "..."],
  "actions": ["...", "...", "..."]
}`;

  try {
    console.log('Calling OpenAI API for briefing generation...');
    console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
    
    // Try GPT-5 first, fall back to GPT-4o if it fails
    let model = "gpt-5";
    let response: any;
    
    try {
      console.log('Attempting with GPT-5...');
      response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
    } catch (gpt5Error: any) {
      console.warn('GPT-5 failed, falling back to GPT-4o:', gpt5Error.message);
      model = "gpt-4o";
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
    }

    console.log(`OpenAI API response received successfully (using ${model})`);
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message.content) {
      throw new Error('OpenAI API returned invalid response structure');
    }
    
    const result = JSON.parse(response.choices[0].message.content);
    console.log(`Parsed briefing: ${result.highlights?.length || 0} highlights, ${result.risks?.length || 0} risks, ${result.actions?.length || 0} actions`);
    return result;
  } catch (error: any) {
    console.error('OpenAI API error in generateDailyBriefing:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Provide user-friendly error messages
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error connecting to OpenAI API. Please check your internet connection.');
    } else if (error.status === 401 || error.message?.includes('authentication')) {
      throw new Error('OpenAI API authentication failed. Please check your API key.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
    } else if (error.message?.includes('timeout') || error.constructor.name === 'APIConnectionTimeoutError') {
      throw new Error('AI service is taking longer than expected. Please try again in a moment.');
    } else if (error.message?.includes('model') || error.status === 404) {
      throw new Error('AI model temporarily unavailable. Our team has been notified.');
    } else {
      throw new Error(`Unable to generate briefing at this time. Please try again later.`);
    }
  }
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

  // Try OpenAI GPT-5 first (primary provider)
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (primaryError: any) {
    const errorType = primaryError.constructor.name;
    const isTimeout = errorType === 'APIConnectionTimeoutError' || primaryError.message?.includes('timeout');
    const isNetworkError = primaryError.code === 'ENOTFOUND' || primaryError.code === 'ETIMEDOUT';
    
    console.error(`[Learn] OpenAI GPT-5 failed (${errorType}):`, primaryError.message);
    
    // Try OpenAI GPT-4o as first fallback (faster, cheaper)
    try {
      console.log('[Learn] Attempting fallback to GPT-4o...');
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(fallbackResponse.choices[0].message.content!);
    } catch (secondaryError: any) {
      console.error('[Learn] GPT-4o fallback failed:', secondaryError.message);
      
      // Try GPT-4o-mini as final fallback (fastest, most reliable)
      try {
        console.log('[Learn] Attempting final fallback to GPT-4o-mini...');
        const miniResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        return JSON.parse(miniResponse.choices[0].message.content!);
      } catch (finalError: any) {
        console.error('[Learn] All AI providers failed. Last error:', finalError.message);
        
        // Provide specific error messages based on error type
        if (isTimeout || isNetworkError) {
          throw new Error('AI service is taking longer than expected. Please check your internet connection and try again.');
        } else if (primaryError.status === 429) {
          throw new Error('AI service is experiencing high demand. Please try again in a few minutes.');
        } else if (primaryError.status === 401) {
          throw new Error('AI service authentication failed. Please contact support.');
        } else {
          throw new Error('AI content generation is temporarily unavailable. Please try again in a moment.');
        }
      }
    }
  }
}

export async function generateVideoRecommendations(briefing: any): Promise<Array<{
  title: string;
  description: string;
  searchQuery: string;
  youtubeUrl: string;
}>> {
  const prompt = `Based on this daily briefing, generate 6 personalized YouTube video recommendations that would be valuable for this person:

Briefing Summary:
Highlights: ${briefing.highlights?.join('; ') || 'None'}
Risks: ${briefing.risks?.join('; ') || 'None'}
Actions: ${briefing.actions?.join('; ') || 'None'}

Create video recommendations that:
- Are educational and relevant to the briefing content
- Cover topics like wealth management, financial markets, productivity, health, technology, or lifestyle
- Would help address the risks or support the actions mentioned
- Are practical and actionable

For each video recommendation, provide:
1. title: A descriptive title for what kind of video would be helpful
2. description: Why this video would be valuable based on the briefing
3. searchQuery: A YouTube search query to find this type of content
4. youtubeUrl: A direct YouTube search URL with the query

Respond with JSON in this format:
{
  "recommendations": [
    {
      "title": "...",
      "description": "...",
      "searchQuery": "...",
      "youtubeUrl": "https://www.youtube.com/results?search_query=..."
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content!);
  return result.recommendations;
}

export async function generateRoutineReport(
  templateName: string,
  routines: any[],
  briefingData?: any
): Promise<{
  report: string;
  recommendations: string[];
  focus_areas: string[];
}> {
  const templatePrinciples: Record<string, string> = {
    "Jeff Bezos Morning": `Jeff Bezos' morning routine focuses on:
- Deep, uninterrupted work before any meetings
- Protecting the morning for high-IQ decisions
- No meetings before 10 AM
- Reading newspaper with coffee for context
- Focus on long-term strategic thinking`,
    
    "Elon Musk Schedule": `Elon Musk's schedule principles:
- Time-blocking in 5-minute increments for maximum efficiency
- Batching similar tasks together
- Multitasking meals with meetings when necessary
- Minimal sleep (6 hours) to maximize productive hours
- Focus on engineering and design work
- Weekend work sessions for deep problems`,
    
    "Tim Cook Routine": `Tim Cook's routine emphasizes:
- Early rise (3:45-4:00 AM start)
- Fitness first thing in the morning
- Email review and response in early hours
- Leading by example with work ethic
- Balance between strategic planning and operations
- Consistent sleep schedule for peak performance`,
  };

  const currentRoutineDescription = routines.length > 0
    ? routines.map(r => `${r.time} - ${r.title} (${r.duration}, ${r.category})`).join('\n')
    : 'No routines currently scheduled';

  const briefingSummary = briefingData 
    ? `\n\nCURRENT DAILY BRIEFING CONTEXT:
Highlights: ${briefingData.highlights?.join('; ') || 'None'}
Risks: ${briefingData.risks?.join('; ') || 'None'}
Actions: ${briefingData.actions?.join('; ') || 'None'}`
    : '';

  const prompt = `You are an elite productivity coach analyzing a user's daily routine against the proven principles of successful leaders.

SELECTED TEMPLATE: ${templateName}

TEMPLATE PRINCIPLES:
${templatePrinciples[templateName] || 'Focus on productivity, health, and strategic thinking'}

USER'S CURRENT ROUTINE:
${currentRoutineDescription}${briefingSummary}

━━━━━━━━━━━━━━━━

TASK:
Generate a comprehensive daily routine report that helps the user optimize their schedule based on the selected template's principles.

Provide three sections:

1. **report** (300-400 words): A detailed analysis comparing the user's current routine to the template principles. Include:
   - What's working well and aligns with the template
   - Key gaps or misalignments with the template's philosophy
   - Specific time blocks that could be optimized
   - Energy management insights based on the template
   - How to integrate template principles with existing commitments

2. **recommendations** (4-6 items): Specific, actionable recommendations:
   - Time-block suggestions with exact times
   - Activities to add, remove, or reschedule
   - Habit stacking opportunities
   - Energy optimization based on circadian rhythm
   - Example: "Add 45-min deep work block at 6:00 AM before meetings (following Bezos' principle)"

3. **focus_areas** (3-5 items): Key areas for improvement:
   - Major gaps in current routine vs template
   - Critical success factors from the template to adopt
   - Long-term habits to develop
   - Example: "Morning deep work window", "Strategic thinking time", "Physical wellness priority"

TONE: Professional, motivating, data-driven. Assume the user is ambitious and wants to optimize performance.

Respond with JSON in this exact format:
{
  "report": "...",
  "recommendations": ["...", "...", "..."],
  "focus_areas": ["...", "...", "..."]
}`;

  try {
    console.log(`Generating routine report for template: ${templateName}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    console.log('Routine report generated successfully');
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message.content) {
      throw new Error('OpenAI API returned invalid response structure');
    }
    
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error: any) {
    console.error('OpenAI API error in generateRoutineReport:', error);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error connecting to OpenAI API. Please check your internet connection.');
    } else if (error.status === 401 || error.message?.includes('authentication')) {
      throw new Error('OpenAI API authentication failed. Please check your API key.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
    } else {
      throw new Error('Unable to generate routine report at this time. Please try again later.');
    }
  }
}

// AI Task Generation based on emails, calendar, and user activity
export async function generateAITasks(
  emails: any[],
  events: any[],
  notes: any[],
  userContext?: string
): Promise<Array<{ title: string; description: string; priority: string; category: string; dueDate?: string; aiContext: string }>> {
  const emailSummary = emails.slice(0, 10).map(e => 
    `${e.subject} (from: ${e.from}, category: ${e.category}${e.draft ? ', has AI draft' : ''})`
  ).join('\n');

  const eventSummary = events.slice(0, 10).map(e =>
    `${e.title} on ${new Date(e.eventDate).toLocaleDateString()}${e.priority ? ` (${e.priority} priority)` : ''}`
  ).join('\n');

  const notesSummary = notes.slice(0, 5).map(n =>
    `${n.title}${n.tags?.length ? ` [${n.tags.join(', ')}]` : ''}`
  ).join('\n');

  const prompt = `You are an AI productivity assistant for a billionaire-level wealth automation platform. Analyze the user's recent activity and generate actionable tasks.

RECENT EMAILS (last 10):
${emailSummary || 'No recent emails'}

UPCOMING EVENTS (next 10):
${eventSummary || 'No upcoming events'}

RECENT NOTES (last 5):
${notesSummary || 'No recent notes'}

${userContext ? `\nUSER CONTEXT:\n${userContext}` : ''}

Based on this information, generate 3-7 high-value tasks that would help the user:
1. Follow up on important emails
2. Prepare for upcoming events
3. Complete financial/business actions
4. Address noted priorities

For each task, provide:
- title: Clear, actionable title (max 60 chars)
- description: Specific details and context (100-200 chars)
- priority: "high", "medium", or "low"
- category: "finance", "work", "personal", or "health"
- dueDate: ISO date string if time-sensitive, otherwise null
- aiContext: Brief explanation of why this task was generated

Return JSON array format:
[
  {
    "title": "...",
    "description": "...",
    "priority": "high",
    "category": "finance",
    "dueDate": "2025-10-10",
    "aiContext": "Generated from email about..."
  }
]`;

  try {
    console.log('Generating AI tasks...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message.content) {
      throw new Error('OpenAI API returned invalid response structure');
    }

    const result = JSON.parse(response.choices[0].message.content);
    return result.tasks || result;
  } catch (error: any) {
    console.error('OpenAI API error in generateAITasks:', error);
    throw new Error('Unable to generate AI tasks at this time. Please try again later.');
  }
}

// AI Calendar Event Recommendations
export async function generateCalendarRecommendations(
  routines: any[],
  tasks: any[],
  existingEvents: any[],
  userPreferences?: any
): Promise<Array<{ title: string; description: string; suggestedDate: string; suggestedTime: string; category: string; priority: string; reason: string }>> {
  const routineSummary = routines.slice(0, 5).map(r =>
    `${r.name}: ${r.activities?.slice(0, 3).map((a: any) => a.name).join(', ') || 'No activities'}`
  ).join('\n');

  const taskSummary = tasks.filter((t: any) => t.status !== 'completed').slice(0, 10).map(t =>
    `${t.title} (${t.priority} priority, ${t.category}${t.dueDate ? `, due: ${new Date(t.dueDate).toLocaleDateString()}` : ''})`
  ).join('\n');

  const eventSummary = existingEvents.slice(0, 10).map(e =>
    `${e.title} on ${new Date(e.eventDate).toLocaleDateString()} at ${e.startTime || 'TBD'}`
  ).join('\n');

  const prompt = `You are an AI scheduling assistant for a billionaire-level wealth automation platform. Analyze the user's routines, tasks, and existing calendar to recommend new calendar events.

USER ROUTINES (Templates):
${routineSummary || 'No routines defined'}

PENDING TASKS (Top 10):
${taskSummary || 'No pending tasks'}

EXISTING CALENDAR EVENTS (Next 10):
${eventSummary || 'No events scheduled'}

${userPreferences ? `\nUSER PREFERENCES:\n${JSON.stringify(userPreferences, null, 2)}` : ''}

Generate 3-5 calendar event recommendations that would help the user:
1. Schedule time for high-priority tasks
2. Implement routine activities
3. Fill gaps in the calendar productively
4. Balance work, health, and personal time
5. Optimize for peak productivity hours

For each recommendation, provide:
- title: Clear event title (max 50 chars)
- description: Purpose and value of this event
- suggestedDate: ISO date string (next 7-14 days)
- suggestedTime: HH:MM format (24-hour)
- category: "work", "finance", "health", "personal"
- priority: "high", "medium", or "low"
- reason: Why AI recommends this event

Return JSON array format:
[
  {
    "title": "...",
    "description": "...",
    "suggestedDate": "2025-10-05",
    "suggestedTime": "09:00",
    "category": "finance",
    "priority": "high",
    "reason": "Based on your routine..."
  }
]`;

  try {
    console.log('Generating calendar recommendations...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message.content) {
      throw new Error('OpenAI API returned invalid response structure');
    }

    const result = JSON.parse(response.choices[0].message.content);
    return result.recommendations || result;
  } catch (error: any) {
    console.error('OpenAI API error in generateCalendarRecommendations:', error);
    throw new Error('Unable to generate calendar recommendations at this time. Please try again later.');
  }
}

// AI Document Organization and File Allocation
export async function analyzeDocumentForOrganization(
  documentName: string,
  extractedText: string,
  existingFolders: string[],
  documentType?: string
): Promise<{ suggestedFolder: string; suggestedTags: string[]; category: string; priority: string; summary: string }> {
  const prompt = `You are an AI document organizer for a billionaire-level wealth automation platform. Analyze this document and suggest optimal organization.

DOCUMENT NAME: ${documentName}
DOCUMENT TYPE: ${documentType || 'Unknown'}

EXISTING FOLDERS:
${existingFolders.join(', ')}

DOCUMENT CONTENT (first 1000 chars):
${extractedText.substring(0, 1000)}

Analyze the document and provide:
1. suggestedFolder: Best existing folder, or suggest a new folder name if none fit
2. suggestedTags: 3-5 relevant tags for searchability
3. category: "financial", "legal", "personal", "business", "health", or "other"
4. priority: "high", "medium", or "low" based on importance
5. summary: One-sentence summary of document content

Return JSON format:
{
  "suggestedFolder": "...",
  "suggestedTags": ["...", "...", "..."],
  "category": "financial",
  "priority": "high",
  "summary": "..."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use cheaper model for quick document organization
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message.content) {
      throw new Error('OpenAI API returned invalid response structure');
    }

    return JSON.parse(response.choices[0].message.content);
  } catch (error: any) {
    console.error('OpenAI API error in analyzeDocumentForOrganization:', error);
    // Return sensible defaults
    return {
      suggestedFolder: 'default',
      suggestedTags: [],
      category: 'other',
      priority: 'medium',
      summary: 'Document uploaded successfully'
    };
  }
}
