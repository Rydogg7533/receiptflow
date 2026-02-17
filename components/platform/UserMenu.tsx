'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { ChevronDown, Settings, CreditCard, LogOut } from 'lucide-react'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-white text-sm font-medium"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
            R
          </div>
          <span className="hidden sm:inline">Ryan</span>
        </div>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} />
            Settings
          </Link>
          <Link
            href="/settings?tab=billing"
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <CreditCard size={16} />
            Billing
          </Link>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors border-t border-zinc-700 disabled:opacity-50"
          >
            <LogOut size={16} />
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  )
}
