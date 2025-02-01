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

    // Check if a like already exists for this user and metaUrl
    const existingLike = await prisma.metaLike.findFirst({
      where: { user_id: user.id, meta_url: metaUrl },
    });

    if (existingLike) {
      // Toggle off: remove the like
      await prisma.metaLike.delete({
        where: { id: existingLike.id },
      });
      return NextResponse.json({ liked: false });
    } else {
      // Toggle on: create a new like record
      await prisma.metaLike.create({
        data: { user_id: user.id, meta_url: metaUrl },
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Error toggling meta like:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 
