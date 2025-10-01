import { fetchRecentEmails } from './gmail';
import { categorizeEmail, draftEmailReply } from './openai';
import { storage } from './storage';
import { applyTemplateToEmail } from './emailTemplates';

export interface EmailSortResult {
  synced: number;
  personal: number;
  finance: number;
  investments: number;
  draftsCreated: number;
}

export async function syncAndCategorizeEmails(userId: string, maxResults: number = 20): Promise<EmailSortResult> {
  const result: EmailSortResult = {
    synced: 0,
    personal: 0,
    finance: 0,
    investments: 0,
    draftsCreated: 0,
  };

  try {
    const emails = await fetchRecentEmails(maxResults);

    for (const email of emails) {
      const category = await categorizeEmail(email.subject, email.preview);
      
      let draftReply: string | undefined;
      
      if (category === 'finance' || category === 'investments') {
        try {
          // Try to use template first
          const templateDraft = await applyTemplateToEmail(userId, email.subject, email.from, category);
          
          if (templateDraft) {
            draftReply = templateDraft;
          } else {
            // Fallback to AI-generated draft
            draftReply = await draftEmailReply(email.body || email.preview);
          }
          
          result.draftsCreated++;
        } catch (error) {
          console.error(`Failed to generate draft for email ${email.id}:`, error);
        }
      }
      
      await storage.upsertEmail({
        id: email.id,
        userId,
        from: email.from,
        subject: email.subject,
        preview: email.preview,
        body: email.body,
        category,
        draftReply,
        isStarred: email.isStarred,
        isRead: email.isRead,
        threadId: email.threadId,
        receivedAt: email.receivedAt,
      });

      result.synced++;
      
      if (category === 'personal') {
        result.personal++;
      } else if (category === 'finance') {
        result.finance++;
      } else if (category === 'investments') {
        result.investments++;
      }
    }

    return result;
  } catch (error) {
    console.error('Error syncing emails:', error);
    throw error;
  }
}

export async function generateDraftForEmail(emailBody: string): Promise<string> {
  try {
    return await draftEmailReply(emailBody);
  } catch (error) {
    console.error('Error generating draft:', error);
    throw error;
  }
}

export interface EmailWithDraft {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  category: string;
  isStarred: string;
  isRead: string;
  receivedAt: Date;
  draftReply?: string;
}

export async function getEmailsWithDrafts(userId: string, category?: string): Promise<EmailWithDraft[]> {
  const emails = await storage.getEmails(userId);
  
  const filteredEmails = category 
    ? emails.filter(e => e.category === category)
    : emails;

  return filteredEmails.map(email => ({
    id: email.id,
    from: email.from,
    subject: email.subject,
    preview: email.preview || '',
    body: email.body || '',
    category: email.category,
    isStarred: email.isStarred,
    isRead: email.isRead,
    receivedAt: email.receivedAt,
    draftReply: email.draftReply || undefined,
  }));
}

export function isFinancialEmail(subject: string): boolean {
  const financialKeywords = [
    'invoice', 'statement', 'trade', 'dividend', 
    'payment', 'receipt', 'balance', 'transaction',
    'portfolio', 'stock', 'crypto', 'investment'
  ];
  
  const subjectLower = subject.toLowerCase();
  return financialKeywords.some(keyword => subjectLower.includes(keyword));
}
