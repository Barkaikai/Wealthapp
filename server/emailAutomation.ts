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
  errors: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        break;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

async function categorizeSafelyWithFallback(subject: string, preview: string): Promise<"personal" | "finance" | "investments"> {
  try {
    return await retryWithBackoff(
      () => categorizeEmail(subject, preview),
      2,
      500
    );
  } catch (error) {
    console.error('Failed to categorize email with AI, using keyword fallback:', error);
    return categorizeFallback(subject, preview);
  }
}

function categorizeFallback(subject: string, preview: string): "personal" | "finance" | "investments" {
  const text = `${subject} ${preview}`.toLowerCase();
  
  const investmentKeywords = [
    'stock', 'crypto', 'bitcoin', 'investment', 'portfolio', 
    'dividend', 'shares', 'trading', 'market', 'blockchain'
  ];
  
  const financeKeywords = [
    'invoice', 'statement', 'payment', 'receipt', 'balance', 
    'transaction', 'bill', 'expense', 'tax', 'account'
  ];
  
  if (investmentKeywords.some(keyword => text.includes(keyword))) {
    return 'investments';
  }
  
  if (financeKeywords.some(keyword => text.includes(keyword))) {
    return 'finance';
  }
  
  return 'personal';
}

async function generateDraftSafely(
  userId: string,
  email: { id: string; subject: string; from: string; body: string | null; preview: string },
  category: string
): Promise<string | undefined> {
  try {
    const templateDraft = await applyTemplateToEmail(userId, email.subject, email.from, category);
    
    if (templateDraft) {
      return templateDraft;
    }
    
    return await retryWithBackoff(
      () => draftEmailReply(email.body || email.preview),
      2,
      500
    );
  } catch (error: any) {
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
      console.error(`Timeout generating draft for email ${email.id}, using simple template`);
      return generateSimpleFallbackDraft(email.from);
    }
    
    console.error(`Failed to generate draft for email ${email.id}:`, error);
    return generateSimpleFallbackDraft(email.from);
  }
}

function generateSimpleFallbackDraft(from: string): string {
  const name = from.split('@')[0].split('.').map(n => 
    n.charAt(0).toUpperCase() + n.slice(1)
  ).join(' ');
  
  return `Thank you for your message. I've received your email and will review the details shortly. I'll get back to you soon.

Best regards`;
}

export async function syncAndCategorizeEmails(userId: string, maxResults: number = 20): Promise<EmailSortResult> {
  const result: EmailSortResult = {
    synced: 0,
    personal: 0,
    finance: 0,
    investments: 0,
    draftsCreated: 0,
    errors: 0,
  };

  try {
    const emails = await fetchRecentEmails(maxResults);

    for (const email of emails) {
      try {
        const category = await categorizeSafelyWithFallback(email.subject, email.preview);
        
        let draftReply: string | undefined;
        
        if (category === 'finance' || category === 'investments') {
          draftReply = await generateDraftSafely(userId, email, category);
          
          if (draftReply) {
            result.draftsCreated++;
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
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        result.errors++;
      }
    }

    return result;
  } catch (error: any) {
    // Suppress Gmail scope errors (known limitation of Replit Gmail connector)
    if (error?.name === 'GmailScopeError' || error?.message?.includes('Gmail integration has limited permissions')) {
      // Return empty result instead of throwing - this is expected until Gmail connector is upgraded
      return result;
    }
    
    console.error('Error syncing emails:', error);
    throw error;
  }
}

export async function generateDraftForEmail(emailBody: string): Promise<string> {
  try {
    return await retryWithBackoff(
      () => draftEmailReply(emailBody),
      3,
      1000
    );
  } catch (error: any) {
    console.error('Error generating draft:', error);
    
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
      return "Thank you for your email. I've received your message and will respond shortly.";
    }
    
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
