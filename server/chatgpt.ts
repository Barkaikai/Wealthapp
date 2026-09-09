import OpenAI from 'openai';
import { config } from './config';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const LOCAL_MODEL = process.env.LOCAL_AI_MODEL || 'llama3.1:8b';

async function ollamaChat(messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for a wealth automation platform. Provide concise, accurate, and helpful responses. Be professional yet friendly.',
          },
          ...messages,
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    const responseText = data.message?.content?.trim() || '';

    if (!responseText) {
      throw new Error('No response generated');
    }

    return responseText;
  } finally {
    clearTimeout(timeout);
  }
}

function validateMessages(messages: ChatMessage[]) {
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      throw new Error('Invalid message format');
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      throw new Error('Invalid message role');
    }
  }
}

export async function getChatCompletion(messages: ChatMessage[]): Promise<string> {
  validateMessages(messages);

  if (!config.openaiApiKey) {
    console.log('[Chat] Using local Ollama model for chat');
    return ollamaChat(messages);
  }

  try {
    const openai = new OpenAI({
      apiKey: config.openaiApiKey,
      timeout: 45000,
      maxRetries: 0,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for a wealth automation platform. Provide concise, accurate, and helpful responses. Be professional yet friendly.',
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) {
      throw new Error('No response generated');
    }

    return response;
  } catch (error) {
    const message = String((error as Error)?.message || error);
    console.warn('[Chat] OpenAI chat failed, falling back to Ollama:', message);

    if (message.includes('rate limit') || message.includes('API key')) {
      // Fall through to local Ollama instead of hard-failing.
      return ollamaChat(messages);
    }

    try {
      return ollamaChat(messages);
    } catch (ollamaError) {
      const ollamaMessage = String((ollamaError as Error)?.message || ollamaError);
      if (ollamaMessage.includes('fetch') || ollamaMessage.includes('Ollama HTTP')) {
        throw new Error('Local AI service is unavailable. Make sure Ollama is running.');
      }
      throw new Error(ollamaMessage);
    }
  }
}
