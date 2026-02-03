import { google, gmail_v1 } from 'googleapis';
import { getOAuth2Client, refreshAccessToken } from './oauth';
import { getStoredTokens, cacheEmails, StoredEmail } from './mongodb';

function decodeBase64(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nestedBody = extractBody(part);
      if (nestedBody) return nestedBody;
    }
  }

  return '';
}

// Fetch emails for a specific user (multi-user support)
export async function fetchEmailsForUser(userEmail: string, maxResults: number = 50): Promise<{ emails: StoredEmail[]; userEmail: string } | null> {
  const tokens = await getStoredTokens(userEmail);
  if (!tokens) {
    console.log(`No tokens found for user: ${userEmail}`);
    return null;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  // Refresh token if expired
  if (tokens.expiryDate < Date.now()) {
    console.log(`Token expired for ${userEmail}, refreshing...`);
    await refreshAccessToken(oauth2Client, userEmail);
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages || [];
    const emails: StoredEmail[] = [];

    for (const message of messages) {
      if (!message.id) continue;

      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const msg = msgResponse.data;
      const headers = msg.payload?.headers;

      const email: StoredEmail = {
        id: msg.id || '',
        threadId: msg.threadId || '',
        snippet: msg.snippet || '',
        subject: getHeader(headers, 'Subject'),
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        date: getHeader(headers, 'Date'),
        body: extractBody(msg.payload),
        isUnread: msg.labelIds?.includes('UNREAD') || false,
        labels: msg.labelIds || [],
      };

      emails.push(email);
    }

    // Cache the emails for this user
    await cacheEmails(emails, userEmail);

    return { emails, userEmail };
  } catch (error) {
    console.error(`Error fetching emails for ${userEmail}:`, error);
    throw error;
  }
}
