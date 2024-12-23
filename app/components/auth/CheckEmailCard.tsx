interface CheckEmailCardProps {
  email: string
  isSignUp?: boolean
  onTryAgain: () => void
}

export function CheckEmailCard({ email, isSignUp = false, onTryAgain }: CheckEmailCardProps) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">
        Check your email
      </h2>
      <p className="text-muted-foreground mb-4">
        We&apos;ve sent a magic link to <strong>{email}</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        {isSignUp ? (
          <>
            Can&apos;t find the email? Check your spam folder or{' '}
            <button 
              onClick={onTryAgain}
              className="text-primary hover:underline"
            >
              try another email address
            </button>
          </>
        ) : (
          <>
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button 
              onClick={onTryAgain}
              className="text-primary hover:underline"
            >
              try again
            </button>
          </>
        )}
      </p>
    </div>
  );
} 