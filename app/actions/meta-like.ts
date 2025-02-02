'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { isValidHttpUrl } from '@/lib/utils/validateUrl'
import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export type MetaLikeResponse = 
  | { success: true }
  | { success: false; error: string };

export const toggleMetaLike = cache(async (rawUrl: string): Promise<MetaLikeResponse> => {
  const metaUrl = normalizeUrl(rawUrl);
  
  if (!isValidHttpUrl(metaUrl)) {
    return { success: false, error: 'Invalid URL format' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    // Get referer to revalidate correct path
    const referer = (await headers()).get('referer');
    const path = referer ? new URL(referer).pathname : '/[categorySlug]/[postSlug]';

    return await prisma.$transaction(async (tx) => {
      const existingLike = await prisma.metaLike.findUnique({
        where: { user_id_meta_url: { user_id: user.id, meta_url: metaUrl } }
      });

      if (existingLike) {
        await tx.metaLike.delete({
          where: { id: existingLike.id }
        });
      } else {
        await tx.metaLike.create({
          data: { 
            user_id: user.id, 
            meta_url: metaUrl,
            created_at: new Date()
          }
        });
      }

      // Revalidate both the specific page and the tag
      revalidatePath(path);
      revalidatePath('/[categorySlug]/[postSlug]', 'layout');
      return { success: true };
    });
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: 'Failed to update like status' };
  }
}); 