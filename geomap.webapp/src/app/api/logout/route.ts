import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // This endpoint is called from the geomap app's logout button
    
    // Call the onboarding app's logout endpoint to retire the session
    try {
      await fetch(`${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Failed to call onboarding logout:', err);
      // Continue with logout even if this fails
    }

    // Return success with redirect URL
    return NextResponse.json({ 
      success: true, 
      redirectUrl: `${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/api/auth/signout`
    });
    
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ 
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests too for direct browser navigation
  try {
    // Call the onboarding app's logout endpoint
    await fetch(`${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/api/auth/logout`, {
      method: 'POST',
    });
  } catch (err) {
    console.error('Failed to call onboarding logout:', err);
  }

  // Redirect to onboarding app signout
  return NextResponse.redirect(`${process.env.ONBOARDING_APP_URL || 'http://localhost:3000'}/api/auth/signout`);
}