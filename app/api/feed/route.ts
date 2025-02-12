import { createClient } from '@/lib/supabase/server';
import { getFeedEntries } from '@/components/feed';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { entries, cursor: nextCursor } = await getFeedEntries(
      user.id,
      cursor
    );

    return NextResponse.json({ entries, cursor: nextCursor });
  } catch (error) {
    console.error('Feed API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 