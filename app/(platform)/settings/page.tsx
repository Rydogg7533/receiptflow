'use client'

import { useSupabase } from '@/components/SupabaseProvider'
import PageHeader from '@/components/platform/PageHeader'
import { useState, useEffect } from 'react'
import { Mail, Lock, Briefcase, CreditCard, Zap } from 'lucide-react'

interface Profile {
  display_name: string | null
  business_name: string | null
  business_address: string | null
  business_phone: string | null
  subscription_status: string
  stripe_customer_id: string | null
}

interface Tool {
  slug: string
  name: string
  icon: string
  is_active: boolean
}

export default function SettingsPage() {
  const { user, loading } = useSupabase()
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      fetchSettings()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const fetchSettings = async () => {
    try {
      const [profileRes, toolsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/tools'),
      ])

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data.profile)
      }

      if (toolsRes.ok) {
        const data = await toolsRes.json()
        setTools(data.tools || [])
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: profile?.display_name,
          business_name: profile?.business_name,
          business_address: profile?.business_address,
          business_phone: profile?.business_phone,
        }),
      })

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Profile updated successfully' })
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to update profile' })
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Settings"
        description="Manage your account, billing, and tool access"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'billing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Billing
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'tools'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Tools
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && profile && (
          <div className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email Address</label>
              <div className="flex items-center px-4 py-2 bg-zinc-800 rounded-lg border border-zinc-700">
                <Mail size={18} className="text-zinc-500 mr-3" />
                <span className="text-white">{user?.email}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Email address cannot be changed</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Display Name</label>
              <input
                type="text"
                value={profile.display_name || ''}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Business Info */}
            <div className="pt-4 border-t border-zinc-700 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Briefcase size={18} />
                Business Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Business Name</label>
                <input
                  type="text"
                  value={profile.business_name || ''}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  placeholder="Your business name"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Business Address</label>
                <input
                  type="text"
                  value={profile.business_address || ''}
                  onChange={(e) => setProfile({ ...profile, business_address: e.target.value })}
                  placeholder="Your business address"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Business Phone</label>
                <input
                  type="tel"
                  value={profile.business_phone || ''}
                  onChange={(e) => setProfile({ ...profile, business_phone: e.target.value })}
                  placeholder="Your business phone"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <form onSubmit={handleProfileUpdate} className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>

            {/* Success/Error Message */}
            {saveMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  saveMessage.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {saveMessage.text}
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && profile && (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <CreditCard size={20} />
                Current Plan
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Status</p>
                <p className="text-white capitalize">
                  {profile.subscription_status || 'No active subscription'}
                </p>
              </div>
              {profile.stripe_customer_id && (
                <a
                  href="https://billing.stripe.com/p/login/test_live"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Manage Billing
                </a>
              )}
            </div>

            {!profile.stripe_customer_id && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-100 text-sm">
                  No active subscription. Visit the{' '}
                  <a href="/pricing" className="underline hover:no-underline">
                    pricing page
                  </a>{' '}
                  to subscribe.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            {tools.length === 0 ? (
              <p className="text-zinc-400">No tools available yet.</p>
            ) : (
              <div className="space-y-3">
                {tools.map((tool) => (
                  <div key={tool.slug} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tool.icon}</span>
                      <div>
                        <p className="font-medium text-white">{tool.name}</p>
                        <p className="text-xs text-zinc-500">{tool.slug}</p>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tool.is_active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {tool.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
          <Lock size={20} />
          Security
        </h3>
        <p className="text-zinc-400 text-sm mb-4">
          Manage your password and security settings
        </p>
        <button className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
          Change Password
        </button>
      </div>
    </div>
  )
}
