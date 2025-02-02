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
    
    // Add URL validation
    if (!metaUrl || typeof metaUrl !== 'string' || !isValidUrl(metaUrl)) {
      return NextResponse.json(
        { error: "Invalid or missing metaUrl" }, 
        { status: 400 }
      );
    }

    // Helper function
    function isValidUrl(url: string) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }

    // Get the authenticated user via Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('Request headers:', request.headers);
    console.log('Auth state:', await supabase.auth.getSession());

    const { error } = await supabase.rpc('toggle_meta_like', {
      meta_url: metaUrl,
      user_id: user.id
    });

    console.log('RPC call result:', { error });

    if (error) {
      console.error('Supabase RPC Error:', error);
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling meta like:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to toggle like",
      success: false
    }, { status: 500 });
  }
} 
