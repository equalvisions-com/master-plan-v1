'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'
import { isValidHttpUrl } from '@/lib/utils/validateUrl'
import { revalidateTag, revalidatePath } from 'next/cache'
import { unstable_noStore } from 'next/cache'

export async function toggleMetaLike(rawUrl: string) {
  unstable_noStore();
  console.debug("toggleMetaLike: received URL", rawUrl);
  
  const metaUrl = normalizeUrl(rawUrl);
  
  // Validate URL format
  if (!isValidHttpUrl(metaUrl)) {
    return { success: false, error: 'Invalid URL format' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const parsed = new URL(metaUrl);
    console.debug("toggleMetaLike: parsed URL", parsed.toString());

    const existingLike = await prisma.metaLike.findUnique({
      where: { user_id_meta_url: { user_id: user.id, meta_url: metaUrl } }
    });

    if (existingLike) {
      await prisma.metaLike.delete({
        where: { id: existingLike.id }
      });
    } else {
      await prisma.metaLike.create({
        data: { 
          user_id: user.id, 
          meta_url: metaUrl 
        }
      });
    }

    // Revalidate all necessary caches
    revalidateTag('meta-likes');
    revalidateTag('counts');
    revalidatePath('/[categorySlug]/[postSlug]', 'page');
    
    return { success: true, liked: !existingLike };
  } catch (error) {
    console.error("toggleMetaLike: failed to parse URL", rawUrl, error);
    console.error('Database error:', error);
    return { success: false, error: 'Failed to update like status' };
  }
} 