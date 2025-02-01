import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/meta-like - Get all liked meta URLs for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const likes = await prisma.metaLike.findMany({
      where: { user_id: user.id },
      select: { meta_url: true }
    });

    return NextResponse.json({ 
      likes: likes.map((like: { meta_url: string }) => like.meta_url)
    });
  } catch (error) {
    logger.error('Error fetching meta likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/meta-like - Toggle like status for a meta URL
export async function POST(request: Request) {
  try {
    const { metaUrl } = await request.json();
    if (!metaUrl) {
      return NextResponse.json({ error: "No metaUrl provided" }, { status: 400 });
    }

    // Get the authenticated user via Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.rpc('toggle_meta_like', {
      user_id: user.id,
      meta_url: metaUrl
    });

    if (error) throw error;
    
    return NextResponse.json({ 
      success: true,
      revalidate: Date.now() // Cache busting
    });
  } catch (error) {
    console.error("Error toggling meta like:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 
