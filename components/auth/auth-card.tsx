import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthCardProps {
  title?: string
  description?: string
  children: React.ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-sm">
      {(title || description) && (
        <CardHeader className="space-y-1">
          {title && <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>}
          {description && <CardDescription className="text-center">{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
} 