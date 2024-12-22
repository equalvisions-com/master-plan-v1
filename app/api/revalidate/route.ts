import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { tags } = await request.json();
    
    await Promise.all(tags.map((tag: string) => revalidateTag(tag)));
    
    return Response.json({ 
      revalidated: true, 
      now: Date.now() 
    });
  } catch (error) {
    console.error('Error revalidating:', error);
    return Response.json({ 
      error: 'Error revalidating' 
    }, { status: 500 });
  }
} 