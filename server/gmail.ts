// From google-mail connection integration
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings?.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export class GmailScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailScopeError';
  }
}

export class GmailNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailNotConnectedError';
  }
}

export async function fetchRecentEmails(maxResults: number = 20) {
  try {
    const gmail = await getUncachableGmailClient();
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const message of messages) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      const headers = detail.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

      // Get email body
      let body = '';
      if (detail.data.payload?.parts) {
        const textPart = detail.data.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      } else if (detail.data.payload?.body?.data) {
        body = Buffer.from(detail.data.payload.body.data, 'base64').toString();
      }

      const preview = body.substring(0, 150).trim();

      emails.push({
        id: message.id!,
        threadId: detail.data.threadId!,
        from,
        subject,
        body,
        preview,
        receivedAt: new Date(date),
        isStarred: detail.data.labelIds?.includes('STARRED') ? 'true' : 'false',
        isRead: !detail.data.labelIds?.includes('UNREAD') ? 'true' : 'false',
      });
    }

    return emails;
  } catch (error: any) {
    // Handle Gmail API errors
    if (error.response?.status === 403 || error.message?.includes('insufficient authentication scopes')) {
      throw new GmailScopeError('Gmail email sync is currently unavailable. The Gmail integration has limited permissions that don\'t allow reading your full inbox. This feature requires the gmail.readonly scope which is not available in the current Replit Gmail connector.');
    }
    if (error.message?.includes('Gmail not connected')) {
      throw new GmailNotConnectedError('Gmail account not connected. Please connect your Gmail account in the Tools panel.');
    }
    throw error;
  }
}
