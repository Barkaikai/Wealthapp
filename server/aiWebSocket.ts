import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import OpenAI from 'openai';
import { aiCache } from './aiCache';

interface StreamMessage {
  type: 'prompt' | 'ping';
  prompt?: string;
  model?: string;
}

export function setupAIWebSocket(server: Server, openai: OpenAI) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/ai-chat'
  });

  console.log('[WebSocket] AI Chat WebSocket server initialized at /ws/ai-chat');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = req.headers['sec-websocket-key'] || 'unknown';
    console.log(`[WebSocket] Client connected: ${clientId}`);

    ws.on('message', async (data: Buffer) => {
      try {
        const message: StreamMessage = JSON.parse(data.toString());
        
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (message.type === 'prompt' && message.prompt) {
          const model = message.prompt || 'gpt-4o-mini';
          
          const cached = aiCache.get(message.prompt, model);
          if (cached) {
            ws.send(JSON.stringify({ type: 'start' }));
            const words = cached.split(' ');
            for (const word of words) {
              ws.send(JSON.stringify({ type: 'token', content: word + ' ' }));
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            ws.send(JSON.stringify({ type: 'end', cached: true }));
            return;
          }

          ws.send(JSON.stringify({ type: 'start' }));

          const stream = await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: message.prompt }],
            max_tokens: 1000,
            temperature: 0.7,
            stream: true,
          });

          let fullResponse = '';

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              ws.send(JSON.stringify({ type: 'token', content }));
            }
          }

          aiCache.set(message.prompt, model, fullResponse);
          ws.send(JSON.stringify({ type: 'end', cached: false }));
          
          console.log(`[WebSocket] Completed streaming response (${fullResponse.length} chars)`);
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] WebSocket error:', error);
    });
  });

  return wss;
}
