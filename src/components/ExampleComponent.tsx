import { useEffect, useState } from 'react'

function ExampleComponent() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'))
      }
    }
    
    fetchData()
  }, [])

  // Rest of the component...
}

export default ExampleComponent 