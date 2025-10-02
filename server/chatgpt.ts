import OpenAI from 'openai';
import { config } from './config';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getChatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = config.openaiApiKey;

  if (!apiKey) {
    console.error('OpenAI API key not configured - check OPENAI_API_KEY environment variable');
    throw new Error('Chat service not configured');
  }

  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // Validate message structure
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      throw new Error('Invalid message format');
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      throw new Error('Invalid message role');
    }
  }

  try {
    const openai = new OpenAI({
      apiKey,
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

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.error('OpenAI returned empty response');
      throw new Error('No response generated');
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('ChatGPT error:', error.message);
      
      if (error.message.includes('API key')) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Chat rate limit exceeded. Please try again later.');
      }
      
      throw error;
    }
    console.error('Unknown ChatGPT error:', error);
    throw new Error('Failed to get AI response');
  }
}
