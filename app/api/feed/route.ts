import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFeedEntries } from '@/app/components/Feed/Server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const feedData = await getFeedEntries(user.id, cursor || undefined)
    return NextResponse.json(feedData)
  } catch (error) {
    console.error('Feed API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 