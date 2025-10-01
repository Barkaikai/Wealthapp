import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator as CalcIcon, Delete } from "lucide-react";

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

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
    const current = parseFloat(display);
    
    if (previousValue !== null && operation && !newNumber) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(current);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      case "%": return a * (b / 100);
      default: return b;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const current = parseFloat(display);
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
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
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
      setNewNumber(true);
    }
  };

  const buttons = [
    { label: "C", onClick: handleClear, variant: "outline" as const, className: "bg-destructive/10 hover:bg-destructive/20" },
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" data-testid="button-calculator-trigger">
          <CalcIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calculator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-right">
            <div className="text-sm text-muted-foreground mb-1">
              {previousValue !== null && operation ? `${previousValue} ${operation}` : " "}
            </div>
            <div className="text-3xl font-mono font-bold" data-testid="calculator-display">
              {display}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {buttons.map((btn, idx) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
