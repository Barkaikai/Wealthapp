import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface TemplateVariables {
  subject?: string;
  name?: string;
  topic?: string;
  [key: string]: string | undefined;
}

export function replacePlaceholders(template: string, variables: TemplateVariables): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const placeholder = `{${key}}`;
      // Escape special regex characters in placeholder
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escapedPlaceholder, 'g'), value);
    }
  }
  
  return result;
}

export function extractNameFromEmail(from: string): string {
  const match = from.match(/^([^<]+)(?:\s*<[^>]+>)?$/);
  if (match && match[1]) {
    return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return from.split('@')[0];
}

export function extractTopicFromSubject(subject: string): string {
  const cleanSubject = subject
    .replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, '')
    .trim();
  
  return cleanSubject;
}

export async function getTemplateByCategory(userId: string, category: string): Promise<EmailTemplate | null> {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.userId, userId),
      eq(emailTemplates.category, category)
    ))
    .limit(1);
  
  return template || null;
}

export async function getTemplateById(userId: string, templateId: string): Promise<EmailTemplate | null> {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.id, templateId),
      eq(emailTemplates.userId, userId)
    ))
    .limit(1);
  
  return template || null;
}

export async function getAllTemplates(userId: string): Promise<EmailTemplate[]> {
  return await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.userId, userId));
}

export async function createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
  const [newTemplate] = await db
    .insert(emailTemplates)
    .values(template)
    .onConflictDoUpdate({
      target: emailTemplates.id,
      set: template,
    })
    .returning();
  
  return newTemplate;
}

export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  await db
    .delete(emailTemplates)
    .where(and(
      eq(emailTemplates.id, templateId),
      eq(emailTemplates.userId, userId)
    ));
}

export async function applyTemplateToEmail(
  userId: string,
  emailSubject: string,
  emailFrom: string,
  emailCategory: string
): Promise<string | null> {
  const template = await getTemplateByCategory(userId, emailCategory);
  
  if (!template) {
    return null;
  }

  const name = extractNameFromEmail(emailFrom);
  const topic = extractTopicFromSubject(emailSubject);

  const variables: TemplateVariables = {
    subject: emailSubject,
    name,
    topic,
  };

  return replacePlaceholders(template.body, variables);
}
