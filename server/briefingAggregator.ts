/**
 * AI Briefing Aggregator
 * Pulls data from productivity, health monitoring, and CRM systems
 * for comprehensive daily briefings
 */

import type { IStorage } from './storage';

export interface BriefingData {
  userId: string;
  timestamp: string;
  
  // Productivity Data
  productivity: {
    routines: {
      total: number;
      completed: number;
      pending: number;
      upcomingToday: any[];
    };
    emails: {
      total: number;
      unread: number;
      needingAction: number;
      recentImportant: any[];
    };
    receipts: {
      total: number;
      thisMonth: number;
      totalSpent: number;
      topCategories: { category: string; count: number; amount: number }[];
    };
    notes: {
      total: number;
      recentlyCreated: number;
      recentNotes: any[];
    };
  };
  
  // Health Monitoring Data
  health: {
    status: string;
    lastCheckTime: string;
    metrics: {
      memory: { heapUsed: number; heapTotal: number; rss: number };
      uptime: number;
      errors: number;
    };
    recentIssues: any[];
  };
  
  // CRM Data
  crm: {
    contacts: {
      total: number;
      recentlyAdded: number;
    };
    organizations: {
      total: number;
      active: number;
    };
    leads: {
      total: number;
      hot: number;
      warm: number;
      cold: number;
    };
    recentActivities: any[];
  };
  
  // Financial Overview
  financial: {
    assets: {
      total: number;
      totalValue: number;
      byType: { type: string; count: number; value: number }[];
    };
    transactions: {
      total: number;
      thisMonth: number;
      recentTransactions: any[];
    };
  };
}

export class BriefingAggregator {
  constructor(private storage: IStorage) {}

  /**
   * Aggregate all data for a user's daily briefing
   */
  async aggregateBriefingData(userId: string): Promise<BriefingData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all data in parallel for efficiency
    const [
      routines,
      emails,
      receipts,
      notes,
      contacts,
      organizations,
      leads,
      activities,
      assets,
      transactions,
    ] = await Promise.all([
      this.getRoutineData(userId),
      this.getEmailData(userId),
      this.getReceiptData(userId, startOfMonth),
      this.getNoteData(userId),
      this.storage.getContacts(userId),
      this.storage.getOrganizations(userId),
      this.storage.getLeads(userId),
      this.storage.getActivities(userId),
      this.storage.getAssets(userId),
      this.storage.getTransactions(userId),
    ]);

    // Process routine data
    const upcomingToday = routines.filter((r: any) => {
      if (!r.time) return false;
      const routineTime = new Date(`${startOfDay.toISOString().split('T')[0]}T${r.time}`);
      return routineTime > now;
    });

    // Process email data
    const unreadEmails = emails.filter((e: any) => !e.isRead);
    const needingActionEmails = emails.filter((e: any) => 
      e.category === 'important' || e.category === 'action_required'
    );
    const recentImportantEmails = emails
      .filter((e: any) => e.category === 'important' || e.aiClassification?.priority === 'high')
      .slice(0, 5);

    // Process receipt data
    const receiptsThisMonth = receipts.filter((r: any) => 
      new Date(r.receiptDate) >= startOfMonth
    );
    const totalSpent = receiptsThisMonth.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    
    const categoryMap = new Map<string, { count: number; amount: number }>();
    receiptsThisMonth.forEach((r: any) => {
      const cat = r.category || 'other';
      const existing = categoryMap.get(cat) || { count: 0, amount: 0 };
      categoryMap.set(cat, {
        count: existing.count + 1,
        amount: existing.amount + (r.amount || 0),
      });
    });
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Process note data
    const recentNotes = notes
      .filter((n: any) => new Date(n.createdAt) >= startOfMonth)
      .slice(0, 5);

    // Process CRM data
    const recentContacts = contacts.filter((c: any) => 
      new Date(c.createdAt) >= startOfMonth
    );
    
    const activeOrgs = organizations.filter((o: any) => o.status === 'active');
    
    const hotLeads = leads.filter((l: any) => l.status === 'hot');
    const warmLeads = leads.filter((l: any) => l.status === 'warm');
    const coldLeads = leads.filter((l: any) => l.status === 'cold');
    
    const recentActivities = activities.slice(0, 10);

    // Process asset data
    const assetsByType = new Map<string, { count: number; value: number }>();
    assets.forEach((a: any) => {
      const type = a.type || 'other';
      const existing = assetsByType.get(type) || { count: 0, value: 0 };
      assetsByType.set(type, {
        count: existing.count + 1,
        value: existing.value + (a.value || 0),
      });
    });
    
