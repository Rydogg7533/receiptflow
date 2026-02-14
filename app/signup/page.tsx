'use client'

import Link from 'next/link'
import { useSupabase } from '@/components/SupabaseProvider'
import { AuthForm } from '@/components/AuthForm'
import { FileText } from 'lucide-react'

export default function SignupPage() {
  const { user, loading } = useSupabase()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    if (typeof window !== 'undefined') window.location.href = '/app'
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <FileText className="h-9 w-9 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">ReceiptsFlow</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mt-8">
            <AuthForm />
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-600 dark:text-gray-300 hover:underline">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
