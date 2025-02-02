'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { isValidHttpUrl } from '@/lib/utils/validateUrl'

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

    if (existingLike) {
      await prisma.metaLike.delete({
        where: { id: existingLike.id }
      });
      return { success: true, liked: false };
    } else {
      await prisma.metaLike.create({
        data: { 
          user_id: user.id, 
          meta_url: metaUrl 
        }
      });
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: 'Failed to update like status' };
  }
} 