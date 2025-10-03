import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
      maxRetries: 0,
    })
  : null;

export interface ReceiptAnalysis {
  rawText: string;
  merchant: string;
  amount: number;
  currency: string;
  receiptDate: string;
  category: string;
  aiAnalysis: string;
  items?: string[];
}

export async function analyzeReceiptImage(imageBase64: string): Promise<ReceiptAnalysis> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Analyze this receipt image and extract the following information in JSON format:
  
1. rawText: All text visible on the receipt
2. merchant: Name of the merchant/store
3. amount: Total amount (as a number, no currency symbols)
4. currency: Currency code (USD, EUR, etc)
5. receiptDate: Date on receipt in YYYY-MM-DD format
6. category: Most appropriate category from: groceries, dining, travel, shopping, entertainment, utilities, healthcare, transportation, other
7. aiAnalysis: Brief analysis of the purchase (2-3 sentences about what was bought, any patterns, etc)
8. items: Array of individual items purchased (if visible)

Return ONLY valid JSON in this exact format:
{
  "rawText": "...",
  "merchant": "...",
  "amount": 0.00,
  "currency": "USD",
  "receiptDate": "YYYY-MM-DD",
  "category": "...",
  "aiAnalysis": "...",
  "items": ["item1", "item2"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      rawText: analysis.rawText || "Unable to extract text",
      merchant: analysis.merchant || "Unknown",
      amount: parseFloat(analysis.amount) || 0,
      currency: analysis.currency || "USD",
      receiptDate: analysis.receiptDate || new Date().toISOString().split('T')[0],
      category: analysis.category || "other",
      aiAnalysis: analysis.aiAnalysis || "Receipt processed successfully",
      items: analysis.items || [],
    };
  } catch (error) {
    console.error("Error analyzing receipt with GPT-4o Vision:", error);
    throw new Error("Failed to analyze receipt image");
  }
}
