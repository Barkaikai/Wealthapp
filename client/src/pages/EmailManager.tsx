import { useState } from "react";
import { EmailList } from "@/components/EmailList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Sparkles } from "lucide-react";

export default function EmailManager() {
  const [selectedEmailId, setSelectedEmailId] = useState<string>("1");
  const [aiDraft, setAiDraft] = useState("Thank you for sending the monthly statement. I've reviewed it and everything looks good. Please let me know if you need any additional information.");

  //todo: remove mock functionality
  const emails = [
    {
      id: "1",
      from: "Charles Schwab",
      subject: "Monthly Statement Available",
      preview: "Your October statement is now available for review...",
      category: "finance" as const,
      isStarred: true,
      isRead: false,
      time: "10:30 AM",
      body: "Dear Valued Client,\n\nYour monthly statement for October 2024 is now available in your account. Please log in to review your holdings and transactions.\n\nBest regards,\nCharles Schwab Team"
    },
    {
      id: "2",
      from: "Coinbase",
      subject: "BTC Price Alert",
      preview: "Bitcoin has reached your target price of $45,000...",
      category: "investments" as const,
      isStarred: false,
      isRead: false,
      time: "9:15 AM",
      body: "Price Alert:\n\nBitcoin (BTC) has reached your target price of $45,000. Current price: $45,125.\n\nConsider reviewing your investment strategy."
    },
    {
      id: "3",
      from: "John Smith",
      subject: "Dinner plans this week?",
      preview: "Hey, wanted to see if you're free for dinner...",
      category: "personal" as const,
      isStarred: false,
      isRead: true,
      time: "Yesterday",
      body: "Hey,\n\nWanted to see if you're free for dinner this week? We should catch up!\n\nLet me know,\nJohn"
    },
  ];

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Email Manager</h1>
        <p className="text-muted-foreground">AI-powered email categorization and drafting</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-emails">All</TabsTrigger>
          <TabsTrigger value="finance" data-testid="tab-finance">Finance</TabsTrigger>
          <TabsTrigger value="investments" data-testid="tab-investments">Investments</TabsTrigger>
          <TabsTrigger value="personal" data-testid="tab-personal">Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <EmailList
                emails={emails}
                onEmailClick={setSelectedEmailId}
                selectedEmailId={selectedEmailId}
              />
            </div>

            <div className="lg:col-span-3">
              {selectedEmail && (
                <div className="space-y-4">
                  <Card className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">{selectedEmail.subject}</h2>
                        <p className="text-sm text-muted-foreground">{selectedEmail.from}</p>
                      </div>
                      <Badge variant="secondary">{selectedEmail.category}</Badge>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap text-sm">{selectedEmail.body}</p>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">AI-Generated Reply</h3>
                    </div>
                    <Textarea
                      value={aiDraft}
                      onChange={(e) => setAiDraft(e.target.value)}
                      className="min-h-32 mb-4"
                      data-testid="textarea-ai-draft"
                    />
                    <div className="flex gap-2">
                      <Button data-testid="button-send-reply">
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </Button>
                      <Button variant="outline" data-testid="button-regenerate">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
