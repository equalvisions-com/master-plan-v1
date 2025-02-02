'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { normalizeUrl } from '@/lib/utils/normalizeUrl'

const MetaLikeSchema = z.object({
  metaUrl: z.string().url()
})

export async function toggleMetaLike(metaUrl: string) {
  try {
    // Validate input
    const validation = MetaLikeSchema.safeParse({ metaUrl })
    if (!validation.success) {
      return { 
        success: false, 
        error: 'Invalid URL format'
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { 
        success: false, 
        error: 'Unauthorized'
      }
    }

    const normalizedUrl = normalizeUrl(metaUrl)

    const isLiked = await prisma.$transaction(async (tx) => {
      const exists = await tx.metaLike.findUnique({
        where: { 
          user_id_meta_url: {
            user_id: user.id,
            meta_url: normalizedUrl
          }
        }
      })

      if (exists) {
        await tx.metaLike.delete({
          where: { id: exists.id }
        })
        return false
      }

      await tx.metaLike.create({
        data: { 
          user_id: user.id, 
          meta_url: normalizedUrl 
        }
      })
      return true
    })

    // Revalidate paths
    revalidatePath('/api/meta-like')
    revalidatePath('/[categorySlug]/[postSlug]')

    return { 
      success: true, 
      liked: isLiked 
    }
  } catch (error) {
    console.error('Error in toggleMetaLike:', error)
    return { 
      success: false, 
      error: 'Failed to update like status'
    }
  }
} 