'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

export function Dialog({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const ref = React.useRef<HTMLDivElement>(null)

  const onDismiss = React.useCallback(() => {
    router.back()
  }, [router])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onDismiss])

  return (
    <div
      ref={ref}
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      {children}
    </div>
  )
} 