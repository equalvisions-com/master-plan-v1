import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { unstable_noStore } from 'next/cache';

// GET /api/meta-like - Get all liked meta URLs for the current user
export async function GET() {
  unstable_noStore();
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
      likes: likes.map(like => like.meta_url)
    });
  } catch (error) {
    logger.error('Error fetching meta likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
