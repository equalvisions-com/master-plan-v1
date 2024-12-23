import { track } from '@vercel/analytics'

interface LogMetadata {
  [key: string]: unknown
}

// Import types from Vercel Analytics type definitions
type AnalyticsProps = Parameters<typeof track>[1]

export const logger = {
  debug(message: string, meta?: LogMetadata) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, meta || '')
    }
  },

  info(message: string, meta?: LogMetadata) {
    console.info(message, meta || '')
    // Cast to analytics-compatible type
    const analyticsData: AnalyticsProps = { 
      message,
      ...(meta as AnalyticsProps)
    }
    track('info', analyticsData)
  },

  warn(message: string, meta?: LogMetadata) {
    console.warn(message, meta || '')
    const analyticsData: AnalyticsProps = { 
      message,
      ...(meta as AnalyticsProps)
    }
    track('warning', analyticsData)
  },

  error(message: string, error?: unknown) {
    console.error(message, error || '')
    const analyticsData: AnalyticsProps = {
      message,
      error: error instanceof Error ? error.message : String(error || ''),
      stack: error instanceof Error ? error.stack || null : null
    }
    track('error', analyticsData)
  }
} 