import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatGPT() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();
      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.message 
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Chat Error",
        description: "Unable to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        data-testid="button-open-chat"
        className="min-h-9"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        AI Chat
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>ChatGPT Assistant</span>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  data-testid="button-clear-chat"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4" ref={scrollRef as any}>
            <div className="space-y-4 py-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with AI</p>
                  <p className="text-sm mt-2">Ask questions, get insights, or chat about anything</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`chat-message-${index}`}
                  >
                    <Card
                      className={`max-w-[80%] p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </Card>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-4 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 flex items-center gap-2 pt-4 border-t">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              data-testid="button-send-message"
              className="min-h-9"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
