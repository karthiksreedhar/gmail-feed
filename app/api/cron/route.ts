import { NextRequest, NextResponse } from 'next/server';
import { fetchEmails } from '@/lib/gmail';
import { isAuthenticated } from '@/lib/oauth';

// This endpoint is called by Vercel Cron Jobs
// It runs every 10 minutes to fetch new emails
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, verify the cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not authenticated, skipping email fetch' 
      });
    }
    
    console.log('Cron job: Fetching emails...');
    const result = await fetchEmails(50);
    
    if (result) {
      console.log(`Cron job: Successfully fetched ${result.emails.length} emails`);
      return NextResponse.json({ 
        success: true, 
        emailCount: result.emails.length,
        userEmail: result.userEmail,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'No emails fetched' 
      });
    }
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch emails' 
    }, { status: 500 });
  }
}
