'use client'

import { useSupabase } from '@/components/SupabaseProvider'
import { AuthForm } from '@/components/AuthForm'
import { UploadZone } from '@/components/UploadZone'
import { DocumentList } from '@/components/DocumentList'
import { PricingCard } from '@/components/PricingCard'
import { LogOut, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Profile {
  subscription_status: string
  stripe_customer_id: string | null
}

export default function Home() {
  const { user, loading, signOut } = useSupabase()
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <FileText className="h-16 w-16 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ReceiptFlow
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Extract data from receipts and invoices automatically using AI
            </p>
            <div className="max-w-md mx-auto">
              <AuthForm />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isSubscribed = profile?.subscription_status === 'active' || profile?.subscription_status === 'inactive' || !profile?.subscription_status

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">ReceiptFlow</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={signOut}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Pricing */}
          <div className="lg:col-span-1 space-y-6">
            {isSubscribed ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Upload Receipt
                </h2>
                <UploadZone />
              </div>
            ) : (
              <PricingCard 
                isSubscribed={isSubscribed} 
                subscriptionStatus={profile?.subscription_status}
              />
            )}
            
            {isSubscribed && (
              <PricingCard 
                isSubscribed={isSubscribed} 
                subscriptionStatus={profile?.subscription_status}
              />
            )}
          </div>

          {/* Documents List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Documents
              </h2>
              {!isSubscribed ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">Subscribe to start uploading</p>
                  <p className="text-sm text-gray-400">Get unlimited receipt extractions</p>
                </div>
              ) : (
                <DocumentList />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
