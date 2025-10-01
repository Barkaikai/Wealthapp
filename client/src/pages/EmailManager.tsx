import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EmailList } from "@/components/EmailList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles, RefreshCw, FileText, Plus, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email, EmailTemplate } from "@shared/schema";

export default function EmailManager() {
  const [selectedEmailId, setSelectedEmailId] = useState<string>();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    id: '',
    name: '',
    subject: '',
    body: '',
    category: 'investments' as 'finance' | 'investments' | 'personal',
  });
  const { toast } = useToast();

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const syncEmails = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/emails/sync", {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      const { synced, personal, finance, investments } = data;
      toast({
        title: "Sync Complete",
        description: `${synced} emails synced: ${personal} Personal, ${finance} Finance, ${investments} Investments`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to sync emails";
      const action = error.action;
      
      let title = "Gmail Sync Error";
      let description = errorMessage;
      
      if (action === 'reconnect_gmail') {
        title = "Email Sync Unavailable";
        description = "Gmail email sync requires full inbox read permissions (gmail.readonly scope) which the current Gmail integration doesn't provide. This is a limitation of the Replit Gmail connector.";
      } else if (action === 'connect_gmail') {
        title = "Gmail Not Connected";
        description = "Please connect your Gmail account in the Tools panel to enable email features.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const regenerateDraft = useMutation({
    mutationFn: async (emailId: string) => {
      const result = await apiRequest("POST", `/api/emails/${emailId}/draft`, {});
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

  const createTemplate = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      return await apiRequest("POST", "/api/email-templates", template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      setTemplateDialogOpen(false);
      setNewTemplate({ id: '', name: '', subject: '', body: '', category: 'investments' });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("DELETE", `/api/email-templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
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
        <div className="flex gap-2">
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-manage-templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates ({templates.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Email Templates</DialogTitle>
                <DialogDescription>
                  Create templates with placeholders like {`{subject}`}, {`{name}`}, {`{topic}`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Create New Template</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-id">Template ID</Label>
                      <Input
                        id="template-id"
                        value={newTemplate.id}
                        onChange={(e) => setNewTemplate({ ...newTemplate, id: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                        placeholder="INVESTMENTS_REPLY"
                        data-testid="input-template-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="Investments Reply"
                        data-testid="input-template-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-category">Category</Label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(value: any) => setNewTemplate({ ...newTemplate, category: value })}
                      >
                        <SelectTrigger id="template-category" data-testid="select-template-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="investments">Investments</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="template-subject">Subject</Label>
                      <Input
                        id="template-subject"
                        value={newTemplate.subject}
                        onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                        placeholder="Re: {subject}"
                        data-testid="input-template-subject"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-body">Body</Label>
                      <Textarea
                        id="template-body"
                        value={newTemplate.body}
                        onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                        placeholder="Hello {name},&#10;&#10;I've reviewed your message regarding {topic}..."
                        className="min-h-32"
                        data-testid="input-template-body"
                      />
                    </div>
                    <Button 
                      onClick={() => createTemplate.mutate(newTemplate)}
                      disabled={!newTemplate.id || !newTemplate.name || createTemplate.isPending}
                      data-testid="button-create-template"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {createTemplate.isPending ? 'Creating...' : 'Create Template'}
                    </Button>
                  </div>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Existing Templates</h3>
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <Card key={template.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{template.name}</h4>
                                <Badge variant="outline">{template.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">ID: {template.id}</p>
                              <p className="text-sm mb-1"><strong>Subject:</strong> {template.subject}</p>
                              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{template.body}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTemplate.mutate(template.id)}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={() => syncEmails.mutate()} 
            disabled={syncEmails.isPending}
            data-testid="button-sync-emails"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncEmails.isPending ? 'animate-spin' : ''}`} />
            {syncEmails.isPending ? 'Syncing...' : 'Sync Gmail'}
          </Button>
        </div>
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
