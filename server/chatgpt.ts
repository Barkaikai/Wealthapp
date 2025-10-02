import OpenAI from 'openai';
import { config } from './config';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getChatCompletion(messages: ChatMessage[]): Promise<string> {
  try {
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

    return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('ChatGPT error:', error);
    throw new Error('Failed to get AI response');
  }
}
