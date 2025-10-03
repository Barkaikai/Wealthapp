import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import OpenAI from 'openai';
import cron from 'node-cron';
import type { IStorage } from '../storage';

class DiscordBotService {
  private client: Client | null = null;
  private openai: OpenAI | null = null;
  private scheduledJobs: Map<number, cron.ScheduledTask> = new Map();
  private storage: IStorage | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  setStorage(storage: IStorage): void {
    this.storage = storage;
  }

  async loadAllScheduledJobs(): Promise<void> {
    if (!this.storage) {
      console.warn('[Discord] Storage not set, skipping scheduled jobs load');
      return;
    }

    try {
      // Load all active scheduled messages from storage
      const allScheduledMessages = await this.storage.getAllActiveDiscordScheduledMessages();

      for (const msg of allScheduledMessages) {
        await this.scheduleAIMessage(msg.id, msg.userId, msg.channelId, msg.prompt, msg.cronTime, false);
      }

      console.log(`[Discord] Loaded ${allScheduledMessages.length} scheduled jobs for all users`);
    } catch (err) {
      console.error('[Discord] Error loading scheduled jobs:', err);
    }
  }

  async initialize(botToken: string): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on('ready', () => {
      console.log(`[Discord] Bot logged in as ${this.client?.user?.tag}`);
    });

    // Content moderation
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      
      const flaggedWords = ['spam', 'scam']; // Configurable
      if (flaggedWords.some(word => message.content.toLowerCase().includes(word))) {
        try {
          await message.delete();
          console.log(`[Discord] Deleted message from ${message.author.username}`);
        } catch (err) {
          console.error('[Discord] Moderation error:', err);
        }
      }
    });

    await this.client.login(botToken);
  }

  async getServers() {
    if (!this.client || !this.client.guilds) {
      throw new Error('Discord bot not initialized');
    }

    return this.client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL(),
      channels: guild.channels.cache
        .filter(c => c.isTextBased())
        .map(channel => ({
          id: channel.id,
          name: channel.name,
        })),
    }));
  }

  async sendAIMessage(channelId: string, prompt: string): Promise<{ messageId: string; content: string }> {
    if (!this.client) {
      throw new Error('Discord bot not initialized');
    }

    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate AI message
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const aiMessage = completion.choices[0].message.content || 'No response generated';

    // Send message to Discord
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Invalid channel');
    }

    const sent = await (channel as TextChannel).send(aiMessage);
    return { messageId: sent.id, content: aiMessage };
  }

  async editAIMessage(channelId: string, messageId: string, prompt: string): Promise<{ content: string }> {
    if (!this.client) {
      throw new Error('Discord bot not initialized');
    }

    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate new AI content
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const aiMessage = completion.choices[0].message.content || 'No response generated';

    // Fetch and edit message
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Invalid channel');
    }

    const message = await (channel as TextChannel).messages.fetch(messageId);
    await message.edit(aiMessage);

    return { content: aiMessage };
  }

  async scheduleAIMessage(scheduleId: number, userId: string, channelId: string, prompt: string, cronTime: string, saveToDb: boolean = true): Promise<void> {
    if (!this.client) {
      throw new Error('Discord bot not initialized');
    }

    // Cancel existing job if any
    if (this.scheduledJobs.has(scheduleId)) {
      this.scheduledJobs.get(scheduleId)?.stop();
    }

    // Create new scheduled job
    const job = cron.schedule(cronTime, async () => {
      try {
        await this.sendAIMessage(channelId, prompt);
        console.log(`[Discord] Scheduled message sent to ${channelId}`);
        
        // Update run time in database
        if (this.storage) {
          try {
            const now = new Date();
            // Calculate next run time based on cron expression
            const parser = await import('cron-parser');
            const interval = parser.parseExpression(cronTime);
            const nextRunAt = interval.next().toDate();
            
            await this.storage.updateDiscordScheduledMessage(scheduleId, userId, {
              lastRunAt: now,
              nextRunAt: nextRunAt,
            });
            console.log(`[Discord] Updated run times for job ${scheduleId}`);
          } catch (err) {
            console.error('[Discord] Failed to update run times:', err);
          }
        }
      } catch (err) {
        console.error('[Discord] Scheduled message error:', err);
      }
    });

    this.scheduledJobs.set(scheduleId, job);
  }

  cancelScheduledMessage(scheduleId: number): void {
    if (this.scheduledJobs.has(scheduleId)) {
      this.scheduledJobs.get(scheduleId)?.stop();
      this.scheduledJobs.delete(scheduleId);
    }
  }

  isReady(): boolean {
    return this.client !== null && this.client.isReady();
  }
}

export const discordBot = new DiscordBotService();
