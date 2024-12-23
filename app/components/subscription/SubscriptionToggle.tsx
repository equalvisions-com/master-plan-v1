'use client'

import { useState, useEffect } from 'react'
import { Switch } from "@/app/components/ui/switch"
import { Label } from "@/app/components/ui/label"
import { createClient } from '@/lib/supabase/client'

interface SubscriptionToggleProps {
  initialStatus: boolean
  userId: string
}

export function SubscriptionToggle({ initialStatus, userId }: SubscriptionToggleProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Log when initial status changes
  useEffect(() => {
    console.log('initialStatus changed:', initialStatus)
    setIsSubscribed(initialStatus)
  }, [initialStatus])

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    try {
      // First verify the current state
      const { data: currentData, error: fetchError } = await supabase
        .from('users')
        .select('subscribed')
        .eq('id', userId)
        .single()
      
      console.log('Current DB state:', currentData)

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('users')
        .update({ 
          subscribed: checked,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      setIsSubscribed(checked)
      
      // Verify the update
      const { data: verifyData } = await supabase
        .from('users')
        .select('subscribed')
        .eq('id', userId)
        .single()
      
      console.log('Updated DB state:', verifyData)
      
    } catch (error) {
      console.error('Error updating subscription:', error)
      setIsSubscribed(!checked)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center space-x-2">
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          id="subscription-toggle"
        />
        <Label htmlFor="subscription-toggle" className="text-sm text-muted-foreground">
          {isLoading ? 'Updating...' : (isSubscribed ? 'Subscribed' : 'Not subscribed')}
        </Label>
      </div>
    </div>
  )
} 