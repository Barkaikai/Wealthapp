import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator as CalcIcon } from "lucide-react";
import { create, all } from 'mathjs';

const math = create(all, {
  precision: 64,
  number: 'BigNumber'
});

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);
  const [mode, setMode] = useState<"basic" | "scientific" | "expression">("basic");
  const [expressionInput, setExpressionInput] = useState("");

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay("0.");
      setNewNumber(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (op: string) => {
    const current = display;
    
    if (previousValue !== null && operation && !newNumber) {
      try {
        const result = calculate(previousValue, current, operation);
        setDisplay(result);
        setPreviousValue(result);
      } catch (error) {
        setDisplay("Error");
        setPreviousValue(null);
        setOperation(null);
        return;
      }
    } else {
      setPreviousValue(current);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (a: string, b: string, op: string): string => {
    try {
      let result;
      switch (op) {
        case "+":
          result = math.add(math.bignumber(a), math.bignumber(b));
          break;
        case "-":
          result = math.subtract(math.bignumber(a), math.bignumber(b));
          break;
        case "×":
          result = math.multiply(math.bignumber(a), math.bignumber(b));
          break;
        case "÷":
          if (parseFloat(b) === 0) return "Error";
          result = math.divide(math.bignumber(a), math.bignumber(b));
          break;
        case "%":
          result = math.multiply(math.bignumber(a), math.divide(math.bignumber(b), 100));
          break;
        case "^":
          result = math.pow(math.bignumber(a), math.bignumber(b));
          break;
        default:
          return b;
      }
      return math.format(result, { precision: 14 });
    } catch (error) {
      return "Error";
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const current = display;
      const result = calculate(previousValue, current, operation);
      setDisplay(result);
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
    setExpressionInput("");
  };

  const handleBackspace = () => {
    if (display.length > 1 && display !== "Error") {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
      setNewNumber(true);
    }
  };

  const handleScientific = (func: string) => {
    try {
      let result;
      const val = math.bignumber(display);
      
      switch (func) {
        case "sin":
          result = math.sin(val);
          break;
        case "cos":
          result = math.cos(val);
          break;
        case "tan":
          result = math.tan(val);
          break;
        case "log":
          result = math.log10(val);
          break;
        case "ln":
          result = math.log(val);
          break;
        case "sqrt":
          result = math.sqrt(val);
          break;
        case "exp":
          result = math.exp(val);
          break;
        case "x²":
          result = math.pow(val, 2);
          break;
        case "1/x":
          result = math.divide(1, val);
          break;
        case "π":
          setDisplay(math.format(math.pi, { precision: 14 }));
          setNewNumber(true);
          return;
        case "e":
          setDisplay(math.format(math.e, { precision: 14 }));
          setNewNumber(true);
          return;
        case "abs":
          result = math.abs(val);
          break;
        default:
          return;
      }
      
      setDisplay(math.format(result, { precision: 14 }));
      setNewNumber(true);
    } catch (error) {
      setDisplay("Error");
      setNewNumber(true);
    }
  };

  const handleExpression = () => {
    try {
      const result = math.evaluate(expressionInput);
      const formatted = math.format(result, { precision: 14 });
      setDisplay(formatted);
      setExpressionInput(formatted);
      setNewNumber(true);
    } catch (error) {
      setDisplay("Error");
      setNewNumber(true);
    }
  };

  const basicButtons = [
    { label: "C", onClick: handleClear, variant: "outline" as const, className: "bg-destructive/10 hover-elevate" },
    { label: "⌫", onClick: handleBackspace, variant: "outline" as const },
    { label: "%", onClick: () => handleOperation("%"), variant: "outline" as const },
    { label: "÷", onClick: () => handleOperation("÷"), variant: "outline" as const, className: "bg-primary/10" },
    
    { label: "7", onClick: () => handleNumber("7") },
    { label: "8", onClick: () => handleNumber("8") },
    { label: "9", onClick: () => handleNumber("9") },
    { label: "×", onClick: () => handleOperation("×"), variant: "outline" as const, className: "bg-primary/10" },
    
    { label: "4", onClick: () => handleNumber("4") },
    { label: "5", onClick: () => handleNumber("5") },
    { label: "6", onClick: () => handleNumber("6") },
    { label: "-", onClick: () => handleOperation("-"), variant: "outline" as const, className: "bg-primary/10" },
    
    { label: "1", onClick: () => handleNumber("1") },
    { label: "2", onClick: () => handleNumber("2") },
    { label: "3", onClick: () => handleNumber("3") },
    { label: "+", onClick: () => handleOperation("+"), variant: "outline" as const, className: "bg-primary/10" },
    
    { label: "0", onClick: () => handleNumber("0"), className: "col-span-2" },
    { label: ".", onClick: handleDecimal },
    { label: "=", onClick: handleEquals, variant: "default" as const, className: "bg-primary" },
  ];

  const scientificButtons = [
    { label: "sin", onClick: () => handleScientific("sin") },
    { label: "cos", onClick: () => handleScientific("cos") },
    { label: "tan", onClick: () => handleScientific("tan") },
    { label: "log", onClick: () => handleScientific("log") },
    
    { label: "ln", onClick: () => handleScientific("ln") },
    { label: "sqrt", onClick: () => handleScientific("sqrt") },
    { label: "x²", onClick: () => handleScientific("x²") },
    { label: "^", onClick: () => handleOperation("^"), variant: "outline" as const },
    
    { label: "exp", onClick: () => handleScientific("exp") },
    { label: "1/x", onClick: () => handleScientific("1/x") },
    { label: "abs", onClick: () => handleScientific("abs") },
    { label: "π", onClick: () => handleScientific("π") },
    
    { label: "e", onClick: () => handleScientific("e") },
    { label: "(", onClick: () => handleNumber("(") },
    { label: ")", onClick: () => handleNumber(")") },
    { label: "C", onClick: handleClear, variant: "destructive" as const },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" data-testid="button-calculator-trigger">
          <CalcIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Advanced Calculator</DialogTitle>
        </DialogHeader>
        
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" data-testid="tab-basic">Basic</TabsTrigger>
            <TabsTrigger value="scientific" data-testid="tab-scientific">Scientific</TabsTrigger>
            <TabsTrigger value="expression" data-testid="tab-expression">Expression</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="bg-muted rounded-lg p-4 text-right">
              <div className="text-sm text-muted-foreground mb-1">
                {previousValue !== null && operation ? `${previousValue} ${operation}` : " "}
              </div>
              <div className="text-3xl font-mono font-bold break-all" data-testid="calculator-display">
                {display}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {basicButtons.map((btn, idx) => (
                <Button
                  key={idx}
                  variant={btn.variant || "secondary"}
                  onClick={btn.onClick}
                  className={btn.className}
                  data-testid={`calc-btn-${btn.label}`}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="scientific" className="space-y-4 mt-4">
            <div className="bg-muted rounded-lg p-4 text-right">
              <div className="text-sm text-muted-foreground mb-1">
                {previousValue !== null && operation ? `${previousValue} ${operation}` : " "}
              </div>
              <div className="text-3xl font-mono font-bold break-all" data-testid="calculator-display">
                {display}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-3">
              {scientificButtons.map((btn, idx) => (
                <Button
                  key={idx}
                  variant={btn.variant || "secondary"}
                  size="sm"
                  onClick={btn.onClick}
                  className={(btn as any).className}
                  data-testid={`calc-sci-${btn.label}`}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {basicButtons.slice(4).map((btn, idx) => (
                <Button
                  key={idx}
                  variant={btn.variant || "secondary"}
                  onClick={btn.onClick}
                  className={btn.className}
                  data-testid={`calc-btn-${btn.label}`}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="expression" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter Expression</label>
                <Input
                  value={expressionInput}
                  onChange={(e) => setExpressionInput(e.target.value)}
                  placeholder="e.g., sqrt(16) + cos(pi) * 2"
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExpression();
                    }
                  }}
                  data-testid="expression-input"
                />
                <p className="text-xs text-muted-foreground">
                  Supports: +, -, *, /, ^, sqrt(), sin(), cos(), tan(), log(), ln(), abs(), pi, e
                </p>
              </div>
              
              <Button 
                onClick={handleExpression} 
                className="w-full"
                data-testid="calc-btn-evaluate"
              >
                Evaluate
              </Button>
              
              <div className="bg-muted rounded-lg p-4 text-right">
                <div className="text-sm text-muted-foreground mb-1">Result</div>
                <div className="text-2xl font-mono font-bold break-all" data-testid="expression-result">
                  {display}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "sqrt()")}>sqrt</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "sin()")}>sin</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "cos()")}>cos</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "tan()")}>tan</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "log()")}>log</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "ln()")}>ln</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "pi")}>π</Button>
                <Button variant="outline" size="sm" onClick={() => setExpressionInput(prev => prev + "e")}>e</Button>
                <Button variant="destructive" size="sm" onClick={handleClear}>Clear</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
