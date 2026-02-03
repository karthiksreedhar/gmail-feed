import { google, gmail_v1 } from 'googleapis';
import { getOAuth2Client, refreshAccessToken } from './oauth';
import { getStoredTokens, cacheEmails, StoredEmail } from './mongodb';

function decodeBase64(data: string): string {
  // Gmail uses URL-safe base64 encoding
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

  // If the payload has a body with data, decode it
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // If there are parts, search through them
  if (payload.parts) {
    for (const part of payload.parts) {
      // Prefer text/plain, fall back to text/html
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Try HTML if no plain text found
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Recursively check nested parts
    for (const part of payload.parts) {
      const nestedBody = extractBody(part);
      if (nestedBody) return nestedBody;
    }
  }

  return '';
}

export async function fetchEmails(maxResults: number = 50): Promise<{ emails: StoredEmail[]; userEmail: string } | null> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    console.log('No tokens found, user needs to authenticate');
    return null;
  }

  // Check if token is expired and refresh if needed
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  // Refresh token if expired
  if (tokens.expiryDate < Date.now()) {
    console.log('Token expired, refreshing...');
    await refreshAccessToken(oauth2Client);
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    // List messages from inbox
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
    });

    const messages = listResponse.data.messages || [];
    const emails: StoredEmail[] = [];

    // Fetch full details for each message
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

    // Cache the emails in MongoDB
    await cacheEmails(emails, tokens.userEmail);

    return { emails, userEmail: tokens.userEmail };
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}
