'use client';

import { useState, useEffect, useCallback } from 'react';

interface Email {
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

interface EmailsResponse {
  authenticated: boolean;
  emails: Email[];
  lastFetched?: string;
  userEmail?: string;
  message?: string;
  error?: string;
}

export default function Home() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const response = await fetch('/api/emails');
      const data: EmailsResponse = await response.json();
      
      if (data.authenticated) {
        setAuthenticated(true);
        setEmails(data.emails || []);
        if (data.lastFetched) {
          setLastFetched(new Date(data.lastFetched));
        }
        if (data.userEmail) {
          setUserEmail(data.userEmail);
        }
        setError('');
      } else {
        setAuthenticated(false);
        setError(data.message || '');
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    
    // Refresh emails every 5 minutes (300000ms)
    const interval = setInterval(fetchEmails, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const extractSenderName = (from: string) => {
    const match = from.match(/^([^<]+)/);
    if (match) {
      return match[1].trim().replace(/"/g, '');
    }
    return from.split('@')[0];
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your inbox...</p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="mb-8">
            <svg className="w-20 h-20 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Gmail Feed</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Connect your Gmail account to view your inbox. Emails are automatically synced every 10 minutes.
          </p>
          <a
            href="/api/auth/login"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Gmail Feed</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</span>
              {lastFetched && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Last synced: {formatDate(lastFetched.toISOString())}
                </span>
              )}
              <button
                onClick={fetchEmails}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Email List */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">No emails found. Emails will sync every 10 minutes.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {emails.map((email) => (
                <li
                  key={email.id}
                  onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors ${
                    email.isUnread ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        email.isUnread ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        {extractSenderName(email.from).charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm ${email.isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {extractSenderName(email.from)}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {formatDate(email.date)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${email.isUnread ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 truncate">
                        {email.snippet}
                      </p>
                      
                      {/* Expanded email body */}
                      {selectedEmail?.id === email.id && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <p><strong>From:</strong> {email.from}</p>
                            <p><strong>To:</strong> {email.to}</p>
                            <p><strong>Date:</strong> {new Date(email.date).toLocaleString()}</p>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-2">
                            <div 
                              className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: email.body.substring(0, 2000) + (email.body.length > 2000 ? '...' : '') }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {email.isUnread && (
                      <div className="flex-shrink-0">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Emails are automatically synced every 10 minutes by the server.</p>
          <p>This page refreshes every 5 minutes to show the latest cached emails.</p>
        </div>
      </div>
    </main>
  );
}
