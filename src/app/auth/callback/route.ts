import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    // Simply redirect back to home and let the browser client handle the exchange
    return NextResponse.redirect(`${origin}/?code=${encodeURIComponent(code)}`);
  }

  return NextResponse.redirect(`${origin}/`);
}
