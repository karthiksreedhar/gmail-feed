import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/oauth';
import { fetchEmails } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_error', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    // Exchange code for tokens and store them
    await exchangeCodeForTokens(code);
    
    // Fetch initial emails
    await fetchEmails(50);
    
    // Redirect to home page
    return NextResponse.redirect(new URL('/?success=true', request.url));
  } catch (err) {
    console.error('Error during OAuth callback:', err);
    return NextResponse.redirect(new URL('/?error=token_exchange', request.url));
  }
}
