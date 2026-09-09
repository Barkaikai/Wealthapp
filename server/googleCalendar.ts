import { google } from 'googleapis';

export type NormalizedGoogleCalendarEvent = {
  googleEventId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  attendees: string[] | null;
  isAllDay: 'true' | 'false';
  recurrence: string | null;
  reminder: number | null;
  color: string | null;
  source: 'google';
};

type ConnectorConnection = {
  settings?: {
    access_token?: string;
    expires_at?: string;
    oauth?: {
      credentials?: {
        access_token?: string;
      };
    };
  };
};

const GOOGLE_CONNECTOR_NAMES = ['google-calendar', 'google-workspace', 'google-mail'] as const;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !xReplitToken) {
    throw new GoogleCalendarNotConnectedError('Google Calendar account not connected. Please connect your Google Workspace account first.');
  }

  for (const connectorName of GOOGLE_CONNECTOR_NAMES) {
    const response = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=${connectorName}`,
      {
        headers: {
          Accept: 'application/json',
          'X_REPLIT_TOKEN': xReplitToken,
        },
      }
    );

    if (!response.ok) {
      continue;
    }

    const data = await response.json() as { items?: ConnectorConnection[] };
    const connection = data.items?.[0];
    const expiresAt = connection?.settings?.expires_at ? new Date(connection.settings.expires_at).getTime() : 0;
    const accessToken =
      (expiresAt > Date.now() && connection?.settings?.access_token) ||
      connection?.settings?.access_token ||
      connection?.settings?.oauth?.credentials?.access_token;

    if (connection && accessToken) {
      return accessToken;
    }
  }

  throw new Error('Google Calendar not connected');
}

export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export class GoogleCalendarScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleCalendarScopeError';
  }
}

export class GoogleCalendarNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleCalendarNotConnectedError';
  }
}

function normalizeDateInput(value: string, isAllDay: boolean) {
  if (isAllDay) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

export async function fetchUpcomingGoogleCalendarEvents(daysAhead: number = 90): Promise<NormalizedGoogleCalendarEvent[]> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const now = new Date();
    const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const events: NormalizedGoogleCalendarEvent[] = [];

    let pageToken: string | undefined;
    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        showDeleted: false,
        maxResults: 2500,
        pageToken,
      });

      for (const event of response.data.items ?? []) {
        if (!event.id || event.status === 'cancelled') {
          continue;
        }

        const startValue = event.start?.dateTime ?? event.start?.date;
        const endValue = event.end?.dateTime ?? event.end?.date;

        if (!startValue || !endValue) {
          continue;
        }

        const isAllDay = Boolean(event.start?.date && event.end?.date && !event.start?.dateTime && !event.end?.dateTime);
        const attendees = uniqueStrings(event.attendees?.map((attendee) => attendee.email));
        const reminder = event.reminders?.useDefault
          ? null
          : event.reminders?.overrides?.find((override) => typeof override.minutes === 'number')?.minutes ?? null;

        events.push({
          googleEventId: event.id,
          title: event.summary?.trim() || 'Untitled event',
          description: event.description ?? null,
          startTime: normalizeDateInput(startValue, isAllDay).toISOString(),
          endTime: normalizeDateInput(endValue, isAllDay).toISOString(),
          location: event.location ?? null,
          attendees: attendees.length > 0 ? attendees : null,
          isAllDay: isAllDay ? 'true' : 'false',
          recurrence: event.recurrence?.length ? event.recurrence.join('\n') : null,
          reminder,
          color: event.colorId ?? null,
          source: 'google',
        });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events;
  } catch (error: any) {
    if (error?.response?.status === 403 || error?.message?.includes('insufficient authentication scopes')) {
      throw new GoogleCalendarScopeError(
        'Google Calendar sync is currently unavailable because the connected Google account does not grant calendar read access.'
      );
    }

    if (error?.message?.includes('Google Calendar not connected')) {
      throw new GoogleCalendarNotConnectedError('Google Calendar account not connected. Please connect your Google Workspace account first.');
    }

    throw error;
  }
}
