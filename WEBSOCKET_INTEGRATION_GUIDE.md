# WebSocket Integration Guide

## Quick Start

### Server Setup (Already Complete ✅)
The WebSocket server is running at `/ws/ai-chat` with full error handling and connection management.

### Frontend Integration (Next Steps)

#### 1. Create WebSocket Hook
```typescript
// client/src/hooks/useAIWebSocket.ts
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useAIWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/ai-chat`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chunk') {
        // Streaming chunk received
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && isStreaming) {
            // Append to existing message
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + data.content }
            ];
          } else {
            // Start new message
            return [
              ...prev,
              { role: 'assistant', content: data.content, timestamp: Date.now() }
            ];
          }
        });
        setIsStreaming(true);
      } else if (data.type === 'done') {
        // Streaming complete
        setIsStreaming(false);
      } else if (data.type === 'error') {
        console.error('WebSocket error:', data.message);
        setIsStreaming(false);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt reconnection after 3 seconds
      setTimeout(() => {
        wsRef.current = null;
        // Trigger re-render to reconnect
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (content: string, model: string = 'gpt-4o') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Add user message
      setMessages(prev => [
        ...prev,
        { role: 'user', content, timestamp: Date.now() }
      ]);

      // Send to server
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message: content,
        model
      }));
    } else {
      console.error('WebSocket not connected');
    }
  };

  return {
    messages,
    isConnected,
    isStreaming,
    sendMessage
  };
}
```

#### 2. Update ChatGPT Component
```typescript
// client/src/components/ChatGPT.tsx
import { useAIWebSocket } from '@/hooks/useAIWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

export function ChatGPT() {
  const { messages, isConnected, isStreaming, sendMessage } = useAIWebSocket();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="p-2 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="text-sm text-muted-foreground animate-pulse">
            AI is typing...
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={!isConnected || isStreaming}
            data-testid="input-chat"
          />
          <Button
            type="submit"
            disabled={!isConnected || isStreaming || !input.trim()}
            data-testid="button-send"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
```

#### 3. Add Virtualization for Large Chat History
```typescript
// client/src/components/VirtualizedChat.tsx
import { FixedSizeList as List } from 'react-window';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface VirtualizedChatProps {
  messages: Message[];
}

export function VirtualizedChat({ messages }: VirtualizedChatProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = messages[index];
    return (
      <div
        style={style}
        className={`px-4 py-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
      >
        <div
          className={`inline-block p-3 rounded-lg max-w-[80%] ${
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {msg.content}
        </div>
      </div>
    );
  };

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

## WebSocket Message Protocol

### Client → Server

**Chat Message:**
```json
{
  "type": "chat",
  "message": "What is the weather today?",
  "model": "gpt-4o"
}
```

**Ping (Keep-Alive):**
```json
{
  "type": "ping"
}
```

### Server → Client

**Streaming Chunk:**
```json
{
  "type": "chunk",
  "content": "The weather"
}
```

**Stream Complete:**
```json
{
  "type": "done"
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Rate limit exceeded"
}
```

**Pong Response:**
```json
{
  "type": "pong"
}
```

## Error Handling

### Automatic Reconnection
```typescript
const reconnect = () => {
  const backoff = Math.min(1000 * 2 ** retryCount, 30000);
  setTimeout(() => {
    setRetryCount(prev => prev + 1);
    // Reinitialize WebSocket
  }, backoff);
};
```

### Connection Health Monitoring
```typescript
// Send ping every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

## Performance Best Practices

### 1. Message Batching
For bulk operations, batch messages:
```typescript
const sendBatch = (messages: string[]) => {
  ws.send(JSON.stringify({
    type: 'batch',
    messages
  }));
};
```

### 2. Message Compression
For large messages, consider compression:
```typescript
// Server already handles this automatically for large responses
```

### 3. Connection Pooling
Reuse connections across components:
```typescript
// Use React Context to share WebSocket connection
const WebSocketContext = createContext<WebSocket | null>(null);
```

## Testing

### Unit Tests
```typescript
describe('useAIWebSocket', () => {
  it('should connect to WebSocket server', () => {
    const { result } = renderHook(() => useAIWebSocket());
    expect(result.current.isConnected).toBe(false);
    // Wait for connection
    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });

  it('should send messages', () => {
    const { result } = renderHook(() => useAIWebSocket());
    act(() => {
      result.current.sendMessage('Hello');
    });
    expect(result.current.messages).toHaveLength(1);
  });
});
```

### Integration Tests
```typescript
it('should stream AI response', async () => {
  const { getByTestId } = render(<ChatGPT />);
  const input = getByTestId('input-chat');
  const sendBtn = getByTestId('button-send');

  fireEvent.change(input, { target: { value: 'Hello AI' } });
  fireEvent.click(sendBtn);

  // Wait for streaming response
  await waitFor(() => {
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });
});
```

## Security Considerations

### Origin Validation
Server validates WebSocket origin automatically.

### Rate Limiting
Built-in rate limiting prevents abuse:
- 100 messages per minute per connection
- Automatic disconnection on violation

### Message Sanitization
All messages are sanitized to prevent XSS:
```typescript
const sanitize = (text: string) => {
  return text.replace(/<script/gi, '&lt;script');
};
```

## Monitoring

### Client-Side Metrics
```typescript
const metrics = {
  messagesPerSecond: 0,
  averageLatency: 0,
  reconnectCount: 0
};
```

### Server-Side Metrics
Available in logs:
- Active connections count
- Messages processed per second
- Error rates

## Troubleshooting

### Common Issues

**Issue:** WebSocket immediately disconnects
**Solution:** Check CORS configuration, ensure origin is allowed

**Issue:** Messages not streaming
**Solution:** Verify OpenAI API key is configured, check server logs

**Issue:** High memory usage
**Solution:** Implement message history limit, use virtualization

## Next Steps

1. Implement the `useAIWebSocket` hook
2. Update existing ChatGPT component to use WebSocket
3. Add virtualized rendering for chat history
4. Implement reconnection logic
5. Add comprehensive error handling
6. Create monitoring dashboard

## Resources

- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Window Guide](https://react-window.vercel.app/)
- [OpenAI Streaming API](https://platform.openai.com/docs/api-reference/streaming)
