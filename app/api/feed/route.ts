import { createClient } from '@/lib/supabase/server'
import { getFeedEntries } from '@/app/components/Feed/Server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { entries, nextCursor } = await getFeedEntries(user.id, cursor || undefined)
    
    return NextResponse.json({ entries, nextCursor })
  } catch (error) {
    console.error('Feed API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 