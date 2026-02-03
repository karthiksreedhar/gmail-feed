import { NextResponse } from 'next/server';
import { getCachedEmails } from '@/lib/mongodb';
import { isAuthenticated } from '@/lib/oauth';

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      return NextResponse.json({ 
        authenticated: false, 
        emails: [], 
        message: 'User needs to authenticate' 
      }, { status: 401 });
    }
    
    const cachedData = await getCachedEmails();
    
    if (!cachedData) {
      return NextResponse.json({ 
        authenticated: true, 
        emails: [], 
        message: 'No emails cached yet' 
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      emails: cachedData.emails,
      lastFetched: cachedData.lastFetched,
      userEmail: cachedData.userEmail,
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch emails' 
    }, { status: 500 });
  }
}
