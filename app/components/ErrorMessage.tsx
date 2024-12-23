import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface ErrorMessageProps {
  error: Error
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {error.message || 'An error occurred while loading posts'}
      </AlertDescription>
    </Alert>
  )
} 