import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  category: "personal" | "finance" | "investments";
  isStarred: boolean;
  isRead: boolean;
  time: string;
}

interface EmailListProps {
  emails: Email[];
  onEmailClick: (emailId: string) => void;
  selectedEmailId?: string;
}

export function EmailList({ emails, onEmailClick, selectedEmailId }: EmailListProps) {
  const categoryColors = {
    personal: "bg-chart-2/10 text-chart-2",
    finance: "bg-chart-3/10 text-chart-3",
    investments: "bg-chart-1/10 text-chart-1",
  };

  return (
    <div className="space-y-2" data-testid="list-emails">
      {emails.map((email) => (
        <Card
          key={email.id}
          className={cn(
            "p-4 cursor-pointer transition-colors hover-elevate active-elevate-2",
            selectedEmailId === email.id && "bg-accent",
            !email.isRead && "border-l-4 border-l-primary"
          )}
          onClick={() => onEmailClick(email.id)}
          data-testid={`email-${email.id}`}
        >
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <p className={cn(
                    "font-medium truncate",
                    !email.isRead && "font-semibold"
                  )}>
                    {email.from}
                  </p>
                  <Badge variant="secondary" className={cn("shrink-0", categoryColors[email.category])}>
                    {email.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{email.time}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6",
                      email.isStarred && "text-chart-4"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Toggle star for email:", email.id);
                    }}
                  >
                    <Star className={cn("h-4 w-4", email.isStarred && "fill-current")} />
                  </Button>
                </div>
              </div>
              <p className={cn(
                "text-sm mb-1",
                !email.isRead ? "font-medium" : "text-muted-foreground"
              )}>
                {email.subject}
              </p>
              <p className="text-sm text-muted-foreground truncate">{email.preview}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