    const totalAssetValue = assets.reduce((sum: number, a: any) => sum + (a.value || 0), 0);

    // Process transaction data
    const transactionsThisMonth = transactions.filter((t: any) => 
      new Date(t.transactionDate) >= startOfMonth
    );

    return {
      userId,
      timestamp: now.toISOString(),
      
      productivity: {
        routines: {
          total: routines.length,
          completed: routines.filter((r: any) => r.completed).length,
          pending: routines.filter((r: any) => !r.completed).length,
          upcomingToday: upcomingToday.slice(0, 5),
        },
        emails: {
          total: emails.length,
          unread: unreadEmails.length,
          needingAction: needingActionEmails.length,
          recentImportant: recentImportantEmails,
        },
        receipts: {
          total: receipts.length,
          thisMonth: receiptsThisMonth.length,
          totalSpent,
          topCategories,
        },
        notes: {
          total: notes.length,
          recentlyCreated: recentNotes.length,
          recentNotes,
        },
      },
      
      health: {
        status: 'healthy',
        lastCheckTime: now.toISOString(),
        metrics: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          errors: 0,
        },
        recentIssues: [],
      },
      
      crm: {
        contacts: {
          total: contacts.length,
          recentlyAdded: recentContacts.length,
        },
        organizations: {
          total: organizations.length,
          active: activeOrgs.length,
        },
        leads: {
          total: leads.length,
          hot: hotLeads.length,
          warm: warmLeads.length,
          cold: coldLeads.length,
        },
        recentActivities,
      },
      
      financial: {
        assets: {
          total: assets.length,
          totalValue: totalAssetValue,
          byType: Array.from(assetsByType.entries()).map(([type, data]) => ({
            type,
            ...data,
          })),
        },
        transactions: {
          total: transactions.length,
          thisMonth: transactionsThisMonth.length,
          recentTransactions: transactions.slice(0, 5),
        },
      },
    };
  }

  /**
   * Get routine data for user
   */
  private async getRoutineData(userId: string): Promise<any[]> {
    try {
      return await this.storage.getRoutines(userId);
    } catch (error) {
      console.error('Error fetching routines:', error);
      return [];
    }
  }

  /**
   * Get email data for user
   */
  private async getEmailData(userId: string): Promise<any[]> {
    try {
      return await this.storage.getEmails(userId);
    } catch (error) {
      console.error('Error fetching emails:', error);
      return [];
    }
  }

  /**
   * Get receipt data for user
   */
  private async getReceiptData(userId: string, since?: Date): Promise<any[]> {
    try {
      return await this.storage.getReceipts(userId);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return [];
    }
  }

  /**
   * Get note data for user
   */
  private async getNoteData(userId: string): Promise<any[]> {
    try {
      return await this.storage.getNotes(userId);
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }

  /**
   * Generate a summary text from briefing data for AI processing
   */
  generateBriefingSummary(data: BriefingData): string {
    const lines = [
      `Daily Briefing for ${new Date(data.timestamp).toLocaleDateString()}`,
      '',
      '=== PRODUCTIVITY ===',
      `Routines: ${data.productivity.routines.completed}/${data.productivity.routines.total} completed`,
      `Upcoming today: ${data.productivity.routines.upcomingToday.length} routines`,
      `Emails: ${data.productivity.emails.unread} unread, ${data.productivity.emails.needingAction} needing action`,
      `Receipts: ${data.productivity.receipts.thisMonth} this month, $${data.productivity.receipts.totalSpent.toFixed(2)} spent`,
      `Notes: ${data.productivity.notes.total} total, ${data.productivity.notes.recentlyCreated} created this month`,
      '',
      '=== CRM ===',
      `Contacts: ${data.crm.contacts.total} total, ${data.crm.contacts.recentlyAdded} added this month`,
      `Organizations: ${data.crm.organizations.total} total, ${data.crm.organizations.active} active`,
      `Leads: ${data.crm.leads.hot} hot, ${data.crm.leads.warm} warm, ${data.crm.leads.cold} cold`,
      `Recent activities: ${data.crm.recentActivities.length}`,
      '',
      '=== FINANCIAL ===',
      `Assets: ${data.financial.assets.total} total, $${data.financial.assets.totalValue.toFixed(2)} value`,
      `Transactions: ${data.financial.transactions.thisMonth} this month`,
    ];

    if (data.productivity.receipts.topCategories.length > 0) {
      lines.push('', 'Top spending categories:');
      data.productivity.receipts.topCategories.forEach(cat => {
        lines.push(`  - ${cat.category}: ${cat.count} receipts, $${cat.amount.toFixed(2)}`);
      });
    }

    return lines.join('\n');
  }
}
