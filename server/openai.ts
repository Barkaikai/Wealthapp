// From javascript_openai integration
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateDailyBriefing(
  assets: any[],
  events: any[]
): Promise<{
  highlights: string[];
  risks: string[];
  actions: string[];
}> {
  const totalWealth = assets.reduce((sum, asset) => sum + asset.value, 0);
  const assetSummary = assets.map(a => `${a.name}: $${a.value.toLocaleString()}`).join(", ");
  
  const prompt = `You are a financial advisor AI. Generate a concise daily briefing based on the following data:

Total Portfolio Value: $${totalWealth.toLocaleString()}
Assets: ${assetSummary}
Recent Events: ${events.map(e => e.details).join(", ") || "None"}

Provide:
1. highlights: Array of 2-3 positive observations or achievements
2. risks: Array of 1-2 potential risks or concerns
3. actions: Array of 2-3 recommended actions

Respond with JSON in this exact format: { "highlights": [], "risks": [], "actions": [] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
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
