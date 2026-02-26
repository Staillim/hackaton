import { NextRequest, NextResponse } from 'next/server';
import { saveUserPreference } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, preferences } = await request.json();

    if (!sessionId || !preferences) {
      return NextResponse.json(
        { error: 'Session ID and preferences required' },
        { status: 400 }
      );
    }

    await saveUserPreference(sessionId, preferences);

    return NextResponse.json({
      success: true,
      message: 'Preferencias guardadas correctamente',
    });

  } catch (error: any) {
    console.error('Preferences API Error:', error);
    return NextResponse.json(
      { error: 'Error saving preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const { getUserPreferences } = await import('@/lib/supabase');
    const preferences = await getUserPreferences(sessionId);

    return NextResponse.json({
      preferences: preferences || null,
    });

  } catch (error: any) {
    console.error('Preferences API Error:', error);
    return NextResponse.json(
      { error: 'Error fetching preferences' },
      { status: 500 }
    );
  }
}
