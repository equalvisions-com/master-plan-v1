import { track } from '@vercel/analytics/server'

interface LogMetadata {
  [key: string]: unknown
}

// Import types from Vercel Analytics type definitions
type AnalyticsProps = Parameters<typeof track>[1]

// Create a mock request object for cases where the actual request is not available
const mockRequest = new Request('https://example.com')

export const logger = {
  debug(message: string, meta?: LogMetadata) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, meta || '')
    }
  },

  info(message: string, meta?: LogMetadata, request?: Request) {
    console.info(message, meta || '')
    const analyticsData: AnalyticsProps = { 
      message,
      ...(meta as AnalyticsProps)
    }
    track('info', analyticsData, { request: request || mockRequest })
  },

  warn(message: string, meta?: LogMetadata, request?: Request) {
    console.warn(message, meta || '')
    const analyticsData: AnalyticsProps = { 
      message,
      ...(meta as AnalyticsProps)
    }
    track('warning', analyticsData, { request: request || mockRequest })
  },

  error(message: string, error?: unknown, request?: Request) {
    console.error(message, error || '')
    const analyticsData: AnalyticsProps = {
      message,
      error: error instanceof Error ? error.message : String(error || ''),
      stack: error instanceof Error ? error.stack || null : null
    }
    track('error', analyticsData, { request: request || mockRequest })
  }
} 