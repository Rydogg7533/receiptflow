'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/SupabaseProvider'

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useSupabase()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Authenticated users go to dashboard
        router.replace('/dashboard')
      }
      // Unauthenticated users stay on landing page (loaded below)
    }
  }, [user, loading, router])

  // If loading, show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  if (!user) {
    const LandingPage = require('./landing/page').default
    return <LandingPage />
  }

  // Authenticated users are redirected above, so this shouldn't render
  return null
}
