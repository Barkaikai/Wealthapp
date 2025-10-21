import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrintButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function PrintButton({ 
  className, 
  variant = "outline", 
  size = "default",
  label = "Print"
}: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handlePrint}
          variant={variant}
          size={size}
          className={className}
          data-testid="button-print"
        >
          <Printer className="w-4 h-4 mr-2" />
          {size !== "icon" && <span className="hidden sm:inline">{label}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Print this page</p>
      </TooltipContent>
    </Tooltip>
  );
}
