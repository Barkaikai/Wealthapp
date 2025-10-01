import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EmailList } from "@/components/EmailList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Sparkles, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email } from "@shared/schema";

export default function EmailManager() {
  const [selectedEmailId, setSelectedEmailId] = useState<string>();
  const { toast } = useToast();

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const syncEmails = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("/api/emails/sync", "POST", {});
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      const { synced, personal, finance, investments } = data;
      toast({
        title: "Sync Complete",
        description: `${synced} emails synced: ${personal} Personal, ${finance} Finance, ${investments} Investments`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync emails",
        variant: "destructive",
      });
    },
  });

  const regenerateDraft = useMutation({
    mutationFn: async (emailId: string) => {
      const result = await apiRequest(`/api/emails/${emailId}/draft`, "POST", {});
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Success",
        description: "Draft regenerated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate draft",
        variant: "destructive",
      });
    },
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const displayEmails = emails.map(email => ({
    ...email,
    preview: email.preview || '',
    time: new Date(email.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    isStarred: email.isStarred === 'true',
    isRead: email.isRead === 'true',
  }));

  const financeEmails = displayEmails.filter(e => e.category === 'finance');
  const investmentEmails = displayEmails.filter(e => e.category === 'investments');
  const personalEmails = displayEmails.filter(e => e.category === 'personal');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Email Manager</h1>
          <p className="text-muted-foreground">AI-powered email categorization and drafting</p>
        </div>
        <Button 
          onClick={() => syncEmails.mutate()} 
          disabled={syncEmails.isPending}
          data-testid="button-sync-emails"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncEmails.isPending ? 'animate-spin' : ''}`} />
          {syncEmails.isPending ? 'Syncing...' : 'Sync Gmail'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No emails synced yet</p>
          <Button onClick={() => syncEmails.mutate()} disabled={syncEmails.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Your Gmail
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-emails">All</TabsTrigger>
            <TabsTrigger value="finance" data-testid="tab-finance">Finance</TabsTrigger>
            <TabsTrigger value="investments" data-testid="tab-investments">Investments</TabsTrigger>
            <TabsTrigger value="personal" data-testid="tab-personal">Personal</TabsTrigger>
          </TabsList>

          {['all', 'finance', 'investments', 'personal'].map(tab => {
            const tabEmails = tab === 'all' ? displayEmails :
                            tab === 'finance' ? financeEmails :
                            tab === 'investments' ? investmentEmails :
                            personalEmails;

            return (
              <TabsContent key={tab} value={tab} className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-2">
                    <EmailList
                      emails={tabEmails as any}
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
                            <p className="whitespace-pre-wrap text-sm">{selectedEmail.body || selectedEmail.preview}</p>
                          </div>
                        </Card>

                        {(selectedEmail.category === 'finance' || selectedEmail.category === 'investments') && (
                          <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <Sparkles className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">AI-Generated Reply</h3>
                            </div>
                            {selectedEmail.draftReply ? (
                              <>
                                <Textarea
                                  value={selectedEmail.draftReply}
                                  readOnly
                                  className="min-h-32 mb-4 bg-muted/50"
                                  data-testid="textarea-ai-draft"
                                />
                                <div className="flex gap-2">
                                  <Button data-testid="button-send-reply">
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Reply
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => regenerateDraft.mutate(selectedEmail.id)}
                                    disabled={regenerateDraft.isPending}
                                    data-testid="button-regenerate"
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {regenerateDraft.isPending ? 'Regenerating...' : 'Regenerate'}
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground mb-4">
                                  No draft generated yet. Sync emails to auto-generate drafts.
                                </p>
                                <Button 
                                  variant="outline" 
                                  onClick={() => regenerateDraft.mutate(selectedEmail.id)}
                                  disabled={regenerateDraft.isPending}
                                  data-testid="button-generate-draft"
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  {regenerateDraft.isPending ? 'Generating...' : 'Generate Draft'}
                                </Button>
                              </div>
                            )}
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
