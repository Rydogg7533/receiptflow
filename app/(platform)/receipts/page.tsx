'use client'

import { useSupabase } from '@/components/SupabaseProvider'
import { UploadZone } from '@/components/UploadZone'
import { DocumentList } from '@/components/DocumentList'
import { PricingCard } from '@/components/PricingCard'
import PageHeader from '@/components/platform/PageHeader'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Profile {
  subscription_status: string
  stripe_customer_id: string | null
}

export default function ReceiptsPage() {
  const { user, loading } = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else {
      setProfileLoading(false)
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isSubscribed =
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'inactive' ||
    !profile?.subscription_status

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Receipts"
        description="Extract data from receipts and invoices automatically using AI"
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Upload & Pricing */}
        <div className="lg:col-span-1 space-y-6">
          {isSubscribed ? (
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText size={20} />
                Upload Receipt
              </h2>
              <UploadZone />
            </div>
          ) : (
            <PricingCard isSubscribed={isSubscribed} subscriptionStatus={profile?.subscription_status} />
          )}

          {isSubscribed && (
            <PricingCard isSubscribed={isSubscribed} subscriptionStatus={profile?.subscription_status} />
          )}
        </div>

        {/* Documents List */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your Documents</h2>
            {!isSubscribed ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-zinc-700" />
                <p className="mt-4 text-zinc-400">Subscribe to start uploading</p>
                <p className="text-sm text-zinc-500">Get unlimited receipt extractions</p>
              </div>
            ) : (
              <DocumentList />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
