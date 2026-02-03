import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ks4190_db_user:pulY33BbK3UQRjKW@please-god.erkorn3.mongodb.net/?appName=please-god';
const DB_NAME = process.env.MONGODB_DB || 'gmail_feed';

let client: MongoClient | null = null;
let db: Db | null = null;

// For serverless environments, we need to cache the connection
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable to preserve the connection across HMR
    if (!global._mongoClientPromise) {
      client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
      });
      global._mongoClientPromise = client.connect();
    }
    client = await global._mongoClientPromise;
  } else {
    // In production, create a new connection
    if (!client) {
      client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
      });
      await client.connect();
    }
  }

  db = client.db(DB_NAME);
  return db;
}

// Token storage
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  userEmail: string;
  updatedAt: Date;
}

export async function getStoredTokens(): Promise<TokenData | null> {
  const database = await connectToDatabase();
  const doc = await database.collection('oauth_tokens').findOne({ type: 'gmail_oauth' });
  return doc as TokenData | null;
}

export async function storeTokens(tokens: Omit<TokenData, 'updatedAt'>): Promise<void> {
  const database = await connectToDatabase();
  await database.collection('oauth_tokens').updateOne(
    { type: 'gmail_oauth' },
    {
      $set: {
        ...tokens,
        type: 'gmail_oauth',
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Email storage
export interface StoredEmail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  isUnread: boolean;
  labels: string[];
}

export interface EmailCache {
  emails: StoredEmail[];
  lastFetched: Date;
  userEmail: string;
}

export async function getCachedEmails(): Promise<EmailCache | null> {
  const database = await connectToDatabase();
  const doc = await database.collection('email_cache').findOne({ type: 'inbox_cache' });
  return doc as EmailCache | null;
}

export async function cacheEmails(emails: StoredEmail[], userEmail: string): Promise<void> {
  const database = await connectToDatabase();
  await database.collection('email_cache').updateOne(
    { type: 'inbox_cache' },
    {
      $set: {
        type: 'inbox_cache',
        emails,
        userEmail,
        lastFetched: new Date(),
      },
    },
    { upsert: true }
  );
}
