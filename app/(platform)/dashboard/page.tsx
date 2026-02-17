'use client'

import { useSupabase } from '@/components/SupabaseProvider'
import PageHeader from '@/components/platform/PageHeader'
import Link from 'next/link'
import { ArrowRight, FileText, Clock, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Profile {
  subscription_status: string
}

interface DocumentStats {
  count: number
}

export default function DashboardPage() {
  const { user, loading } = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<DocumentStats>({ count: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/documents?limit=1'),
      ])

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data.profile)
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats({ count: data.total || 0 })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const tools = [
    {
      name: 'Receipts',
      icon: '📄',
      description: 'Extract data from receipts and invoices',
      href: '/receipts',
      active: true,
      stats: stats.count,
    },
    {
      name: 'Pay Stubs',
      icon: '💰',
      description: 'Generate and manage pay stubs',
      href: '/paystubs',
      active: false,
    },
    {
      name: 'Invoices',
      icon: '📋',
      description: 'Create and send invoices',
      href: '/invoices',
      active: false,
    },
    {
      name: 'Expenses',
      icon: '💳',
      description: 'Track and categorize expenses',
      href: '/expenses',
      active: false,
    },
  ]

  const isSubscribed =
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'inactive' ||
    !profile?.subscription_status

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome to ToolSuite. Manage your business tools in one place."
      />

      {/* Status Cards */}
      {!isSubscribed && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-200">Upgrade your plan</h3>
            <p className="text-sm text-amber-100/80 mt-1">
              Subscribe to access all tools and features. {' '}
              <Link href="/pricing" className="underline hover:no-underline">
                View pricing
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Documents Processed</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.count}</p>
            </div>
            <FileText size={32} className="text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Active Tools</p>
              <p className="text-3xl font-bold text-white mt-1">1</p>
            </div>
            <Clock size={32} className="text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Plan Status</p>
              <p className="text-lg font-bold text-white mt-1">
                {isSubscribed ? 'Active' : 'Free Trial'}
              </p>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                isSubscribed ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Available Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className={`rounded-lg border p-6 transition-all ${
                tool.active
                  ? 'bg-zinc-900 border-zinc-800 hover:border-blue-600/50 cursor-pointer group'
                  : 'bg-zinc-900/50 border-zinc-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <Link href={tool.active ? tool.href : '#'} className="block">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-3xl mb-2">{tool.icon}</div>
                    <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">{tool.description}</p>
                    {tool.stats !== undefined && (
                      <p className="text-xs text-zinc-500 mt-3">
                        {tool.stats} documents processed
                      </p>
                    )}
                  </div>
                  {tool.active && (
                    <ArrowRight
                      size={20}
                      className="text-zinc-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
                    />
                  )}
                  {!tool.active && (
                    <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500 flex-shrink-0">
                      Coming Soon
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      {isSubscribed && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/receipts"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Upload Receipt
            </Link>
            <Link
              href="/settings"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
            >
              Manage Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
