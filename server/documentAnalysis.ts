import OpenAI from "openai";
import { storage } from "./storage";
import { fileStorage } from "./fileStorage";
import type { DocumentInsight } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 1,
});

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  categories: string[];
  tokenWarning?: string;
}

async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  // Explicitly reject PDF and Word documents
  if (mimeType === 'application/pdf') {
    throw new Error('PDF analysis is currently in development. You can upload and store PDFs, but AI analysis is only available for text files (.txt, .md) and images (.jpg, .png). This feature will be available in a future update.');
  }

  if (mimeType === 'application/msword' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    throw new Error('Word document analysis is currently in development. You can upload and store Word files, but AI analysis is only available for text files (.txt, .md) and images (.jpg, .png). This feature will be available in a future update.');
  }

  // Text files - read directly
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8');
  }

  // Images - use OpenAI Vision API with GPT-4o
  if (mimeType.startsWith('image/')) {
    const base64Image = buffer.toString('base64');
    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this image. If there is no text, describe what you see in detail. Preserve formatting and structure as much as possible."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Vision API error:', error);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  throw new Error(`Unsupported file type: ${mimeType}. Currently supported: text files (.txt, .md) and images (.jpg, .jpeg, .png, .gif).`);
}

async function analyzeExtractedText(text: string, mimeType: string): Promise<AnalysisResult> {
  const MAX_TEXT_LENGTH = 6000;
  let processedText = text;
  let tokenWarning: string | undefined;

  // Handle long text files
  if (text.length > MAX_TEXT_LENGTH) {
    processedText = text.substring(0, MAX_TEXT_LENGTH);
    const truncatedChars = text.length - MAX_TEXT_LENGTH;
    tokenWarning = `Note: Text was truncated. Original length: ${text.length} characters. Analyzed first ${MAX_TEXT_LENGTH} characters (${truncatedChars} characters truncated to optimize costs).`;
    console.log(tokenWarning);
  }

  const analysisPrompt = `You are an AI document analyst. Analyze the following text and provide structured insights in JSON format.

Your response must be valid JSON with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the main content",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "sentiment": "positive" | "negative" | "neutral",
  "categories": ["category1", "category2"]
}

Guidelines:
- summary: Capture the essence of the document in 2-3 clear sentences
- keyPoints: Extract 3-5 most important points or insights (array of strings)
- actionItems: Identify any tasks, to-dos, or action items mentioned (array of strings, empty if none)
- sentiment: Overall tone of the document (must be one of: positive, negative, neutral)
- categories: Relevant categories like "finance", "health", "personal", "business", "legal", etc. (array of strings)

Document text:
${processedText}`;

  // Use GPT-4o-mini for text files, GPT-4o for images
  const isTextFile = mimeType === 'text/plain' || mimeType === 'text/markdown';
  const model = isTextFile ? "gpt-4o-mini" : "gpt-4o";

  console.log(`Using model ${model} for analysis (MIME type: ${mimeType})`);

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a precise document analyst. Always respond with valid JSON matching the requested structure."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as AnalysisResult;

    // Validate the result
    if (!result.summary || !Array.isArray(result.keyPoints) || !Array.isArray(result.actionItems) || 
        !result.sentiment || !Array.isArray(result.categories)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    // Validate sentiment value
    if (!['positive', 'negative', 'neutral'].includes(result.sentiment)) {
      result.sentiment = 'neutral';
    }

    // Add token warning if text was truncated
    if (tokenWarning) {
      result.tokenWarning = tokenWarning;
    }

    return result;
  } catch (error: any) {
    console.error('Analysis error:', error);
    throw new Error(`Failed to analyze document: ${error.message}`);
  }
}

export async function analyzeDocument(
  documentId: number,
  userId: string
): Promise<DocumentInsight> {
  console.log(`Starting analysis for document ${documentId}, user ${userId}`);

  // Fetch document from database
  const document = await storage.getDocument(documentId, userId);
  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Check if analysis already exists
  const existingInsight = await storage.getDocumentInsight(documentId, userId);
  if (existingInsight) {
    console.log(`Analysis already exists for document ${documentId}`);
    return existingInsight;
  }

  console.log(`Downloading file from storage: ${document.storageKey}`);

  // Download file from object storage
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fileStorage.downloadFile(document.storageKey);
  } catch (error: any) {
    console.error('File download error:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }

  console.log(`File downloaded, size: ${fileBuffer.length} bytes, MIME type: ${document.mimeType}`);

  // Extract text based on file type
  let extractedText: string;
  try {
    extractedText = await extractTextFromFile(fileBuffer, document.mimeType, document.originalName);
  } catch (error: any) {
    console.error('Text extraction error:', error);
    throw error;
  }

  console.log(`Text extracted, length: ${extractedText.length} characters`);

  // If extracted text is too short, provide helpful feedback
  if (extractedText.trim().length < 10) {
    throw new Error('Document appears to be empty or contains insufficient text for analysis');
  }

  // Analyze the extracted text with AI
  console.log('Starting AI analysis...');
  let analysis: AnalysisResult;
  try {
    analysis = await analyzeExtractedText(extractedText, document.mimeType);
  } catch (error: any) {
    console.error('AI analysis error:', error);
    throw error;
  }

  console.log('AI analysis completed successfully');

  // Determine the model used based on MIME type
  const isTextFile = document.mimeType === 'text/plain' || document.mimeType === 'text/markdown';
  const modelUsed = isTextFile ? 'gpt-4o-mini' : 'gpt-4o';

  // Store results in documentInsights table
  const insight = await storage.createDocumentInsight({
    documentId,
    userId,
    summary: analysis.tokenWarning 
      ? `${analysis.summary}\n\n${analysis.tokenWarning}`
      : analysis.summary,
    keyPoints: analysis.keyPoints,
    actionItems: analysis.actionItems,
    sentiment: analysis.sentiment,
    categories: analysis.categories,
    extractedText: extractedText.substring(0, 50000), // Limit stored text to 50k chars
    analysisModel: modelUsed,
  });

  console.log(`Insight saved with ID ${insight.id}`);

  return insight;
}
