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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meta_url } = await request.json();
    
    if (!meta_url) {
      return NextResponse.json(
        { error: 'Missing meta_url parameter' },
        { status: 400 }
      );
    }

    // Check if like exists
    const existingLike = await prisma.metaLike.findUnique({
      where: {
        user_id_meta_url: {
          user_id: user.id,
          meta_url: meta_url
        }
      }
    });

    if (existingLike) {
      // Unlike: Remove the existing like
      await prisma.metaLike.delete({
        where: {
          user_id_meta_url: {
            user_id: user.id,
            meta_url: meta_url
          }
        }
      });
      return NextResponse.json({ liked: false });
    } else {
      // Like: Create a new like
      await prisma.metaLike.create({
        data: {
          user_id: user.id,
          meta_url: meta_url
        }
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    logger.error('Error toggling meta like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
