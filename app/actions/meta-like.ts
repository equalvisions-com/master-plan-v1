'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

const MetaLikeSchema = z.object({
  metaUrl: z.string().url()
})

export async function toggleMetaLike(rawUrl: string) {
  const metaUrl = normalizeUrl(rawUrl);
  
  // Validate URL format
  if (!isValidHttpUrl(metaUrl)) {
    return { success: false, error: 'Invalid URL format' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const existingLike = await prisma.metaLike.findUnique({
      where: { user_id_meta_url: { user_id: user.id, meta_url: metaUrl } }
    });

    const isLiked = !existingLike;
    
    await prisma.metaLike[existingLike ? 'delete' : 'create']({
      where: existingLike ? { id: existingLike.id } : undefined,
      data: existingLike ? undefined : { user_id: user.id, meta_url: metaUrl }
    });

    revalidatePath('/[categorySlug]/[postSlug]', 'page');
    return { success: true, liked: isLiked };
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: 'Failed to update like status' };
  }
} 