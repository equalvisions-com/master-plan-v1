import { z } from 'zod';

// Post validation schema
export const PostSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  date: z.string().datetime(),
  excerpt: z.string(),
  content: z.string(),
  featuredImage: z.object({
    node: z.object({
      sourceUrl: z.string().url(),
      altText: z.string(),
    }),
  }).nullable(),
  categories: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      })
    ),
  }),
});

// Category validation schema
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  slug: z.string().min(1, 'Slug is required'),
  posts: z.object({
    nodes: z.array(PostSchema),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string(),
    }),
  }),
});

// Validation function
export async function validateData<T>(schema: z.Schema<T>, data: unknown): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      throw new Error('Invalid data received from API');
    }
    throw error;
  }
} 