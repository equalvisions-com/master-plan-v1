'use client'

import { useState, useCallback } from "react"

type ToastType = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = useCallback(({ title, description, variant = "default" }: ToastType) => {
    setToasts(prev => [...prev, { title, description, variant }])
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 3000)
  }, [])

  return { toast, toasts }
} 