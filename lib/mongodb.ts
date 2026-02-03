import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
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
    if (!global._mongoClientPromise) {
      client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
      });
      global._mongoClientPromise = client.connect();
    }
    client = await global._mongoClientPromise;
  } else {
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

// Token storage - MULTI-USER
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  userEmail: string;
  updatedAt: Date;
}

// Get tokens for a specific user
export async function getStoredTokens(userEmail: string): Promise<TokenData | null> {
  const database = await connectToDatabase();
  const doc = await database.collection('oauth_tokens').findOne({ userEmail });
  return doc as TokenData | null;
}

// Get all stored users (for cron job to fetch all emails)
export async function getAllUsers(): Promise<TokenData[]> {
  const database = await connectToDatabase();
  const docs = await database.collection<TokenData>('oauth_tokens').find({}).toArray();
  return docs as unknown as TokenData[];
}

// Store tokens for a specific user
export async function storeTokens(tokens: Omit<TokenData, 'updatedAt'>): Promise<void> {
  const database = await connectToDatabase();
  await database.collection('oauth_tokens').updateOne(
    { userEmail: tokens.userEmail },
    {
      $set: {
        ...tokens,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Delete tokens for a user (logout)
export async function deleteTokens(userEmail: string): Promise<void> {
  const database = await connectToDatabase();
  await database.collection('oauth_tokens').deleteOne({ userEmail });
}

// Email storage - MULTI-USER
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

// Get cached emails for a specific user
export async function getCachedEmails(userEmail: string): Promise<EmailCache | null> {
  const database = await connectToDatabase();
  const doc = await database.collection('email_cache').findOne({ userEmail });
  return doc as EmailCache | null;
}

// Cache emails for a specific user
export async function cacheEmails(emails: StoredEmail[], userEmail: string): Promise<void> {
  const database = await connectToDatabase();
  await database.collection('email_cache').updateOne(
    { userEmail },
    {
      $set: {
        emails,
        userEmail,
        lastFetched: new Date(),
      },
    },
    { upsert: true }
  );
}

// Delete email cache for a user (logout)
export async function deleteEmailCache(userEmail: string): Promise<void> {
  const database = await connectToDatabase();
  await database.collection('email_cache').deleteOne({ userEmail });
}
