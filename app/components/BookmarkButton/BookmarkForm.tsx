'use client'

import { useOptimistic } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { bookmarkAction } from '@/app/actions/bookmarkActions'
import { useEffect } from 'react'
import type { BookmarkState } from '@/app/types/bookmark'

interface BookmarkFormProps {
  postId: string
  title: string
  userId: string
  sitemapUrl: string
  initialIsBookmarked: boolean
}

function SubmitButton({ isBookmarked }: { isBookmarked: boolean }) {
  const { pending } = useFormStatus()
  
  return (
    <button 
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
        ${pending ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}
        ${isBookmarked 
          ? 'bg-black text-white hover:bg-gray-800' 
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Updating...
        </span>
      ) : (
        isBookmarked ? 'Bookmarked' : 'Bookmark'
      )}
    </button>
  )
}

export function BookmarkForm({ 
  postId, 
  title, 
  userId, 
  sitemapUrl, 
  initialIsBookmarked 
}: BookmarkFormProps) {
  const [optimisticIsBookmarked, setOptimisticIsBookmarked] = useOptimistic(
    initialIsBookmarked
  )

  const initialState: BookmarkState = {
    message: null,
    error: null
  }

  const formActionWithState = async (
    prevState: BookmarkState,
    formData: FormData
  ): Promise<BookmarkState> => {
    try {
      return await bookmarkAction(formData)
    } catch (error) {
      return {
        message: null,
        error: error instanceof Error ? error.message : 'An error occurred'
      }
    }
  }

  const [state, formAction] = useFormState(formActionWithState, initialState)

  // Add debug logging for state changes
  useEffect(() => {
    console.log('BookmarkForm state:', {
      initialIsBookmarked,
      optimisticIsBookmarked,
      formState: state,
      sitemapUrl
    });
  }, [initialIsBookmarked, optimisticIsBookmarked, state, sitemapUrl]);

  // Reset optimistic state if there's an error
  useEffect(() => {
    if (state?.error) {
      console.log('Error detected, resetting state:', {
        error: state.error,
        wasBookmarked: optimisticIsBookmarked,
        resettingTo: initialIsBookmarked
      });
      setOptimisticIsBookmarked(initialIsBookmarked)
    }
  }, [state?.error, initialIsBookmarked, optimisticIsBookmarked])

  const handleFormAction = async (formData: FormData): Promise<void> => {
    console.log('Form submission:', {
      currentState: optimisticIsBookmarked,
      newState: !optimisticIsBookmarked,
      formData: Object.fromEntries(formData.entries())
    });
    
    setOptimisticIsBookmarked(!optimisticIsBookmarked)
    
    try {
      await formAction(formData)
      
      if (state?.error) {
        console.log('Error in form action, reverting state:', state.error);
        setOptimisticIsBookmarked(optimisticIsBookmarked)
      }
    } catch (error) {
      console.error('Form action error:', error);
      setOptimisticIsBookmarked(optimisticIsBookmarked)
    }
  }

  return (
    <form action={handleFormAction}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="sitemapUrl" value={sitemapUrl} />
      <input type="hidden" name="isBookmarked" value={optimisticIsBookmarked.toString()} />
      <SubmitButton isBookmarked={optimisticIsBookmarked} />
      {state?.error && (
        <p className="text-red-500 text-sm mt-2" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
} 