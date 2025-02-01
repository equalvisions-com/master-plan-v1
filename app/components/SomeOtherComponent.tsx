'use client'

import { useEffect } from 'react'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_UPSTASH_REDIS_URL!,
  token: process.env.NEXT_PUBLIC_UPSTASH_REDIS_TOKEN!,
})

interface Props {
  url: string
}

export function SomeOtherComponent({ url }: Props) {
  useEffect(() => {
    const loadMeta = async () => {
      try {
        await redis.get(`meta:${url}`); // Result not used
      } catch (error) {
        console.error('Failed to load meta:', error)
      }
    }
    loadMeta()
  }, [url])

  return <div>{/* Component JSX */}</div>
} 