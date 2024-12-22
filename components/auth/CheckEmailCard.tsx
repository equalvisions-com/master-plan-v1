import { Mail } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CheckEmailCardProps {
  email: string
  isSignUp?: boolean
  onTryAgain: () => void
}

export function CheckEmailCard({ email, isSignUp = false, onTryAgain }: CheckEmailCardProps) {
  return (
    <>
      <CardHeader className="space-y-1">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Check your inbox</CardTitle>
        <CardDescription className="text-center">
          We've sent a {isSignUp ? 'confirmation' : 'magic'} link to {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="text-center text-sm text-muted-foreground">
            <p>Didn't receive an email? Check your spam folder or{' '}
              <button 
                onClick={onTryAgain}
                className="text-sm font-medium text-primary hover:underline"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </CardContent>
    </>
  )
} 