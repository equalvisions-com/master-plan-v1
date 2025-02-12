import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getFeedData } from '@/app/components/Feed/Server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const feedData = await getFeedData(user.id, cursor || undefined)
    
    return NextResponse.json(feedData)
  } catch (error) {
    console.error('Error in feed API route:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 