import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Edit, Calendar, Trash2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  channels: { id: string; name: string }[];
}

interface ScheduledMessage {
  id: number;
  serverId: string;
  channelId: string;
  channelName?: string;
  prompt: string;
  cronTime: string;
  isActive: string;
  createdAt: string;
}

export default function DiscordManager() {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [messagePrompt, setMessagePrompt] = useState('');
  const [editMessageId, setEditMessageId] = useState('');
  const [schedulePrompt, setSchedulePrompt] = useState('');
  const [cronTime, setCronTime] = useState('0 9 * * *');

  const { data: serversData, isLoading: serversLoading, refetch: refetchServers } = useQuery<{ servers: Server[] }>({
    queryKey: ['/api/discord/servers'],
    retry: false,
  });

  const { data: scheduledData, isLoading: scheduledLoading } = useQuery<{ scheduled: ScheduledMessage[] }>({
    queryKey: ['/api/discord/scheduled'],
  });

  const initBotMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest('POST', '/api/discord/initialize', { botToken: token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discord/servers'] });
      refetchServers();
      toast({
        title: "Bot Connected",
        description: "Discord bot initialized successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initialize Discord bot",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (params: { channelId: string; prompt: string }) => {
      return await apiRequest('POST', '/api/discord/send-message', params);
    },
    onSuccess: () => {
      setMessagePrompt('');
      toast({
        title: "Message Sent",
        description: "AI-generated message sent successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async (params: { channelId: string; messageId: string; prompt: string }) => {
      return await apiRequest('POST', '/api/discord/edit-message', params);
    },
    onSuccess: () => {
      setEditMessageId('');
      setMessagePrompt('');
      toast({
        title: "Message Edited",
        description: "Message updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Edit Failed",
        description: error.message || "Failed to edit message",
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (params: { serverId: string; channelId: string; channelName?: string; prompt: string; cronTime: string }) => {
      return await apiRequest('POST', '/api/discord/schedule', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discord/scheduled'] });
      setSchedulePrompt('');
      setCronTime('0 9 * * *');
      toast({
        title: "Message Scheduled",
        description: "AI message scheduled successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Schedule Failed",
        description: error.message || "Failed to schedule message",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/discord/scheduled/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discord/scheduled'] });
      toast({
        title: "Schedule Deleted",
        description: "Scheduled message removed successfully!",
      });
    },
  });

  const handleInitBot = () => {
    if (!botToken) {
      toast({
        title: "Missing Token",
        description: "Please enter your Discord bot token",
        variant: "destructive",
      });
      return;
    }
    initBotMutation.mutate(botToken);
  };

  const handleSendMessage = () => {
    if (!selectedChannel || !messagePrompt) {
      toast({
        title: "Missing Fields",
        description: "Please select a channel and enter a prompt",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate({ channelId: selectedChannel, prompt: messagePrompt });
  };

  const handleEditMessage = () => {
    if (!selectedChannel || !editMessageId || !messagePrompt) {
      toast({
        title: "Missing Fields",
        description: "Please select channel, message ID, and prompt",
        variant: "destructive",
      });
      return;
    }
    editMessageMutation.mutate({ channelId: selectedChannel, messageId: editMessageId, prompt: messagePrompt });
  };

  const handleSchedule = () => {
    if (!selectedChannel || !schedulePrompt || !cronTime) {
      toast({
        title: "Missing Fields",
        description: "Please fill all schedule fields",
        variant: "destructive",
      });
      return;
    }

    const selectedChannelData = serversData?.servers
      .flatMap(s => s.channels.map(c => ({ ...c, serverId: s.id, serverName: s.name })))
      .find(c => c.id === selectedChannel);

    if (!selectedChannelData) return;

    scheduleMutation.mutate({
      serverId: selectedChannelData.serverId,
      channelId: selectedChannel,
      channelName: selectedChannelData.name,
      prompt: schedulePrompt,
      cronTime,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-discord-manager">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discord AI Manager</h1>
          <p className="text-muted-foreground">AI-powered Discord bot management</p>
        </div>
        <Bot className="w-10 h-10 text-primary" />
      </div>

      {/* Bot Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Discord Bot</CardTitle>
          <CardDescription>Enter your Discord bot token to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Bot Token (starts with MTk...)"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              data-testid="input-bot-token"
            />
            <Button 
              onClick={handleInitBot} 
              disabled={initBotMutation.isPending}
              data-testid="button-connect-bot"
            >
              {initBotMutation.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
          {serversData?.servers && (
            <Button variant="outline" size="sm" onClick={() => refetchServers()} data-testid="button-refresh-servers">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Servers
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Channel Selection */}
      {serversData?.servers && serversData.servers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Channel</CardTitle>
            <CardDescription>Choose a channel to send messages</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger data-testid="select-channel">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {serversData.servers.map(server => 
                  server.channels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {server.name} → {channel.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Message Controls */}
      {selectedChannel && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Send AI Message</CardTitle>
              <CardDescription>Generate and send AI-powered messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter AI prompt (e.g., 'Write a welcoming message for new members')"
                value={messagePrompt}
                onChange={(e) => setMessagePrompt(e.target.value)}
                rows={3}
                data-testid="textarea-message-prompt"
              />
              <div className="flex gap-2">
                <Button onClick={handleSendMessage} disabled={sendMessageMutation.isPending} data-testid="button-send-message">
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send AI Message'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-edit-dialog">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Message</DialogTitle>
                      <DialogDescription>Enter the message ID and new prompt</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Message ID</Label>
                        <Input
                          placeholder="Message ID (from Discord)"
                          value={editMessageId}
                          onChange={(e) => setEditMessageId(e.target.value)}
                          data-testid="input-edit-message-id"
                        />
                      </div>
                      <div>
                        <Label>New Prompt</Label>
                        <Textarea
                          placeholder="Enter new AI prompt"
                          value={messagePrompt}
                          onChange={(e) => setMessagePrompt(e.target.value)}
                          rows={3}
                          data-testid="textarea-edit-prompt"
                        />
                      </div>
                      <Button onClick={handleEditMessage} disabled={editMessageMutation.isPending} data-testid="button-confirm-edit">
                        {editMessageMutation.isPending ? 'Editing...' : 'Update Message'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule AI Messages</CardTitle>
              <CardDescription>Automate messages with cron scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>AI Prompt</Label>
                <Textarea
                  placeholder="Enter AI prompt for scheduled message"
                  value={schedulePrompt}
                  onChange={(e) => setSchedulePrompt(e.target.value)}
                  rows={3}
                  data-testid="textarea-schedule-prompt"
                />
              </div>
              <div>
                <Label>Cron Schedule</Label>
                <Input
                  placeholder="e.g., 0 9 * * * (daily at 9 AM)"
                  value={cronTime}
                  onChange={(e) => setCronTime(e.target.value)}
                  data-testid="input-cron-time"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Examples: "0 9 * * *" (9 AM daily), "0 */6 * * *" (every 6 hours)
                </p>
              </div>
              <Button onClick={handleSchedule} disabled={scheduleMutation.isPending} data-testid="button-schedule-message">
                <Calendar className="w-4 h-4 mr-2" />
                {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Message'}
              </Button>
            </CardContent>
          </Card>

          {/* Scheduled Messages List */}
          {scheduledData?.scheduled && scheduledData.scheduled.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Messages</CardTitle>
                <CardDescription>Manage your automated messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scheduledData.scheduled.map(msg => (
                    <div key={msg.id} className="flex items-center justify-between p-3 border rounded-md" data-testid={`scheduled-message-${msg.id}`}>
                      <div className="flex-1">
                        <p className="font-medium">{msg.channelName || msg.channelId}</p>
                        <p className="text-sm text-muted-foreground truncate">{msg.prompt}</p>
                        <p className="text-xs text-muted-foreground">Cron: {msg.cronTime}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteScheduleMutation.mutate(msg.id)}
                        data-testid={`button-delete-schedule-${msg.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
