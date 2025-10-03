import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Terminal as TerminalIcon, Loader2, ChevronRight } from "lucide-react";

interface TerminalOutput {
  id: number;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export default function Terminal() {
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [outputs, setOutputs] = useState<TerminalOutput[]>([
    {
      id: 0,
      type: 'output',
      content: 'Welcome to Wealth Automation Terminal v1.0',
      timestamp: new Date(),
    },
    {
      id: 1,
      type: 'output',
      content: 'Type "help" for available commands',
      timestamp: new Date(),
    },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  const addOutput = (type: 'command' | 'output' | 'error', content: string) => {
    setOutputs(prev => [
      ...prev,
      {
        id: Date.now(),
        type,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    setCommandHistory(prev => [...prev, trimmedCmd]);
    setHistoryIndex(-1);
    addOutput('command', `$ ${trimmedCmd}`);
    setIsExecuting(true);

    try {
      const response = await apiRequest('POST', '/api/terminal/execute', { command: trimmedCmd });
      const data = await response.json();
      
      if (data.output) {
        addOutput('output', data.output);
      }
      if (data.error) {
        addOutput('error', data.error);
      }
    } catch (error: any) {
      addOutput('error', `Error: ${error.message || 'Command execution failed'}`);
    } finally {
      setIsExecuting(false);
      setCommand("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(command);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const clearTerminal = () => {
    setOutputs([
      {
        id: Date.now(),
        type: 'output',
        content: 'Terminal cleared',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TerminalIcon className="h-8 w-8 text-primary" />
            Terminal
          </h1>
          <p className="text-muted-foreground">Execute commands and interact with the system</p>
        </div>
        <Button 
          variant="outline" 
          onClick={clearTerminal}
          data-testid="button-clear-terminal"
        >
          Clear
        </Button>
      </div>

      <Card className="bg-black/90 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary font-mono">Terminal Session</CardTitle>
          <CardDescription className="text-muted-foreground">
            Interactive command-line interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Terminal Output */}
          <ScrollArea 
            ref={scrollRef}
            className="h-[400px] w-full rounded-md border border-primary/20 bg-black/50 p-4 font-mono text-sm"
          >
            <div className="space-y-1">
              {outputs.map((output) => (
                <div 
                  key={output.id} 
                  className={`${
                    output.type === 'command' 
                      ? 'text-primary font-bold' 
                      : output.type === 'error'
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`}
                  data-testid={`terminal-output-${output.type}`}
                >
                  {output.content}
                </div>
              ))}
              {isExecuting && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Executing...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Terminal Input */}
          <div className="flex items-center gap-2 bg-black/50 rounded-md border border-primary/20 p-3">
            <ChevronRight className="h-4 w-4 text-primary" />
            <span className="text-primary font-mono">$</span>
            <Input
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Enter command..."
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 font-mono text-green-400 placeholder:text-muted-foreground"
              data-testid="input-terminal-command"
            />
            <Button
              onClick={() => executeCommand(command)}
              disabled={isExecuting || !command.trim()}
              size="sm"
              data-testid="button-execute-command"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Execute'
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Press Enter to execute command</div>
            <div>• Use ↑/↓ arrows to navigate command history</div>
            <div>• Type "help" to see available commands</div>
          </div>
        </CardContent>
      </Card>

      {/* Command Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
          <CardDescription>Common commands and their usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm font-mono">
            <div className="flex justify-between p-2 rounded hover-elevate">
              <code className="text-primary">help</code>
              <span className="text-muted-foreground">Display available commands</span>
            </div>
            <div className="flex justify-between p-2 rounded hover-elevate">
              <code className="text-primary">status</code>
              <span className="text-muted-foreground">Show system status</span>
            </div>
            <div className="flex justify-between p-2 rounded hover-elevate">
              <code className="text-primary">wallet</code>
              <span className="text-muted-foreground">Display wallet balance</span>
            </div>
            <div className="flex justify-between p-2 rounded hover-elevate">
              <code className="text-primary">portfolio</code>
              <span className="text-muted-foreground">Show portfolio summary</span>
            </div>
            <div className="flex justify-between p-2 rounded hover-elevate">
              <code className="text-primary">health</code>
              <span className="text-muted-foreground">Check system health</span>
            </div>
            <div className="flex justify-between p-2 rounded hover-elevate">
              <code className="text-primary">clear</code>
              <span className="text-muted-foreground">Clear terminal output</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
