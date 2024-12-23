import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            There was an error authenticating your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Please try logging in again or contact support if the problem persists.
          </p>
          <Link 
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            Return to login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
} 