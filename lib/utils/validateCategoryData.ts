import { z } from 'zod';
import type { CategoryData } from '@/types/wordpress';

const categorySchema = z.object({
  category: z.object({
    posts: z.object({
      nodes: z.array(z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        // Add other required fields
      })),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    }).nullable(),
  }).nullable(),
});

export function validateCategoryData(data: CategoryData) {
  try {
    categorySchema.parse(data);
    return { success: true as const };
  } catch (error) {
    return { 
      success: false as const, 
      error: error instanceof Error ? error : new Error('Validation failed') 
    };
  }
} 