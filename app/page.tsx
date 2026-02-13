'use client'

import Link from 'next/link'
import { useSupabase } from '@/components/SupabaseProvider'

export default function Home() {
  const { user, loading } = useSupabase()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Root becomes the marketing entry point.
  // If logged in, bounce to the app.
  if (user) {
    if (typeof window !== 'undefined') window.location.href = '/app'
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            ReceiptsFlow
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300">
            Turn receipts and invoices into clean, export-ready data in seconds.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Sign in
            </Link>
            <Link
              href="/landing"
              className="inline-flex items-center rounded-md bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Learn more
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 p-6">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Stop manual entry</div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Extract vendor, date, totals, and key fields automatically.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 p-6">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Built for bookkeeping</div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Great for contractors, agencies, landlords, and SMB owners.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 p-6">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Export-ready</div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Export to CSV / Google Sheets and keep your workflow moving.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
