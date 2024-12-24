'use client';

import { useEffect, useState } from 'react'
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";

interface ExampleData {
  id: string;
  title: string;
  content: string;
  // Add other fields as needed
}

interface ExampleError {
  message: string;
  code?: string;
  cause?: unknown;
}

interface ApiResponse {
  data: ExampleData | null;
  error?: ExampleError;
}

export default function ExampleComponent() {
  const [data, setData] = useState<ExampleData | null>(null)
  const [error, setError] = useState<ExampleError | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data')
        const result = await response.json() as ApiResponse
        
        if (result.error) {
          throw new Error(result.error.message)
        }
        
        if (!result.data) {
          throw new Error('No data received')
        }

        setData(result.data)
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'An unknown error occurred',
          code: 'FETCH_ERROR'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    void fetchData()
  }, [])

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (!data) {
    return <div>No data available</div>
  }

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.content}</p>
    </div>
  )
} 